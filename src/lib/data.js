import { supabase, supabaseConfigError } from './supabaseClient';

function assertConfigured() {
  if (supabaseConfigError) throw new Error(supabaseConfigError);
}

// ---- Auth (magic link, invite-only per CLAUDE.md — Supabase Auth handles
// the email itself; whether public signup is disabled is a Supabase dashboard
// setting, not something this client code controls) ----

export async function sendMagicLink(email) {
  assertConfigured();
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw new Error(error.message);
}

export async function getSession() {
  assertConfigured();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

export function onAuthStateChange(callback) {
  assertConfigured();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return data.subscription;
}

export async function signOut() {
  assertConfigured();
  await supabase.auth.signOut();
}

// ---- Assessments ----

export async function fetchAssessments() {
  assertConfigured();
  const { data, error } = await supabase
    .from('assessments')
    .select('id, name, mode, status, respondents_done, respondents_total, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`assessments query failed: ${error.message}`);
  return data;
}

// ---- Dashboard: IROs + their assessor_ratings, shaped for src/lib/calc.js ----

export async function fetchDashboard(assessmentId) {
  assertConfigured();

  const { data: iroRows, error: iroError } = await supabase
    .from('iros')
    .select('id, esrs_topic_id, name, description, iro_type, actual, impact_threshold, financial_threshold, session_notes, order')
    .eq('assessment_id', assessmentId)
    .order('order', { ascending: true });
  if (iroError) throw new Error(`iros query failed: ${iroError.message}`);
  if (!iroRows.length) return { iros: [] };

  const iroIds = iroRows.map((r) => r.id);

  const { data: assessorRows, error: arError } = await supabase
    .from('assessor_ratings')
    .select('iro_id, assessor_label, scale, scope, irreversibility, likelihood, magnitude, financial_likelihood, recorded_at')
    .in('iro_id', iroIds);
  if (arError) throw new Error(`assessor_ratings query failed: ${arError.message}`);

  const { data: calRows, error: calError } = await supabase
    .from('calibrations')
    .select('id, iro_id, owner, moderator, calibrated_value, notes, band_value, calibrated_at, signed_off_by, signed_off_at')
    .in('iro_id', iroIds);
  if (calError) throw new Error(`calibrations query failed: ${calError.message}`);

  const calibrationIds = calRows.map((c) => c.id);
  let historyRows = [];
  if (calibrationIds.length) {
    const { data, error } = await supabase
      .from('calibration_history')
      .select('id, calibration_id, from_value, to_value, notes, changed_by, changed_at')
      .in('calibration_id', calibrationIds)
      .order('changed_at', { ascending: true });
    if (error) throw new Error(`calibration_history query failed: ${error.message}`);
    historyRows = data;
  }

  const iros = iroRows.map((r) => {
    const assessments = assessorRows
      .filter((a) => a.iro_id === r.id)
      .map((a) => ({
        assessor: a.assessor_label,
        scale: a.scale,
        scope: a.scope,
        irreversibility: a.irreversibility,
        likelihood: a.likelihood,
        magnitude: a.magnitude,
        financialLikelihood: a.financial_likelihood,
      }));
    const calibration = calRows.find((c) => c.iro_id === r.id) ?? null;
    const history = calibration ? historyRows.filter((h) => h.calibration_id === calibration.id) : [];
    return {
      id: r.id,
      topic: r.esrs_topic_id,
      name: r.name,
      description: r.description,
      iroType: r.iro_type,
      actual: r.actual,
      impactThreshold: r.impact_threshold ?? 3.0,
      financialThreshold: r.financial_threshold ?? 3.0,
      sessionNotes: r.session_notes,
      assessments,
      calibration,
      calibrationHistory: history,
    };
  });

  return { iros };
}

// ---- Stakeholders: master map + who actually participated in this assessment ----
// Tool A's `ratings` table is protected (read-only for this tool per CLAUDE.md,
// and currently has no RLS SELECT policy for any role at all). Participation is
// derived instead from assessor_ratings.assessor_label, which this tool owns —
// see docs/supabase-setup.md "Ratings → assessor_ratings" note for why.

export async function fetchStakeholderMaster() {
  assertConfigured();
  const { data: groups, error: gError } = await supabase
    .from('stakeholder_groups')
    .select('id, name, perspectives, order')
    .order('order', { ascending: true });
  if (gError) throw new Error(`stakeholder_groups query failed: ${gError.message}`);

  const { data: members, error: mError } = await supabase
    .from('stakeholder_members')
    .select('id, group_id, name, role, company, email, pillars, expertise');
  if (mError) throw new Error(`stakeholder_members query failed: ${mError.message}`);

  return groups.map((g) => ({ ...g, members: members.filter((m) => m.group_id === g.id) }));
}

export function participationByGroup(iros) {
  const counts = new Map();
  for (const iro of iros) {
    for (const a of iro.assessments) {
      const label = a.assessor || 'Unspecified';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([group, ratingCount]) => ({ group, ratingCount })).sort((a, b) => b.ratingCount - a.ratingCount);
}

// ---- Calibration writes: append-only history, calculated value never deleted ----

async function ensureCalibrationRow(iroId, calibration) {
  if (calibration?.id) return calibration.id;
  const { data, error } = await supabase
    .from('calibrations')
    .insert({ iro_id: iroId, owner: '', moderator: '' })
    .select('id')
    .single();
  if (error) throw new Error(`calibrations insert failed: ${error.message}`);
  return data.id;
}

export async function saveCalibrationAdjustment({ iroId, calibration, fromValue, toValue, notes, changedBy }) {
  assertConfigured();
  const calibrationId = await ensureCalibrationRow(iroId, calibration);

  const { error: updateError } = await supabase
    .from('calibrations')
    .update({ calibrated_value: toValue, notes, calibrated_at: new Date().toISOString(), signed_off_by: null, signed_off_at: null })
    .eq('id', calibrationId);
  if (updateError) throw new Error(`calibrations update failed: ${updateError.message}`);

  const { error: historyError } = await supabase
    .from('calibration_history')
    .insert({ calibration_id: calibrationId, from_value: fromValue, to_value: toValue, notes, changed_by: changedBy });
  if (historyError) throw new Error(`calibration_history insert failed: ${historyError.message}`);

  return calibrationId;
}

export async function resetCalibrationToCalculated({ iroId, calibration, fromValue, changedBy }) {
  assertConfigured();
  const calibrationId = await ensureCalibrationRow(iroId, calibration);

  const { error: updateError } = await supabase
    .from('calibrations')
    .update({ calibrated_value: null, signed_off_by: null, signed_off_at: null })
    .eq('id', calibrationId);
  if (updateError) throw new Error(`calibrations update failed: ${updateError.message}`);

  const { error: historyError } = await supabase
    .from('calibration_history')
    .insert({ calibration_id: calibrationId, from_value: fromValue, to_value: null, notes: 'Reset to calculated value', changed_by: changedBy });
  if (historyError) throw new Error(`calibration_history insert failed: ${historyError.message}`);

  return calibrationId;
}

export async function updateCalibrationFields({ iroId, calibration, patch }) {
  assertConfigured();
  const calibrationId = await ensureCalibrationRow(iroId, calibration);
  const { error } = await supabase.from('calibrations').update(patch).eq('id', calibrationId);
  if (error) throw new Error(`calibrations update failed: ${error.message}`);
  return calibrationId;
}

export async function signOffCalibration({ iroId, calibration, signedOffBy }) {
  assertConfigured();
  const calibrationId = await ensureCalibrationRow(iroId, calibration);
  const { error } = await supabase
    .from('calibrations')
    .update({ signed_off_by: signedOffBy, signed_off_at: new Date().toISOString() })
    .eq('id', calibrationId);
  if (error) throw new Error(`calibrations update failed: ${error.message}`);
  return calibrationId;
}

export async function revokeCalibrationSignOff(calibrationId) {
  assertConfigured();
  const { error } = await supabase
    .from('calibrations')
    .update({ signed_off_by: null, signed_off_at: null })
    .eq('id', calibrationId);
  if (error) throw new Error(`calibrations update failed: ${error.message}`);
}

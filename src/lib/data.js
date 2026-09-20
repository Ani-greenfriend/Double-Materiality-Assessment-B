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

// ---- Assessments — joined to their cycle (thresholds, stage, ESRS version)
// and the cycle's client, since v2.0 organises everything under a cycle ----

export async function fetchAssessments() {
  assertConfigured();
  const { data, error } = await supabase
    .from('assessments')
    .select(`
      id, name, type, status, justification_mode, cycle_id, created_at,
      cycles ( id, name, esrs_version, stage, impact_threshold, financial_threshold, client_id, clients ( name ) )
    `)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`assessments query failed: ${error.message}`);
  return data.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    status: a.status,
    justificationMode: a.justification_mode,
    cycle: a.cycles
      ? {
          id: a.cycles.id,
          name: a.cycles.name,
          esrsVersion: a.cycles.esrs_version,
          stage: a.cycles.stage,
          impactThreshold: a.cycles.impact_threshold ?? 3.0,
          financialThreshold: a.cycles.financial_threshold ?? 3.0,
          clientName: a.cycles.clients?.name ?? null,
        }
      : null,
  }));
}

// ---- Dashboard: IROs + their submitted ratings (via combined_ratings),
// shaped for src/lib/calc.js. One "assessment row" (assessor) per submission —
// a submitted survey response or a finished live session — never per rating. ----

export async function fetchDashboard(assessmentId) {
  assertConfigured();

  const { data: iroRows, error: iroError } = await supabase
    .from('iros')
    .select('id, esrs_topic_id, name, description, iro_type, actual, time_horizon, potential_human_rights_impact, session_notes, order')
    .eq('assessment_id', assessmentId)
    .order('order', { ascending: true });
  if (iroError) throw new Error(`iros query failed: ${iroError.message}`);
  if (!iroRows.length) return { iros: [] };

  const iroIds = iroRows.map((r) => r.id);

  const { data: ratingRows, error: rError } = await supabase
    .from('combined_ratings')
    .select('submission_id, source, iro_id, criterion_key, value, justification, stakeholder_group, invitation_id, live_session_id')
    .eq('assessment_id', assessmentId);
  if (rError) throw new Error(`combined_ratings query failed: ${rError.message}`);

  const { data: calRows, error: calError } = await supabase
    .from('calibrations')
    .select('id, cycle_id, iro_id, owner, moderator, calibrated_value, notes, band_value, reviewed_with_owner, reviewed_with_owner_at, calibrated_at')
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

  // combined_ratings has one row per (submission, iro, criterion). Group into
  // one "assessment row" per (submission, iro) pair — that's one assessor's
  // rating of one IRO, the shape src/lib/calc.js expects.
  const assessmentRows = new Map(); // key: `${submission_id}:${iro_id}` -> row
  for (const r of ratingRows) {
    const key = `${r.submission_id}:${r.iro_id}`;
    if (!assessmentRows.has(key)) {
      assessmentRows.set(key, {
        submissionId: r.submission_id,
        source: r.source,
        stakeholderGroup: r.stakeholder_group,
        iroId: r.iro_id,
      });
    }
    assessmentRows.get(key)[r.criterion_key] = r.value;
  }

  const iros = iroRows.map((r) => {
    const assessments = [...assessmentRows.values()].filter((a) => a.iroId === r.id);
    const calibration = calRows.find((c) => c.iro_id === r.id) ?? null;
    const history = calibration ? historyRows.filter((h) => h.calibration_id === calibration.id) : [];
    return {
      id: r.id,
      topic: r.esrs_topic_id,
      name: r.name,
      description: r.description,
      iroType: r.iro_type,
      actual: r.actual,
      timeHorizon: r.time_horizon,
      potentialHumanRightsImpact: r.potential_human_rights_impact,
      sessionNotes: r.session_notes,
      assessments,
      calibration,
      calibrationHistory: history,
    };
  });

  return { iros };
}

// ---- Stakeholders: master map + who actually participated in this assessment ----

export async function fetchStakeholderMaster() {
  assertConfigured();
  const { data: groups, error: gError } = await supabase
    .from('stakeholder_groups')
    .select('id, name, type, perspectives, order')
    .order('order', { ascending: true });
  if (gError) throw new Error(`stakeholder_groups query failed: ${gError.message}`);

  const { data: members, error: mError } = await supabase
    .from('stakeholder_members')
    .select('id, group_id, name, role, company, email, pillars, expertise');
  if (mError) throw new Error(`stakeholder_members query failed: ${mError.message}`);

  return groups.map((g) => ({ ...g, members: members.filter((m) => m.group_id === g.id) }));
}

// One row per submission (assessor), grouped by the stakeholder group the
// expert chose or the live session was run under — not per individual rating.
export function participationByGroup(iros) {
  const seen = new Set();
  const counts = new Map();
  for (const iro of iros) {
    for (const a of iro.assessments) {
      const dedupeKey = a.submissionId;
      const label = a.stakeholderGroup || 'Unspecified';
      const seenKey = `${dedupeKey}:${label}`;
      if (seen.has(seenKey)) continue;
      seen.add(seenKey);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([group, submissionCount]) => ({ group, submissionCount })).sort((a, b) => b.submissionCount - a.submissionCount);
}

// ---- Calibration writes: append-only history, calculated value never deleted ----

async function ensureCalibrationRow(iroId, cycleId, calibration) {
  if (calibration?.id) return calibration.id;
  const { data, error } = await supabase
    .from('calibrations')
    .insert({ iro_id: iroId, cycle_id: cycleId, owner: '', moderator: '' })
    .select('id')
    .single();
  if (error) throw new Error(`calibrations insert failed: ${error.message}`);
  return data.id;
}

export async function saveCalibrationAdjustment({ iroId, cycleId, calibration, fromValue, toValue, notes, changedBy }) {
  assertConfigured();
  const calibrationId = await ensureCalibrationRow(iroId, cycleId, calibration);

  const { error: updateError } = await supabase
    .from('calibrations')
    .update({ calibrated_value: toValue, notes, calibrated_at: new Date().toISOString() })
    .eq('id', calibrationId);
  if (updateError) throw new Error(`calibrations update failed: ${updateError.message}`);

  const { error: historyError } = await supabase
    .from('calibration_history')
    .insert({ calibration_id: calibrationId, from_value: fromValue, to_value: toValue, notes, changed_by: changedBy });
  if (historyError) throw new Error(`calibration_history insert failed: ${historyError.message}`);

  return calibrationId;
}

export async function resetCalibrationToCalculated({ iroId, cycleId, calibration, fromValue, changedBy }) {
  assertConfigured();
  const calibrationId = await ensureCalibrationRow(iroId, cycleId, calibration);

  const { error: updateError } = await supabase
    .from('calibrations')
    .update({ calibrated_value: null })
    .eq('id', calibrationId);
  if (updateError) throw new Error(`calibrations update failed: ${updateError.message}`);

  const { error: historyError } = await supabase
    .from('calibration_history')
    .insert({ calibration_id: calibrationId, from_value: fromValue, to_value: null, notes: 'Reset to calculated value', changed_by: changedBy });
  if (historyError) throw new Error(`calibration_history insert failed: ${historyError.message}`);

  return calibrationId;
}

export async function updateCalibrationFields({ iroId, cycleId, calibration, patch }) {
  assertConfigured();
  const calibrationId = await ensureCalibrationRow(iroId, cycleId, calibration);
  const { error } = await supabase.from('calibrations').update(patch).eq('id', calibrationId);
  if (error) throw new Error(`calibrations update failed: ${error.message}`);
  return calibrationId;
}

// "Reviewed with owner" is a tick with a date per topic (Section 9) — it is
// not a sign-off; sign-off is cycle-level (Cycles and assessments overview,
// not built yet) and calibrations no longer carry their own sign-off columns.
export async function setReviewedWithOwner({ iroId, cycleId, calibration, reviewed }) {
  assertConfigured();
  const calibrationId = await ensureCalibrationRow(iroId, cycleId, calibration);
  const { error } = await supabase
    .from('calibrations')
    .update({ reviewed_with_owner: reviewed, reviewed_with_owner_at: reviewed ? new Date().toISOString() : null })
    .eq('id', calibrationId);
  if (error) throw new Error(`calibrations update failed: ${error.message}`);
  return calibrationId;
}

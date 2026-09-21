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

// ---- Clients + logo upload (Storage bucket `logos`, public-read) ----

export async function fetchClients() {
  assertConfigured();
  const { data, error } = await supabase.from('clients').select('id, name, logo_url').order('name', { ascending: true });
  if (error) throw new Error(`clients query failed: ${error.message}`);
  return data;
}

export async function createClient({ name }) {
  assertConfigured();
  const { data, error } = await supabase.from('clients').insert({ name }).select('id, name, logo_url').single();
  if (error) throw new Error(`clients insert failed: ${error.message}`);
  return data;
}

export async function uploadClientLogo(clientId, file) {
  assertConfigured();
  const ext = file.name.split('.').pop();
  const path = `clients/${clientId}/logo.${ext}`;
  const { error: upError } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
  if (upError) throw new Error(`logo upload failed: ${upError.message}`);
  const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
  const { error: updError } = await supabase.from('clients').update({ logo_url: urlData.publicUrl }).eq('id', clientId);
  if (updError) throw new Error(`clients update failed: ${updError.message}`);
  return urlData.publicUrl;
}

// ---- Cycles and assessments overview — cycles joined to their client, with
// each assessment's response summary (invitation status counts for surveys,
// live session status for live sessions, submission counts for both) ----

export async function fetchCycles() {
  assertConfigured();
  const { data: cycles, error: cError } = await supabase
    .from('cycles')
    .select(`
      id, client_id, name, financial_year, esrs_version, stage,
      impact_threshold, financial_threshold, baseline_impact_threshold, baseline_financial_threshold,
      require_both_sources, silent_stakeholders_considered, silent_stakeholders_note,
      approver_name, approver_role, minutes_reference, signed_off_at, created_at,
      clients ( id, name, logo_url )
    `)
    .order('created_at', { ascending: false });
  if (cError) throw new Error(`cycles query failed: ${cError.message}`);
  if (!cycles.length) return [];

  const cycleIds = cycles.map((c) => c.id);
  const { data: assessments, error: aError } = await supabase
    .from('assessments')
    .select('id, cycle_id, name, slug, type, status, justification_mode, created_at')
    .in('cycle_id', cycleIds)
    .order('created_at', { ascending: true });
  if (aError) throw new Error(`assessments query failed: ${aError.message}`);

  const assessmentIds = assessments.map((a) => a.id);
  let invitations = [];
  let liveSessions = [];
  let submissions = [];
  if (assessmentIds.length) {
    const [invRes, lsRes, subRes] = await Promise.all([
      supabase.from('invitations').select('assessment_id, status').in('assessment_id', assessmentIds),
      supabase.from('live_sessions').select('id, assessment_id, status, facilitator, started_at, finished_at').in('assessment_id', assessmentIds),
      supabase.from('submissions').select('id, assessment_id, source, status').in('assessment_id', assessmentIds),
    ]);
    if (invRes.error) throw new Error(`invitations query failed: ${invRes.error.message}`);
    if (lsRes.error) throw new Error(`live_sessions query failed: ${lsRes.error.message}`);
    if (subRes.error) throw new Error(`submissions query failed: ${subRes.error.message}`);
    invitations = invRes.data;
    liveSessions = lsRes.data;
    submissions = subRes.data;
  }

  const assessmentsWithDetail = assessments.map((a) => {
    const invitationStatusCounts = invitations
      .filter((i) => i.assessment_id === a.id)
      .reduce((acc, i) => ({ ...acc, [i.status]: (acc[i.status] ?? 0) + 1 }), {});
    const liveSession = liveSessions.find((s) => s.assessment_id === a.id) ?? null;
    const ownSubmissions = submissions.filter((s) => s.assessment_id === a.id);
    return {
      id: a.id,
      cycleId: a.cycle_id,
      name: a.name,
      slug: a.slug,
      type: a.type,
      status: a.status,
      justificationMode: a.justification_mode,
      createdAt: a.created_at,
      invitationStatusCounts,
      liveSession,
      draftCount: ownSubmissions.filter((s) => s.status === 'draft').length,
      submittedCount: ownSubmissions.filter((s) => s.status === 'submitted').length,
      hasAnyResponse: ownSubmissions.length > 0,
    };
  });

  return cycles.map((c) => {
    const cycleAssessments = assessmentsWithDetail.filter((a) => a.cycleId === c.id);
    const submittedSources = new Set(
      submissions.filter((s) => cycleAssessments.some((a) => a.id === s.assessment_id) && s.status === 'submitted').map((s) => s.source)
    );
    return {
      id: c.id,
      clientId: c.client_id,
      clientName: c.clients?.name ?? null,
      clientLogoUrl: c.clients?.logo_url ?? null,
      name: c.name,
      financialYear: c.financial_year,
      esrsVersion: c.esrs_version,
      stage: c.stage,
      impactThreshold: c.impact_threshold,
      financialThreshold: c.financial_threshold,
      baselineImpactThreshold: c.baseline_impact_threshold,
      baselineFinancialThreshold: c.baseline_financial_threshold,
      requireBothSources: c.require_both_sources,
      silentStakeholdersConsidered: c.silent_stakeholders_considered,
      silentStakeholdersNote: c.silent_stakeholders_note,
      approverName: c.approver_name,
      approverRole: c.approver_role,
      minutesReference: c.minutes_reference,
      signedOffAt: c.signed_off_at,
      createdAt: c.created_at,
      assessments: cycleAssessments,
      submittedSources,
      hasAnyDraft: cycleAssessments.some((a) => a.draftCount > 0),
    };
  });
}

export async function createCycle({
  clientId,
  name,
  financialYear,
  esrsVersion,
  impactThreshold,
  financialThreshold,
  createdBy,
}) {
  assertConfigured();
  const { data, error } = await supabase
    .from('cycles')
    .insert({
      client_id: clientId,
      name,
      financial_year: financialYear,
      esrs_version: esrsVersion,
      impact_threshold: impactThreshold,
      financial_threshold: financialThreshold,
      baseline_impact_threshold: impactThreshold,
      baseline_financial_threshold: financialThreshold,
      created_by: createdBy,
    })
    .select('id')
    .single();
  if (error) throw new Error(`cycles insert failed: ${error.message}`);
  return data.id;
}

export async function startCalibration(cycleId) {
  assertConfigured();
  const { error } = await supabase.from('cycles').update({ stage: 'calibrating' }).eq('id', cycleId);
  if (error) throw new Error(`cycles update failed: ${error.message}`);
}

export async function signOffCycle({ cycleId, approverName, approverRole, minutesReference, recordedBy }) {
  assertConfigured();
  const { error } = await supabase
    .from('cycles')
    .update({
      stage: 'signed_off',
      approver_name: approverName,
      approver_role: approverRole,
      minutes_reference: minutesReference || null,
      signed_off_at: new Date().toISOString(),
      signed_off_recorded_by: recordedBy,
    })
    .eq('id', cycleId);
  if (error) throw new Error(`cycles update failed: ${error.message}`);
}

export async function revokeCycleSignOff(cycleId) {
  assertConfigured();
  const { error } = await supabase
    .from('cycles')
    .update({ stage: 'calibrating', signed_off_at: null, signed_off_recorded_by: null })
    .eq('id', cycleId);
  if (error) throw new Error(`cycles update failed: ${error.message}`);
}

// RLS-gated: only succeeds when no response exists anywhere in the cycle
// (see docs/supabase-setup.md — "authenticated delete cycles without responses").
export async function deleteCycle(cycleId) {
  assertConfigured();
  const { error } = await supabase.from('cycles').delete().eq('id', cycleId);
  if (error) throw new Error(`cycles delete failed: ${error.message}`);
}

// RLS-gated: only succeeds when the assessment has no submissions at all
// (see docs/supabase-setup.md — "authenticated delete assessments without responses").
export async function deleteAssessment(assessmentId) {
  assertConfigured();
  const { error } = await supabase.from('assessments').delete().eq('id', assessmentId);
  if (error) throw new Error(`assessments delete failed: ${error.message}`);
}

// Deletes every DRAFT submission across a cycle's assessments (ratings and
// topic_justifications cascade automatically). RLS-gated to draft rows in a
// Calibrating or Signed off cycle only — submitted rows are never touched.
export async function purgeUnfinishedDrafts(cycleId) {
  assertConfigured();
  const { data: assessments, error: aError } = await supabase.from('assessments').select('id').eq('cycle_id', cycleId);
  if (aError) throw new Error(`assessments query failed: ${aError.message}`);
  const assessmentIds = assessments.map((a) => a.id);
  if (!assessmentIds.length) return;
  const { error } = await supabase.from('submissions').delete().eq('status', 'draft').in('assessment_id', assessmentIds);
  if (error) throw new Error(`submissions delete failed: ${error.message}`);
}

// ---- Topic library — read-only count for the Dashboard until Topics admin is built ----

export async function fetchTopicLibraryCount(esrsVersion) {
  assertConfigured();
  const { count, error } = await supabase
    .from('topic_library')
    .select('id', { count: 'exact', head: true })
    .eq('esrs_version', esrsVersion);
  if (error) throw new Error(`topic_library count failed: ${error.message}`);
  return count ?? 0;
}

// The library rows a new assessment snapshots into its own iros, filtered
// by perspective (impact = neg/pos impact IROs, financial = risk/
// opportunity), ESRS version and client (shared master topics have
// client_id null; client-specific ones must match) — Section 8's New
// assessment "Review & customise" step.
const IMPACT_IRO_TYPES = ['neg_impact', 'pos_impact'];

export async function fetchTopicLibraryForSnapshot({ esrsVersion, clientId, perspective }) {
  assertConfigured();
  const { data, error } = await supabase
    .from('topic_library')
    .select('id, iro_type, esrs_topic_id, esrs_subtopic, short_title, description, actual, value_chain, time_horizon, potential_human_rights_impact, client_id, reference_code')
    .eq('esrs_version', esrsVersion)
    .order('esrs_topic_id', { ascending: true });
  if (error) throw new Error(`topic_library query failed: ${error.message}`);
  return data
    .filter((t) => t.client_id === null || t.client_id === clientId)
    .filter((t) => {
      if (perspective === 'impact') return IMPACT_IRO_TYPES.includes(t.iro_type);
      if (perspective === 'financial') return !IMPACT_IRO_TYPES.includes(t.iro_type);
      return true;
    });
}

// ---- New assessment: create the row, then snapshot chosen topics into iros ----

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'assessment';
}

export async function createAssessment({
  cycleId,
  type,
  perspectiveFilter,
  name,
  description,
  startDate,
  endDate,
  welcomeText,
  taskText,
  justificationMode,
  mandatory,
  createdBy,
}) {
  assertConfigured();
  const slug = `${slugify(name)}-${crypto.randomUUID().slice(0, 8)}`;
  const { data, error } = await supabase
    .from('assessments')
    .insert({
      cycle_id: cycleId,
      type,
      perspective_filter: perspectiveFilter,
      name,
      description: description || null,
      start_date: startDate || null,
      end_date: endDate || null,
      welcome_text: welcomeText || null,
      task_text: taskText || null,
      justification_mode: justificationMode,
      mandatory,
      slug,
      status: 'active',
      created_by: createdBy,
    })
    .select('id, slug')
    .single();
  if (error) throw new Error(`assessments insert failed: ${error.message}`);
  return data;
}

export async function snapshotTopicsIntoIros(assessmentId, topics) {
  assertConfigured();
  if (!topics.length) return;
  const rows = topics.map((t, idx) => ({
    assessment_id: assessmentId,
    topic_library_id: t.id,
    esrs_topic_id: t.esrs_topic_id,
    name: t.short_title,
    description: t.description,
    iro_type: t.iro_type,
    actual: t.actual,
    time_horizon: t.time_horizon,
    potential_human_rights_impact: t.potential_human_rights_impact,
    order: idx,
  }));
  const { error } = await supabase.from('iros').insert(rows);
  if (error) throw new Error(`iros insert failed: ${error.message}`);
}

// ---- Invitations (expert survey) ----

// Tool A's site address — not a secret (it's a public URL), so it's a
// hardcoded default here rather than a required env var like the Supabase
// ones; VITE_TOOL_A_URL can override it if Tool A's domain ever changes.
const TOOL_A_URL = import.meta.env.VITE_TOOL_A_URL || 'https://questionnaire-dma.netlify.app';

export function buildPersonalLink(slug, linkCode) {
  return `${TOOL_A_URL.replace(/\/$/, '')}/survey/${slug}/${linkCode}`;
}

export async function fetchInvitations(assessmentId) {
  assertConfigured();
  const { data, error } = await supabase
    .from('invitations')
    .select('id, assessment_id, name, email, stakeholder_group_id, link_code, status, sent_at, opened_at, submitted_at, anonymised_at, created_at, stakeholder_groups ( name )')
    .eq('assessment_id', assessmentId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`invitations query failed: ${error.message}`);
  return data.map((i) => ({
    id: i.id,
    assessmentId: i.assessment_id,
    name: i.name,
    email: i.email,
    stakeholderGroupId: i.stakeholder_group_id,
    groupName: i.stakeholder_groups?.name ?? null,
    linkCode: i.link_code,
    status: i.status,
    sentAt: i.sent_at,
    openedAt: i.opened_at,
    submittedAt: i.submitted_at,
    anonymisedAt: i.anonymised_at,
    createdAt: i.created_at,
  }));
}

function generateLinkCode() {
  return crypto.randomUUID().replace(/-/g, '');
}

export async function createInvitation({ assessmentId, name, email, stakeholderGroupId }) {
  assertConfigured();
  const { error } = await supabase
    .from('invitations')
    .insert({ assessment_id: assessmentId, name, email, stakeholder_group_id: stakeholderGroupId, link_code: generateLinkCode() });
  if (error) throw new Error(`invitations insert failed: ${error.message}`);
}

export async function updateInvitation(id, patch) {
  assertConfigured();
  const { error } = await supabase.from('invitations').update(patch).eq('id', id);
  if (error) throw new Error(`invitations update failed: ${error.message}`);
}

// RLS-gated: only succeeds before the invitee has opened the link.
export async function deleteInvitation(id) {
  assertConfigured();
  const { error } = await supabase.from('invitations').delete().eq('id', id);
  if (error) throw new Error(`invitations delete failed: ${error.message}`);
}

export async function markInvitationSent(id) {
  return updateInvitation(id, { sent_at: new Date().toISOString() });
}

// name/email are NOT NULL on invitations — anonymising replaces them with a
// placeholder rather than clearing to null (Section 7's deletion mechanism).
export async function anonymiseInvitation(id) {
  return updateInvitation(id, { name: 'Anonymised', email: 'anonymised@invalid', anonymised_at: new Date().toISOString() });
}

// ---- Participants (expert live session) ----

async function ensureLiveSession(assessmentId, facilitator) {
  const { data: existing, error: selError } = await supabase
    .from('live_sessions')
    .select('id, status, facilitator, started_at, finished_at')
    .eq('assessment_id', assessmentId)
    .maybeSingle();
  if (selError) throw new Error(`live_sessions query failed: ${selError.message}`);
  if (existing) return existing;
  const { data, error } = await supabase
    .from('live_sessions')
    .insert({ assessment_id: assessmentId, facilitator: facilitator || null })
    .select('id, status, facilitator, started_at, finished_at')
    .single();
  if (error) throw new Error(`live_sessions insert failed: ${error.message}`);
  return data;
}

export async function fetchLiveSessionWithParticipants(assessmentId) {
  assertConfigured();
  const liveSession = await ensureLiveSession(assessmentId, null);
  const { data: participants, error } = await supabase
    .from('live_session_participants')
    .select('id, live_session_id, name, expertise, represents_group_id, removed_at, removed_reason')
    .eq('live_session_id', liveSession.id)
    .order('name', { ascending: true });
  if (error) throw new Error(`live_session_participants query failed: ${error.message}`);
  return { liveSession, participants };
}

export async function setLiveSessionFacilitator(liveSessionId, facilitator) {
  assertConfigured();
  const { error } = await supabase.from('live_sessions').update({ facilitator }).eq('id', liveSessionId);
  if (error) throw new Error(`live_sessions update failed: ${error.message}`);
}

export async function addParticipant({ liveSessionId, name, expertise, representsGroupId, changedBy }) {
  assertConfigured();
  const { data, error } = await supabase
    .from('live_session_participants')
    .insert({ live_session_id: liveSessionId, name, expertise, represents_group_id: representsGroupId || null })
    .select('id')
    .single();
  if (error) throw new Error(`live_session_participants insert failed: ${error.message}`);
  const { error: logError } = await supabase
    .from('attendance_edit_log')
    .insert({ live_session_id: liveSessionId, participant_id: data.id, action: 'added', changed_by: changedBy });
  if (logError) throw new Error(`attendance_edit_log insert failed: ${logError.message}`);
  return data.id;
}

export async function editParticipant({ liveSessionId, participantId, patch, changedBy }) {
  assertConfigured();
  const { error } = await supabase.from('live_session_participants').update(patch).eq('id', participantId);
  if (error) throw new Error(`live_session_participants update failed: ${error.message}`);
  const { error: logError } = await supabase
    .from('attendance_edit_log')
    .insert({ live_session_id: liveSessionId, participant_id: participantId, action: 'edited', changed_by: changedBy });
  if (logError) throw new Error(`attendance_edit_log insert failed: ${logError.message}`);
}

export async function removeParticipant({ liveSessionId, participantId, reason, changedBy }) {
  assertConfigured();
  const { error } = await supabase
    .from('live_session_participants')
    .update({ removed_at: new Date().toISOString(), removed_reason: reason || null })
    .eq('id', participantId);
  if (error) throw new Error(`live_session_participants update failed: ${error.message}`);
  const { error: logError } = await supabase
    .from('attendance_edit_log')
    .insert({ live_session_id: liveSessionId, participant_id: participantId, action: 'removed', reason: reason || null, changed_by: changedBy });
  if (logError) throw new Error(`attendance_edit_log insert failed: ${logError.message}`);
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

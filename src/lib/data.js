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

// ---- Practice settings — one row, the consultant's own logo for the report cover ----

export async function fetchPracticeSettings() {
  assertConfigured();
  const { data, error } = await supabase.from('practice_settings').select('id, consultant_logo_url').limit(1).maybeSingle();
  if (error) throw new Error(`practice_settings query failed: ${error.message}`);
  return data ?? { id: null, consultant_logo_url: null };
}

export async function uploadConsultantLogo(file) {
  assertConfigured();
  const existing = await fetchPracticeSettings();
  const ext = file.name.split('.').pop();
  const path = `practice/logo.${ext}`;
  const { error: upError } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
  if (upError) throw new Error(`logo upload failed: ${upError.message}`);
  const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
  if (existing.id) {
    const { error } = await supabase.from('practice_settings').update({ consultant_logo_url: urlData.publicUrl }).eq('id', existing.id);
    if (error) throw new Error(`practice_settings update failed: ${error.message}`);
  } else {
    const { error } = await supabase.from('practice_settings').insert({ consultant_logo_url: urlData.publicUrl });
    if (error) throw new Error(`practice_settings insert failed: ${error.message}`);
  }
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
    .select('id, cycle_id, name, slug, type, status, justification_mode, end_date, created_at')
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
      endDate: a.end_date,
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

// ---- Cycles — v2.0 amended 6: never shown in the interface. A cycle is
// created automatically with the first assessment of a financial year, and
// every later assessment of the same year joins it. One client is assumed
// (CLAUDE.md's access model: "acceptable with one client and one user") —
// there is no client-picker UI any more, so the single existing client row
// is reused, or a placeholder one is created the first time this runs. ----

async function getOrCreateDefaultClient() {
  const { data: existing, error: selError } = await supabase
    .from('clients')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1);
  if (selError) throw new Error(`clients query failed: ${selError.message}`);
  if (existing.length) return existing[0].id;
  const { data: created, error: insError } = await supabase.from('clients').insert({ name: 'Client' }).select('id').single();
  if (insError) throw new Error(`clients insert failed: ${insError.message}`);
  return created.id;
}

// Read-only lookup for the wizard's General info step: whether this
// financial year already has a cycle, so the ESRS version field can be
// shown read-only (pre-filled) instead of editable. Never creates a row.
export async function findCycleForFinancialYear(financialYear) {
  assertConfigured();
  const { data, error } = await supabase
    .from('cycles')
    .select('id, client_id, esrs_version, impact_threshold, financial_threshold, stage')
    .eq('financial_year', financialYear)
    .maybeSingle();
  if (error) throw new Error(`cycles query failed: ${error.message}`);
  if (!data) return null;
  return { id: data.id, clientId: data.client_id, esrsVersion: data.esrs_version, impactThreshold: data.impact_threshold, financialThreshold: data.financial_threshold, stage: data.stage };
}

// Called when an assessment is actually created: finds the cycle for this
// financial year, or creates one (with the default client, baseline
// thresholds 3.0/3.0) if this is the year's first assessment.
export async function getOrCreateCycleForFinancialYear({ financialYear, esrsVersion, createdBy }) {
  assertConfigured();
  const existing = await findCycleForFinancialYear(financialYear);
  if (existing) return existing;

  const clientId = await getOrCreateDefaultClient();
  const { data, error } = await supabase
    .from('cycles')
    .insert({
      client_id: clientId,
      name: `DMA ${financialYear}`,
      financial_year: financialYear,
      esrs_version: esrsVersion,
      impact_threshold: 3.0,
      financial_threshold: 3.0,
      baseline_impact_threshold: 3.0,
      baseline_financial_threshold: 3.0,
      created_by: createdBy,
    })
    .select('id, client_id, esrs_version, impact_threshold, financial_threshold, stage')
    .single();
  if (error) throw new Error(`cycles insert failed: ${error.message}`);
  return { id: data.id, clientId: data.client_id, esrsVersion: data.esrs_version, impactThreshold: data.impact_threshold, financialThreshold: data.financial_threshold, stage: data.stage };
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

export async function setRequireBothSources(cycleId, value) {
  assertConfigured();
  const { error } = await supabase.from('cycles').update({ require_both_sources: value }).eq('id', cycleId);
  if (error) throw new Error(`cycles update failed: ${error.message}`);
}

// Section 8 business rule: thresholds are editable only in the Calibrating
// stage, via Apply with a reason logged to threshold_changes (append-only —
// never updated or deleted). One history row per axis that actually
// changed, so a same-value re-apply on one axis doesn't pollute the other's
// trail.
export async function updateCycleThresholds({ cycleId, oldImpact, newImpact, oldFinancial, newFinancial, reason, changedBy }) {
  assertConfigured();
  const { error } = await supabase
    .from('cycles')
    .update({ impact_threshold: newImpact, financial_threshold: newFinancial })
    .eq('id', cycleId);
  if (error) throw new Error(`cycles update failed: ${error.message}`);

  const rows = [];
  if (newImpact !== oldImpact) rows.push({ cycle_id: cycleId, axis: 'impact', old_value: oldImpact, new_value: newImpact, reason, changed_by: changedBy });
  if (newFinancial !== oldFinancial) rows.push({ cycle_id: cycleId, axis: 'financial', old_value: oldFinancial, new_value: newFinancial, reason, changed_by: changedBy });
  if (rows.length) {
    const { error: historyError } = await supabase.from('threshold_changes').insert(rows);
    if (historyError) throw new Error(`threshold_changes insert failed: ${historyError.message}`);
  }
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
// Refused (RLS) once the assessment has any submitted response — draft
// submissions, their ratings/justifications, and any live-session data are
// deleted along with it via ON DELETE CASCADE, no separate cleanup needed
// here. A refusal returns 0 rows, not an error (RLS-filtered deletes never
// throw), so this checks the returned row itself rather than trusting a
// missing `error` to mean success — a silent no-op here would be exactly
// the "fails silently" bug this replaces.
export async function deleteAssessment(assessmentId) {
  assertConfigured();
  const { data, error } = await supabase.from('assessments').delete().eq('id', assessmentId).select('id');
  if (error) throw new Error(`assessments delete failed: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error("This assessment has submitted responses and can't be deleted, to keep the audit trail.");
  }
}

// Deletes every DRAFT submission across a cycle's assessments (ratings and
// topic_justifications cascade automatically). RLS-gated to draft rows in a
// Calibrating or Signed off cycle only — submitted rows are never touched.
// Section 8, Responses screen: "Delete unfinished drafts on the Expert
// survey panel... available once the assessment is Closed or Completed" —
// per-assessment now, not per-round; RLS enforces the same Closed/
// Completed condition server-side (migration
// v2_delete_drafts_by_assessment_status), so this only ever succeeds when
// it should regardless of what the UI thinks the status is.
export async function purgeUnfinishedDrafts(assessmentId) {
  assertConfigured();
  const { error } = await supabase.from('submissions').delete().eq('status', 'draft').eq('assessment_id', assessmentId);
  if (error) throw new Error(`submissions delete failed: ${error.message}`);
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

// Tool A's site address — required env var, never hardcoded (resolves
// product-spec.md Section 15's open question on how this tool knows it).
const SURVEY_BASE_URL = import.meta.env.VITE_SURVEY_BASE_URL;

export function buildPersonalLink(slug, linkCode) {
  if (!SURVEY_BASE_URL) throw new Error('VITE_SURVEY_BASE_URL is not set — cannot build a personal link.');
  return `${SURVEY_BASE_URL.replace(/\/$/, '')}/survey/${slug}/${linkCode}`;
}

export async function fetchInvitations(assessmentId) {
  assertConfigured();
  const { data, error } = await supabase
    .from('invitations')
    .select('id, assessment_id, name, email, stakeholder_group_id, stakeholder_member_id, link_code, status, sent_at, opened_at, submitted_at, anonymised_at, created_at, stakeholder_groups ( name )')
    .eq('assessment_id', assessmentId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`invitations query failed: ${error.message}`);
  return data.map((i) => ({
    id: i.id,
    assessmentId: i.assessment_id,
    name: i.name,
    email: i.email,
    stakeholderGroupId: i.stakeholder_group_id,
    stakeholderMemberId: i.stakeholder_member_id,
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

export async function createInvitation({ assessmentId, name, email, stakeholderGroupId, stakeholderMemberId }) {
  assertConfigured();
  const { error } = await supabase
    .from('invitations')
    .insert({ assessment_id: assessmentId, name, email, stakeholder_group_id: stakeholderGroupId, stakeholder_member_id: stakeholderMemberId || null, link_code: generateLinkCode() });
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
    .select('id, live_session_id, name, expertise, represents_group_id, stakeholder_member_id, removed_at, removed_reason')
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

export async function addParticipant({ liveSessionId, name, expertise, representsGroupId, stakeholderMemberId, changedBy }) {
  assertConfigured();
  const { data, error } = await supabase
    .from('live_session_participants')
    .insert({ live_session_id: liveSessionId, name, expertise, represents_group_id: representsGroupId || null, stakeholder_member_id: stakeholderMemberId || null })
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

  // topic_library ( esrs_subtopic ) is an embedded read through the existing
  // nullable topic_library_id FK, not a schema change — iros itself has no
  // subtopic column of its own (subtopic_raw was retired, see
  // supabase-setup.md), but every IRO snapshotted from the topic library
  // (snapshotTopicsIntoIros) already carries the FK, so the real ESRS/custom
  // subtopic text is one join away for anything created the normal way. An
  // IRO with no topic_library_id (none currently, but the FK is nullable)
  // just comes back with subtopic: null and falls back to its ESRS topic.
  const { data: iroRows, error: iroError } = await supabase
    .from('iros')
    .select('id, esrs_topic_id, name, description, iro_type, actual, time_horizon, potential_human_rights_impact, session_notes, order, topic_library_id, topic_library:topic_library_id ( esrs_subtopic )')
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
    .select('id, cycle_id, iro_id, owner, moderator, calibrated_value, notes, band_value, reviewed_with_owner, reviewed_with_owner_at, reviewed_with_owner_by, calibrated_at')
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
      subtopic: r.topic_library?.esrs_subtopic || null,
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

// Same shape as fetchDashboard's iros, but across every assessment in a
// cycle rather than one — what the restored prototype Dashboard needs for
// its "Assessment of impact/financial topics" and "Calibration" progress
// cards (Section 8: App shell and navigation). Also returns a calibrations
// map keyed by iro id, `{ [iroId]: { calibratedAt, ... } }`, matching the
// prototype's original in-memory shape exactly (Dashboard.jsx only reads
// `.calibratedAt`).
export async function fetchCycleIros(cycleId) {
  assertConfigured();

  const { data: assessmentRows, error: aError } = await supabase
    .from('assessments')
    .select('id')
    .eq('cycle_id', cycleId);
  if (aError) throw new Error(`assessments query failed: ${aError.message}`);
  const assessmentIds = assessmentRows.map((a) => a.id);
  if (!assessmentIds.length) return { iros: [], calibrations: {} };

  const { data: iroRows, error: iroError } = await supabase
    .from('iros')
    .select('id, assessment_id, esrs_topic_id, name, description, iro_type, actual, time_horizon, potential_human_rights_impact, session_notes, order')
    .in('assessment_id', assessmentIds)
    .order('order', { ascending: true });
  if (iroError) throw new Error(`iros query failed: ${iroError.message}`);
  if (!iroRows.length) return { iros: [], calibrations: {} };

  const { data: ratingRows, error: rError } = await supabase
    .from('combined_ratings')
    .select('submission_id, source, iro_id, criterion_key, value, justification, stakeholder_group, invitation_id, live_session_id')
    .in('assessment_id', assessmentIds);
  if (rError) throw new Error(`combined_ratings query failed: ${rError.message}`);

  const { data: calRows, error: calError } = await supabase
    .from('calibrations')
    .select('id, cycle_id, iro_id, owner, moderator, calibrated_value, notes, band_value, reviewed_with_owner, reviewed_with_owner_at, reviewed_with_owner_by, calibrated_at')
    .eq('cycle_id', cycleId);
  if (calError) throw new Error(`calibrations query failed: ${calError.message}`);

  const assessmentRowsByKey = new Map();
  for (const r of ratingRows) {
    const key = `${r.submission_id}:${r.iro_id}`;
    if (!assessmentRowsByKey.has(key)) {
      assessmentRowsByKey.set(key, { submissionId: r.submission_id, source: r.source, stakeholderGroup: r.stakeholder_group, iroId: r.iro_id });
    }
    assessmentRowsByKey.get(key)[r.criterion_key] = r.value;
  }

  const iros = iroRows.map((r) => ({
    id: r.id,
    topic: r.esrs_topic_id,
    name: r.name,
    description: r.description,
    iroType: r.iro_type,
    actual: r.actual,
    timeHorizon: r.time_horizon,
    potentialHumanRightsImpact: r.potential_human_rights_impact,
    sessionNotes: r.session_notes,
    assessments: [...assessmentRowsByKey.values()].filter((a) => a.iroId === r.id),
    calibration: calRows.find((c) => c.iro_id === r.id) ?? null,
  }));

  // Dashboard.jsx (ported verbatim) treats calibratedAt as a Date.now()-style
  // epoch-ms number, matching how the prototype always set it locally —
  // convert from the DB's ISO timestamp rather than changing the component.
  const calibrations = {};
  for (const iro of iros) {
    if (iro.calibration?.calibrated_at) {
      calibrations[iro.id] = { calibratedAt: new Date(iro.calibration.calibrated_at).getTime(), calibratedValue: iro.calibration.calibrated_value };
    }
  }

  return { iros, calibrations };
}

// ---- Responses screen (Section 8) — assessment_progress, group_engagement
// and iro_comments are the three new read-only views this screen reads
// from, plus fetchCycleIros (above) for the IRO ratings table's per-source
// scores, which calc.js's aggregateIro already breaks out (surveyAvg,
// sessionAvg, sourceBasis, sourceGap) — no separate scoring logic needed
// here. ----

export async function fetchResponsesData(cycleId) {
  assertConfigured();
  const { data: assessments, error: aError } = await supabase
    .from('assessments')
    .select('id, name, type, slug, perspective_filter, status, start_date, end_date')
    .eq('cycle_id', cycleId);
  if (aError) throw new Error(`assessments query failed: ${aError.message}`);
  const assessmentIds = assessments.map((a) => a.id);

  if (!assessmentIds.length) {
    return { assessments: [], progress: [], groupEngagement: [], iros: [], calibrations: {} };
  }

  const [progressRes, groupEngRes, cycleIros] = await Promise.all([
    supabase.from('assessment_progress').select('*').in('assessment_id', assessmentIds),
    supabase.from('group_engagement').select('*').in('assessment_id', assessmentIds),
    fetchCycleIros(cycleId),
  ]);
  if (progressRes.error) throw new Error(`assessment_progress query failed: ${progressRes.error.message}`);
  if (groupEngRes.error) throw new Error(`group_engagement query failed: ${groupEngRes.error.message}`);

  return {
    assessments: assessments.map((a) => ({
      id: a.id, name: a.name, type: a.type, slug: a.slug,
      perspectiveFilter: a.perspective_filter, status: a.status, startDate: a.start_date, endDate: a.end_date,
    })),
    progress: progressRes.data,
    groupEngagement: groupEngRes.data,
    ...cycleIros,
  };
}

// Lazy per-IRO fetch for the detail panel — every submitted per-criterion
// or per-topic justification tied to this IRO, source/group/expertise only
// (never the invitee's name — that's a separate opt-in lookup below).
export async function fetchIroComments(iroId) {
  assertConfigured();
  const { data, error } = await supabase.from('iro_comments').select('*').eq('iro_id', iroId).order('commented_at', { ascending: false });
  if (error) throw new Error(`iro_comments query failed: ${error.message}`);
  return data;
}

// "Reveal name" — only meaningful for a survey comment (one named
// invitee); a live session's rating comes from the whole group, not one
// person, so there's no single name to reveal there.
export async function fetchInvitationName(invitationId) {
  assertConfigured();
  const { data, error } = await supabase.from('invitations').select('name').eq('id', invitationId).single();
  if (error) throw new Error(`invitations query failed: ${error.message}`);
  return data.name;
}

// ---- Report builder (Section 8) — everything the six report sections
// need, assembled in one call. Reuses fetchCycleIros for the IRO/topic
// data (same aggregateIro/aggregateTopic math the console already uses),
// and the Responses screen's assessment_progress/group_engagement views
// for Section 3 (Engagement). Adds what neither already carries:
// calibration_history per IRO (fetchCycleIros/fetchDashboard don't
// include it — only fetchDashboard's single-assessment version does),
// threshold_changes for the whole cycle, live session facilitator/dates,
// attendees, and submitted responses (basis_for_representation for silent
// stakeholders, overall_comment for the appendix). ----
export async function fetchReportData(cycleId) {
  assertConfigured();
  const { data: assessments, error: aError } = await supabase
    .from('assessments')
    .select('id, name, type, slug, perspective_filter, status, start_date, end_date')
    .eq('cycle_id', cycleId);
  if (aError) throw new Error(`assessments query failed: ${aError.message}`);
  const assessmentIds = assessments.map((a) => a.id);

  const [cycleIros, progressRes, groupEngRes, thresholdChangesRes, liveSessionsRes, submissionsRes, ratingsRes] = await Promise.all([
    fetchCycleIros(cycleId),
    assessmentIds.length ? supabase.from('assessment_progress').select('*').in('assessment_id', assessmentIds) : Promise.resolve({ data: [] }),
    assessmentIds.length ? supabase.from('group_engagement').select('*').in('assessment_id', assessmentIds) : Promise.resolve({ data: [] }),
    supabase.from('threshold_changes').select('*').eq('cycle_id', cycleId).order('changed_at', { ascending: true }),
    assessmentIds.length ? supabase.from('live_sessions').select('id, assessment_id, facilitator, started_at, finished_at, status').in('assessment_id', assessmentIds) : Promise.resolve({ data: [] }),
    assessmentIds.length ? supabase.from('submissions').select('id, assessment_id, source, stakeholder_group, expertise_topics, title, basis_for_representation, overall_comment, invitation_id, live_session_id, submitted_at').in('assessment_id', assessmentIds).eq('status', 'submitted') : Promise.resolve({ data: [] }),
    assessmentIds.length ? supabase.from('combined_ratings').select('submission_id, source, iro_id, criterion_key, value, justification, stakeholder_group').in('assessment_id', assessmentIds) : Promise.resolve({ data: [] }),
  ]);
  if (progressRes.error) throw new Error(`assessment_progress query failed: ${progressRes.error.message}`);
  if (groupEngRes.error) throw new Error(`group_engagement query failed: ${groupEngRes.error.message}`);
  if (thresholdChangesRes.error) throw new Error(`threshold_changes query failed: ${thresholdChangesRes.error.message}`);
  if (liveSessionsRes.error) throw new Error(`live_sessions query failed: ${liveSessionsRes.error.message}`);
  if (submissionsRes.error) throw new Error(`submissions query failed: ${submissionsRes.error.message}`);
  if (ratingsRes.error) throw new Error(`combined_ratings query failed: ${ratingsRes.error.message}`);

  const calibrationIds = cycleIros.iros.map((i) => i.calibration?.id).filter(Boolean);
  let historyRows = [];
  if (calibrationIds.length) {
    const { data, error } = await supabase.from('calibration_history').select('*').in('calibration_id', calibrationIds).order('changed_at', { ascending: true });
    if (error) throw new Error(`calibration_history query failed: ${error.message}`);
    historyRows = data;
  }
  const iros = cycleIros.iros.map((iro) => ({ ...iro, calibrationHistory: historyRows.filter((h) => h.calibration_id === iro.calibration?.id) }));

  const liveSessionIds = liveSessionsRes.data.map((s) => s.id);
  let liveParticipants = [];
  if (liveSessionIds.length) {
    const { data, error } = await supabase.from('live_session_participants').select('*').in('live_session_id', liveSessionIds).is('removed_at', null);
    if (error) throw new Error(`live_session_participants query failed: ${error.message}`);
    liveParticipants = data;
  }

  return {
    assessments,
    iros,
    progress: progressRes.data,
    groupEngagement: groupEngRes.data,
    thresholdChanges: thresholdChangesRes.data,
    liveSessions: liveSessionsRes.data,
    liveParticipants,
    submissions: submissionsRes.data,
    ratings: ratingsRes.data,
  };
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

// Editing a signed-off IRO clears its sign-off (Section 8, Calibrate tab) —
// the number it approved no longer holds, so reviewed_with_owner resets
// alongside the calibrated value in the same update.
export async function saveCalibrationAdjustment({ iroId, cycleId, calibration, fromValue, toValue, notes, changedBy }) {
  assertConfigured();
  const calibrationId = await ensureCalibrationRow(iroId, cycleId, calibration);

  const { error: updateError } = await supabase
    .from('calibrations')
    .update({ calibrated_value: toValue, notes, calibrated_at: new Date().toISOString(), reviewed_with_owner: false, reviewed_with_owner_at: null, reviewed_with_owner_by: null })
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
    .update({ calibrated_value: null, reviewed_with_owner: false, reviewed_with_owner_at: null, reviewed_with_owner_by: null })
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
// The per-IRO Sign off / Revoke action (Section 8, Calibrate tab: "sign-off
// records the logged-in user and the time, and editing a signed-off IRO
// clears its sign-off"). Uses reviewed_with_owner/_at/_by — never the
// retired calibrations.signed_off_by/signed_off_at columns.
export async function setReviewedWithOwner({ iroId, cycleId, calibration, reviewed, changedBy }) {
  assertConfigured();
  const calibrationId = await ensureCalibrationRow(iroId, cycleId, calibration);
  const { error } = await supabase
    .from('calibrations')
    .update({
      reviewed_with_owner: reviewed,
      reviewed_with_owner_at: reviewed ? new Date().toISOString() : null,
      reviewed_with_owner_by: reviewed ? changedBy : null,
    })
    .eq('id', calibrationId);
  if (error) throw new Error(`calibrations update failed: ${error.message}`);
  return calibrationId;
}

// ---------------------------------------------------------------------------
// Stakeholders — StakeholderModule.jsx (ported verbatim from
// reference-prototype/) — the Impact/Financial perspectives + generic pool.
// Loaded/saved as one nested array, matching the shape the component already
// expects: [{ id, name, perspectives, type, members: [{ id, name, title,
// company, email, pillars, expertise }] }]. "title" in the component ===
// "role" in the DB (the prototype's own field naming, kept verbatim per the
// Hard Rule). `type` is `null` for an ordinary group or `'silent'` for a
// silent stakeholder — an ordinary entry in the same list, per spec v2.0
// amended 5: no separate scope, silent groups sit in the generic pool like
// any other suggestion until dragged into Impact.
//
// A plain full-collection sync over the whole table — upserts everything
// present, deletes everything absent — since silent groups are no longer a
// protected subset that needs shielding from it.
// ---------------------------------------------------------------------------

export async function loadStakeholderMapForModule() {
  assertConfigured();
  const { data: groups, error: gErr } = await supabase
    .from('stakeholder_groups')
    .select('id, name, perspectives, type, order')
    .order('order', { ascending: true });
  if (gErr) throw new Error(`stakeholder_groups query failed: ${gErr.message}`);

  const groupIds = groups.map((g) => g.id);
  let members = [];
  if (groupIds.length) {
    const { data, error: mErr } = await supabase
      .from('stakeholder_members')
      .select('id, group_id, name, role, company, email, pillars, expertise')
      .in('group_id', groupIds);
    if (mErr) throw new Error(`stakeholder_members query failed: ${mErr.message}`);
    members = data;
  }

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    perspectives: g.perspectives || [],
    type: g.type,
    members: members
      .filter((m) => m.group_id === g.id)
      .map((m) => ({
        id: m.id,
        name: m.name,
        title: m.role,
        company: m.company || '',
        email: m.email || '',
        pillars: m.pillars || [],
        expertise: m.expertise || '',
      })),
  }));
}

export async function saveStakeholderMapForModule(map) {
  assertConfigured();
  const groupRows = map.map((g, index) => ({ id: g.id, name: g.name, perspectives: g.perspectives, type: g.type || null, order: index }));
  const memberRows = map.flatMap((g) =>
    g.members.map((m) => ({
      id: m.id,
      group_id: g.id,
      name: m.name,
      role: m.title,
      company: m.company || null,
      email: m.email || null,
      pillars: m.pillars || [],
      expertise: m.expertise || null,
    }))
  );

  if (groupRows.length) {
    const { error } = await supabase.from('stakeholder_groups').upsert(groupRows);
    if (error) throw new Error(`stakeholder_groups upsert failed: ${error.message}`);
  }
  if (memberRows.length) {
    const { error } = await supabase.from('stakeholder_members').upsert(memberRows);
    if (error) throw new Error(`stakeholder_members upsert failed: ${error.message}`);
  }

  const groupIds = groupRows.map((g) => g.id);
  const delGroupsQuery = supabase.from('stakeholder_groups').delete();
  const { error: delGroupsErr } = groupIds.length
    ? await delGroupsQuery.not('id', 'in', `(${groupIds.join(',')})`)
    : await delGroupsQuery.neq('id', '00000000-0000-0000-0000-000000000000');
  if (delGroupsErr) throw new Error(`stakeholder_groups delete failed: ${delGroupsErr.message}`);

  const memberIds = memberRows.map((m) => m.id);
  const delMembersQuery = supabase.from('stakeholder_members').delete();
  const { error: delMembersErr } = memberIds.length
    ? await delMembersQuery.not('id', 'in', `(${memberIds.join(',')})`)
    : await delMembersQuery.neq('id', '00000000-0000-0000-0000-000000000000');
  if (delMembersErr) throw new Error(`stakeholder_members delete failed: ${delMembersErr.message}`);
}

// ---------------------------------------------------------------------------
// Topics — TopicsModule.jsx (ported verbatim) — the master IRO library.
// Unlike Stakeholders, topic_library has no protected subset (this tool owns
// the whole table), so this is a plain full-collection sync over every row —
// upserts everything present, deletes everything absent. JS field names
// match the component exactly (iroType, esrsTopicId, subtopic — not
// esrsSubtopic, shortTitle, valueChain, referenceCode, signedOffBy,
// signedOffAt as a JS ms timestamp), plus the v2.0 additions esrsVersion,
// timeHorizon, potentialHumanRightsImpact and clientId.
// ---------------------------------------------------------------------------

export async function loadTopicLibraryForModule() {
  assertConfigured();
  const { data: rows, error } = await supabase
    .from('topic_library')
    .select('id, esrs_version, iro_type, esrs_topic_id, esrs_subtopic, short_title, description, actual, value_chain, reference_code, signed_off_by, signed_off_at, time_horizon, potential_human_rights_impact, client_id, created_at')
    .order('created_at', { ascending: true });
  if (error) throw new Error(`topic_library query failed: ${error.message}`);

  return rows.map((r) => ({
    id: r.id,
    esrsVersion: r.esrs_version,
    iroType: r.iro_type,
    esrsTopicId: r.esrs_topic_id,
    subtopic: r.esrs_subtopic || '',
    shortTitle: r.short_title,
    description: r.description || '',
    actual: r.actual,
    valueChain: r.value_chain,
    referenceCode: r.reference_code,
    signedOffBy: r.signed_off_by,
    signedOffAt: r.signed_off_at ? new Date(r.signed_off_at).getTime() : null,
    timeHorizon: r.time_horizon || '',
    potentialHumanRightsImpact: r.potential_human_rights_impact || false,
    clientId: r.client_id,
  }));
}

export async function saveTopicLibraryForModule(list) {
  assertConfigured();
  const rows = list.map((t) => ({
    id: t.id,
    esrs_version: t.esrsVersion,
    iro_type: t.iroType,
    esrs_topic_id: t.esrsTopicId,
    esrs_subtopic: t.subtopic || null,
    short_title: t.shortTitle,
    description: t.description || null,
    actual: t.actual,
    value_chain: t.valueChain,
    reference_code: t.referenceCode,
    signed_off_by: t.signedOffBy || null,
    signed_off_at: t.signedOffAt ? new Date(t.signedOffAt).toISOString() : null,
    time_horizon: t.timeHorizon || null,
    potential_human_rights_impact: t.potentialHumanRightsImpact || false,
    client_id: t.clientId || null,
  }));

  if (rows.length) {
    const { error } = await supabase.from('topic_library').upsert(rows);
    if (error) throw new Error(`topic_library upsert failed: ${error.message}`);
  }

  const ids = rows.map((r) => r.id);
  const delQuery = supabase.from('topic_library').delete();
  const { error: delErr } = ids.length
    ? await delQuery.not('id', 'in', `(${ids.join(',')})`)
    : await delQuery.neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) throw new Error(`topic_library delete failed: ${delErr.message}`);
}

// ---------------------------------------------------------------------------
// Assessment flow — ported prototype screens (AssessmentModeSelect,
// PerspectiveSelect, SurveySetupStep, SetupReviewStep, RecipientsScreen,
// ExpertAssessmentCreated, AssessmentReviewHub, IntroFlow, Questionnaire),
// wired to the v2.0 schema. General patch for the draft-autosave pattern
// these screens use (SetupReviewStep autosaves on every keystroke; the
// wizard patches at each step's "proceed").
// ---------------------------------------------------------------------------

export async function updateAssessment(id, patch) {
  assertConfigured();
  const dbPatch = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.description !== undefined) dbPatch.description = patch.description || null;
  if (patch.startDate !== undefined) dbPatch.start_date = patch.startDate || null;
  if (patch.endDate !== undefined) dbPatch.end_date = patch.endDate || null;
  if (patch.welcomeText !== undefined) dbPatch.welcome_text = patch.welcomeText || null;
  if (patch.taskText !== undefined) dbPatch.task_text = patch.taskText || null;
  if (patch.justificationMode !== undefined) dbPatch.justification_mode = patch.justificationMode;
  if (patch.mandatory !== undefined) dbPatch.mandatory = patch.mandatory;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.slug !== undefined) dbPatch.slug = patch.slug;
  if (Object.keys(dbPatch).length === 0) return;
  const { error } = await supabase.from('assessments').update(dbPatch).eq('id', id);
  if (error) throw new Error(`assessments update failed: ${error.message}`);
}

// Review Hub's per-assessment topic name/description overrides — write
// straight onto the assessment's own iros snapshot (never the master
// topic_library), matching how iros already carries its own name/description.
export async function updateIroOverrides(overridesByIroId) {
  assertConfigured();
  const entries = Object.entries(overridesByIroId || {});
  for (const [iroId, fields] of entries) {
    const patch = {};
    if (fields.name !== undefined) patch.name = fields.name;
    if (fields.description !== undefined) patch.description = fields.description;
    if (Object.keys(patch).length === 0) continue;
    const { error } = await supabase.from('iros').update(patch).eq('id', iroId);
    if (error) throw new Error(`iros update failed: ${error.message}`);
  }
}

// Removes one topic from this assessment only — never the master library —
// for a questionnaire going out scoped to fewer topics than the library
// snapshot offered.
export async function deleteAssessmentIro(iroId) {
  assertConfigured();
  const { error } = await supabase.from('iros').delete().eq('id', iroId);
  if (error) throw new Error(`iros delete failed: ${error.message}`);
}

// ---- Recipients screen → real invitations/participants rows ----

// invitations.email is NOT NULL, but the master stakeholder map treats
// email as optional — anyone without one can't get a personal link, so
// they're skipped here and handed back for the wizard to surface.
// Recipients is reachable more than once for the same assessment (the
// wizard, and the Assessment overview's direct shortcut) — its own
// candidate list is always freshly derived from the master map, with no
// memory of who's already invited, so this skips anyone who already has an
// invitation here (matched by email) rather than creating a duplicate row.
export async function createInvitationsFromRecipients(assessmentId, people) {
  assertConfigured();
  const { data: existing, error: selError } = await supabase.from('invitations').select('email').eq('assessment_id', assessmentId);
  if (selError) throw new Error(`invitations query failed: ${selError.message}`);
  const existingEmails = new Set(existing.map((i) => i.email));

  const withEmail = people.filter((p) => p.email && !existingEmails.has(p.email));
  const skipped = people.filter((p) => !p.email).map((p) => p.name);
  for (const p of withEmail) {
    await createInvitation({ assessmentId, name: p.name, email: p.email, stakeholderGroupId: p.groupId ?? null, stakeholderMemberId: p.stakeholderMemberId ?? null });
  }
  return { created: withEmail.length, skipped };
}

// Same dedup reasoning as above — matched by name, since participants (unlike
// invitations) have no unique identifier like email to key off.
export async function addParticipantsFromRecipients(liveSessionId, people, changedBy) {
  assertConfigured();
  const { data: existing, error: selError } = await supabase
    .from('live_session_participants')
    .select('name')
    .eq('live_session_id', liveSessionId)
    .is('removed_at', null);
  if (selError) throw new Error(`live_session_participants query failed: ${selError.message}`);
  const existingNames = new Set(existing.map((p) => p.name));

  for (const p of people.filter((p) => !existingNames.has(p.name))) {
    await addParticipant({ liveSessionId, name: p.name, expertise: p.expertise ?? [], representsGroupId: p.groupId ?? null, stakeholderMemberId: p.stakeholderMemberId ?? null, changedBy });
  }
}

// ---- Live session ratings (Questionnaire.jsx) ----
//
// Questionnaire.jsx's own field naming (kept verbatim in the component) uses
// `financialLikelihood` for a risk/opportunity's likelihood axis — the
// prototype's pre-v2.0 name for what the DB now stores under the single,
// unified `likelihood` criterion_key. That translation happens only here,
// at the data boundary, never inside the component. Continuous slider
// values (0-5, step 0.1) are rounded to the nearest integer, since
// ratings.value is an integer column shared with Tool A.

const CRITERION_KEYS = ['scale', 'scope', 'irreversibility', 'likelihood', 'magnitude', 'financialLikelihood'];
function componentKeyToDbKey(k) {
  return k === 'financialLikelihood' ? 'likelihood' : k;
}

function ratingRowsFromComponentState({ submissionId, assessmentId, ratings, justifications, justificationMode }) {
  // `likelihood` and `financialLikelihood` both write to the same DB column
  // (ratings.criterion_key has no separate financialLikelihood value) — if
  // an IRO's local rating state ever carries both (Questionnaire.jsx is
  // supposed to prevent this at the source, but a stale in-memory session
  // from before that fix, or any other future source, could still produce
  // it), two rows would target the same (submission_id, iro_id,
  // criterion_key) conflict key in one upsert batch, which Postgres refuses
  // outright. Deduping here, keyed by the actual DB column, is a second,
  // independent guard — the last value for a given db key wins.
  const byKey = new Map();
  for (const [iroId, r] of Object.entries(ratings || {})) {
    for (const componentKey of CRITERION_KEYS) {
      if (!(componentKey in r)) continue;
      const raw = r[componentKey];
      const justification = justificationMode === 'per_criterion' ? (justifications?.[iroId]?.[componentKey] || null) : null;
      byKey.set(`${iroId}:${componentKeyToDbKey(componentKey)}`, {
        submission_id: submissionId,
        assessment_id: assessmentId,
        iro_id: iroId,
        criterion_key: componentKeyToDbKey(componentKey),
        value: raw === null || raw === undefined ? null : Math.round(raw),
        justification,
      });
    }
  }
  return [...byKey.values()];
}

function topicJustificationRowsFromComponentState({ submissionId, ratings, justifications, justificationMode }) {
  if (justificationMode !== 'per_topic') return [];
  return Object.keys(ratings || {})
    .filter((iroId) => (justifications?.[iroId] || '').trim())
    .map((iroId) => ({ submission_id: submissionId, iro_id: iroId, justification: justifications[iroId] }));
}

// submissions.stakeholder_group has no single natural value for a live
// session (one submission covers the whole group, which can span several
// stakeholder groups) — resolve it from the active participants' groups
// (their own group, or the silent-stakeholder group they represent),
// deduplicated and joined, so the NOT NULL column always gets a real,
// meaningful value instead of failing the insert.
async function resolveLiveSessionStakeholderGroup(liveSessionId) {
  const { data: participants, error: pError } = await supabase
    .from('live_session_participants')
    .select('represents_group_id, stakeholder_member_id')
    .eq('live_session_id', liveSessionId)
    .is('removed_at', null);
  if (pError) throw new Error(`live_session_participants query failed: ${pError.message}`);

  const groupIds = new Set(participants.filter((p) => p.represents_group_id).map((p) => p.represents_group_id));
  const memberIds = participants.filter((p) => p.stakeholder_member_id).map((p) => p.stakeholder_member_id);
  if (memberIds.length) {
    const { data: members, error: mError } = await supabase
      .from('stakeholder_members')
      .select('id, group_id')
      .in('id', memberIds);
    if (mError) throw new Error(`stakeholder_members query failed: ${mError.message}`);
    members.forEach((m) => { if (m.group_id) groupIds.add(m.group_id); });
  }
  if (!groupIds.size) return 'Live session participants';

  const { data: groups, error: gError } = await supabase
    .from('stakeholder_groups')
    .select('name')
    .in('id', [...groupIds]);
  if (gError) throw new Error(`stakeholder_groups query failed: ${gError.message}`);
  const names = [...new Set(groups.map((g) => g.name))].sort();
  return names.length ? names.join(', ') : 'Live session participants';
}

// One live session has exactly one submission (the group's combined
// ratings) — created as a draft on first save, marked submitted on Finish.
// perspectiveFilter is the assessment's own ('full' | 'impact' | 'financial')
// — submissions.perspective only accepts 'impact'/'financial' (no "full"),
// so a mixed-perspective session is tagged 'impact'; the ratings themselves
// are still scored correctly per IRO regardless of this label.
async function ensureLiveSessionSubmission(assessmentId, liveSessionId, perspectiveFilter) {
  const { data: existing, error: selError } = await supabase
    .from('submissions')
    .select('id, status, current_topic_index')
    .eq('live_session_id', liveSessionId)
    .maybeSingle();
  if (selError) throw new Error(`submissions query failed: ${selError.message}`);
  if (existing) return existing;
  const perspective = perspectiveFilter === 'financial' ? 'financial' : 'impact';
  const stakeholderGroup = await resolveLiveSessionStakeholderGroup(liveSessionId);
  const { data, error } = await supabase
    .from('submissions')
    .insert({ assessment_id: assessmentId, source: 'expert_live_session', live_session_id: liveSessionId, status: 'draft', perspective, stakeholder_group: stakeholderGroup })
    .select('id, status, current_topic_index')
    .single();
  if (error) throw new Error(`submissions insert failed: ${error.message}`);
  return data;
}

// Resume support for Questionnaire.jsx's initialRatings/initialIndex/
// initialJustifications props — reads back whatever "Save and pause" wrote.
export async function fetchLiveSessionProgress(assessmentId, liveSessionId, perspectiveFilter) {
  assertConfigured();
  const submission = await ensureLiveSessionSubmission(assessmentId, liveSessionId, perspectiveFilter);

  const { data: ratingRows, error: rError } = await supabase
    .from('ratings')
    .select('iro_id, criterion_key, value, justification')
    .eq('submission_id', submission.id);
  if (rError) throw new Error(`ratings query failed: ${rError.message}`);

  const { data: justRows, error: jError } = await supabase
    .from('topic_justifications')
    .select('iro_id, justification')
    .eq('submission_id', submission.id);
  if (jError) throw new Error(`topic_justifications query failed: ${jError.message}`);

  // The DB's single `likelihood` key is ambiguous on the way back out —
  // which component key it un-maps to depends on the IRO's type.
  const { data: iroRows, error: iError } = await supabase.from('iros').select('id, iro_type, session_notes').eq('assessment_id', assessmentId);
  if (iError) throw new Error(`iros query failed: ${iError.message}`);
  const iroTypeById = new Map(iroRows.map((r) => [r.id, r.iro_type]));

  const ratings = {};
  const justifications = {};
  for (const r of ratingRows) {
    const isFinancialAxis = !['neg_impact', 'pos_impact'].includes(iroTypeById.get(r.iro_id));
    const componentKey = isFinancialAxis && r.criterion_key === 'likelihood' ? 'financialLikelihood' : r.criterion_key;
    ratings[r.iro_id] = ratings[r.iro_id] || {};
    ratings[r.iro_id][componentKey] = r.value;
    if (r.justification) {
      justifications[r.iro_id] = justifications[r.iro_id] || {};
      justifications[r.iro_id][componentKey] = r.justification;
    }
  }
  for (const r of justRows) {
    justifications[r.iro_id] = r.justification;
  }
  const sessionNotes = {};
  for (const r of iroRows) {
    if (r.session_notes) sessionNotes[r.id] = r.session_notes;
  }

  return {
    submissionId: submission.id,
    status: submission.status,
    currentTopicIndex: submission.current_topic_index ?? 0,
    ratings,
    justifications,
    sessionNotes,
  };
}

// "Save and pause session" — writes ratings/justifications/session notes so
// far and records the paused position; the submission stays draft, so
// nothing here counts in results yet.
export async function saveLiveSessionProgress({ assessmentId, submissionId, ratings, sessionNotes, justifications, justificationMode, currentTopicIndex }) {
  assertConfigured();
  const ratingRows = ratingRowsFromComponentState({ submissionId, assessmentId, ratings, justifications, justificationMode });
  if (ratingRows.length) {
    const { error } = await supabase.from('ratings').upsert(ratingRows, { onConflict: 'submission_id,iro_id,criterion_key' });
    if (error) throw new Error(`ratings upsert failed: ${error.message}`);
  }

  const topicRows = topicJustificationRowsFromComponentState({ submissionId, ratings, justifications, justificationMode });
  if (topicRows.length) {
    const { error } = await supabase.from('topic_justifications').upsert(topicRows, { onConflict: 'submission_id,iro_id' });
    if (error) throw new Error(`topic_justifications upsert failed: ${error.message}`);
  }

  for (const [iroId, note] of Object.entries(sessionNotes || {})) {
    if (!note) continue;
    const { error } = await supabase.from('iros').update({ session_notes: note }).eq('id', iroId);
    if (error) throw new Error(`iros update failed: ${error.message}`);
  }

  const { error: subError } = await supabase
    .from('submissions')
    .update({ current_topic_index: currentTopicIndex ?? 0, last_saved_at: new Date().toISOString() })
    .eq('id', submissionId);
  if (subError) throw new Error(`submissions update failed: ${subError.message}`);
}

// "Finish session" — final write, then marks the submission submitted and
// the live session finished. Only from here on do its ratings count in results.
export async function finishLiveSession({ assessmentId, liveSessionId, submissionId, ratings, sessionNotes, justifications, justificationMode }) {
  assertConfigured();
  await saveLiveSessionProgress({ assessmentId, submissionId, ratings, sessionNotes, justifications, justificationMode, currentTopicIndex: 0 });

  const { error: subError } = await supabase
    .from('submissions')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', submissionId);
  if (subError) throw new Error(`submissions update failed: ${subError.message}`);

  const { error: lsError } = await supabase
    .from('live_sessions')
    .update({ status: 'finished', finished_at: new Date().toISOString() })
    .eq('id', liveSessionId);
  if (lsError) throw new Error(`live_sessions update failed: ${lsError.message}`);
}

// ---- Assessment overview — the prototype's AssessmentOverview.jsx table.
// Everything that screen needs directly off assessments, plus a respondents
// summary (survey: submitted/total invitations; live session: its status). ----

export async function fetchAssessmentsForOverview() {
  assertConfigured();
  const { data, error } = await supabase
    .from('assessments')
    .select('id, cycle_id, name, slug, type, perspective_filter, justification_mode, description, start_date, end_date, welcome_text, task_text, mandatory, created_at, cycles ( financial_year, esrs_version, stage )')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`assessments query failed: ${error.message}`);
  if (!data.length) return [];

  const ids = data.map((a) => a.id);
  const [invRes, lsRes] = await Promise.all([
    supabase.from('invitations').select('assessment_id, status').in('assessment_id', ids),
    supabase.from('live_sessions').select('assessment_id, status').in('assessment_id', ids),
  ]);
  if (invRes.error) throw new Error(`invitations query failed: ${invRes.error.message}`);
  if (lsRes.error) throw new Error(`live_sessions query failed: ${lsRes.error.message}`);

  return data.map((a) => {
    const ownInvitations = invRes.data.filter((i) => i.assessment_id === a.id);
    const submitted = ownInvitations.filter((i) => i.status === 'submitted').length;
    const liveSession = lsRes.data.find((s) => s.assessment_id === a.id);
    return {
      id: a.id,
      cycleId: a.cycle_id,
      name: a.name,
      slug: a.slug,
      type: a.type,
      perspectiveFilter: a.perspective_filter,
      justificationMode: a.justification_mode,
      description: a.description,
      startDate: a.start_date,
      endDate: a.end_date,
      welcomeText: a.welcome_text,
      taskText: a.task_text,
      mandatory: a.mandatory,
      createdAt: a.created_at,
      financialYear: a.cycles?.financial_year ?? null,
      esrsVersion: a.cycles?.esrs_version ?? null,
      cycleStage: a.cycles?.stage ?? null,
      respondents: a.type === 'expert_survey' ? `${submitted}/${ownInvitations.length}` : (liveSession ? liveSession.status : 'not started'),
      // AssessmentOverview.jsx's computeStatus() treats a truthy `status` as
      // a real terminal state and skips its own date-based logic — only
      // give it one for a finished live session; everything else falls
      // through to Scheduled/Active/Closed there, exactly as the prototype
      // computes it for a survey.
      status: a.type === 'expert_live_session' && liveSession?.status === 'finished' ? 'Completed' : undefined,
    };
  });
}

// ---- team_members — access stage Groups 3/4 (Settings → Admin & Roles,
// Settings → Profile). `avatars` is a private bucket (unlike the public-read
// `logos` bucket) — `avatar_url` stores the storage PATH, not a public URL;
// every read resolves it to a fresh signed URL, since a private bucket's
// objects have no stable public address. ----

const AVATAR_SIGNED_URL_SECONDS = 60 * 60 * 24 * 7; // 7 days — long enough for a session, short enough to self-heal if ever revoked

function mapTeamMember(row, avatarUrl) {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    email: row.email,
    name: row.name,
    phoneNumber: row.phone_number,
    avatarPath: row.avatar_url,
    avatarUrl: avatarUrl ?? null,
    roleTitle: row.role_title,
    accessLevel: row.access_level,
    isAdmin: row.is_admin,
    isOwner: row.is_owner,
    canSignoffTopics: row.can_signoff_topics,
    canSignoffResults: row.can_signoff_results,
    active: row.active,
    createdAt: row.created_at,
  };
}

async function resolveAvatarUrls(paths) {
  const distinct = [...new Set(paths.filter(Boolean))];
  if (distinct.length === 0) return {};
  const { data, error } = await supabase.storage.from('avatars').createSignedUrls(distinct, AVATAR_SIGNED_URL_SECONDS);
  if (error) throw new Error(`avatar signed URL batch failed: ${error.message}`);
  const map = {};
  data.forEach((entry, i) => { if (!entry.error) map[distinct[i]] = entry.signedUrl; });
  return map;
}

// The caller's own team_members row — the login gate (App.jsx checks for
// null = "No access yet", `active: false` = deactivated) and Profile both
// read through this. Returns null if no row matches this auth identity yet.
export async function fetchOwnTeamMember(authUserId) {
  assertConfigured();
  const { data, error } = await supabase.from('team_members').select('*').eq('auth_user_id', authUserId).maybeSingle();
  if (error) throw new Error(`team_members query failed: ${error.message}`);
  if (!data) return null;
  const urls = await resolveAvatarUrls([data.avatar_url]);
  return mapTeamMember(data, urls[data.avatar_url]);
}

// Every team_members row — Settings → Admin & Roles (Tool Owner/Admin only;
// RLS also allows any full-access read, but the screen itself is nav-gated
// to Owner/Admin per access-matrix.md's people table).
export async function listTeamMembers() {
  assertConfigured();
  const { data, error } = await supabase.from('team_members').select('*').order('created_at', { ascending: true });
  if (error) throw new Error(`team_members query failed: ${error.message}`);
  const urls = await resolveAvatarUrls(data.map((r) => r.avatar_url));
  return data.map((row) => mapTeamMember(row, urls[row.avatar_url]));
}

// Own-row only, per access-matrix.md's team_members section (name,
// phone_number, avatar_url — enforced again server-side by
// enforce_team_members_protections()).
export async function updateOwnProfile(id, { name, phoneNumber }) {
  assertConfigured();
  const { error } = await supabase.from('team_members').update({ name, phone_number: phoneNumber }).eq('id', id);
  if (error) throw new Error(`team_members update failed: ${error.message}`);
}

export async function uploadAvatar(authUserId, teamMemberId, file) {
  assertConfigured();
  const ext = file.name.split('.').pop();
  const path = `${authUserId}/avatar.${ext}`;
  const { error: upError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (upError) throw new Error(`avatar upload failed: ${upError.message}`);
  const { error: updError } = await supabase.from('team_members').update({ avatar_url: path }).eq('id', teamMemberId);
  if (updError) throw new Error(`team_members update failed: ${updError.message}`);
  const urls = await resolveAvatarUrls([path]);
  return urls[path];
}

// "+ New team member" (Admin & Roles) — the email must already have a
// Supabase Auth identity (invited via the dashboard, per CLAUDE.md's Option
// A); the auth-link trigger fills in auth_user_id the first time that
// person logs in. Owner/Admin only — matches the INSERT policy.
export async function createTeamMember({ email, name, roleTitle, accessLevel, canSignoffTopics, canSignoffResults }) {
  assertConfigured();
  const { data, error } = await supabase
    .from('team_members')
    .insert({
      email,
      name,
      role_title: roleTitle || null,
      access_level: accessLevel,
      can_signoff_topics: accessLevel === 'signoff' ? !!canSignoffTopics : false,
      can_signoff_results: accessLevel === 'signoff' ? !!canSignoffResults : false,
    })
    .select('*')
    .single();
  if (error) throw new Error(`team_members insert failed: ${error.message}`);
  return mapTeamMember(data, null);
}

// Access level, sign-off permissions, role title — any row, Owner/Admin only
// (enforced again by the trigger).
export async function updateTeamMemberAccess(id, { roleTitle, accessLevel, canSignoffTopics, canSignoffResults }) {
  assertConfigured();
  const { error } = await supabase
    .from('team_members')
    .update({
      role_title: roleTitle || null,
      access_level: accessLevel,
      can_signoff_topics: accessLevel === 'signoff' ? !!canSignoffTopics : false,
      can_signoff_results: accessLevel === 'signoff' ? !!canSignoffResults : false,
    })
    .eq('id', id);
  if (error) throw new Error(`team_members update failed: ${error.message}`);
}

// is_admin — Tool Owner only, never on one's own row (both enforced by the trigger).
export async function updateTeamMemberAdmin(id, isAdmin) {
  assertConfigured();
  const { error } = await supabase.from('team_members').update({ is_admin: isAdmin }).eq('id', id);
  if (error) throw new Error(`team_members update failed: ${error.message}`);
}

// active — Owner/Admin, never on one's own row (both enforced by the trigger). Deactivate, never delete.
export async function updateTeamMemberActive(id, active) {
  assertConfigured();
  const { error } = await supabase.from('team_members').update({ active }).eq('id', id);
  if (error) throw new Error(`team_members update failed: ${error.message}`);
}

import { useState, useEffect, useCallback } from 'react';
import AssessmentOverview from './AssessmentOverview';
import AssessmentModeSelect from './AssessmentModeSelect';
import PerspectiveSelect from './PerspectiveSelect';
import SurveySetupStep from './SurveySetupStep';
import SetupReviewStep, { DEFAULT_WELCOME, QUAL_EXPERT_WELCOME, IMPACT_TASK, FINANCIAL_TASK, DEFAULT_STAKEHOLDERS } from './SetupReviewStep';
import RecipientsScreen from './RecipientsScreen';
import ExpertAssessmentCreated from './ExpertAssessmentCreated';
import AssessmentReviewHub from './AssessmentReviewHub';
import IntroFlow from './IntroFlow';
import Questionnaire from './Questionnaire';
import WizardBreadcrumb from './WizardBreadcrumb';
import {
  fetchAssessmentsForOverview, fetchTopicLibraryForSnapshot, createAssessment, snapshotTopicsIntoIros,
  updateAssessment, updateIroOverrides, deleteAssessmentIro, findCycleForFinancialYear, getOrCreateCycleForFinancialYear,
  fetchInvitations, buildPersonalLink, createInvitationsFromRecipients, deleteAssessment,
  fetchLiveSessionWithParticipants, addParticipantsFromRecipients, fetchLiveSessionProgress,
  saveLiveSessionProgress, finishLiveSession, fetchDashboard,
  loadStakeholderMapForModule, saveStakeholderMapForModule, uploadClientLogo,
} from '../lib/data';

// Section 8, New assessment: Mode -> Perspective -> General info -> Review &
// customise -> Recipients -> Created -> (Preview / Kick off). This wrapper
// owns the whole state machine (mirroring the prototype's own App.jsx
// pattern — see PROGRESS.md) and wires each ported screen to the v2.0
// schema; the screens themselves are never touched here beyond their
// already-applied, sanctioned differences.

const EMPTY_META = { name: '', description: '', logo: null, startDate: undefined, endDate: undefined, slug: undefined, financialYear: null, esrsVersion: '' };

const TYPE_LABEL = { expert_survey: 'Expert survey', expert_live_session: 'Expert live session' };

// topic_library rows (snapshot candidates, before an assessment exists) and
// iros rows (the real per-assessment snapshot) end up needing the same
// camelCase shape wherever a ported screen displays a topic.
function candidateIroShape(t) {
  return { id: t.id, name: t.short_title, description: t.description || '', iroType: t.iro_type, actual: t.actual, esrsTopicId: t.esrs_topic_id, timeHorizon: t.time_horizon, potentialHumanRightsImpact: t.potential_human_rights_impact };
}

export default function AssessmentsTab({ perspective, userId, onChanged, onViewResults, onGoToStakeholders, deepLink, onDeepLinkHandled, resetSignal, readOnly }) {
  const [flowStep, setFlowStep] = useState('overview');
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // ---- wizard draft state ----
  const [assessmentMode, setAssessmentMode] = useState(null); // 'expert_survey' | 'expert_live_session'
  const [perspectiveFilter, setPerspectiveFilter] = useState(null); // 'full' | 'impact' | 'financial'
  const [surveyMeta, setSurveyMeta] = useState(EMPTY_META);
  const [welcomeText, setWelcomeText] = useState('');
  const [taskText, setTaskText] = useState('');
  const [stakeholdersChoice, setStakeholdersChoice] = useState(DEFAULT_STAKEHOLDERS);
  const [topicOverrides, setTopicOverrides] = useState({});
  const [mandatory, setMandatory] = useState(false);
  const [justificationMode, setJustificationMode] = useState('per_criterion');
  const [adjustingId, setAdjustingId] = useState(null);
  const [candidateIros, setCandidateIros] = useState([]);
  const [cycleForYear, setCycleForYear] = useState(null);
  // Recipients is reachable two ways: through the wizard (Back returns to
  // Review) or as a direct shortcut from Assessment overview (Back returns
  // straight to the overview, since there's no in-progress wizard state).
  const [recipientsBackTarget, setRecipientsBackTarget] = useState('review');

  const [stakeholderMap, setStakeholderMapLocal] = useState([]);

  // ---- runtime state for Created / Review Hub / Intro / Questionnaire ----
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [activeInvitations, setActiveInvitations] = useState([]);
  const [activeIros, setActiveIros] = useState([]);
  const [liveSession, setLiveSession] = useState(null);
  const [sessionProgress, setSessionProgress] = useState(null);
  // Set fresh on every enterLiveSession call, never stale between sessions —
  // true only when that session was already finished (submitted, frozen).
  const [liveSessionReadOnly, setLiveSessionReadOnly] = useState(false);
  const [activeParticipantCount, setActiveParticipantCount] = useState(0);

  const reloadAssessments = useCallback(() => {
    fetchAssessmentsForOverview()
      .then(setAssessments)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reloadAssessments();
    loadStakeholderMapForModule().then(setStakeholderMapLocal).catch((err) => setError(err.message));
  }, [reloadAssessments]);

  function setStakeholderMap(updater) {
    setStakeholderMapLocal((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveStakeholderMapForModule(next).catch((err) => setError(err.message));
      return next;
    });
  }

  // Whenever the entered financial year changes, look up whether it
  // already has a cycle — General info shows the ESRS version read-only if
  // so (Section 8: "for later assessments of the same year these show
  // read-only").
  useEffect(() => {
    if (!surveyMeta.financialYear) { setCycleForYear(null); return; }
    let cancelled = false;
    findCycleForFinancialYear(surveyMeta.financialYear)
      .then((c) => { if (!cancelled) setCycleForYear(c); })
      .catch((err) => setError(err.message));
    return () => { cancelled = true; };
  }, [surveyMeta.financialYear]);

  function resetDraft() {
    setAssessmentMode(null);
    setPerspectiveFilter(null);
    setSurveyMeta(EMPTY_META);
    setWelcomeText('');
    setTaskText('');
    setStakeholdersChoice(DEFAULT_STAKEHOLDERS);
    setTopicOverrides({});
    setMandatory(false);
    setJustificationMode('per_criterion');
    setAdjustingId(null);
    setCandidateIros([]);
    setRecipientsBackTarget('review');
  }

  // ---- Mode / Perspective ----

  function handleModeSelect(mode) {
    setAssessmentMode(mode);
    setWelcomeText(mode === 'expert_live_session' ? QUAL_EXPERT_WELCOME : DEFAULT_WELCOME);
    setFlowStep('perspective');
  }

  function handlePerspectiveSelect(p) {
    setPerspectiveFilter(p);
    setTaskText(p === 'financial' ? FINANCIAL_TASK : IMPACT_TASK);
    // Section 8, Perspective Select: pre-fill from the master map, filtered
    // to groups tagged with the matching perspective — for both modes, so
    // Recipients (which always reads `stakeholders`, not `participants`)
    // has real people to resolve either way.
    const names = (persp) => stakeholderMap.filter((g) => g.perspectives.includes(persp)).map((g) => g.name);
    setStakeholdersChoice({
      impact: p === 'financial' ? [] : names('impact'),
      financial: p === 'impact' ? [] : names('financial'),
    });
    setFlowStep('survey-details');
  }

  // ---- General info ----

  async function handleSurveyDetailsProceed(meta) {
    setSurveyMeta(meta);
    setError('');
    try {
      const esrsVersion = cycleForYear ? cycleForYear.esrsVersion : (meta.esrsVersion || 'esrs_2023_amended');
      const topics = await fetchTopicLibraryForSnapshot({ esrsVersion, clientId: null, perspective: perspectiveFilter });
      setCandidateIros(topics.map(candidateIroShape));
      setFlowStep('review');
    } catch (err) {
      setError(err.message);
    }
  }

  // ---- Review & customise ----

  // For a questionnaire going out scoped to fewer topics than the library
  // snapshot offered. Before the assessment is first created, this is just
  // local draft state; once it exists (including a re-edit), the iro row
  // (and any ratings already against it) is deleted immediately — there's
  // no separate save step for a removal, unlike a text override.
  async function handleDeleteTopic(iroId) {
    setError('');
    if (adjustingId) {
      try {
        await deleteAssessmentIro(iroId);
      } catch (err) {
        setError(err.message);
        return;
      }
    }
    setCandidateIros((prev) => prev.filter((t) => t.id !== iroId));
    setTopicOverrides((prev) => {
      if (!(iroId in prev)) return prev;
      const next = { ...prev };
      delete next[iroId];
      return next;
    });
  }

  async function handleCreate() {
    setBusy(true);
    setError('');
    try {
      const esrsVersion = cycleForYear ? cycleForYear.esrsVersion : (surveyMeta.esrsVersion || 'esrs_2023_amended');
      const cycle = await getOrCreateCycleForFinancialYear({ financialYear: surveyMeta.financialYear, esrsVersion, createdBy: userId });

      // Bake topicOverrides in before the snapshot, so the assessment's own
      // iros carry the edited name/description from the very first insert.
      const topicsForSnapshot = candidateIros.map((t) => ({
        id: t.id,
        esrs_topic_id: t.esrsTopicId,
        short_title: topicOverrides[t.id]?.name ?? t.name,
        description: topicOverrides[t.id]?.description ?? t.description,
        iro_type: t.iroType,
        actual: t.actual,
        time_horizon: t.timeHorizon,
        potential_human_rights_impact: t.potentialHumanRightsImpact,
      }));

      // LogoUpload.jsx (verbatim) hands back a base64 data URL, not a File —
      // re-encode it so it can go through the same Storage upload path the
      // client's own logo already uses, per the builder's decision (logo
      // wired to the real client, no separate "company name" field).
      if (surveyMeta.logo && surveyMeta.logo.startsWith('data:')) {
        const blob = await (await fetch(surveyMeta.logo)).blob();
        const ext = blob.type.split('/')[1] || 'png';
        await uploadClientLogo(cycle.clientId, new File([blob], `logo.${ext}`, { type: blob.type }));
      }

      if (adjustingId) {
        await updateAssessment(adjustingId, {
          name: surveyMeta.name, description: surveyMeta.description, startDate: surveyMeta.startDate, endDate: surveyMeta.endDate,
          welcomeText, taskText, justificationMode, mandatory,
        });
        // Re-editing never re-snapshots topics (never resets responses or
        // status) — only the display overrides on the already-created iros
        // can change here.
        await updateIroOverrides(topicOverrides);
        setActiveAssessment((prev) => ({ ...prev, name: surveyMeta.name }));
      } else {
        const created = await createAssessment({
          cycleId: cycle.id, type: assessmentMode, perspectiveFilter,
          name: surveyMeta.name, description: surveyMeta.description,
          startDate: surveyMeta.startDate, endDate: surveyMeta.endDate,
          welcomeText, taskText, justificationMode, mandatory, createdBy: userId,
        });
        await snapshotTopicsIntoIros(created.id, topicsForSnapshot);
        setAdjustingId(created.id);
        setActiveAssessment({
          id: created.id, slug: created.slug, name: surveyMeta.name, type: assessmentMode, justificationMode, mandatory,
          perspectiveFilter, welcomeText, taskText, description: surveyMeta.description, startDate: surveyMeta.startDate, endDate: surveyMeta.endDate,
        });
      }
      setFlowStep('recipients');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // ---- Recipients ----

  async function handleRecipientsContinue(included) {
    setBusy(true);
    setError('');
    try {
      const people = included.map((p) => ({
        name: p.name,
        email: p.email,
        expertise: [],
        groupId: p.groupId ?? null,
        stakeholderMemberId: p.stakeholderMemberId ?? null,
      }));

      if (assessmentMode === 'expert_survey') {
        const { skipped } = await createInvitationsFromRecipients(activeAssessment.id, people);
        if (skipped.length) setError(`No email on file for: ${skipped.join(', ')} — they weren't invited. Add an email in Stakeholders, or add them manually from Recipients.`);
        const invitations = await fetchInvitations(activeAssessment.id);
        setActiveInvitations(invitations);
      } else {
        const { liveSession: ls } = await fetchLiveSessionWithParticipants(activeAssessment.id);
        await addParticipantsFromRecipients(ls.id, people, userId);
        const { participants } = await fetchLiveSessionWithParticipants(activeAssessment.id);
        setActiveParticipantCount(participants.filter((p) => !p.removed_at).length);
        setLiveSession(ls);
      }
      reloadAssessments();
      onChanged?.();
      setFlowStep('expert-created');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // ---- Created ----

  // Was fire-and-forget with a swallowed `.catch(() => {})` — copying could
  // silently fail (clipboard permission denied, insecure/non-standard
  // context, no Clipboard API at all) with zero feedback either way, so
  // "the button doesn't work" was indistinguishable from "it worked but
  // nothing told you." Now returns a result the caller (ExpertAssessmentCreated)
  // uses to show "Link copied" or fall back to select-to-copy-by-hand —
  // never silent.
  async function handleCopyInvitation(inv) {
    if (!navigator.clipboard?.writeText) return { ok: false, reason: 'unsupported' };
    try {
      await navigator.clipboard.writeText(inv.link);
      return { ok: true };
    } catch {
      return { ok: false, reason: 'denied' };
    }
  }

  // Jumps straight to Recipients (survey) or Participants (live session)
  // for an existing assessment, without going through the setup wizard.
  function openRecipientsDirect(assessment) {
    if (readOnly) return;
    setError('');
    setAssessmentMode(assessment.type);
    setPerspectiveFilter(assessment.perspectiveFilter || 'full');
    setActiveAssessment(assessment);
    setRecipientsBackTarget('overview');
    setFlowStep('recipients');
  }

  async function openReviewHub(assessment) {
    setError('');
    try {
      const { iros } = await fetchDashboard(assessment.id);
      setActiveIros(iros);
      setActiveAssessment(assessment);
      if (assessment.type === 'expert_survey') {
        const invitations = await fetchInvitations(assessment.id);
        setActiveInvitations(invitations);
      }
      setFlowStep('review-hub');
    } catch (err) {
      setError(err.message);
    }
  }

  async function enterLiveSession(assessment) {
    if (readOnly) { setError('Sign-off only cannot run a live session.'); return; }
    setError('');
    try {
      const { liveSession: ls, participants } = await fetchLiveSessionWithParticipants(assessment.id);
      const active = participants.filter((p) => !p.removed_at);
      if (active.length === 0) {
        openRecipientsDirect(assessment);
        setError('Add who participates first — this session has no participants yet.');
        return;
      }
      const progress = await fetchLiveSessionProgress(assessment.id, ls.id, assessment.perspectiveFilter);
      // A submitted response is frozen for every role (CLAUDE.md Business
      // Rules) — the RLS policy already refuses any further write to it.
      // Rather than refusing to open it at all, open the Questionnaire in
      // its read-only review mode, landing on the results summary: browse
      // any topic, but nothing here can attempt the write RLS would refuse.
      const alreadySubmitted = progress.status === 'submitted';
      setLiveSessionReadOnly(alreadySubmitted);
      const { iros } = await fetchDashboard(assessment.id);
      setActiveIros(iros);
      setActiveAssessment(assessment);
      setLiveSession({ ...ls, participants: active });
      setSessionProgress(progress);
      setFlowStep(alreadySubmitted || progress.currentTopicIndex > 0 || Object.keys(progress.ratings).length > 0 ? 'questionnaire' : 'intro');
    } catch (err) {
      setError(err.message);
    }
  }

  // "Go to the external expert survey" — Tool A has no generic, non-personal
  // entry point (every link is one invitee's own), so this opens the first
  // invitation's real personal link in a new tab, exactly what "Copy
  // personal link" on Recipients would give you, just one click instead of
  // two. Same no-invitations fallback shape as enterLiveSession's own
  // no-participants guard, for the same reason: nowhere to go yet.
  async function openExternalSurvey(assessment) {
    if (readOnly) { setError('Sign-off only cannot open the survey.'); return; }
    setError('');
    // Open the tab synchronously, in the same tick as the click, and
    // navigate it once the link is known — a window.open() called after an
    // await (fetchInvitations below) loses the click's "user activation" in
    // most browsers and gets silently eaten by the popup blocker, which is
    // exactly why this looked like nothing happened at all. Can't pass
    // noopener/noreferrer here since navigating the tab afterward needs a
    // live reference to it; Tool A is our own trusted site, so that's fine.
    const tab = window.open('', '_blank');
    try {
      const invitations = await fetchInvitations(assessment.id);
      if (!invitations.length) {
        tab?.close();
        openRecipientsDirect(assessment);
        setError('Add recipients first — no invitations exist yet to open the survey with.');
        return;
      }
      if (tab) tab.location.href = buildPersonalLink(assessment.slug, invitations[0].linkCode);
      else setError('Your browser blocked the new tab — allow pop-ups for this site, or use Recipients to copy the link instead.');
    } catch (err) {
      tab?.close();
      setError(err.message);
    }
  }

  function goDirect(assessment) {
    if (assessment.type === 'expert_live_session') enterLiveSession(assessment);
    else openExternalSurvey(assessment);
  }

  // The Responses screen's "Invitations"/"Resume session" links jump here
  // for one specific assessment, without going through the overview first.
  useEffect(() => {
    if (!deepLink || !assessments.length) return;
    const a = assessments.find((x) => x.id === deepLink.assessmentId);
    if (a) {
      if (deepLink.action === 'recipients') openRecipientsDirect(a);
      else if (deepLink.action === 'kickoff') enterLiveSession(a);
    }
    onDeepLinkHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLink, assessments]);

  // Clicking "Assessments" in the left nav while already on this tab is a
  // no-op tab change (tab stays 'assessments', so this component never
  // remounts) — resetSignal is an incrementing counter the shell bumps on
  // every click of that nav item, forcing back to the overview from
  // anywhere (wizard, Review Hub, a running live session) with no stale
  // in-progress state left behind.
  useEffect(() => {
    if (!resetSignal) return;
    resetDraft();
    setActiveAssessment(null);
    setLiveSession(null);
    setSessionProgress(null);
    setFlowStep('overview');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  // ---- Review Hub ----

  async function handleReviewHubSaveAndExit(payload) {
    setError('');
    try {
      await updateAssessment(activeAssessment.id, { welcomeText: payload.welcomeText, taskText: payload.taskText });
      await updateIroOverrides(payload.topicOverrides);
      reloadAssessments();
    } catch (err) {
      setError(err.message);
    }
    setFlowStep('overview');
  }

  // ---- Questionnaire (live session) ----

  async function handleQuestionnaireProgress(ratings, index, justifications) {
    try {
      await saveLiveSessionProgress({
        assessmentId: activeAssessment.id, submissionId: sessionProgress.submissionId,
        ratings, sessionNotes: {}, justifications, justificationMode: activeAssessment.justificationMode || justificationMode,
        currentTopicIndex: index,
      });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleQuestionnaireFinish(ratings, relevantIros, sessionNotes, justifications) {
    // Belt-and-braces alongside Questionnaire.jsx's own button guard — a
    // second concurrent call here would re-submit an already-submitted
    // response and hit the RLS policy that freezes it.
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await finishLiveSession({
        assessmentId: activeAssessment.id, liveSessionId: liveSession.id, submissionId: sessionProgress.submissionId,
        ratings, sessionNotes, justifications, justificationMode: activeAssessment.justificationMode || justificationMode,
      });
      reloadAssessments();
      onChanged?.();
      setFlowStep('overview');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // ---- Overview actions ----

  async function handleEdit(a) {
    if (readOnly) return;
    setError('');
    try {
      // Re-editing setup reads the assessment's own already-created iros
      // (not the master library) — their ids are what topicOverrides must
      // key against, and re-editing never re-snapshots or resets them.
      const { iros } = await fetchDashboard(a.id);
      setAssessmentMode(a.type);
      setPerspectiveFilter('full');
      setSurveyMeta({ name: a.name, description: a.description || '', logo: null, startDate: a.startDate, endDate: a.endDate, slug: a.slug, financialYear: a.financialYear, esrsVersion: a.esrsVersion });
      setWelcomeText(a.welcomeText || '');
      setTaskText(a.taskText || '');
      setMandatory(!!a.mandatory);
      setJustificationMode(a.justificationMode || 'per_criterion');
      setAdjustingId(a.id);
      setActiveAssessment(a);
      setCandidateIros(iros);
      setFlowStep('survey-details');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(a) {
    if (readOnly) return;
    if (!window.confirm(`Delete "${a.name}"? Any draft responses, their ratings and justifications, and any paused live-session data go with it. This is refused if the assessment has any submitted response, to keep the audit trail.`)) return;
    try {
      await deleteAssessment(a.id);
      reloadAssessments();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  }

  // ---- Render ----

  if (loading) return <p className="text-[13px] text-text-secondary">Loading…</p>;

  const errorBanner = error && <p className="text-[12px] text-badge-amber mb-4">{error}</p>;
  const showBreadcrumb = ['mode', 'perspective', 'survey-details', 'review', 'recipients', 'expert-created'].includes(flowStep);

  return (
    <div>
      {errorBanner}
      {showBreadcrumb && (
        <WizardBreadcrumb
          flowStep={flowStep}
          mode={assessmentMode}
          onJump={(step) => setFlowStep(step)}
        />
      )}

      {flowStep === 'overview' && (
        <AssessmentOverview
          assessments={assessments
            .filter((a) => !perspective || a.perspectiveFilter === 'full' || a.perspectiveFilter === perspective)
            .map((a) => ({ ...a, type: TYPE_LABEL[a.type] ?? a.type }))}
          onNew={() => { resetDraft(); setFlowStep('mode'); }}
          onEdit={(a) => handleEdit(assessments.find((x) => x.id === a.id))}
          onPreview={(a) => openReviewHub(assessments.find((x) => x.id === a.id))}
          onViewResults={(a) => onViewResults?.(assessments.find((x) => x.id === a.id))}
          onDelete={(a) => handleDelete(a)}
          onRecipients={(a) => openRecipientsDirect(assessments.find((x) => x.id === a.id))}
          onGoDirect={(a) => goDirect(assessments.find((x) => x.id === a.id))}
          readOnly={readOnly}
        />
      )}

      {flowStep === 'mode' && <AssessmentModeSelect onSelect={handleModeSelect} />}

      {flowStep === 'perspective' && (
        <PerspectiveSelect mode={assessmentMode} onSelect={handlePerspectiveSelect} onBack={() => setFlowStep('mode')} />
      )}

      {flowStep === 'survey-details' && (
        <SurveySetupStep
          mode={assessmentMode}
          modeLabel={TYPE_LABEL[assessmentMode]}
          defaultNameHint={`${TYPE_LABEL[assessmentMode]} — ${new Date().getFullYear()}`}
          value={surveyMeta}
          onChange={setSurveyMeta}
          onProceed={handleSurveyDetailsProceed}
          onBack={() => setFlowStep('perspective')}
          cycleForYear={cycleForYear}
        />
      )}

      {flowStep === 'review' && (
        <SetupReviewStep
          mode={assessmentMode}
          surveyName={surveyMeta.name}
          perspectiveFilter={perspectiveFilter}
          iros={candidateIros}
          welcomeText={welcomeText} setWelcomeText={setWelcomeText}
          taskText={taskText} setTaskText={setTaskText}
          stakeholders={stakeholdersChoice} setStakeholders={setStakeholdersChoice}
          topicOverrides={topicOverrides} setTopicOverrides={setTopicOverrides} onDeleteTopic={handleDeleteTopic}
          mandatory={mandatory} setMandatory={setMandatory}
          justificationMode={justificationMode} setJustificationMode={setJustificationMode}
          onBack={() => setFlowStep('survey-details')}
          onCreate={handleCreate}
        />
      )}

      {flowStep === 'recipients' && (
        <RecipientsScreen
          mode={assessmentMode}
          perspectiveFilter={perspectiveFilter || 'full'}
          stakeholderMap={stakeholderMap}
          setStakeholderMap={setStakeholderMap}
          onBack={() => setFlowStep(recipientsBackTarget)}
          onContinue={handleRecipientsContinue}
          onGoToStakeholders={() => onGoToStakeholders?.()}
        />
      )}

      {flowStep === 'expert-created' && (
        <ExpertAssessmentCreated
          mode={assessmentMode}
          surveyName={surveyMeta.name}
          assessmentSlug={activeAssessment.slug}
          invitations={activeInvitations.map((inv) => ({ id: inv.id, name: inv.name, email: inv.email, groupName: inv.groupName, status: inv.status, link: buildPersonalLink(activeAssessment.slug, inv.linkCode) }))}
          startDate={surveyMeta.startDate}
          endDate={surveyMeta.endDate}
          alreadyRun={false}
          participantCount={activeParticipantCount}
          hasStakeholderGroups={stakeholderMap.some((g) => g.perspectives.includes('impact') || g.perspectives.includes('financial'))}
          readOnly={readOnly}
          onCopyInvitation={handleCopyInvitation}
          onPreview={() => openReviewHub(activeAssessment)}
          onKickOff={() => enterLiveSession(activeAssessment)}
          onGoToRecipients={() => openRecipientsDirect(activeAssessment)}
          onGoToStakeholders={() => onGoToStakeholders?.()}
          onGoToOverview={() => { reloadAssessments(); setFlowStep('overview'); }}
        />
      )}

      {flowStep === 'review-hub' && activeAssessment && (
        <AssessmentReviewHub
          mode={activeAssessment.type}
          perspectiveFilter="full"
          iros={activeIros}
          logo={null}
          companyName=""
          welcomeText={activeAssessment.welcomeText || ''}
          taskText={activeAssessment.taskText || ''}
          stakeholders={stakeholdersChoice}
          topicOverrides={{}}
          onSaveAndExit={handleReviewHubSaveAndExit}
          onDiscardAndExit={() => setFlowStep('overview')}
          onGoDirect={() => goDirect(activeAssessment)}
          readOnly={readOnly}
        />
      )}

      {flowStep === 'intro' && activeAssessment && (
        <IntroFlow
          welcomeText={activeAssessment.welcomeText || QUAL_EXPERT_WELCOME}
          taskText={activeAssessment.taskText || IMPACT_TASK}
          logo={null}
          participants={(liveSession?.participants || []).map((p) => ({ name: p.name, title: (p.expertise || []).join(', ') }))}
          onDone={() => setFlowStep('questionnaire')}
        />
      )}

      {flowStep === 'questionnaire' && activeAssessment && sessionProgress && (
        <Questionnaire
          perspectiveFilter="full"
          iros={activeIros}
          onFinish={handleQuestionnaireFinish}
          topicOverrides={{}}
          mandatory={!!activeAssessment.mandatory}
          initialRatings={sessionProgress.ratings}
          initialIndex={sessionProgress.currentTopicIndex}
          onProgress={handleQuestionnaireProgress}
          onExit={() => setFlowStep('overview')}
          justificationMode={activeAssessment.justificationMode || justificationMode}
          initialJustifications={sessionProgress.justifications}
          participants={(liveSession?.participants || []).map((p) => ({ name: p.name }))}
          readOnly={liveSessionReadOnly}
          startFinished={liveSessionReadOnly}
        />
      )}

      {busy && <p className="text-[11px] text-text-secondary mt-4">Saving…</p>}
    </div>
  );
}

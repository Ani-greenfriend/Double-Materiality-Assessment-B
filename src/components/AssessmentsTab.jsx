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
  updateAssessment, updateIroOverrides, findCycleForFinancialYear, getOrCreateCycleForFinancialYear,
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

export default function AssessmentsTab({ perspective, userId, onChanged, onViewResults }) {
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
  const [participantsChoice, setParticipantsChoice] = useState([]);
  const [topicOverrides, setTopicOverrides] = useState({});
  const [mandatory, setMandatory] = useState(false);
  const [justificationMode, setJustificationMode] = useState('per_criterion');
  const [adjustingId, setAdjustingId] = useState(null);
  const [candidateIros, setCandidateIros] = useState([]);
  const [cycleForYear, setCycleForYear] = useState(null);

  const [stakeholderMap, setStakeholderMapLocal] = useState([]);

  // ---- runtime state for Created / Review Hub / Intro / Questionnaire ----
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [activeInvitations, setActiveInvitations] = useState([]);
  const [activeIros, setActiveIros] = useState([]);
  const [liveSession, setLiveSession] = useState(null);
  const [sessionProgress, setSessionProgress] = useState(null);

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
    setParticipantsChoice([]);
    setTopicOverrides({});
    setMandatory(false);
    setJustificationMode('per_criterion');
    setAdjustingId(null);
    setCandidateIros([]);
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
        setActiveAssessment({ id: created.id, slug: created.slug, name: surveyMeta.name, type: assessmentMode });
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
        groupId: stakeholderMap.find((g) => g.name === p.groupName)?.id ?? null,
      }));

      if (assessmentMode === 'expert_survey') {
        const { skipped } = await createInvitationsFromRecipients(activeAssessment.id, people);
        if (skipped.length) setError(`No email on file for: ${skipped.join(', ')} — they weren't invited. Add an email in Stakeholders, or add them manually from Recipients.`);
        const invitations = await fetchInvitations(activeAssessment.id);
        setActiveInvitations(invitations);
      } else {
        const { liveSession: ls } = await fetchLiveSessionWithParticipants(activeAssessment.id);
        await addParticipantsFromRecipients(ls.id, people, userId);
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

  function handleCopyInvitation(inv) {
    navigator.clipboard?.writeText(inv.link).catch(() => {});
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
    setError('');
    try {
      const { iros } = await fetchDashboard(assessment.id);
      setActiveIros(iros);
      setActiveAssessment(assessment);
      const { liveSession: ls, participants } = await fetchLiveSessionWithParticipants(assessment.id);
      setLiveSession({ ...ls, participants: participants.filter((p) => !p.removed_at) });
      const progress = await fetchLiveSessionProgress(assessment.id, ls.id);
      setSessionProgress(progress);
      setFlowStep(progress.currentTopicIndex > 0 || Object.keys(progress.ratings).length > 0 ? 'questionnaire' : 'intro');
    } catch (err) {
      setError(err.message);
    }
  }

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
    if (!window.confirm(`Delete "${a.name}"? This only succeeds if it has no responses at all.`)) return;
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
  const showBreadcrumb = ['mode', 'perspective', 'survey-details', 'review', 'recipients'].includes(flowStep);

  return (
    <div>
      {errorBanner}
      {showBreadcrumb && (
        <WizardBreadcrumb
          flowStep={flowStep}
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
          participants={participantsChoice} setParticipants={setParticipantsChoice}
          stakeholderMap={stakeholderMap} setStakeholderMap={setStakeholderMap}
          topicOverrides={topicOverrides} setTopicOverrides={setTopicOverrides}
          mandatory={mandatory} setMandatory={setMandatory}
          onBack={() => setFlowStep('survey-details')}
          onCreate={handleCreate}
        />
      )}

      {flowStep === 'recipients' && (
        <RecipientsScreen
          mode={assessmentMode}
          stakeholders={stakeholdersChoice}
          stakeholderMap={stakeholderMap}
          onBack={() => setFlowStep('review')}
          onContinue={handleRecipientsContinue}
          onGoToStakeholders={() => setError('Add more stakeholders from the Stakeholders tab, then come back and continue.')}
        />
      )}

      {flowStep === 'expert-created' && (
        <ExpertAssessmentCreated
          mode={assessmentMode}
          surveyName={surveyMeta.name}
          invitations={activeInvitations.map((inv) => ({ id: inv.id, name: inv.name, link: buildPersonalLink(activeAssessment.slug, inv.linkCode) }))}
          startDate={surveyMeta.startDate}
          endDate={surveyMeta.endDate}
          alreadyRun={false}
          onCopyInvitation={handleCopyInvitation}
          onPreview={() => openReviewHub(activeAssessment)}
          onKickOff={() => enterLiveSession(activeAssessment)}
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
        />
      )}

      {busy && <p className="text-[11px] text-text-secondary mt-4">Saving…</p>}
    </div>
  );
}

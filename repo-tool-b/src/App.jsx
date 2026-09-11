import { useState, useRef, useEffect } from 'react';
import ApusLogo from './components/ApusLogo';
import Dashboard from './components/Dashboard';
import AssessmentOverview from './components/AssessmentOverview';
import AssessmentModeSelect from './components/AssessmentModeSelect';
import PerspectiveSelect from './components/PerspectiveSelect';
import SurveySetupStep from './components/SurveySetupStep';
import CsvUploadStep from './components/CsvUploadStep';
import SetupReviewStep, { DEFAULT_WELCOME, QUAL_EXPERT_WELCOME, IMPACT_TASK, FINANCIAL_TASK, DEFAULT_STAKEHOLDERS } from './components/SetupReviewStep';
import ExpertAssessmentCreated from './components/ExpertAssessmentCreated';
import IntroFlow from './components/IntroFlow';
import ParticipantExperience from './components/ParticipantExperience';
import Questionnaire from './components/Questionnaire';
import QuantAssessmentGrid from './components/QuantAssessmentGrid';
import CalibrationScreen from './components/CalibrationScreen';
import ResultsScreen from './components/ResultsScreen';
import DmaMascot from './components/DmaMascot';
import { DashboardIcon, AssessmentIcon, CalibrationIcon, ResultsIcon, CollapseIcon } from './components/icons';
import { hasImpactAxis } from './lib/calc';

const TABS = [
  { key: 'Dashboard', icon: DashboardIcon },
  { key: 'Assessment', icon: AssessmentIcon },
  { key: 'Calibration', icon: CalibrationIcon },
  { key: 'Results', icon: ResultsIcon },
];

const PERSPECTIVE_LABEL = { full: 'Full', impact: 'Impact perspective', financial: 'Financial perspective' };

export default function App() {
  const [tab, setTab] = useState('Dashboard');
  const [collapsed, setCollapsed] = useState(false);

  const [iros, setIros] = useState([]);
  const [calibrations, setCalibrations] = useState({});
  const [assessments, setAssessments] = useState([]);

  const [flowStep, setFlowStep] = useState('overview');
  const [assessmentMode, setAssessmentMode] = useState(null); // 'quantitative' | 'qualitative'
  const [perspectiveFilter, setPerspectiveFilter] = useState(null); // 'full' | 'impact' | 'financial'
  const [surveyMeta, setSurveyMeta] = useState({});
  const [welcomeText, setWelcomeText] = useState(DEFAULT_WELCOME);
  const [taskText, setTaskText] = useState(IMPACT_TASK);
  const [stakeholders, setStakeholders] = useState(DEFAULT_STAKEHOLDERS);
  const [participants, setParticipants] = useState([]);
  const [topicOverrides, setTopicOverrides] = useState({});
  const [mandatory, setMandatory] = useState(false);
  const [adjustingId, setAdjustingId] = useState(null);
  const [sessionRatings, setSessionRatings] = useState({});
  const [sessionIndex, setSessionIndex] = useState(0);
  const [sessionAssessmentId, setSessionAssessmentId] = useState(null);

  // Entering the live session for a different assessment than whatever was
  // last in progress starts that assessment's own fresh progress; entering
  // the SAME one again resumes exactly where it was left.
  function enterLiveSession(id) {
    const resuming = id === sessionAssessmentId && (sessionIndex > 0 || Object.keys(sessionRatings).length > 0);
    if (!resuming) {
      setSessionRatings({});
      setSessionIndex(0);
      setSessionAssessmentId(id);
    }
    // Resuming skips the intro screens entirely — those are for a fresh
    // start, not for picking back up mid-way through the rating itself.
    setFlowStep(resuming ? 'questionnaire' : 'intro');
  }
  const adjustingIdRef = useRef(null);
  useEffect(() => { adjustingIdRef.current = adjustingId; }, [adjustingId]);

  function startNewAssessment() {
    setAdjustingId(null);
    setSurveyMeta({});
    setTopicOverrides({});
    setStakeholders(DEFAULT_STAKEHOLDERS);
    setParticipants([]);
    setFlowStep('mode');
  }

  function editAssessmentSetup(assessment) {
    setAssessmentMode(assessment.mode);
    setPerspectiveFilter(assessment.perspectiveFilter);
    setAdjustingId(assessment.id);
    if (assessment.config) {
      setSurveyMeta(assessment.config.surveyMeta || {});
      setWelcomeText(assessment.config.welcomeText || (assessment.mode === 'qualitative' ? QUAL_EXPERT_WELCOME : DEFAULT_WELCOME));
      setTaskText(assessment.config.taskText || IMPACT_TASK);
      setStakeholders(assessment.config.stakeholders || DEFAULT_STAKEHOLDERS);
      setParticipants(assessment.config.participants || []);
      setTopicOverrides(assessment.config.topicOverrides || {});
      setMandatory(assessment.config.mandatory || false);
    }
    setFlowStep('survey-details');
  }

  function previewAssessment(assessment) {
    setAssessmentMode(assessment.mode);
    setPerspectiveFilter(assessment.perspectiveFilter);
    if (assessment.config) {
      setSurveyMeta(assessment.config.surveyMeta || {});
      setWelcomeText(assessment.config.welcomeText || (assessment.mode === 'qualitative' ? QUAL_EXPERT_WELCOME : DEFAULT_WELCOME));
      setTaskText(assessment.config.taskText || IMPACT_TASK);
      setStakeholders(assessment.config.stakeholders || DEFAULT_STAKEHOLDERS);
      setParticipants(assessment.config.participants || []);
      setTopicOverrides(assessment.config.topicOverrides || {});
      setMandatory(assessment.config.mandatory || false);
    }
    if (assessment.mode === 'quantitative') {
      setFlowStep('preview');
    } else {
      enterLiveSession(assessment.id);
    }
  }

  // Real cross-tab handoff: a submission written by the preview window (a
  // genuinely separate tab of the same origin) triggers this in the main
  // window via the native 'storage' event — no polling, no backend needed
  // for this to work within one browser.
  useEffect(() => {
    function onStorage(e) {
      if (!e.key || !e.key.startsWith('apus_submission_') || !e.newValue) return;
      const { assessmentId, answers, relevantIroIds } = JSON.parse(e.newValue);

      setIros((prev) => prev.map((iro) => {
        if (!relevantIroIds.includes(iro.id)) return iro;
        const isImpact = hasImpactAxis(iro.iroType);
        const get = (key) => {
          const v = answers[`${iro.id}::${key}`];
          return v === 'skipped' || v === undefined ? null : v;
        };
        const assessment = isImpact
          ? { assessor: 'Participant', scale: get('scale'), scope: get('scope'), irreversibility: iro.iroType === 'neg_impact' ? get('irreversibility') : null, likelihood: get('likelihood'), magnitude: null, financialLikelihood: null }
          : { assessor: 'Participant', scale: null, scope: null, irreversibility: null, likelihood: null, magnitude: get('magnitude'), financialLikelihood: get('financialLikelihood') };
        return { ...iro, assessments: [...iro.assessments, assessment] };
      }));

      setAssessments((prev) => prev.map((a) => {
        if (a.id !== assessmentId) return a;
        const [doneStr, totalStr] = (a.respondents || '0/?').split('/');
        const done = (parseInt(doneStr) || 0) + 1;
        return { ...a, respondents: `${done}/${totalStr === '?' ? done : totalStr}` };
      }));

      localStorage.removeItem(e.key);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);


  // Nothing typed during setup is ever silently lost — a draft row appears in
  // the Assessment overview from the moment mode+scope are picked, and is
  // kept current at each step. If the user navigates away, the draft simply
  // stays there instead of vanishing.
  function saveDraft(patch) {
    setAssessments((prev) => {
      const id = adjustingIdRef.current;
      if (id && prev.some((a) => a.id === id)) {
        return prev.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a));
      }
      const newId = crypto.randomUUID();
      adjustingIdRef.current = newId;
      setAdjustingId(newId);
      return [...prev, { id: newId, status: 'Draft', respondents: '0/?', createdAt: Date.now(), ...patch }];
    });
  }

  function onModeSelected(mode) {
    setAssessmentMode(mode);
    setWelcomeText(mode === 'qualitative' ? QUAL_EXPERT_WELCOME : DEFAULT_WELCOME);
    setFlowStep('perspective');
  }

  function onPerspectiveSelected(p) {
    setPerspectiveFilter(p);
    setTaskText(p === 'financial' ? FINANCIAL_TASK : IMPACT_TASK);
    saveDraft({
      name: 'Untitled draft',
      type: `${assessmentMode === 'quantitative' ? 'Quantitative' : 'Qualitative'} — ${PERSPECTIVE_LABEL[p]}`,
      mode: assessmentMode,
      perspectiveFilter: p,
    });
    setFlowStep('survey-details');
  }

  function onSurveyDetailsProceed(meta) {
    setSurveyMeta(meta);
    saveDraft({
      name: meta.name || 'Untitled draft',
      link: meta.slug ? `apus.app/survey/${meta.slug}` : undefined,
      startDate: meta.startDate,
      endDate: meta.endDate,
    });
    setFlowStep('upload');
  }

  function onCsvLoaded(loaded) {
    setIros(loaded);
    setTopicOverrides({});
    saveDraft({ iroIds: loaded.map((i) => i.id) });
    setFlowStep('review');
  }

  // Keep the draft's config current while the user is editing in Review,
  // so abandoning mid-edit never loses what was typed.
  useEffect(() => {
    if (adjustingId && (flowStep === 'review' || flowStep === 'survey-details')) {
      setAssessments((prev) => prev.map((a) => (a.id === adjustingId
        ? { ...a, config: { surveyMeta, welcomeText, taskText, stakeholders, participants, topicOverrides, mandatory } }
        : a)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [welcomeText, taskText, stakeholders, participants, topicOverrides, mandatory]);

  function onCreateQuestionnaire() {
    const record = {
      name: surveyMeta.name || 'Untitled survey',
      type: `${assessmentMode === 'quantitative' ? 'Quantitative' : 'Qualitative'} — ${PERSPECTIVE_LABEL[perspectiveFilter]}`,
      respondents: '0/?',
      mode: assessmentMode,
      perspectiveFilter,
      link: `apus.app/survey/${surveyMeta.slug}`,
      startDate: surveyMeta.startDate,
      endDate: surveyMeta.endDate,
      iroIds: iros.map((i) => i.id),
      config: { surveyMeta, welcomeText, taskText, stakeholders, participants, topicOverrides, mandatory },
      status: undefined, // clears any leftover 'Draft' status so date-based computation takes over for quant
    };
    if (adjustingId) {
      setAssessments((prev) => prev.map((a) => (a.id === adjustingId ? { ...a, ...record, updatedAt: Date.now() } : a)));
    } else {
      const newId = crypto.randomUUID();
      setAssessments((prev) => [...prev, { ...record, id: newId, createdAt: Date.now() }]);
      // So that actually running the qualitative session afterwards updates
      // this record instead of creating a duplicate on top of it.
      setAdjustingId(newId);
    }
    setFlowStep('expert-created');
  }

  function finishQuestionnaire(ratings, relevantIros) {
    setIros((prev) => prev.map((iro) => {
      const r = ratings[iro.id];
      if (!r) return iro;
      const isImpact = hasImpactAxis(iro.iroType);
      const assessment = isImpact
        ? { assessor: 'Live session', scale: r.scale, scope: r.scope, irreversibility: iro.iroType === 'neg_impact' ? r.irreversibility : null, likelihood: r.likelihood, magnitude: null, financialLikelihood: null }
        : { assessor: 'Live session', scale: null, scope: null, irreversibility: null, likelihood: null, magnitude: r.magnitude, financialLikelihood: r.financialLikelihood };
      const withoutPriorLive = iro.assessments.filter((a) => a.assessor !== 'Live session');
      return { ...iro, assessments: [...withoutPriorLive, assessment] };
    }));

    if (adjustingId) {
      setAssessments((prev) => prev.map((a) => {
        if (a.id !== adjustingId) return a;
        const isFirstRealRun = a.respondents === '0/?'; // created via "Create expert assessment" but never actually run yet
        return {
          ...a,
          status: 'Completed',
          respondents: `${relevantIros.length}/${relevantIros.length}`,
          name: isFirstRealRun || a.name.includes('(adjusted)') ? a.name : `${a.name} (adjusted)`,
          updatedAt: Date.now(),
        };
      }));
    } else {
      setAssessments((prev) => [...prev, {
        id: crypto.randomUUID(),
        name: surveyMeta.name || `${assessmentMode === 'quantitative' ? 'Quantitative' : 'Qualitative'} — ${new Date().toLocaleDateString()}`,
        type: `Qualitative — ${PERSPECTIVE_LABEL[perspectiveFilter]}`,
        status: 'Completed',
        respondents: `${relevantIros.length}/${relevantIros.length}`,
        mode: assessmentMode,
        perspectiveFilter,
        iroIds: relevantIros.map((i) => i.id),
        createdAt: Date.now(),
        config: { surveyMeta, welcomeText, taskText, stakeholders, participants, topicOverrides, mandatory },
      }]);
    }

    setSessionRatings({});
    setSessionIndex(0);
    setSessionAssessmentId(null);
    setFlowStep('overview');
    setTab('Calibration');
  }

  // Preview stays inside this tool — a full white-page takeover of the same
  // window, not a new tab. A banner + "Back to setup" makes it unmistakably
  // a preview, never confusable with the external participant link.
  if (tab === 'Assessment' && flowStep === 'preview') {
    return (
      <ParticipantExperience
        mode={assessmentMode} perspectiveFilter={perspectiveFilter} iros={iros}
        welcomeText={welcomeText} stakeholders={stakeholders}
        topicOverrides={topicOverrides} logo={surveyMeta.logo} companyName={surveyMeta.name}
        previewBanner
        onExitPreview={() => setFlowStep('overview')}
        onSubmit={() => {}}
      />
    );
  }

  return (
    <div
      className="min-h-screen flex"
      style={{
        backgroundColor: '#07070B',
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(76,111,255,0.06), transparent 60%)',
      }}
    >
      <aside
        className="border-r border-border-apus flex flex-col py-5 shrink-0 transition-all duration-200 relative overflow-hidden"
        style={{
          width: collapsed ? 64 : 200,
          backgroundColor: '#07070B',
          backgroundImage: `
            radial-gradient(ellipse 160% 70% at 10% 105%, rgba(76,111,255,0.42), transparent 65%),
            radial-gradient(ellipse 120% 55% at 100% -5%, rgba(76,111,255,0.20), transparent 60%),
            radial-gradient(circle, rgba(76,111,255,0.18) 1px, transparent 1px)
          `,
          backgroundSize: 'auto, auto, 18px 18px',
        }}
      >
        <button onClick={() => { setTab('Dashboard'); setFlowStep('overview'); }} className="flex flex-col items-center px-4 mb-8">
          {collapsed ? (
            <svg width="26" height="26" viewBox="0 0 350 320">
              <g transform="translate(0,320) scale(0.1,-0.1)">
                <path d="M265 2951 c11 -6 99 -41 195 -80 360 -143 577 -245 800 -374 248 -144 497 -354 588 -496 76 -117 102 -233 68 -300 -47 -91 -340 -292 -614 -422 -89 -42 -430 -189 -438 -189 -22 0 -104 -46 -104 -58 0 -12 12 -14 68 -10 53 4 87 15 163 52 64 31 133 54 207 70 60 14 136 36 168 49 33 13 97 37 144 52 47 15 115 43 152 61 36 19 113 51 170 73 57 22 148 61 203 86 55 26 143 66 195 89 53 23 134 65 180 93 77 46 175 97 390 204 41 20 109 58 150 83 41 26 91 51 111 56 19 5 60 28 90 49 30 22 77 52 104 67 l50 27 -72 13 c-39 6 -112 26 -162 43 -61 21 -108 31 -149 31 -65 0 -178 -30 -228 -61 -17 -10 -38 -19 -45 -19 -8 0 -31 35 -51 78 -43 90 -131 192 -221 256 -107 76 -446 227 -627 279 -302 87 -527 132 -895 177 -184 23 -627 38 -590 21z" fill="#4C6FFF" />
                <path d="M2870 1559 c-36 -27 -108 -75 -160 -105 -52 -31 -117 -70 -145 -87 -27 -17 -90 -52 -140 -79 -49 -27 -98 -58 -108 -67 -17 -17 -18 -21 -4 -47 8 -16 27 -67 42 -114 24 -72 28 -107 33 -231 4 -130 2 -158 -22 -270 -15 -68 -45 -176 -67 -239 -54 -152 -53 -150 -40 -150 23 0 259 242 345 355 186 243 298 472 341 700 15 76 21 338 9 369 -8 22 -10 21 -84 -35z" fill="#4C6FFF" />
              </g>
            </svg>
          ) : (
            <>
              <ApusLogo height={48} />
              <span className="text-[10px] text-text-secondary mt-1" style={{ fontFamily: 'var(--font-league)' }}>by greenfriend.</span>
            </>
          )}
        </button>

        <nav className="flex flex-col gap-1 px-2 flex-1">
          {TABS.map(({ key, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                // Clicking "Assessment" resets to the overview table — unless a
                // live session is genuinely in progress, in which case clicking
                // back into Assessment should land you exactly where you left it.
                const midSession = flowStep === 'questionnaire' || flowStep === 'intro';
                if (key === 'Assessment' && !midSession) setFlowStep('overview');
              }}
              title={key}
              className={`flex items-center gap-3 text-[13px] font-medium px-3 py-2.5 rounded-lg transition-colors ${tab === key ? 'bg-emerald text-app-black' : 'text-text-primary hover:bg-surface'}`}
            >
              <Icon />
              {!collapsed && <span>{key}</span>}
            </button>
          ))}
        </nav>

        <button onClick={() => setCollapsed((c) => !c)} className="flex items-center gap-3 text-[12px] text-text-secondary px-5 py-2 mt-4">
          <CollapseIcon />
          {!collapsed && <span>Collapse</span>}
        </button>
      </aside>

      <main className="flex-1 px-10 py-8 overflow-x-auto">
        <div className="max-w-6xl mx-auto">
          {tab === 'Dashboard' && (
            <Dashboard
              iros={iros} assessments={assessments} calibrations={calibrations}
              onGoToAssessment={() => { setTab('Assessment'); setFlowStep(assessments.length === 0 ? 'mode' : 'overview'); }}
            />
          )}

          {tab === 'Assessment' && flowStep === 'overview' && (
            <AssessmentOverview
              assessments={assessments} onNew={startNewAssessment} onEdit={editAssessmentSetup}
              onPreview={previewAssessment} onViewResults={() => setTab('Results')}
            />
          )}
          {tab === 'Assessment' && flowStep === 'mode' && (
            <AssessmentModeSelect onSelect={onModeSelected} />
          )}
          {tab === 'Assessment' && flowStep === 'perspective' && (
            <PerspectiveSelect mode={assessmentMode} onSelect={onPerspectiveSelected} onBack={() => setFlowStep('mode')} />
          )}
          {tab === 'Assessment' && flowStep === 'survey-details' && (
            <SurveySetupStep
              mode={assessmentMode}
              modeLabel={assessmentMode === 'quantitative' ? 'Quantitative' : 'Qualitative'}
              defaultNameHint={`${perspectiveFilter === 'financial' ? 'Financial' : 'Impact'} assessment of [Company]`}
              value={surveyMeta}
              onChange={setSurveyMeta}
              onProceed={onSurveyDetailsProceed}
              onBack={() => setFlowStep('perspective')}
            />
          )}
          {tab === 'Assessment' && flowStep === 'upload' && (
            <div>
              <button onClick={() => setFlowStep('survey-details')} className="text-[11.5px] text-text-secondary mb-4">← Back</button>
              <CsvUploadStep onLoaded={onCsvLoaded} />
            </div>
          )}
          {tab === 'Assessment' && flowStep === 'review' && (
            <SetupReviewStep
              mode={assessmentMode}
              surveyName={surveyMeta.name}
              perspectiveFilter={perspectiveFilter}
              iros={iros.filter((i) => perspectiveFilter === 'impact' ? hasImpactAxis(i.iroType) : perspectiveFilter === 'financial' ? !hasImpactAxis(i.iroType) : true)}
              welcomeText={welcomeText} setWelcomeText={setWelcomeText}
              taskText={taskText} setTaskText={setTaskText}
              stakeholders={stakeholders} setStakeholders={setStakeholders}
              participants={participants} setParticipants={setParticipants}
              topicOverrides={topicOverrides} setTopicOverrides={setTopicOverrides}
              mandatory={mandatory} setMandatory={setMandatory}
              onBack={() => setFlowStep('survey-details')}
              onCreate={onCreateQuestionnaire}
            />
          )}
          {tab === 'Assessment' && flowStep === 'expert-created' && (
            <ExpertAssessmentCreated
              mode={assessmentMode}
              surveyName={surveyMeta.name}
              startDate={surveyMeta.startDate}
              endDate={surveyMeta.endDate}
              link={`apus.app/survey/${surveyMeta.slug}`}
              onCopy={() => navigator.clipboard?.writeText(`apus.app/survey/${surveyMeta.slug}`).catch(() => {})}
              onPreview={() => {
                if (assessmentMode === 'quantitative') setFlowStep('preview');
              }}
              onKickOff={() => enterLiveSession(adjustingId)}
              onGoToOverview={() => setFlowStep('overview')}
            />
          )}
          {tab === 'Assessment' && flowStep === 'intro' && (
            <IntroFlow welcomeText={welcomeText} taskText={taskText} logo={surveyMeta.logo} participants={participants} onDone={() => setFlowStep('questionnaire')} />
          )}
          {tab === 'Assessment' && flowStep === 'questionnaire' && assessmentMode === 'quantitative' && (
            <QuantAssessmentGrid perspectiveFilter={perspectiveFilter} iros={iros} onFinish={finishQuestionnaire} topicOverrides={topicOverrides} mandatory={mandatory} />
          )}
          {tab === 'Assessment' && flowStep === 'questionnaire' && assessmentMode === 'qualitative' && (
            <Questionnaire
              perspectiveFilter={perspectiveFilter} iros={iros} onFinish={finishQuestionnaire}
              topicOverrides={topicOverrides} mandatory={mandatory}
              initialRatings={sessionRatings} initialIndex={sessionIndex}
              onProgress={(ratings, index) => { setSessionRatings(ratings); setSessionIndex(index); }}
              onExit={() => setFlowStep('overview')}
            />
          )}

          {tab === 'Calibration' && <CalibrationScreen iros={iros} calibrations={calibrations} setCalibrations={setCalibrations} assessments={assessments} />}
          {tab === 'Results' && <ResultsScreen iros={iros} calibrations={calibrations} />}
        </div>
      </main>
    </div>
  );
}

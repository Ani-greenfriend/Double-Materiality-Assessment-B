import { useEffect, useState, useCallback } from 'react';
import { supabaseConfigError } from './lib/supabaseClient';
import {
  getSession, onAuthStateChange, signOut, fetchAssessments, fetchDashboard, fetchStakeholderMaster,
  fetchCycles, fetchCycleIros, fetchTopicLibraryForSnapshot, fetchClients,
} from './lib/data';
import Login from './components/Login';
import ApusLogo from './components/ApusLogo';
import Dashboard from './components/Dashboard';
import StakeholdersTab from './components/StakeholdersTab';
import TopicsTab from './components/TopicsTab';
import AssessmentsTab from './components/AssessmentsTab';
import CalibrateResultsTab from './components/CalibrateResultsTab';
import ReportTab from './components/ReportTab';
import { DashboardIcon, StakeholderIcon, TopicsIcon, AssessmentIcon, CalibrationIcon, ReportIcon, CollapseIcon } from './components/icons';

// Nav item set and order per product-spec.md Section 8 "App shell and
// navigation" (v2.0 amended 6): Dashboard, Stakeholders, Topics, Assessments,
// Calibrate & Results, Report — no Cycles item; cycles exist only in the
// database now, never in the interface. Sidebar mechanics (collapsible
// rail, logo, icon+label buttons, its styling) are ported from
// reference-prototype/'s App.jsx as-is; there is no separate top tab bar.
const TABS = [
  { key: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { key: 'stakeholders', label: 'Stakeholders', Icon: StakeholderIcon },
  { key: 'topics', label: 'Topics', Icon: TopicsIcon },
  { key: 'assessments', label: 'Assessments', Icon: AssessmentIcon },
  { key: 'calibrate-results', label: 'Calibrate & Results', Icon: CalibrationIcon },
  { key: 'report', label: 'Report', Icon: ReportIcon },
];

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [assessments, setAssessments] = useState([]);
  const [assessmentId, setAssessmentId] = useState(null);
  const [iros, setIros] = useState([]);
  const [stakeholderMaster, setStakeholderMaster] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [tab, setTab] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Dashboard is scoped to one financial year — v2.0 amended 6: "a small
  // financial year selector appears only when more than one financial year
  // has assessments." Cycles are never named or selected directly in the
  // interface; a financial year maps to exactly one cycle under the
  // one-client assumption (see getOrCreateCycleForFinancialYear in data.js).
  const [dashboardFinancialYear, setDashboardFinancialYear] = useState(null);
  const [dashboardIros, setDashboardIros] = useState([]);
  const [dashboardCalibrations, setDashboardCalibrations] = useState({});
  const [dashboardTopicLibrary, setDashboardTopicLibrary] = useState([]);

  const [assessmentsPerspective, setAssessmentsPerspective] = useState(null);
  const [crInitialSub, setCrInitialSub] = useState('results');

  // Lifted out of StakeholdersTab so the sidebar nav click can reset it —
  // otherwise clicking "Stakeholders" while inside a specific group's detail
  // view would do nothing, since the tab is already selected.
  const [openGroupId, setOpenGroupId] = useState(null);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    if (supabaseConfigError) {
      setSession(null);
      return;
    }
    getSession().then(setSession).catch((err) => { setSession(null); setLoadError(err.message); });
    const sub = onAuthStateChange(setSession);
    return () => sub.unsubscribe();
  }, []);

  const reloadCycles = useCallback(() => {
    fetchCycles().then(setCycles).catch((err) => setLoadError(err.message));
  }, []);

  const reloadAssessments = useCallback(() => {
    fetchAssessments()
      .then((rows) => {
        setAssessments(rows);
        setAssessmentId((id) => (rows.some((r) => r.id === id) ? id : rows[0]?.id ?? null));
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  const reloadCyclesAndAssessments = useCallback(() => {
    reloadCycles();
    reloadAssessments();
  }, [reloadCycles, reloadAssessments]);

  const reloadStakeholderMaster = useCallback(() => {
    fetchStakeholderMaster().then(setStakeholderMaster).catch((err) => setLoadError(err.message));
  }, []);

  useEffect(() => {
    if (!session) return;
    reloadAssessments();
    reloadCycles();
    reloadStakeholderMaster();
    fetchClients().then(setClients).catch((err) => setLoadError(err.message));
  }, [session, reloadAssessments, reloadCycles, reloadStakeholderMaster]);

  // Financial years that actually have assessments, newest first — the pool
  // the selector (and its default) draws from.
  const financialYearsWithAssessments = [...new Set(cycles.filter((c) => c.assessments.length > 0).map((c) => c.financialYear))].sort((a, b) => b - a);

  useEffect(() => {
    if (cycles.length && !cycles.some((c) => c.financialYear === dashboardFinancialYear)) {
      setDashboardFinancialYear(financialYearsWithAssessments[0] ?? cycles[0].financialYear);
    }
  }, [cycles, dashboardFinancialYear, financialYearsWithAssessments]);

  const dashboardCycle = cycles.find((c) => c.financialYear === dashboardFinancialYear) ?? null;

  const reloadDashboard = useCallback(() => {
    if (!dashboardCycle) {
      setDashboardIros([]);
      setDashboardCalibrations({});
      setDashboardTopicLibrary([]);
      return;
    }
    fetchCycleIros(dashboardCycle.id)
      .then(({ iros: rows, calibrations }) => { setDashboardIros(rows); setDashboardCalibrations(calibrations); })
      .catch((err) => setLoadError(err.message));
    fetchTopicLibraryForSnapshot({ esrsVersion: dashboardCycle.esrsVersion, clientId: dashboardCycle.clientId, perspective: 'full' })
      .then(setDashboardTopicLibrary)
      .catch((err) => setLoadError(err.message));
  }, [dashboardCycle]);

  useEffect(() => {
    reloadDashboard();
  }, [reloadDashboard]);

  const reload = useCallback(() => {
    if (!assessmentId) return;
    fetchDashboard(assessmentId)
      .then((d) => setIros(d.iros))
      .catch((err) => setLoadError(err.message));
  }, [assessmentId]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (supabaseConfigError) {
    return <div className="min-h-screen flex items-center justify-center p-6 text-[13px] text-badge-amber">Supabase is not configured: {supabaseConfigError}</div>;
  }

  if (session === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-[13px] text-text-secondary">Loading…</div>;
  }
  if (!session) return <Login />;

  const currentAssessment = assessments.find((a) => a.id === assessmentId) ?? null;
  // Dashboard.jsx (ported verbatim) expects two things the DB doesn't give
  // as-is: (1) `!a.status` meaning "still running" — v2.0's status is always
  // a truthy string, so this derives it from the cycle's stage instead,
  // still running while Collecting; (2) `createdAt`/`updatedAt` as
  // Date.now()-style epoch-ms numbers for its timeAgo() activity feed and
  // "closing soon" day-count, not the DB's ISO timestamp strings.
  const dashboardAssessmentsForHeader = (dashboardCycle?.assessments ?? []).map((a) => ({
    ...a,
    status: dashboardCycle.stage === 'collecting' ? undefined : dashboardCycle.stage,
    createdAt: a.createdAt ? new Date(a.createdAt).getTime() : 0,
  }));
  const thresholds = {
    impact: currentAssessment?.cycle?.impactThreshold ?? 3.0,
    financial: currentAssessment?.cycle?.financialThreshold ?? 3.0,
  };

  // Section 8, App shell: the two assessment cards open Assessments filtered
  // by perspective; Calibration opens Calibrate & Results on the Calibrate
  // tab; Downloadable result opens the Report builder (not the old Results
  // tab — that behaviour moved under Report in v2.0).
  function onNavigate(step) {
    if (step === 'stakeholders') { setTab('stakeholders'); setOpenGroupId(null); }
    else if (step === 'topics') setTab('topics');
    else if (step === 'assessment-impact') { setAssessmentsPerspective('impact'); setTab('assessments'); }
    else if (step === 'assessment-financial') { setAssessmentsPerspective('financial'); setTab('assessments'); }
    else if (step === 'calibration') { setCrInitialSub('calibrate'); setTab('calibrate-results'); }
    else if (step === 'results') setTab('report');
  }

  return (
    <div
      className="min-h-screen flex"
      style={{
        backgroundColor: '#07070B',
        backgroundImage: 'radial-gradient(ellipse 70% 45% at 50% -5%, rgba(76,111,255,0.14), transparent 60%), radial-gradient(ellipse 50% 35% at 100% 20%, rgba(94,217,150,0.05), transparent 55%)',
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
        <button onClick={() => setTab('dashboard')} className="flex flex-col items-center px-4 mb-4">
          {collapsed ? (
            <svg width="26" height="26" viewBox="0 0 350 320">
              <g transform="translate(0,320) scale(0.1,-0.1)">
                <path d="M265 2951 c11 -6 99 -41 195 -80 360 -143 577 -245 800 -374 248 -144 497 -354 588 -496 76 -117 102 -233 68 -300 -47 -91 -340 -292 -614 -422 -89 -42 -430 -189 -438 -189 -22 0 -104 -46 -104 -58 0 -12 12 -14 68 -10 53 4 87 15 163 52 64 31 133 54 207 70 60 14 136 36 168 49 33 13 97 37 144 52 47 15 115 43 152 61 36 19 113 51 170 73 57 22 148 61 203 86 55 26 143 66 195 89 53 23 134 65 180 93 77 46 175 97 390 204 41 20 109 58 150 83 41 26 91 51 111 56 19 5 60 28 90 49 30 22 77 52 104 67 l50 27 -72 13 c-39 6 -112 26 -162 43 -61 21 -108 31 -149 31 -65 0 -178 -30 -228 -61 -17 -10 -38 -19 -45 -19 -8 0 -31 35 -51 78 -43 90 -131 192 -221 256 -107 76 -446 227 -627 279 -302 87 -527 132 -895 177 -184 23 -627 38 -590 21z" fill="#4C6FFF" />
                <path d="M2870 1559 c-36 -27 -108 -75 -160 -105 -52 -31 -117 -70 -145 -87 -27 -17 -90 -52 -140 -79 -49 -27 -98 -58 -108 -67 -17 -17 -18 -21 -4 -47 8 -16 27 -67 42 -114 24 -72 28 -107 33 -231 4 -130 2 -158 -22 -270 -15 -68 -45 -176 -67 -239 -54 -152 -53 -150 -40 -150 23 0 259 242 345 355 186 243 298 472 341 700 15 76 21 338 9 369 -8 22 -10 21 -84 -35z" fill="#5ED996" />
              </g>
            </svg>
          ) : (
            <>
              <ApusLogo height={40} />
              <span className="text-[10px] text-text-secondary mt-1">by greenfriend.</span>
            </>
          )}
        </button>

        {!collapsed && (
          <div className="px-4 pb-4 mb-2 border-b border-border-apus">
            <p className="text-[10.5px] text-text-secondary truncate mb-1.5">{session.user.email}</p>
            <button onClick={signOut} className="text-[11.5px] text-text-secondary hover:text-text-primary">Sign out</button>
          </div>
        )}

        <nav className="flex flex-col gap-1 px-2 flex-1">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); if (key === 'stakeholders') setOpenGroupId(null); }}
              title={label}
              className={`flex items-center gap-3 text-[13px] font-medium px-3 py-2.5 rounded-lg transition-colors ${tab === key ? 'bg-emerald text-app-black' : 'text-text-primary hover:bg-surface'}`}
            >
              <Icon />
              {!collapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>

        <button onClick={() => setCollapsed((c) => !c)} className="flex items-center gap-3 text-[12px] text-text-secondary px-5 py-2 mt-2">
          <CollapseIcon />
          {!collapsed && <span>Collapse</span>}
        </button>
      </aside>

      <main className="flex-1 px-10 py-8 overflow-x-auto">
        <div className="max-w-6xl mx-auto">
          {loadError && <p className="text-[12px] text-badge-amber mb-4">{loadError}</p>}

          {tab === 'dashboard' && (
            <div>
              {financialYearsWithAssessments.length > 1 && (
                <div className="flex justify-end mb-3">
                  <select
                    value={dashboardFinancialYear ?? ''}
                    onChange={(e) => setDashboardFinancialYear(Number(e.target.value))}
                    className="bg-surface border border-border-apus rounded-lg px-3 py-1.5 text-[12px] outline-none"
                  >
                    {financialYearsWithAssessments.map((year) => <option key={year} value={year}>FY{year}</option>)}
                  </select>
                </div>
              )}
              <Dashboard
                assessments={dashboardAssessmentsForHeader}
                calibrations={dashboardCalibrations}
                iros={dashboardIros}
                stakeholderMap={stakeholderMaster}
                topicLibrary={dashboardTopicLibrary}
                onGoToAssessment={() => { setTab('stakeholders'); setOpenGroupId(null); }}
                onNavigate={onNavigate}
              />
            </div>
          )}
          {tab === 'stakeholders' && (
            <StakeholdersTab
              openGroupId={openGroupId} setOpenGroupId={setOpenGroupId}
              onGoNext={() => setTab('topics')}
              onChanged={reloadStakeholderMaster}
            />
          )}
          {tab === 'topics' && (
            <TopicsTab clients={clients} currentUserEmail={session.user.email} onGoNext={() => setTab('assessments')} />
          )}
          {tab === 'assessments' && (
            <AssessmentsTab
              perspective={assessmentsPerspective}
              userId={session.user.id}
              onChanged={reloadCyclesAndAssessments}
              onViewResults={(a) => { setAssessmentId(a.id); setCrInitialSub('results'); setTab('calibrate-results'); }}
            />
          )}
          {tab === 'report' && <ReportTab />}
          {tab === 'calibrate-results' && (
            <div>
              {assessments.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap mb-5">
                  <select
                    value={assessmentId ?? ''}
                    onChange={(e) => setAssessmentId(e.target.value)}
                    className="bg-surface border border-border-apus rounded-lg px-3 py-1.5 text-[12px] outline-none"
                  >
                    {assessments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.cycle?.clientName ? `${a.cycle.clientName} — ` : ''}{a.name} ({a.type === 'expert_live_session' ? 'Live session' : 'Survey'})
                      </option>
                    ))}
                  </select>
                  {currentAssessment?.cycle?.stage && (
                    <span className="text-[10.5px] font-semibold rounded-full px-2 py-0.5 border border-border-apus text-text-secondary uppercase tracking-wide">
                      {currentAssessment.cycle.stage.replace('_', ' ')} · {currentAssessment.cycle.stage === 'signed_off' ? 'Final' : 'Provisional'}
                    </span>
                  )}
                </div>
              )}
              {assessments.length === 0 ? (
                <div className="bg-surface rounded-2xl p-10 text-center text-text-secondary text-[13px]">No assessments yet — create one from the Assessments tab.</div>
              ) : (
                <CalibrateResultsTab
                  iros={iros}
                  thresholds={thresholds}
                  cycleId={currentAssessment?.cycle?.id ?? null}
                  locked={currentAssessment?.cycle?.stage !== 'calibrating'}
                  onChanged={reload}
                  initialSub={crInitialSub}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

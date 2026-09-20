import { useEffect, useState, useCallback } from 'react';
import { supabaseConfigError } from './lib/supabaseClient';
import { getSession, onAuthStateChange, signOut, fetchAssessments, fetchDashboard, fetchStakeholderMaster, participationByGroup, fetchCycles } from './lib/data';
import Login from './components/Login';
import ApusLogo from './components/ApusLogo';
import DashboardTab from './components/DashboardTab';
import CyclesTab from './components/CyclesTab';
import StakeholdersTab from './components/StakeholdersTab';
import TopicsTab from './components/TopicsTab';
import CalibrateResultsTab from './components/CalibrateResultsTab';
import ReportTab from './components/ReportTab';
import { DashboardIcon, CycleIcon, StakeholderIcon, TopicsIcon, CalibrationIcon, ReportIcon, CollapseIcon } from './components/icons';

// Nav item set follows product-spec.md Section 8's v2.0 IA (confirmed with
// the builder) rather than reference-prototype's pre-cycle six tabs: the
// prototype's separate Calibration/Results become one Calibrate & Results
// item, Cycles replaces the prototype's flat Assessment tab (assessments
// now live inside a cycle), and Report is new. Sidebar mechanics
// (collapsible rail, logo, icon+label buttons) are ported from the
// prototype's App.jsx as-is.
const TABS = [
  { key: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { key: 'cycles', label: 'Cycles', Icon: CycleIcon },
  { key: 'stakeholders', label: 'Stakeholders', Icon: StakeholderIcon },
  { key: 'topics', label: 'Topics', Icon: TopicsIcon },
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

  useEffect(() => {
    if (!session) return;
    reloadAssessments();
    reloadCycles();
    fetchStakeholderMaster().then(setStakeholderMaster).catch((err) => setLoadError(err.message));
  }, [session, reloadAssessments, reloadCycles]);

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

  const participation = participationByGroup(iros);
  const currentAssessment = assessments.find((a) => a.id === assessmentId) ?? null;
  const thresholds = {
    impact: currentAssessment?.cycle?.impactThreshold ?? 3.0,
    financial: currentAssessment?.cycle?.financialThreshold ?? 3.0,
  };

  function navigate(key) {
    setTab(key === 'calibrate-results' ? 'calibrate-results' : key);
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
        <button onClick={() => setTab('dashboard')} className="flex flex-col items-center px-4 mb-8">
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

        <nav className="flex flex-col gap-1 px-2 flex-1">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              title={label}
              className={`flex items-center gap-3 text-[13px] font-medium px-3 py-2.5 rounded-lg transition-colors ${tab === key ? 'bg-emerald text-app-black' : 'text-text-primary hover:bg-surface'}`}
            >
              <Icon />
              {!collapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>

        {!collapsed && (
          <div className="px-4 py-2 text-[10.5px] text-text-secondary truncate">{session.user.email}</div>
        )}
        <button onClick={signOut} className="flex items-center gap-3 text-[12px] text-text-secondary hover:text-text-primary px-5 py-1.5">
          {!collapsed && <span>Sign out</span>}
        </button>
        <button onClick={() => setCollapsed((c) => !c)} className="flex items-center gap-3 text-[12px] text-text-secondary px-5 py-2 mt-2">
          <CollapseIcon />
          {!collapsed && <span>Collapse</span>}
        </button>
      </aside>

      <main className="flex-1 px-10 py-8 overflow-x-auto">
        <div className="max-w-6xl mx-auto">
          {loadError && <p className="text-[12px] text-badge-amber mb-4">{loadError}</p>}

          {tab === 'dashboard' && <DashboardTab cycles={cycles} stakeholderMaster={stakeholderMaster} session={session} onNavigate={navigate} />}
          {tab === 'cycles' && <CyclesTab cycles={cycles} userId={session.user.id} onChanged={reloadCyclesAndAssessments} />}
          {tab === 'stakeholders' && <StakeholdersTab master={stakeholderMaster} participation={participation} />}
          {tab === 'topics' && <TopicsTab />}
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
                <div className="bg-surface rounded-2xl p-10 text-center text-text-secondary text-[13px]">No assessments yet — create one from a cycle in the Cycles tab (wizard coming next).</div>
              ) : (
                <CalibrateResultsTab
                  iros={iros}
                  thresholds={thresholds}
                  cycleId={currentAssessment?.cycle?.id ?? null}
                  locked={currentAssessment?.cycle?.stage !== 'calibrating'}
                  onChanged={reload}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

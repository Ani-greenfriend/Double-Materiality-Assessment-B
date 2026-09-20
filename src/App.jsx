import { useEffect, useState, useCallback } from 'react';
import { supabaseConfigError } from './lib/supabaseClient';
import { getSession, onAuthStateChange, signOut, fetchAssessments, fetchDashboard, fetchStakeholderMaster, participationByGroup } from './lib/data';
import Login from './components/Login';
import ResultsTab from './components/ResultsTab';
import StakeholdersTab from './components/StakeholdersTab';
import CalibrationTab from './components/CalibrationTab';

const TABS = [
  { id: 'results', label: 'Results' },
  { id: 'stakeholders', label: 'Stakeholders' },
  { id: 'calibration', label: 'Calibration' },
];

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [assessments, setAssessments] = useState([]);
  const [assessmentId, setAssessmentId] = useState(null);
  const [iros, setIros] = useState([]);
  const [stakeholderMaster, setStakeholderMaster] = useState([]);
  const [tab, setTab] = useState('results');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (supabaseConfigError) {
      setSession(null);
      return;
    }
    getSession().then(setSession).catch(() => setSession(null));
    const sub = onAuthStateChange(setSession);
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchAssessments()
      .then((rows) => {
        setAssessments(rows);
        if (rows.length) setAssessmentId((id) => id ?? rows[0].id);
      })
      .catch((err) => setLoadError(err.message));
    fetchStakeholderMaster().then(setStakeholderMaster).catch((err) => setLoadError(err.message));
  }, [session]);

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

  if (session === undefined) return null;
  if (!session) return <Login />;

  const participation = participationByGroup(iros);
  const currentAssessment = assessments.find((a) => a.id === assessmentId) ?? null;
  const thresholds = {
    impact: currentAssessment?.cycle?.impactThreshold ?? 3.0,
    financial: currentAssessment?.cycle?.financialThreshold ?? 3.0,
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border-apus px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <p className="font-jost text-[16px]">apus</p>
          {assessments.length > 0 && (
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
          )}
          {currentAssessment?.cycle?.stage && (
            <span className="text-[10.5px] font-semibold rounded-full px-2 py-0.5 border border-border-apus text-text-secondary uppercase tracking-wide">
              {currentAssessment.cycle.stage.replace('_', ' ')} · {currentAssessment.cycle.stage === 'signed_off' ? 'Final' : 'Provisional'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11.5px] text-text-secondary">{session.user.email}</span>
          <button onClick={signOut} className="text-[12px] text-text-secondary hover:text-text-primary">Sign out</button>
        </div>
      </header>

      <nav className="px-6 pt-4 flex gap-2 border-b border-border-apus">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-[13px] px-3 py-2 rounded-t-lg -mb-px border-b-2 ${tab === t.id ? 'border-badge-blue text-text-primary' : 'border-transparent text-text-secondary'}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="px-6 py-6 max-w-5xl mx-auto">
        {loadError && <p className="text-[12px] text-badge-amber mb-4">{loadError}</p>}
        {!assessments.length ? (
          <div className="bg-surface rounded-2xl p-10 text-center text-text-secondary text-[13px]">No assessments yet — create one in the New Assessment wizard (not built yet) or via Supabase directly.</div>
        ) : (
          <>
            {tab === 'results' && <ResultsTab iros={iros} thresholds={thresholds} />}
            {tab === 'stakeholders' && <StakeholdersTab master={stakeholderMaster} participation={participation} />}
            {tab === 'calibration' && (
              <CalibrationTab
                iros={iros}
                thresholds={thresholds}
                cycleId={currentAssessment?.cycle?.id ?? null}
                locked={currentAssessment?.cycle?.stage !== 'calibrating'}
                onChanged={reload}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { fetchTopicLibraryCount } from '../lib/data';
import { StakeholderIcon, TopicsIcon, AssessmentIcon, CalibrationIcon, ReportIcon, CycleIcon } from './icons';

// Ported from reference-prototype/src/components/Dashboard.jsx — same hero
// banner + six-step process row + overview layout, adapted to v2.0's cycle-
// based steps (Cycle, Stakeholders, Topics, Assessments, Calibrate &
// Results, Report) per product-spec.md Section 8's Dashboard description.

function StartButton({ hasCycles, onClick }) {
  return (
    <div className="relative mb-9">
      <div
        className="absolute -inset-4 rounded-[32px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 80% at 20% 50%, rgba(76,111,255,0.35), transparent 70%), radial-gradient(ellipse 50% 80% at 90% 50%, rgba(94,217,150,0.25), transparent 70%)', filter: 'blur(18px)' }}
      />
      <button
        onClick={onClick}
        className="relative w-full flex items-center justify-between rounded-[28px] px-7 py-6 text-left transition-transform hover:scale-[1.005] overflow-hidden"
        style={{ background: 'linear-gradient(115deg, #3654D6 0%, #4C6FFF 45%, #2FA88A 100%)', boxShadow: '0 20px 44px -14px rgba(76,111,255,0.55)' }}
      >
        <div className="flex items-center gap-4 relative z-10">
          <span className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.16)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)' }}>
            <CycleIcon size={26} />
          </span>
          <div>
            <p className="text-[20px] font-bold text-white">{hasCycles ? 'Continue your assessment' : 'Start your double materiality assessment'}</p>
            <p className="text-[12.5px] mt-1" style={{ color: 'rgba(245,246,250,0.9)' }}>
              {hasCycles ? 'Pick up where you left off.' : 'Set up a cycle, map stakeholders, select topics, and start rating.'}
            </p>
          </div>
        </div>
        <span className="relative z-10 flex items-center gap-2 rounded-full pl-5 pr-2 py-2 text-[13px] font-bold shrink-0 ml-4" style={{ background: '#F5F6FA', color: '#111318' }}>
          Get started
          <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#111318', color: '#F5F6FA' }}>→</span>
        </span>
      </button>
    </div>
  );
}

function ProcessStep({ step, progress, onClick, isLast }) {
  const [hover, setHover] = useState(false);
  const { Icon } = step;
  return (
    <div className="relative flex items-center">
      <button
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="relative text-left rounded-2xl p-4 pb-3.5 transition-transform hover:-translate-y-0.5 flex-1 min-w-0"
        style={{ background: 'var(--color-surface)', border: '1px solid #232129' }}
      >
        <span className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-white" style={{ background: step.gradient, boxShadow: '0 6px 14px -4px rgba(0,0,0,0.4)' }}>
          <Icon size={18} />
        </span>
        <p className="text-[12.5px] font-semibold leading-snug mb-2.5">{step.title}</p>
        <span className="text-[10px] font-semibold rounded-full px-2 py-1 inline-block whitespace-nowrap" style={{ background: '#1A1820', color: '#ACACB8' }}>
          {progress}
        </span>
        {hover && (
          <div className="absolute left-0 right-0 top-full mt-2 z-20 rounded-xl p-3 text-[11.5px] leading-relaxed shadow-xl" style={{ background: '#100E15', border: '1px solid #2A2830', color: '#ACACB8' }}>
            {step.blurb}
          </div>
        )}
      </button>
      {!isLast && (
        <span className="shrink-0 mx-1 text-text-secondary" style={{ opacity: 0.5 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 6l6 6-6 6" /></svg>
        </span>
      )}
    </div>
  );
}

function timeAgo(ts) {
  const mins = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

const STAGE_LABEL = { collecting: 'Collecting', calibrating: 'Calibrating', signed_off: 'Signed off' };

export default function DashboardTab({ cycles, stakeholderMaster, session, onNavigate }) {
  const [selectedCycleId, setSelectedCycleId] = useState(cycles[0]?.id ?? null);
  const [topicCount, setTopicCount] = useState(null);

  const selectedCycle = cycles.find((c) => c.id === selectedCycleId) ?? cycles[0] ?? null;

  useEffect(() => {
    if (cycles.length && !cycles.some((c) => c.id === selectedCycleId)) setSelectedCycleId(cycles[0].id);
  }, [cycles, selectedCycleId]);

  useEffect(() => {
    if (!selectedCycle) {
      setTopicCount(null);
      return;
    }
    fetchTopicLibraryCount(selectedCycle.esrsVersion).then(setTopicCount).catch(() => setTopicCount(null));
  }, [selectedCycle]);

  const activeGroups = stakeholderMaster.filter((g) => g.members.length > 0);
  const totalPeople = activeGroups.reduce((sum, g) => sum + g.members.length, 0);

  const cycleAssessments = selectedCycle?.assessments ?? [];
  const submittedCount = cycleAssessments.reduce((sum, a) => sum + a.submittedCount, 0);

  const STEPS = [
    {
      key: 'cycles', title: 'Cycle', Icon: CycleIcon,
      gradient: 'linear-gradient(135deg, #6C8CFF, #4C6FFF)',
      blurb: 'The financial year, ESRS version, client and thresholds this DMA round runs against.',
      progress: selectedCycle ? `${STAGE_LABEL[selectedCycle.stage] ?? selectedCycle.stage} · FY${selectedCycle.financialYear}` : 'No cycles yet',
    },
    {
      key: 'stakeholders', title: 'Stakeholders', Icon: StakeholderIcon,
      gradient: 'linear-gradient(135deg, #5ED996, #2FA88A)',
      blurb: 'Build the map of who is relevant — internally and externally, including silent stakeholders such as nature.',
      progress: activeGroups.length > 0 ? `${activeGroups.length} groups · ${totalPeople} people` : 'Not started',
    },
    {
      key: 'topics', title: 'Topics', Icon: TopicsIcon,
      gradient: 'linear-gradient(135deg, #7C9BFF, #4C6FFF)',
      blurb: 'The master library of ESRS Impacts, Risks and Opportunities this cycle draws from.',
      progress: topicCount === null ? 'Not started' : `${topicCount} topics`,
    },
    {
      key: 'cycles', title: 'Assessments', Icon: AssessmentIcon,
      gradient: 'linear-gradient(135deg, #5ED996, #4C6FFF)',
      blurb: 'Expert surveys and expert live sessions running inside this cycle.',
      progress: cycleAssessments.length ? `${submittedCount} of ${cycleAssessments.length} submitted` : 'No assessments yet',
    },
    {
      key: 'calibrate-results', title: 'Calibrate & Results', Icon: CalibrationIcon,
      gradient: 'linear-gradient(135deg, #E8B26B, #D79A4C)',
      blurb: 'Review flagged results, calibrate where the group agrees, and see materiality against the thresholds.',
      progress: !selectedCycle ? 'Not started' : selectedCycle.stage === 'signed_off' ? 'Finalized' : selectedCycle.stage === 'calibrating' ? 'Ready to calibrate' : 'Not started',
    },
    {
      key: 'report', title: 'Report', Icon: ReportIcon,
      gradient: 'linear-gradient(135deg, #B79BF0, #9B7FE0)',
      blurb: 'Build the Word DMA report — cover, methodology, engagement, results, calibration and sign-off, appendix.',
      progress: 'Not built yet',
    },
  ];

  const activity = cycles
    .flatMap((c) => [
      { ts: c.createdAt, text: `Cycle created: ${c.name}` },
      ...c.assessments.map((a) => ({ ts: a.createdAt, text: `Assessment created: ${a.name}` })),
    ])
    .sort((a, b) => new Date(b.ts) - new Date(a.ts))
    .slice(0, 6);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[24px] font-bold">Hello 👋</p>
          <p className="text-[12px] text-text-secondary mt-0.5">Let's see what we have for you today.</p>
        </div>
        {cycles.length > 1 && (
          <select
            value={selectedCycleId ?? ''}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            className="bg-surface border border-border-apus rounded-lg px-3 py-1.5 text-[12px] outline-none"
          >
            {cycles.map((c) => <option key={c.id} value={c.id}>{c.clientName} — {c.name}</option>)}
          </select>
        )}
      </div>

      <StartButton hasCycles={cycles.length > 0} onClick={() => onNavigate('cycles')} />

      <p className="text-[13px] font-semibold mb-1">The double materiality process</p>
      <p className="text-[11.5px] text-text-secondary mb-4">Hover any step for what it covers, or click straight through to that area.</p>
      <div className="flex items-stretch gap-0 mb-9 overflow-x-auto pb-1">
        {STEPS.map((step, i) => (
          <ProcessStep key={step.title} step={step} progress={step.progress} onClick={() => onNavigate(step.key)} isLast={i === STEPS.length - 1} />
        ))}
      </div>

      <p className="text-[13px] font-semibold mb-3">Overview</p>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="bg-surface rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ background: 'linear-gradient(135deg, #B79BF0, #9B7FE0)', boxShadow: '0 6px 14px -4px rgba(0,0,0,0.4)' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
            </span>
            <div>
              <p className="text-[11px] text-text-secondary">Assessments submitted (all cycles)</p>
              <p className="text-[22px] font-bold">{cycles.reduce((sum, c) => sum + c.assessments.reduce((s, a) => s + a.submittedCount, 0), 0)}</p>
            </div>
          </div>
          <div className="border-t border-border-apus pt-4">
            <p className="text-[12px] font-semibold mb-3">Recent activity</p>
            {activity.length === 0 ? (
              <p className="text-[12px] text-text-secondary">No activity yet — create a cycle to see it here.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {activity.map((a, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full shrink-0" style={{ background: 'linear-gradient(135deg, #7C9BFF, #4C6FFF)' }} />
                    <span className="text-[11.5px] flex-1 truncate">{a.text}</span>
                    <span className="text-[10px] text-text-secondary shrink-0">{timeAgo(a.ts)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(160deg, rgba(76,111,255,0.08), var(--color-surface))', border: '1px solid rgba(76,111,255,0.18)' }}>
          <div className="flex items-center gap-2 mb-3.5">
            <span className="text-[15px]">💡</span>
            <p className="text-[12px] font-semibold">Quick tips</p>
          </div>
          <div className="flex flex-col gap-2.5">
            {[
              'Start with a cycle, then the stakeholder map',
              'Keep the topic library current for your ESRS version',
              'Invite experts, or run a live session yourself',
              'Review and calibrate before signing off',
            ].map((tip) => (
              <div key={tip} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(94,217,150,0.18)', color: '#5ED996' }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                </span>
                <span className="text-[11.5px] text-text-secondary leading-relaxed">{tip}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border-apus mt-4 pt-3">
            <p className="text-[11px] text-text-secondary">{session.user.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

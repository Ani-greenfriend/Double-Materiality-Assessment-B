import { useState } from 'react';
import DmaMascot from './DmaMascot';
import { StakeholderIcon, TopicsIcon, ImpactIcon, FinancialIcon, CalibrationIcon, ResultsIcon } from './icons';
import { aggregateIro, hasImpactAxis } from '../lib/calc';

// The notification bell and profile avatar this used to carry (a
// disconnected local-state "Set up your profile" stub, never wired to real
// data) moved to GlobalHeader.jsx, which renders on every screen instead of
// just Dashboard's. This keeps only the greeting.
function ProfileHeader({ name }) {
  return (
    <div className="mb-6">
      <p className="text-[24px] font-bold text-white">Hello{name ? `, ${name}` : ''} 👋</p>
      <p className="text-[12px] text-text-secondary mt-0.5">Let's see what we have for you today.</p>
    </div>
  );
}

function StartButton({ hasAssessments, onGoToAssessment }) {
  return (
    <div className="relative mb-9">
      <div className="absolute -inset-4 rounded-[32px] pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 80% at 20% 50%, rgba(76,111,255,0.35), transparent 70%), radial-gradient(ellipse 50% 80% at 90% 50%, rgba(94,217,150,0.25), transparent 70%)', filter: 'blur(18px)' }} />
      <button
        onClick={onGoToAssessment}
        className="relative w-full flex items-center justify-between rounded-[28px] px-7 py-6 text-left transition-transform hover:scale-[1.005] overflow-hidden"
        style={{ background: 'linear-gradient(115deg, #3654D6 0%, #4C6FFF 45%, #2FA88A 100%)', boxShadow: '0 20px 44px -14px rgba(76,111,255,0.55)' }}
      >
        {/* Subtle decorative shapes for depth, matching the elevated reference */}
        <span className="absolute rounded-full pointer-events-none" style={{ width: 10, height: 10, top: 14, right: 200, background: 'rgba(255,255,255,0.18)' }} />
        <span className="absolute rounded-full pointer-events-none" style={{ width: 5, height: 5, bottom: 18, right: 150, background: 'rgba(255,255,255,0.25)' }} />
        <span className="absolute pointer-events-none" style={{ width: 16, height: 16, top: 20, right: 90, border: '2px solid rgba(255,255,255,0.2)', borderRadius: 4, transform: 'rotate(20deg)' }} />
        <span className="absolute rounded-full pointer-events-none" style={{ width: 90, height: 90, top: -40, right: -20, background: 'rgba(255,255,255,0.06)' }} />
        <span className="absolute rounded-full pointer-events-none" style={{ width: 50, height: 50, bottom: -25, left: '40%', background: 'rgba(255,255,255,0.05)' }} />

        <div className="flex items-center gap-4 relative z-10">
          <span
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.16)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)' }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
          </span>
          <div>
            <p className="text-[20px] font-bold text-white">{hasAssessments ? 'Continue your assessment' : 'Start your double materiality assessment'}</p>
            <p className="text-[12.5px] mt-1" style={{ color: 'rgba(245,246,250,0.9)' }}>
              {hasAssessments ? 'Pick up where you left off.' : 'Map stakeholders, select topics, and start rating — takes a few minutes to set up.'}
            </p>
          </div>
        </div>
        <span className="relative z-10 flex items-center gap-2 rounded-full pl-5 pr-2 py-2 text-[13px] font-bold shrink-0 ml-4" style={{ background: '#F5F6FA', color: '#111318' }}>
          {hasAssessments ? 'Continue' : 'Get started'}
          <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#111318', color: '#F5F6FA' }}>→</span>
        </span>
      </button>
    </div>
  );
}

const STEPS = [
  {
    key: 'stakeholders', title: 'Stakeholder selection', Icon: StakeholderIcon,
    gradient: 'linear-gradient(135deg, #5ED996, #2FA88A)',
    blurb: 'Build the map of who is relevant — internally and externally, for impact and financial perspectives.',
  },
  {
    key: 'topics', title: 'Topic selection', Icon: TopicsIcon,
    gradient: 'linear-gradient(135deg, #7C9BFF, #4C6FFF)',
    blurb: 'Choose which ESRS Impacts, Risks, and Opportunities are in scope for this engagement.',
  },
  {
    key: 'assessment-impact', title: 'Assessment of impact topics', Icon: ImpactIcon,
    gradient: 'linear-gradient(135deg, #5ED996, #4C6FFF)',
    blurb: 'Rate how the company affects people and the environment — the inside-out view.',
  },
  {
    key: 'assessment-financial', title: 'Assessment of financial topics', Icon: FinancialIcon,
    gradient: 'linear-gradient(135deg, #4C6FFF, #7C63D6)',
    blurb: 'Rate the risks and opportunities sustainability issues pose to the company itself — the outside-in view.',
  },
  {
    key: 'calibration', title: 'Calibration', Icon: CalibrationIcon,
    gradient: 'linear-gradient(135deg, #E8B26B, #D79A4C)',
    blurb: 'Review flagged results together with experts and adjust where the group agrees it is needed.',
  },
  {
    key: 'results', title: 'Downloadable result', Icon: ResultsIcon,
    gradient: 'linear-gradient(135deg, #B79BF0, #9B7FE0)',
    blurb: 'See the final materiality matrix and export it as your deliverable.',
  },
];

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
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-white"
          style={{ background: step.gradient, boxShadow: '0 6px 14px -4px rgba(0,0,0,0.4)' }}
        >
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
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function Dashboard({ assessments, calibrations, iros, stakeholderMap = [], topicLibrary = [], onGoToAssessment, onNavigate }) {
  const activity = [
    ...assessments.map((a) => ({
      ts: a.updatedAt ?? a.createdAt ?? 0,
      gradient: 'linear-gradient(135deg, #7C9BFF, #4C6FFF)',
      text: `${a.name.includes('adjusted') ? 'Adjusted' : 'Completed'}: ${a.type}`,
    })),
    ...Object.entries(calibrations)
      .filter(([, c]) => c.calibratedAt)
      .map(([iroId, c]) => ({
        ts: c.calibratedAt,
        gradient: 'linear-gradient(135deg, #E8B26B, #D79A4C)',
        text: `Calibrated: ${iros.find((i) => i.id === iroId)?.name ?? 'a topic'}`,
      })),
  ].sort((a, b) => b.ts - a.ts).slice(0, 6);

  const activeGroupsList = stakeholderMap.filter((g) => g.perspectives.length > 0);
  const activeGroups = activeGroupsList.length;
  const totalPeople = activeGroupsList.reduce((sum, g) => sum + g.members.length, 0);
  const impactIros = iros.filter((i) => hasImpactAxis(i.iroType));
  const financialIros = iros.filter((i) => !hasImpactAxis(i.iroType));
  const pct = (list) => (list.length ? Math.round((list.filter((i) => aggregateIro(i).n > 0).length / list.length) * 100) : 0);
  const flaggedCount = Object.values(calibrations).filter((c) => c.calibratedAt).length;

  const progressFor = {
    stakeholders: activeGroups > 0 ? `${activeGroups} groups · ${totalPeople} people` : 'Not started',
    topics: topicLibrary.length > 0 ? `${topicLibrary.length} topics defined` : 'Not started',
    'assessment-impact': impactIros.length ? `${pct(impactIros)}% rated` : 'No topics yet',
    'assessment-financial': financialIros.length ? `${pct(financialIros)}% rated` : 'No topics yet',
    calibration: flaggedCount > 0 ? `${flaggedCount} calibrated` : 'Nothing yet',
    results: assessments.length > 0 ? 'Ready to export' : 'Not ready yet',
  };

  return (
    <div className="relative">
      <DmaMascot title="What is a DMA?">
        <p className="mb-2">
          A DMA identifies which sustainability topics actually matter, from two directions: <b className="text-text-primary">impact materiality</b> (how the company affects people and the environment) and <b className="text-text-primary">financial materiality</b> (how sustainability issues affect the company itself). A topic can matter from either direction, or both.
        </p>
        <p>
          That's why every topic is rated as an <b className="text-text-primary">Impact</b>, a <b className="text-text-primary">Risk</b>, or an <b className="text-text-primary">Opportunity</b> — each a different way something can turn out to matter.
        </p>
      </DmaMascot>

      <ProfileHeader />
      <StartButton hasAssessments={assessments.length > 0} onGoToAssessment={onGoToAssessment} />

      <p className="text-[13px] font-semibold mb-1">The double materiality process</p>
      <p className="text-[11.5px] text-text-secondary mb-4">Hover any step for what it covers, or click straight through to that area.</p>
      <div className="flex items-stretch gap-0 mb-9 overflow-x-auto pb-1">
        {STEPS.map((step, i) => (
          <ProcessStep key={step.key} step={step} progress={progressFor[step.key]} onClick={() => onNavigate(step.key)} isLast={i === STEPS.length - 1} />
        ))}
      </div>

      <p className="text-[13px] font-semibold mb-3">Overview</p>
      <div className="grid grid-cols-[1fr_320px] gap-4">
        <div className="bg-surface rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ background: 'linear-gradient(135deg, #B79BF0, #9B7FE0)', boxShadow: '0 6px 14px -4px rgba(0,0,0,0.4)' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
            </span>
            <div>
              <p className="text-[11px] text-text-secondary">Assessments submitted</p>
              <p className="text-[22px] font-bold">{assessments.length}</p>
            </div>
          </div>
          <div className="border-t border-border-apus pt-4">
            <p className="text-[12px] font-semibold mb-3">Recent activity</p>
            {activity.length === 0 ? (
              <p className="text-[12px] text-text-secondary">No activity yet — complete an assessment to see it here.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {activity.map((a, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full shrink-0" style={{ background: a.gradient }} />
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
              'Start with stakeholder mapping',
              'Focus on your most relevant topics',
              'Engage experts for accurate scoring',
              'Review and calibrate regularly',
            ].map((tip) => (
              <div key={tip} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(94,217,150,0.18)', color: '#5ED996' }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                </span>
                <span className="text-[11.5px] text-text-secondary leading-relaxed">{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

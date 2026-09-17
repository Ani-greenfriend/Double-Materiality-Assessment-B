import DmaMascot from './DmaMascot';

const MODES = [
  {
    key: 'quantitative',
    icon: '📋',
    color: '#4C6FFF',
    title: 'Quantitative',
    subtitle: 'Stakeholder questionnaire',
    description: 'Every criterion (Scale, Scope, Irremediability, Likelihood, Magnitude) as its own quick multiple-choice question — clear enough that stakeholders can fill it in independently via a link, no facilitation needed.',
    useWhen: 'You need the most defensible, audit-ready result — every criterion is captured individually, with a clear methodology version and override logic. Better suited to larger or more complex companies, where the extra rigor is worth the time it takes.',
    footer: '🔗 Generates a shareable link once set up.',
    caveat: '*The quantitative assessment results still need to be validated by experts.',
  },
  {
    key: 'qualitative',
    icon: '🧭',
    color: '#5ED996',
    title: 'Qualitative',
    subtitle: 'Expert live session',
    description: 'A simplified, single-slider version rated holistically per topic — done together with a small group of experts, where a facilitator can help calibrate consistently in real time.',
    useWhen: 'A holistic expert judgment matters more than a fully broken-down score — smaller companies, or a quick first pass before a deeper quantitative round. The follow-up Calibration step reconciles differing views into a final number.',
    footer: '🎙️ No survey link needed — run it live, in the room.',
    caveat: null,
  },
];

export default function AssessmentModeSelect({ onSelect }) {
  return (
    <div className="max-w-3xl">
      <DmaMascot title="What is a DMA?">
        <p className="mb-2">
          A DMA identifies which sustainability topics actually matter, from two directions: <b className="text-text-primary">impact materiality</b> (how the company affects people and the environment) and <b className="text-text-primary">financial materiality</b> (how sustainability issues affect the company itself). A topic can matter from either direction, or both.
        </p>
        <p>
          That's why every topic is rated as an <b className="text-text-primary">Impact</b>, a <b className="text-text-primary">Risk</b>, or an <b className="text-text-primary">Opportunity</b> — each a different way something can turn out to matter.
        </p>
      </DmaMascot>

      <h2 className="text-[24px] font-bold text-white mb-1">New Assessment</h2>
      <p className="text-[12px] text-text-secondary mb-6">
        Start by choosing how this round of ratings will be collected. This shapes everything downstream — you can always run the other mode later for the same topics.
      </p>

      <div className="grid grid-cols-2 gap-5">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => onSelect(m.key)}
            className="text-left rounded-2xl overflow-hidden transition-transform hover:-translate-y-0.5 flex flex-col"
            style={{ background: `linear-gradient(160deg, ${m.color}14, var(--color-surface))`, border: `1px solid ${m.color}33` }}
          >
            <div className="p-5 pb-4">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-[20px] shrink-0"
                  style={{ background: m.key === 'quantitative' ? 'linear-gradient(135deg, #7C9BFF, #4C6FFF)' : 'linear-gradient(135deg, #5ED996, #2FA88A)', boxShadow: '0 6px 14px -4px rgba(0,0,0,0.4)' }}
                >
                  {m.icon}
                </span>
                <div>
                  <p className="font-bold text-[16px]" style={{ color: m.color }}>{m.title}</p>
                  <p className="text-[11.5px] text-text-secondary">{m.subtitle}</p>
                </div>
              </div>
              <p className="text-[12px] text-text-secondary leading-relaxed">{m.description}</p>
            </div>

            <div className="mx-5 rounded-xl p-3.5 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${m.color}22` }}>
              <p className="text-[10.5px] font-bold tracking-wide mb-1.5 flex items-center gap-1.5" style={{ color: m.color }}>
                <span>💡</span>USE THIS WHEN
              </p>
              <p className="text-[11.5px] text-text-secondary leading-relaxed">{m.useWhen}</p>
            </div>

            <div className="px-5 pb-5 mt-auto">
              <p className="text-[11px] text-text-secondary">{m.footer}</p>
              {m.caveat && <p className="text-[10.5px] mt-2 italic" style={{ color: '#D79A4C' }}>{m.caveat}</p>}
            </div>
          </button>
        ))}
      </div>

      <div className="bg-surface rounded-xl p-4 mt-5 flex gap-3">
        <span className="text-[16px] shrink-0">👥</span>
        <p className="text-[11.5px] text-text-secondary leading-relaxed">
          <b className="text-text-primary">A note on who to invite either way:</b> stakeholders should be selected because they are genuinely affected by, or make decisions based on, the specific topics being assessed — not invited generically. Someone with no real connection to a topic doesn't strengthen the result, even if their input is well-intentioned.
        </p>
      </div>
    </div>
  );
}

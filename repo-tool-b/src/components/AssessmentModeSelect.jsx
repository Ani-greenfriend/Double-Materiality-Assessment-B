import DmaMascot from './DmaMascot';

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

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onSelect('quantitative')}
          className="text-left rounded-2xl p-5 border border-border-apus hover:border-emerald transition-colors"
        >
          <p className="font-semibold text-[14.5px] mb-2">Quantitative — stakeholder questionnaire</p>
          <p className="text-[12px] text-text-secondary leading-relaxed mb-3">
            Every criterion (Scale, Scope, Irremediability, Likelihood, Magnitude) as its own quick multiple-choice question — clear enough that stakeholders can fill it in independently via a link, no facilitation needed.
          </p>
          <p className="text-[11.5px] text-text-secondary leading-relaxed mb-3">
            <b className="text-text-primary">Use this when:</b> you need the most defensible, audit-ready result — every criterion is captured individually, with a clear methodology version and override logic. Better suited to larger or more complex companies, where the extra rigor is worth the time it takes.
          </p>
          <p className="text-[11px] text-text-secondary">Generates a shareable link once set up.</p>
          <p className="text-[10.5px] text-text-secondary mt-2 italic">*The quantitative assessment results still need to be validated by experts.</p>
        </button>

        <button
          onClick={() => onSelect('qualitative')}
          className="text-left rounded-2xl p-5 border border-border-apus hover:border-emerald transition-colors"
        >
          <p className="font-semibold text-[14.5px] mb-2">Qualitative — expert live session</p>
          <p className="text-[12px] text-text-secondary leading-relaxed mb-3">
            A simplified, single-slider version rated holistically per topic — done together with a small group of experts, where a facilitator can help calibrate consistently in real time.
          </p>
          <p className="text-[11.5px] text-text-secondary leading-relaxed mb-3">
            <b className="text-text-primary">Use this when:</b> a holistic expert judgment matters more than a fully broken-down score — smaller companies, or a quick first pass before a deeper quantitative round. The follow-up Calibration step reconciles differing views into a final number.
          </p>
          <p className="text-[11px] text-text-secondary">No survey link needed — run it live, in the room.</p>
        </button>
      </div>

      <div className="bg-surface rounded-xl p-4 mt-5">
        <p className="text-[11.5px] text-text-secondary leading-relaxed">
          <b className="text-text-primary">A note on who to invite either way:</b> stakeholders should be selected because they are genuinely affected by, or make decisions based on, the specific topics being assessed — not invited generically. Someone with no real connection to a topic doesn't strengthen the result, even if their input is well-intentioned.
        </p>
      </div>
    </div>
  );
}

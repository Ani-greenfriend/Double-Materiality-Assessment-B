import DmaMascot from './DmaMascot';

const OPTIONS = [
  { key: 'full', label: 'Full', desc: 'All IROs — impacts, risks, and opportunities together.' },
  { key: 'impact', label: 'Impact perspective', desc: 'Negative and positive impacts only.' },
  { key: 'financial', label: 'Financial perspective', desc: 'Risks and opportunities only.' },
];

export default function PerspectiveSelect({ mode, onSelect, onBack }) {
  return (
    <div className="max-w-2xl">
      <DmaMascot title="Impact vs. Financial perspective?">
        <p className="mb-2">
          <b className="text-text-primary">Impact perspective</b> covers positive and negative effects on people and the environment — the "inside-out" view.
        </p>
        <p>
          <b className="text-text-primary">Financial perspective</b> covers risks and opportunities to the company itself — the "outside-in" view. Choose <b className="text-text-primary">Full</b> to cover both at once.
        </p>
      </DmaMascot>

      <button onClick={onBack} className="text-[11.5px] text-text-secondary mb-4">← Back</button>
      <h2 className="text-[24px] font-bold text-white mb-1">Which IROs should this cover?</h2>
      <p className="text-[12px] text-text-secondary mb-6">
        {mode === 'quantitative'
          ? 'Choose the scope for this questionnaire — it determines which IROs the participants rate, and is stated plainly in their introduction.'
          : 'Choose the scope for this expert session. This is also what the participants see reflected in the setup.'}
      </p>

      <div className="flex flex-col gap-2.5">
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => onSelect(o.key)}
            className="text-left rounded-xl p-4 border border-border-apus hover:border-emerald transition-colors"
          >
            <p className="font-semibold text-[13px] mb-1">{o.label}</p>
            <p className="text-[11.5px] text-text-secondary">{o.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

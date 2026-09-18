const STEP_ORDER = ['mode', 'perspective', 'survey-details', 'review', 'recipients'];
const STEP_LABEL = {
  mode: 'Mode', perspective: 'Perspective', 'survey-details': 'General info',
  review: 'Review', recipients: 'Recipients',
};

export default function WizardBreadcrumb({ flowStep, onJump }) {
  const currentIndex = STEP_ORDER.indexOf(flowStep);
  if (currentIndex === -1) return null;

  return (
    <div className="flex items-center gap-1.5 mb-5 flex-wrap">
      {STEP_ORDER.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step} className="flex items-center gap-1.5">
            <button
              onClick={() => done && onJump(step)}
              disabled={!done}
              className="text-[11px] font-medium rounded-full px-2.5 py-1"
              style={{
                background: active ? '#4C6FFF' : done ? 'rgba(76,111,255,0.12)' : 'transparent',
                color: active ? '#F5F6FA' : done ? '#4C6FFF' : '#5B5B66',
                cursor: done ? 'pointer' : 'default',
              }}
            >
              {STEP_LABEL[step]}
            </button>
            {i < STEP_ORDER.length - 1 && <span className="text-[10px] text-text-secondary">→</span>}
          </div>
        );
      })}
    </div>
  );
}

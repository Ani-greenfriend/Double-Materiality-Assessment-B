import { useState } from 'react';
import { LIKELIHOOD_NOTE } from './SetupReviewStep';

function StepShell({ children, onNext, onBack, nextLabel = 'Continue →', nextDisabled = false }) {
  return (
    <div className="max-w-xl mx-auto">
      {onBack && <button onClick={onBack} className="text-[11.5px] text-text-secondary mb-3">← Back</button>}
      <div className="bg-surface rounded-2xl p-8">
        {children}
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className="w-full text-[13px] font-semibold rounded-xl py-3 mt-6 disabled:opacity-40"
          style={{ background: '#4C6FFF', color: '#F5F6FA' }}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

function ParticipantFoldout({ participants }) {
  const [open, setOpen] = useState(false);
  if (!participants || participants.length === 0) return null;
  return (
    <div className="rounded-xl mt-5 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(76,111,255,0.10), rgba(94,217,150,0.06))', border: '1px solid rgba(76,111,255,0.2)' }}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3">
        <span className="text-[12.5px] font-semibold flex items-center gap-2">
          👥 {participants.length} joining this session
        </span>
        <span className="text-[11px] text-text-secondary">{open ? 'Hide' : 'Show'} {open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-2">
          {participants.map((p, i) => (
            <div key={i} className="flex items-center gap-2.5 bg-surface-2 rounded-lg px-3 py-2.5">
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ background: 'rgba(76,111,255,0.16)', color: '#4C6FFF' }}
              >
                {p.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-medium truncate">{p.name}</p>
                {(p.title || p.topic) && (
                  <p className="text-[10.5px] text-text-secondary truncate">
                    {p.title}{p.title && p.topic && ' · '}{p.topic && `covers ${p.topic}`}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Welcome({ text, logo, participants, onNext }) {
  return (
    <StepShell onNext={onNext}>
      {logo ? (
        <img src={logo} alt="Company logo" className="w-14 h-14 rounded-xl object-contain bg-surface-2 mb-3" />
      ) : (
        <p className="text-[26px] mb-3">🧭</p>
      )}
      <p className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-wrap">{text}</p>
      <div className="bg-surface-2 rounded-xl p-4 mt-5">
        <p className="text-[12px] mb-1.5">✓ A guided, topic-by-topic discussion</p>
        <p className="text-[12px] mb-1.5">✓ Disagreements are expected — that's what calibration is for</p>
        <p className="text-[12px]">✓ An explanation is always one hover away if anything's unclear</p>
      </div>
      <ParticipantFoldout participants={participants} />
    </StepShell>
  );
}

function YourTask({ text, onNext, onBack }) {
  return (
    <StepShell onNext={onNext} onBack={onBack} nextLabel="Continue →">
      <p className="font-semibold text-[17px] mb-4">How to rate each topic</p>
      <div className="bg-surface-2 rounded-xl p-4 mb-4">
        <p className="text-[12.5px] text-text-secondary leading-relaxed whitespace-pre-wrap">{text}</p>
      </div>
      <p className="text-[11.5px] text-text-secondary leading-relaxed italic">{LIKELIHOOD_NOTE}</p>
    </StepShell>
  );
}

export default function IntroFlow({ welcomeText, taskText, logo, participants, onDone }) {
  const [step, setStep] = useState(0);

  if (step === 0) return <Welcome text={welcomeText} logo={logo} participants={participants} onNext={() => setStep(1)} />;
  return <YourTask text={taskText} onNext={onDone} onBack={() => setStep(0)} />;
}

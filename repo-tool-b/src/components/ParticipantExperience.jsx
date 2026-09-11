import { useState } from 'react';
import ApusLogoLight from './ApusLogoLight';
import { hasImpactAxis } from '../lib/calc';
import { TYPE_LABEL } from '../lib/topics';
import {
  SCALE_LABELS, SCOPE_LABELS, IRREMEDIABILITY_LABELS, IMPACT_LIKELIHOOD_LABELS,
  FINANCIAL_LIKELIHOOD_LABELS, RISK_MAGNITUDE_LABELS, OPPORTUNITY_MAGNITUDE_LABELS,
} from '../lib/calc';

const CRITERIA_FOR = {
  neg_impact: [
    { key: 'scale', label: 'Scale', description: 'How big and severe the effect is — from barely noticeable to very severe.', labels: SCALE_LABELS },
    { key: 'scope', label: 'Scope', description: 'How far the effect reaches — a single site, or something felt nationally or globally.', labels: SCOPE_LABELS },
    { key: 'irreversibility', label: 'Irremediability', description: 'How hard it would be to undo or fix — and how long that would take.', labels: IRREMEDIABILITY_LABELS },
    { key: 'likelihood', label: 'Likelihood', description: 'How probable this is to happen. A 4-5 means it is already happening or about to. A 1-3 means it is a possible future scenario.', labels: IMPACT_LIKELIHOOD_LABELS },
  ],
  pos_impact: [
    { key: 'scale', label: 'Scale', description: 'How big and significant the positive effect is.', labels: SCALE_LABELS },
    { key: 'scope', label: 'Scope', description: 'How far the positive effect reaches — a single site, or something felt nationally or globally.', labels: SCOPE_LABELS },
    { key: 'likelihood', label: 'Likelihood', description: 'How probable this is to happen. A 4-5 means it is already happening or about to. A 1-3 means it is a possible future scenario.', labels: IMPACT_LIKELIHOOD_LABELS },
  ],
  risk: [
    { key: 'magnitude', label: 'Magnitude', description: 'How much this could affect the company\u2019s financial performance and position — think in terms of a share of EBITDA, if you know it.', labels: RISK_MAGNITUDE_LABELS },
    { key: 'financialLikelihood', label: 'Likelihood', description: 'How probable this is to happen. A 4-5 means it is already happening or about to. A 1-3 means it is a possible future scenario.', labels: FINANCIAL_LIKELIHOOD_LABELS },
  ],
  opportunity: [
    { key: 'magnitude', label: 'Magnitude', description: 'How much this could positively affect the company\u2019s financial performance and position.', labels: OPPORTUNITY_MAGNITUDE_LABELS },
    { key: 'financialLikelihood', label: 'Likelihood', description: 'How probable this is to happen. A 4-5 means it is already happening or about to. A 1-3 means it is a possible future scenario.', labels: FINANCIAL_LIKELIHOOD_LABELS },
  ],
};

function Shell({ children, wide }) {
  return <div className={`mx-auto px-6 pb-16 ${wide ? 'max-w-2xl' : 'max-w-xl'}`}>{children}</div>;
}

function Card({ children }) {
  return (
    <div
      className="rounded-3xl p-9 bg-white"
      style={{ boxShadow: '0 1px 3px rgba(17,19,24,0.04), 0 20px 40px -16px rgba(17,19,24,0.12)', border: '1px solid #EFEFEC' }}
    >
      {children}
    </div>
  );
}

function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="w-full text-[14px] font-semibold rounded-2xl py-3.5 transition-transform hover:scale-[1.01] disabled:opacity-40 disabled:hover:scale-100"
      style={{ background: '#1F9A63', color: '#FFFFFF', boxShadow: '0 10px 24px -8px rgba(31,154,99,0.45)' }}
    >
      {children}
    </button>
  );
}

function Welcome({ text, logo, companyName, onNext }) {
  return (
    <Shell>
      <Card>
        {logo ? (
          <img src={logo} alt="Company logo" className="w-14 h-14 rounded-2xl object-contain mb-4" />
        ) : (
          <p className="text-[28px] mb-3">🌱</p>
        )}
        <p className="text-[20px] font-bold mb-4" style={{ color: '#111318' }}>
          {companyName ? `${companyName} sustainability survey` : 'Sustainability survey'}
        </p>
        <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: '#5B5B66' }}>{text}</p>
        <div className="rounded-2xl p-4 mt-6" style={{ background: '#F5F6F3' }}>
          <p className="text-[12.5px] mb-1.5" style={{ color: '#3A3A42' }}>✓ Fully anonymous — no answer can be traced back to you</p>
          <p className="text-[12.5px] mb-1.5" style={{ color: '#3A3A42' }}>✓ About 15–20 minutes</p>
          <p className="text-[12.5px]" style={{ color: '#3A3A42' }}>✓ Not sure about something? Every question can be skipped</p>
        </div>
        <div className="mt-7"><PrimaryButton onClick={onNext}>Get started →</PrimaryButton></div>
      </Card>
    </Shell>
  );
}

function TaskDescription({ perspectiveFilter, onNext, onBack }) {
  const showImpact = perspectiveFilter !== 'financial';
  const showFinancial = perspectiveFilter !== 'impact';
  return (
    <Shell wide>
      <button onClick={onBack} className="text-[12px] mb-4" style={{ color: '#8A8A94' }}>← Back</button>
      <Card>
        <p className="text-[20px] font-bold mb-2" style={{ color: '#111318' }}>How to rate each topic</p>
        <p className="text-[13.5px] mb-7" style={{ color: '#5B5B66' }}>For each topic, please select the option that in your opinion applies best.</p>

        {showImpact && (
          <div className="mb-7">
            <p className="text-[13px] font-bold mb-3 tracking-wide" style={{ color: '#111318' }}>IMPACTS ON THE ENVIRONMENT OR SOCIETY (POSITIVE OR NEGATIVE)</p>
            {CRITERIA_FOR.neg_impact.map((c) => (
              <div key={c.key} className="mb-3.5 last:mb-0">
                <p className="text-[15px] font-bold" style={{ color: '#111318' }}>{c.label}</p>
                <p className="text-[12.5px] leading-relaxed" style={{ color: '#6B6B76' }}>{c.description}</p>
              </div>
            ))}
          </div>
        )}
        {showFinancial && (
          <div>
            <p className="text-[13px] font-bold mb-3 tracking-wide" style={{ color: '#111318' }}>FINANCIAL RISKS AND OPPORTUNITIES</p>
            {CRITERIA_FOR.risk.map((c) => (
              <div key={c.key} className="mb-3.5 last:mb-0">
                <p className="text-[15px] font-bold" style={{ color: '#111318' }}>{c.label}</p>
                <p className="text-[12.5px] leading-relaxed" style={{ color: '#6B6B76' }}>{c.description}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-7"><PrimaryButton onClick={onNext}>Continue →</PrimaryButton></div>
      </Card>
    </Shell>
  );
}

function StakeholderSelect({ stakeholders, selected, setSelected, onNext, onBack }) {
  return (
    <Shell wide>
      <button onClick={onBack} className="text-[12px] mb-4" style={{ color: '#8A8A94' }}>← Back</button>
      <Card>
        <p className="text-[20px] font-bold mb-1.5" style={{ color: '#111318' }}>Which group best describes you?</p>
        <p className="text-[13.5px] mb-6" style={{ color: '#5B5B66' }}>This helps us understand where different perspectives come from.</p>

        <p className="text-[11.5px] font-bold tracking-wide mb-2" style={{ color: '#8A8A94' }}>IMPACT PERSPECTIVE</p>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {stakeholders.impact.map((s) => (
            <button
              key={s} onClick={() => setSelected(s)}
              className="text-left text-[13px] rounded-xl px-3.5 py-3 border transition-colors"
              style={{ borderColor: selected === s ? '#1F9A63' : '#EAEAE6', background: selected === s ? 'rgba(31,154,99,0.06)' : '#FFFFFF', color: selected === s ? '#1F9A63' : '#111318' }}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="text-[11.5px] font-bold tracking-wide mb-2" style={{ color: '#8A8A94' }}>FINANCIAL PERSPECTIVE</p>
        <div className="grid grid-cols-2 gap-2 mb-7">
          {stakeholders.financial.map((s) => (
            <button
              key={s} onClick={() => setSelected(s)}
              className="text-left text-[13px] rounded-xl px-3.5 py-3 border transition-colors"
              style={{ borderColor: selected === s ? '#1F9A63' : '#EAEAE6', background: selected === s ? 'rgba(31,154,99,0.06)' : '#FFFFFF', color: selected === s ? '#1F9A63' : '#111318' }}
            >
              {s}
            </button>
          ))}
        </div>
        <PrimaryButton onClick={onNext} disabled={!selected}>Continue →</PrimaryButton>
      </Card>
    </Shell>
  );
}

function SkipInfo() {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <span className="w-4 h-4 rounded-full border text-[9px] flex items-center justify-center select-none" style={{ borderColor: '#B8B8C0', color: '#8A8A94' }}>i</span>
      {open && (
        <div className="absolute left-0 bottom-full mb-2 z-20 w-56 rounded-xl p-2.5 text-[11px] leading-snug shadow-lg bg-white" style={{ border: '1px solid #EAEAE6', color: '#3A3A42' }}>
          For anyone unsure or without direct expertise on this specific topic — it's fine to skip rather than guess.
        </div>
      )}
    </span>
  );
}

function CriterionRow({ criterion, value, onAnswer, onSkip }) {
  const [hoverVal, setHoverVal] = useState(null);
  const skipped = value === 'skipped';
  return (
    <div className="mb-7 last:mb-0 pb-7 last:pb-0 border-b last:border-b-0" style={{ borderColor: '#EFEFEC' }}>
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-[17px] font-extrabold" style={{ color: '#111318' }}>{criterion.label}</p>
        {!skipped ? (
          <button onClick={onSkip} className="text-[11px] flex items-center gap-1" style={{ color: '#8A8A94' }}>
            Skip <SkipInfo />
          </button>
        ) : (
          <button onClick={() => onAnswer(undefined)} className="text-[11px]" style={{ color: '#1F9A63' }}>Answer instead</button>
        )}
      </div>
      <p className="text-[12.5px] leading-relaxed mb-4" style={{ color: '#6B6B76' }}>{criterion.description}</p>

      {skipped ? (
        <p className="text-[12px] rounded-xl px-3 py-2.5" style={{ background: '#F5F6F3', color: '#8A8A94' }}>Skipped — that's okay, not everyone has a view on every topic.</p>
      ) : (
        <>
          <div className="grid grid-cols-6 gap-1.5 mb-2">
            {[0, 1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                onMouseEnter={() => setHoverVal(v)}
                onMouseLeave={() => setHoverVal(null)}
                onClick={() => onAnswer(v)}
                className="rounded-xl py-3 text-[11px] font-semibold transition-colors border"
                style={{
                  borderColor: value === v ? '#1F9A63' : '#EAEAE6',
                  background: value === v ? '#1F9A63' : '#FFFFFF',
                  color: value === v ? '#FFFFFF' : '#111318',
                }}
              >
                {v}
              </button>
            ))}
          </div>
          <p className="text-[11.5px]" style={{ color: '#8A8A94', minHeight: 16 }}>
            {(hoverVal !== null ? criterion.labels[hoverVal] : typeof value === 'number' ? criterion.labels[value] : '')}
          </p>
        </>
      )}
    </div>
  );
}

function Question({ iro, criteria, answers, onAnswerCriterion, onBack, onNext, canGoBack, allAnswered, index, total }) {
  return (
    <Shell wide>
      <div className="flex items-center justify-between mb-4">
        {canGoBack ? <button onClick={onBack} className="text-[12px]" style={{ color: '#8A8A94' }}>← Previous topic</button> : <span />}
        <span className="text-[11.5px]" style={{ color: '#8A8A94' }}>Topic {index + 1} of {total}</span>
      </div>
      <div className="h-1 rounded-full mb-7 overflow-hidden" style={{ background: '#EAEAE6' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${(index / total) * 100}%`, background: '#1F9A63' }} />
      </div>

      <Card>
        <span className="text-[11px] font-semibold rounded-full px-2.5 py-1 inline-block mb-3" style={{ background: '#F5F6F3', color: '#5B5B66' }}>
          {TYPE_LABEL[iro.iroType]} · {iro.actual ? 'Actual' : 'Potential'}
        </span>
        <p className="text-[16px] font-semibold mb-1" style={{ color: '#111318' }}>{iro.name}</p>
        {iro.description && <p className="text-[12.5px] mb-7" style={{ color: '#6B6B76' }}>{iro.description}</p>}

        {criteria.map((c) => (
          <CriterionRow
            key={c.key}
            criterion={c}
            value={answers[c.key]}
            onAnswer={(v) => onAnswerCriterion(c.key, v)}
            onSkip={() => onAnswerCriterion(c.key, 'skipped')}
          />
        ))}

        <div className="mt-7">
          <PrimaryButton onClick={onNext} disabled={!allAnswered}>
            {index + 1 < total ? 'Next topic →' : 'Continue →'}
          </PrimaryButton>
        </div>
      </Card>
    </Shell>
  );
}

function Submit({ onSubmit }) {
  return (
    <Shell>
      <Card>
        <p className="text-[20px] font-bold mb-2" style={{ color: '#111318' }}>That's everything</p>
        <p className="text-[13.5px] mb-7" style={{ color: '#5B5B66' }}>
          Review your answers using "Previous" if you'd like, or submit the survey now.
        </p>
        <PrimaryButton onClick={onSubmit}>Submit survey →</PrimaryButton>
      </Card>
    </Shell>
  );
}

function ThankYou() {
  return (
    <Shell>
      <Card>
        <p className="text-[28px] mb-3">🎉</p>
        <p className="text-[20px] font-bold mb-2" style={{ color: '#111318' }}>Thank you for your participation</p>
        <p className="text-[13.5px] leading-relaxed" style={{ color: '#5B5B66' }}>
          Your answers have been recorded and will feed into the company's materiality assessment, alongside everyone else's. This helps shape which sustainability topics get prioritized next.
        </p>
      </Card>
    </Shell>
  );
}

export default function ParticipantExperience({
  mode, perspectiveFilter, iros, welcomeText, stakeholders, topicOverrides = {}, logo, companyName, onSubmit,
  previewBanner, congrats, onExitPreview,
}) {
  const [phase, setPhase] = useState('welcome'); // welcome | task | stakeholder | questions | submit | done
  const [stakeholder, setStakeholder] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // `${iroId}::${criterionKey}` -> value

  const relevantIros = iros.filter((i) => {
    if (perspectiveFilter === 'impact') return hasImpactAxis(i.iroType);
    if (perspectiveFilter === 'financial') return !hasImpactAxis(i.iroType);
    return true;
  });

  let content;
  if (phase === 'welcome') {
    content = <Welcome text={welcomeText} logo={logo} companyName={companyName} onNext={() => setPhase('task')} />;
  } else if (phase === 'task') {
    content = <TaskDescription perspectiveFilter={perspectiveFilter} onNext={() => setPhase('stakeholder')} onBack={() => setPhase('welcome')} />;
  } else if (phase === 'stakeholder') {
    content = (
      <StakeholderSelect
        stakeholders={stakeholders} selected={stakeholder} setSelected={setStakeholder}
        onNext={() => setPhase('questions')} onBack={() => setPhase('task')}
      />
    );
  } else if (phase === 'questions' && relevantIros.length) {
    const iro = relevantIros[qIndex];
    const overrideIro = topicOverrides[iro.id] ? { ...iro, ...topicOverrides[iro.id] } : iro;
    const criteria = CRITERIA_FOR[iro.iroType];
    const topicAnswers = Object.fromEntries(criteria.map((c) => [c.key, answers[`${iro.id}::${c.key}`]]));
    const allAnswered = criteria.every((c) => topicAnswers[c.key] !== undefined);

    const goNext = () => {
      if (qIndex + 1 < relevantIros.length) setQIndex(qIndex + 1);
      else setPhase('submit');
    };

    content = (
      <Question
        iro={overrideIro} criteria={criteria} answers={topicAnswers}
        onAnswerCriterion={(key, v) => setAnswers((prev) => ({ ...prev, [`${iro.id}::${key}`]: v }))}
        onNext={goNext}
        onBack={() => setQIndex((i) => Math.max(0, i - 1))}
        canGoBack={qIndex > 0}
        allAnswered={allAnswered}
        index={qIndex} total={relevantIros.length}
      />
    );
  } else if (phase === 'done') {
    content = <ThankYou />;
  } else {
    content = <Submit onSubmit={() => { onSubmit(answers, relevantIros); setPhase('done'); }} />;
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF8' }}>
      {previewBanner && (
        <div className="flex items-center justify-between px-5 py-2.5" style={{ background: '#FFF4E0', borderBottom: '1px solid #F0DBAE' }}>
          <span className="text-[12px] font-semibold" style={{ color: '#9A6B1F' }}>
            {congrats ? `🎉 "${congrats.name}" is set up — this is a live preview` : '👁 Preview mode — nothing entered here is saved'}
          </span>
          <button onClick={onExitPreview} className="text-[12px]" style={{ color: '#9A6B1F' }}>Exit to overview ×</button>
        </div>
      )}
      {congrats && (
        <div className="flex items-center gap-3 px-5 py-2.5 flex-wrap" style={{ background: '#FFFFFF', borderBottom: '1px solid #EFEFEC' }}>
          <span className="text-[11.5px]" style={{ color: '#6B6B76' }}>Runs {congrats.startDate} → {congrats.endDate || 'no end date'} ·</span>
          <span className="text-[11.5px] font-mono px-2 py-0.5 rounded" style={{ background: '#F5F6F3', color: '#3A3A42' }}>{congrats.link}</span>
          <button onClick={congrats.onCopy} className="text-[11px] font-semibold" style={{ color: '#1F9A63' }}>Copy link</button>
        </div>
      )}
      <div className="flex items-center justify-center pt-10 pb-4">
        <ApusLogoLight height={30} />
      </div>
      {content}
    </div>
  );
}

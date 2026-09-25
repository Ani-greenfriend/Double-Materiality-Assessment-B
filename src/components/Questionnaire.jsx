import { useState, useEffect } from 'react';
import { TYPE_LABEL, TYPE_COLOR } from '../lib/topics';
import {
  hasImpactAxis, SCALE_LABELS, SCOPE_LABELS, IRREMEDIABILITY_LABELS,
  IMPACT_LIKELIHOOD_LABELS, FINANCIAL_LIKELIHOOD_LABELS, RISK_MAGNITUDE_LABELS, OPPORTUNITY_MAGNITUDE_LABELS,
} from '../lib/calc';

function CriterionInfo({ description }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex items-center ml-1.5"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className="w-4 h-4 rounded-full border border-text-secondary text-text-secondary text-[9px] flex items-center justify-center cursor-default select-none">i</span>
      {open && (
        <div className="absolute left-0 top-full mt-2 z-20 w-56 bg-surface-2 border border-border-apus rounded-xl p-2.5 text-[11px] leading-snug shadow-lg">
          {description}
        </div>
      )}
    </span>
  );
}

function CriterionSlider({ label, description, labels, value, onChange, color, disabled }) {
  const [hovering, setHovering] = useState(false);
  const nearest = Math.round(value);
  const thumbPercent = Math.min(96, Math.max(4, (value / 5) * 100));

  return (
    <div className="mb-6" style={disabled ? { opacity: 0.65 } : undefined}>
      <p className="text-[10.5px] mb-1" style={{ color: '#8B8B98' }}>How would you rate:</p>
      <div className="flex items-center mb-1.5">
        <p className="text-[13.5px] font-semibold">{label}</p>
        <CriterionInfo description={description} />
        <span className="text-[13px] font-bold ml-auto" style={{ color }}>{value.toFixed(1)}</span>
      </div>

      <div className="relative pt-6">
        {hovering && !disabled && (
          <div
            className="absolute top-0 -translate-x-1/2 bg-surface-2 border border-border-apus rounded-lg px-2.5 py-1 text-[10.5px] whitespace-nowrap z-10 shadow-lg"
            style={{ left: `${thumbPercent}%` }}
          >
            <b>{nearest}</b> — {labels[nearest]}
          </div>
        )}
        <input
          type="range" min="0" max="5" step="0.1"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onTouchStart={() => setHovering(true)}
          onTouchEnd={() => setHovering(false)}
          className="w-full apus-slider"
          style={{ accentColor: color, color }}
        />
      </div>

      <div className="flex justify-between mt-1 px-0.5">
        <span className="text-[10px] text-text-secondary">0 — {labels[0]}</span>
        <span className="text-[9px] text-text-secondary opacity-50">1</span>
        <span className="text-[9px] text-text-secondary opacity-50">2</span>
        <span className="text-[9px] text-text-secondary opacity-50">3</span>
        <span className="text-[9px] text-text-secondary opacity-50">4</span>
        <span className="text-[10px] text-text-secondary">5 — {labels[5]}</span>
      </div>
    </div>
  );
}

const CRITERIA_FOR = {
  neg_impact: [
    { key: 'scale', label: 'Scale', description: 'Size and severity of the impact.', labels: SCALE_LABELS },
    { key: 'scope', label: 'Scope', description: 'Geographic or demographic spread of the impact — local, regional, national, or global.', labels: SCOPE_LABELS },
    { key: 'irreversibility', label: 'Irremediability', description: 'Difficulty of reversing or mitigating the impact — how permanent it is.', labels: IRREMEDIABILITY_LABELS },
    { key: 'likelihood', label: 'Likelihood', description: 'Probability and timeframe of the impact occurring.', labels: IMPACT_LIKELIHOOD_LABELS },
  ],
  pos_impact: [
    { key: 'scale', label: 'Scale', description: 'Size and severity of the impact.', labels: SCALE_LABELS },
    { key: 'scope', label: 'Scope', description: 'Geographic or demographic spread of the impact — local, regional, national, or global.', labels: SCOPE_LABELS },
    { key: 'likelihood', label: 'Likelihood', description: 'Probability and timeframe of the impact occurring.', labels: IMPACT_LIKELIHOOD_LABELS },
  ],
  risk: [
    { key: 'magnitude', label: 'Magnitude', description: "Effect on the company's economic performance and financial position.", labels: RISK_MAGNITUDE_LABELS },
    { key: 'financialLikelihood', label: 'Likelihood & timeframe', description: 'Probability of occurrence and the expected timeframe.', labels: FINANCIAL_LIKELIHOOD_LABELS },
  ],
  opportunity: [
    { key: 'magnitude', label: 'Magnitude', description: 'Size and impact of the positive financial opportunity.', labels: OPPORTUNITY_MAGNITUDE_LABELS },
    { key: 'financialLikelihood', label: 'Likelihood & timeframe', description: 'Probability of occurrence and the expected timeframe.', labels: FINANCIAL_LIKELIHOOD_LABELS },
  ],
};

// Only the keys this IRO's own type actually rates — never the full set.
// `likelihood` and `financialLikelihood` both write to the same DB column
// (ratings.criterion_key has no separate financialLikelihood value), so an
// IRO carrying both in its local rating state produces two rows targeting
// the same (submission_id, iro_id, criterion_key) conflict key in one
// upsert batch, which Postgres refuses outright ("ON CONFLICT DO UPDATE
// command cannot affect row a second time") — every criterion here must
// stay scoped to what CRITERIA_FOR[iro.iroType] actually lists.
function initialValuesFor(iro) {
  const defaults = { scale: 2.5, scope: 2.5, irreversibility: 2.5, likelihood: 2.5, magnitude: 2.5, financialLikelihood: 2.5 };
  const keys = CRITERIA_FOR[iro.iroType].map((c) => c.key);
  const live = iro.assessments.filter((a) => a.assessor === 'Live session');
  const avg = (key) => {
    if (!live.length) return defaults[key];
    const vals = live.map((a) => a[key]).filter((v) => v !== null && v !== undefined);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : defaults[key];
  };
  return Object.fromEntries(keys.map((key) => [key, avg(key)]));
}

export default function Questionnaire({
  perspectiveFilter, iros, onFinish, topicOverrides = {}, mandatory = false,
  initialRatings = {}, initialIndex = 0, onProgress, onExit,
  justificationMode = 'per_criterion', initialJustifications = {}, participants = [],
  // Reviewing an already-finished session (CLAUDE.md: a submitted response
  // is frozen for every role) — browse-only, lands on the results summary
  // first. Rating/justification/notes inputs are inert and onProgress is
  // never called, so this can never attempt the write that RLS refuses.
  // Real adjustments after submission go through Calibration, not here.
  readOnly = false, startFinished = false,
}) {
  const relevantIros = iros.filter((i) => {
    if (perspectiveFilter === 'impact') return hasImpactAxis(i.iroType);
    if (perspectiveFilter === 'financial') return !hasImpactAxis(i.iroType);
    return true; // full
  });

  const startIndex = Math.min(initialIndex, Math.max(0, relevantIros.length - 1));
  const [index, setIndex] = useState(startIndex);
  const [values, setValues] = useState(() => (
    relevantIros.length
      ? (initialRatings[relevantIros[startIndex]?.id] ? { ...initialRatings[relevantIros[startIndex].id] } : initialValuesFor(relevantIros[startIndex]))
      : {}
  ));
  const [ratings, setRatings] = useState(initialRatings);
  const [sessionNotes, setSessionNotes] = useState({});
  const [touched, setTouched] = useState(() => new Set(initialRatings[relevantIros[startIndex]?.id] ? Object.keys(initialRatings[relevantIros[startIndex].id]) : []));
  const [finished, setFinished] = useState(startFinished);
  // Guards "To Results" against a double click — without it, a second click
  // before the first request lands fires onFinish twice; the first submits
  // the session (submission becomes 'submitted'), and the second's ratings
  // upsert then hits the RLS wall that freezes a submitted response (by
  // design, per CLAUDE.md), surfacing as an "upsert failed: row-level
  // security policy" error on top of this already-shown summary screen.
  const [finishing, setFinishing] = useState(false);
  // Section 8, Live session: "a justification per criterion or per topic
  // according to the assessment's justification mode (required once a
  // value is entered)" — per_criterion: { [iroId]: { [criterionKey]: text } };
  // per_topic: { [iroId]: text }.
  const [justifications, setJustifications] = useState(initialJustifications);

  // Must run before any early return below — a hook can never be skipped
  // conditionally, or React throws "Rendered fewer hooks than expected".
  useEffect(() => {
    if (readOnly) return; // never autosave over a frozen, submitted session
    onProgress?.(ratings, index, justifications);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratings, index, justifications]);

  if (!relevantIros.length) {
    return <div className="bg-surface rounded-2xl p-10 text-center text-text-secondary text-[13px]">No matching IROs in this upload for the selected scope.</div>;
  }

  if (finished) {
    const summary = relevantIros
      .map((iro) => {
        const r = ratings[iro.id] ?? {};
        const vals = Object.values(r).filter((v) => v !== undefined && v !== null);
        const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
        return { name: topicOverrides[iro.id]?.name ?? iro.name, score: avg };
      })
      .sort((a, b) => b.score - a.score);
    const gradeColor = (score) => {
      // green (low) -> amber -> red (high), 0-5 scale
      const t = Math.min(1, score / 5);
      if (t < 0.5) {
        const p = t / 0.5;
        return `rgb(${Math.round(94 + p * (215 - 94))}, ${Math.round(217 + p * (154 - 217))}, ${Math.round(150 + p * (76 - 150))})`;
      }
      const p = (t - 0.5) / 0.5;
      return `rgb(${Math.round(215 + p * (224 - 215))}, ${Math.round(154 + p * (100 - 154))}, ${Math.round(76 + p * (90 - 76))})`;
    };

    return (
      <div className="max-w-xl mx-auto text-center">
        <div className="bg-surface rounded-2xl p-8">
          <p className="text-[28px] mb-2">🎉</p>
          <p className="font-semibold text-[16px] mb-1">{readOnly ? `${relevantIros.length} topics rated — this session's results` : `All ${relevantIros.length} topics rated — thank you for your participation`}</p>
          <p className="text-[12.5px] text-text-secondary mb-6">
            {readOnly
              ? 'This session already finished and its ratings are locked. Browse any topic below, or use Calibration to adjust a value if the group needs to revisit it.'
              : "Here's how the group's ratings came out, highest to lowest. Next, review this with leadership or subject-matter experts and calibrate anything that needs a closer look."}
          </p>

          <div className="bg-surface-2 rounded-xl p-4 mb-6 text-left max-h-72 overflow-y-auto">
            {summary.map((s, i) => (
              <div key={i} className="flex items-center gap-2.5 mb-2 last:mb-0">
                <span className="text-[10.5px] text-text-secondary w-32 truncate shrink-0">{s.name}</span>
                <div className="flex-1 bg-app-black rounded h-3 overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${(s.score / 5) * 100}%`, background: gradeColor(s.score) }} />
                </div>
                <span className="text-[10.5px] font-semibold w-8 text-right shrink-0">{s.score.toFixed(1)}</span>
              </div>
            ))}
          </div>

          {readOnly ? (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => { loadTopic(relevantIros.length - 1); setFinished(false); }}
                className="text-[12.5px] font-semibold rounded-xl px-5 py-3 border border-border-apus"
              >
                ← Review topics
              </button>
              {onExit && (
                <button onClick={onExit} className="text-[13px] font-semibold rounded-xl px-6 py-3" style={{ background: '#4C6FFF', color: '#F5F6FA' }}>
                  Close
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={async () => {
                if (finishing) return;
                setFinishing(true);
                try {
                  await onFinish(ratings, relevantIros, sessionNotes, justifications);
                } finally {
                  setFinishing(false);
                }
              }}
              disabled={finishing}
              className="text-[13px] font-semibold rounded-xl px-6 py-3 disabled:opacity-50"
              style={{ background: '#4C6FFF', color: '#F5F6FA' }}
            >
              {finishing ? 'Submitting…' : 'To Results →'}
            </button>
          )}
        </div>
      </div>
    );
  }

  const iro = relevantIros[index];
  const displayName = topicOverrides[iro.id]?.name ?? iro.name;
  const displayDescription = topicOverrides[iro.id]?.description ?? iro.description;
  const color = TYPE_COLOR[iro.iroType].text;
  const progress = (index / relevantIros.length) * 100;
  const criteria = CRITERIA_FOR[iro.iroType];
  const allTouched = criteria.every((c) => touched.has(c.key));
  const nextBlocked = mandatory && !allTouched;

  // A justification is required once a criterion has been rated (per
  // criterion) or once any criterion on the topic has been rated (per
  // topic) — Section 8, Live session.
  const topicJustification = justificationMode === 'per_topic' ? (justifications[iro.id] ?? '') : '';
  const justificationBlocked = justificationMode === 'per_criterion'
    ? criteria.some((c) => touched.has(c.key) && !(justifications[iro.id]?.[c.key] ?? '').trim())
    : touched.size > 0 && !topicJustification.trim();

  function setVal(key, v) {
    setValues((prev) => ({ ...prev, [key]: v }));
    setTouched((prev) => new Set(prev).add(key));
  }

  function setCriterionJustification(key, text) {
    setJustifications((prev) => ({ ...prev, [iro.id]: { ...prev[iro.id], [key]: text } }));
  }

  function setTopicJustification(text) {
    setJustifications((prev) => ({ ...prev, [iro.id]: text }));
  }

  function loadTopic(i) {
    const targetIro = relevantIros[i];
    setValues(ratings[targetIro.id] ? { ...ratings[targetIro.id] } : initialValuesFor(targetIro));
    setTouched(new Set(ratings[targetIro.id] ? CRITERIA_FOR[targetIro.iroType].map((c) => c.key) : []));
    setIndex(i);
  }

  function next() {
    const updated = { ...ratings, [iro.id]: { ...values } };
    setRatings(updated);
    if (index + 1 < relevantIros.length) {
      loadTopic(index + 1);
    } else {
      setFinished(true);
    }
  }

  function prev() {
    setRatings((r) => ({ ...r, [iro.id]: { ...values } }));
    loadTopic(index - 1);
  }

  function exitSession() {
    if (!window.confirm('Exit this session?\n\nYour progress will be saved and you can resume exactly where you left off.')) return;
    const updated = { ...ratings, [iro.id]: { ...values } };
    setRatings(updated);
    onProgress?.(updated, index);
    onExit?.();
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="rounded-2xl p-5 mb-6" style={{ background: 'linear-gradient(135deg, rgba(76,111,255,0.12), rgba(76,111,255,0.06))' }}>
        {readOnly ? (
          <>
            <p className="font-semibold text-[14px] mb-1.5">🔒 Reviewing a finished session</p>
            <p className="text-[12px] text-text-secondary leading-relaxed">
              This session's ratings are submitted and locked — browse them topic by topic below. To change a value, use Calibration instead of rating here again.
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold text-[14px] mb-1.5">👋 A few quick questions per topic</p>
            <p className="text-[12px] text-text-secondary leading-relaxed">
              {perspectiveFilter === 'impact'
                ? 'For each topic, rate the scale, scope, and — for negative impacts — irremediability of the effect on people and the environment, plus how likely it is to occur.'
                : perspectiveFilter === 'financial'
                ? 'For each topic, rate the magnitude of the financial effect and how likely it is to occur — please weigh both near-term and longer-term time horizons.'
                : 'For each topic, rate the criteria that apply to its type — impact topics use Scale/Scope/Irremediability/Likelihood, financial topics use Magnitude/Likelihood.'}
            </p>
            <p className="text-[11px] text-text-secondary mt-2 italic">
              For likelihood: a score of 4–5 means the event is likely to occur soon or has already occurred. A score of 1–3 means a potential future occurrence.
            </p>
          </>
        )}
      </div>

      <div className="h-1.5 bg-surface-2 rounded-full mb-2 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: '#4C6FFF' }} />
      </div>
      <div className={`flex justify-between items-center ${participants.length > 0 ? 'mb-2' : 'mb-6'}`}>
        <p className="text-[11px] text-text-secondary">Topic {index + 1} of {relevantIros.length}</p>
        <div className="flex items-center gap-3">
          {index > 0 && <button onClick={prev} className="text-[11px] text-text-secondary">← Previous topic</button>}
          {readOnly
            ? (onExit && <button onClick={onExit} className="text-[11px] text-text-secondary">Close</button>)
            : (onExit && <button onClick={exitSession} className="text-[11px] text-text-secondary">Save and pause session</button>)}
        </div>
      </div>
      {participants.length > 0 && (
        <p className="text-[10.5px] text-text-secondary mb-6">
          <span className="opacity-70">Session participants:</span> {participants.map((p) => p.name).join(', ')}
        </p>
      )}

      <div
        className="bg-surface rounded-3xl p-8 relative"
        style={{ boxShadow: '0 20px 50px -12px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full opacity-[0.15] overflow-hidden blur-sm" style={{ background: color }} />
        <span className="text-[11px] font-semibold rounded-full px-2.5 py-1 relative" style={{ color, background: TYPE_COLOR[iro.iroType].bg }}>
          {TYPE_LABEL[iro.iroType]}
        </span>
        <span className="text-[11px] font-medium rounded-full px-2.5 py-1 relative ml-1.5 border border-text-secondary text-text-secondary">
          {iro.actual ? 'Actual' : 'Potential'}
        </span>
        <p className="font-bold text-[19px] mt-4 mb-1.5 relative tracking-tight">{displayName}</p>
        {displayDescription && <p className="text-[12.5px] text-text-secondary mb-5 relative leading-relaxed">{displayDescription}</p>}

        <div className="bg-surface-2 rounded-2xl p-4 mb-6 relative">
          <p className="text-[11.5px] text-text-secondary leading-relaxed">
            💡 Rate each criterion on its own — a topic can be small in scale but very likely, or severe but rare. Drag each slider to where it best fits; hover the slider to see what each number means.
          </p>
        </div>

        {criteria.map((c) => (
          <div key={c.key}>
            <CriterionSlider label={c.label} description={c.description} labels={c.labels} value={values[c.key]} onChange={(v) => setVal(c.key, v)} color={color} disabled={readOnly} />
            {justificationMode === 'per_criterion' && touched.has(c.key) && (
              <div className="mb-6 -mt-4">
                <p className="text-[10.5px] mb-1.5" style={{ color: '#8B8B98' }}>JUSTIFICATION FOR {c.label.toUpperCase()}</p>
                <textarea
                  value={justifications[iro.id]?.[c.key] ?? ''}
                  onChange={(e) => setCriterionJustification(c.key, e.target.value)}
                  readOnly={readOnly}
                  placeholder="Why this rating?"
                  className="w-full bg-surface-2 rounded-xl px-3.5 py-3 text-[12.5px] outline-none min-h-[60px]"
                  style={readOnly ? { opacity: 0.75 } : undefined}
                />
              </div>
            )}
          </div>
        ))}

        {justificationMode === 'per_topic' && touched.size > 0 && (
          <div className="mb-6">
            <p className="text-[10.5px] mb-1.5" style={{ color: '#8B8B98' }}>JUSTIFICATION FOR THIS TOPIC</p>
            <textarea
              value={topicJustification}
              onChange={(e) => setTopicJustification(e.target.value)}
              readOnly={readOnly}
              placeholder="Why these ratings?"
              className="w-full bg-surface-2 rounded-xl px-3.5 py-3 text-[12.5px] outline-none min-h-[60px]"
              style={readOnly ? { opacity: 0.75 } : undefined}
            />
          </div>
        )}

        <div className="mb-6">
          <p className="text-[10.5px] mb-1.5" style={{ color: '#8B8B98' }}>SESSION NOTES FOR THIS TOPIC (optional)</p>
          <textarea
            value={sessionNotes[iro.id] ?? ''}
            onChange={(e) => setSessionNotes((prev) => ({ ...prev, [iro.id]: e.target.value }))}
            readOnly={readOnly}
            style={readOnly ? { opacity: 0.75 } : undefined}
            placeholder="Capture anything the group discussed — context, disagreements, follow-ups…"
            className="w-full bg-surface-2 rounded-xl px-3.5 py-3 text-[12.5px] outline-none min-h-[70px]"
          />
        </div>

        {!readOnly && nextBlocked && <p className="text-[11px] mb-2" style={{ color: '#D79A4C' }}>Please rate every criterion above before continuing.</p>}
        {!readOnly && !nextBlocked && justificationBlocked && <p className="text-[11px] mb-2" style={{ color: '#D79A4C' }}>Please add a justification for every rating above before continuing.</p>}
        <button onClick={next} disabled={!readOnly && (nextBlocked || justificationBlocked)} className="w-full text-[13.5px] font-semibold rounded-2xl py-3.5 mt-2 disabled:opacity-40 transition-transform hover:scale-[1.01]" style={{ background: '#4C6FFF', color: '#F5F6FA', boxShadow: '0 8px 24px -6px rgba(76,111,255,0.5)' }}>
          {index + 1 < relevantIros.length ? 'Next topic →' : (readOnly ? 'See results →' : 'Finish session ✓')}
        </button>
      </div>
    </div>
  );
}

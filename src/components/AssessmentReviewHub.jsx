import { useState } from 'react';
import { hasImpactAxis } from '../lib/calc';
import { TYPE_LABEL } from '../lib/topics';

const CRITERIA_LABELS = {
  neg_impact: [
    { key: 'scale', label: 'Scale' }, { key: 'scope', label: 'Scope' },
    { key: 'irreversibility', label: 'Irremediability' }, { key: 'likelihood', label: 'Likelihood' },
  ],
  pos_impact: [
    { key: 'scale', label: 'Scale' }, { key: 'scope', label: 'Scope' }, { key: 'likelihood', label: 'Likelihood' },
  ],
  risk: [{ key: 'magnitude', label: 'Magnitude' }, { key: 'financialLikelihood', label: 'Likelihood' }],
  opportunity: [{ key: 'magnitude', label: 'Magnitude' }, { key: 'financialLikelihood', label: 'Likelihood' }],
};

function EditableText({ value, onChange, minHeight = 90, readOnly }) {
  const [editing, setEditing] = useState(false);
  return (
    <div>
      {!readOnly && (
        <div className="flex justify-end mb-2">
          <button onClick={() => setEditing((e) => !e)} className="text-[11.5px] font-semibold" style={{ color: '#4C6FFF' }}>
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>
      )}
      {editing ? (
        <textarea
          value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full bg-surface-2 rounded-lg px-3 py-2.5 text-[12.5px] outline-none whitespace-pre-wrap"
          style={{ minHeight }}
        />
      ) : (
        <p className="text-[13px] text-text-secondary whitespace-pre-wrap leading-relaxed">{value}</p>
      )}
    </div>
  );
}

function TopicRow({ iro, override, onUpdate, readOnly }) {
  const [editing, setEditing] = useState(false);
  const displayName = override?.name ?? iro.name;
  const displayDescription = override?.description ?? iro.description ?? '';
  const criteria = CRITERIA_LABELS[iro.iroType];

  return (
    <div className="bg-surface-2 rounded-xl p-5 mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold rounded-full px-2.5 py-1" style={{ background: 'rgba(76,111,255,0.14)', color: '#4C6FFF' }}>
          {TYPE_LABEL[iro.iroType]} · {iro.actual ? 'Actual' : 'Potential'}
        </span>
        {!readOnly && (
          <button onClick={() => setEditing((e) => !e)} className="text-[11.5px] font-semibold" style={{ color: '#4C6FFF' }}>
            {editing ? 'Done' : 'Edit'}
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2 mb-4">
          <input
            value={displayName}
            onChange={(e) => onUpdate(iro.id, 'name', e.target.value)}
            className="bg-app-black rounded-lg px-3 py-2 text-[14px] font-semibold outline-none"
          />
          <textarea
            value={displayDescription}
            onChange={(e) => onUpdate(iro.id, 'description', e.target.value)}
            placeholder="Topic description shown to participants…"
            className="bg-app-black rounded-lg px-3 py-2 text-[12px] outline-none min-h-[50px]"
          />
        </div>
      ) : (
        <>
          <p className="text-[14.5px] font-semibold mb-0.5">{displayName}</p>
          {displayDescription && <p className="text-[11.5px] text-text-secondary mb-3">{displayDescription}</p>}
        </>
      )}

      <div className="flex flex-wrap gap-4">
        {criteria.map((c) => (
          <div key={c.key} className="min-w-[140px]">
            <p className="text-[10.5px] font-medium text-text-secondary mb-1.5">{c.label}</p>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4, 5].map((v) => (
                <span key={v} className="w-5 h-5 rounded flex items-center justify-center text-[9.5px] border border-border-apus text-text-secondary">{v}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AssessmentReviewHub({
  mode, perspectiveFilter, iros, logo, companyName,
  welcomeText, taskText, stakeholders, topicOverrides,
  onSaveAndExit, onDiscardAndExit, onGoDirect, readOnly,
}) {
  const relevantIros = iros.filter((i) => {
    if (perspectiveFilter === 'impact') return hasImpactAxis(i.iroType);
    if (perspectiveFilter === 'financial') return !hasImpactAxis(i.iroType);
    return true;
  });

  const [draftWelcome, setDraftWelcome] = useState(welcomeText);
  const [draftTask, setDraftTask] = useState(taskText);
  const [draftStakeholders, setDraftStakeholders] = useState(stakeholders);
  const [draftOverrides, setDraftOverrides] = useState(topicOverrides);
  const [dirty, setDirty] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Every topic is summarized under one "Topics" nav item — a single
  // scrollable page listing all of them — rather than one tab per topic,
  // which stopped being readable once a real assessment had 20+ IROs.
  const screens = [
    { key: 'welcome', label: 'Introduction' },
    { key: 'task', label: 'Rating Criteria' },
    ...(mode === 'expert_survey' ? [{ key: 'stakeholder', label: 'Stakeholder Group' }] : []),
    { key: 'topics', label: 'Topics' },
  ];
  const active = screens[activeIndex];

  function markDirty(fn) {
    return (...args) => { setDirty(true); fn(...args); };
  }

  function updateTopic(iroId, field, value) {
    setDirty(true);
    setDraftOverrides((prev) => ({ ...prev, [iroId]: { ...prev[iroId], [field]: value } }));
  }

  function handleExit() {
    if (readOnly || !dirty) { onDiscardAndExit(); return; }
    const wantsToSave = window.confirm('Save your changes before exiting?\n\nOK = save changes\nCancel = discard changes and keep it as it was');
    if (wantsToSave) {
      onSaveAndExit({ welcomeText: draftWelcome, taskText: draftTask, stakeholders: draftStakeholders, topicOverrides: draftOverrides });
    } else {
      onDiscardAndExit();
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[15px] font-semibold">Review — {companyName || 'Untitled'}</p>
          <p className="text-[11px] text-text-secondary">
            {readOnly ? 'Click any screen to jump to it — read-only.' : 'Click any screen to jump to it. No answers are required here — this is a preview, not a live session.'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!readOnly && onGoDirect && (
            <button onClick={onGoDirect} className="text-[12.5px] font-semibold rounded-lg px-4 py-2 border border-border-apus">
              {mode === 'expert_live_session' ? 'Go to live session →' : 'Go to survey →'}
            </button>
          )}
          <button onClick={handleExit} className="text-[12.5px] font-semibold rounded-lg px-4 py-2" style={{ background: '#4C6FFF', color: '#F5F6FA' }}>
            {readOnly ? 'Close' : 'Exit'}
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-5" style={{ scrollbarWidth: 'thin' }}>
        {screens.map((s, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className="shrink-0 text-[11.5px] font-medium rounded-lg px-3 py-1.5 whitespace-nowrap"
            style={{
              background: i === activeIndex ? '#4C6FFF' : '#100E15',
              color: i === activeIndex ? '#F5F6FA' : '#8B8B98',
              border: '1px solid ' + (i === activeIndex ? '#4C6FFF' : '#2A2830'),
            }}
          >
            {s.label}{s.key === 'topics' ? ` (${relevantIros.length})` : ''}
          </button>
        ))}
      </div>

      <div className="bg-surface rounded-2xl p-6 max-w-2xl">
        {active.key === 'welcome' && (
          <>
            <p className="text-[13px] font-semibold mb-3">Introduction</p>
            {logo && <img src={logo} alt="Logo" className="w-14 h-14 rounded-xl object-contain bg-surface-2 mb-3" />}
            <EditableText value={draftWelcome} onChange={markDirty(setDraftWelcome)} readOnly={readOnly} />
          </>
        )}

        {active.key === 'task' && (
          <>
            <p className="text-[13px] font-semibold mb-3">Rating Criteria</p>
            <EditableText value={draftTask} onChange={markDirty(setDraftTask)} readOnly={readOnly} />
          </>
        )}

        {active.key === 'stakeholder' && (
          <>
            <p className="text-[13px] font-semibold mb-4">Which group best describes you? — participant options</p>
            {['impact', 'financial'].map((group) => (
              <div key={group} className="mb-4 last:mb-0">
                <p className="text-[10.5px] font-semibold text-text-secondary tracking-wide mb-2">{group === 'impact' ? 'IMPACT PERSPECTIVE' : 'FINANCIAL PERSPECTIVE'}</p>
                <div className="flex flex-wrap gap-2">
                  {draftStakeholders[group].map((s) => (
                    <span key={s} className="flex items-center gap-1.5 text-[11.5px] bg-surface-2 rounded-full pl-3 pr-2 py-1">
                      {s}
                      {!readOnly && (
                        <button
                          onClick={() => { setDirty(true); setDraftStakeholders((prev) => ({ ...prev, [group]: prev[group].filter((x) => x !== s) })); }}
                          className="text-text-secondary hover:text-text-primary"
                        >×</button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {active.key === 'topics' && (
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <p className="text-[13px] font-semibold mb-1">All topics in this assessment</p>
            <p className="text-[10.5px] text-text-secondary mb-4 italic">Shown for reference only — nothing here is recorded.</p>
            {relevantIros.map((iro) => (
              <TopicRow key={iro.id} iro={iro} override={draftOverrides[iro.id]} onUpdate={updateTopic} readOnly={readOnly} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

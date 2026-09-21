import { useState } from 'react';

const DEFAULT_WELCOME = `Thank you for taking a few minutes for something that really matters.

You're about to help us understand how the company's work affects the people and environment around it — and what that could mean for the business itself, in both risks and opportunities.

Your answers, combined with everyone else's, will directly shape which sustainability topics we prioritize and act on next.`;

const QUAL_EXPERT_WELCOME = `Welcome, and thank you for joining this session.

You're part of a small group of experts helping calibrate how the company's activities affect people and the environment, and what that means financially — both risks and opportunities.

We'll go through each topic together, drawing on your collective expertise to judge how severe, how far-reaching, and how likely each one is. Your discussion is what makes the result defensible.`;


const IMPACT_TASK = `For each topic, please select the option that in your opinion applies best.

Impacts on the environment or society (positive or negative):
• Scale — size and severity of the impact
• Scope — how far it reaches: local, regional, national, or global
• Irremediability (negative impacts only) — how reversible and permanent it is
• Likelihood — how probable the impact is to occur`;

const FINANCIAL_TASK = `For each topic, please select the option that in your opinion applies best.

Financial risks and opportunities:
• Magnitude of financial risk or opportunity — effect on financial performance and position
• Likelihood of financial risk or opportunity occurring`;

const LIKELIHOOD_NOTE = 'For the evaluation of likelihood, a score of 4 or 5 indicates that the event is likely to occur soon or has already occurred (current development). A score of 1 to 3 indicates a potential future occurrence.';

const DEFAULT_STAKEHOLDERS = {
  impact: ['Employees', 'Suppliers', 'Local community', 'Customers', 'Workers in the value chain', 'NGOs / civil society'],
  financial: ['Investors / shareholders', 'Lenders / creditors', 'Executive management', 'Supervisory board', 'Analysts / rating agencies'],
};

export { DEFAULT_WELCOME, QUAL_EXPERT_WELCOME, IMPACT_TASK, FINANCIAL_TASK, LIKELIHOOD_NOTE, DEFAULT_STAKEHOLDERS };

function EditableCard({ title, icon, accent, value, onChange, minHeight = 100 }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="rounded-2xl p-5 mb-4" style={{ background: `linear-gradient(160deg, ${accent}12, var(--color-surface))`, borderLeft: `3px solid ${accent}` }}>
      <div className="flex justify-between items-center mb-3">
        <p className="text-[12.5px] font-semibold flex items-center gap-2"><span className="text-[15px]">{icon}</span>{title}</p>
        <button onClick={() => setEditing((e) => !e)} className="text-[11.5px] text-badge-blue">
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>
      {editing ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-surface-2 rounded-lg px-3 py-2.5 text-[12px] outline-none whitespace-pre-wrap"
          style={{ minHeight }}
        />
      ) : (
        <p className="text-[12px] text-text-secondary whitespace-pre-wrap leading-relaxed">{value}</p>
      )}
    </div>
  );
}

function StakeholderCard({ stakeholders, setStakeholders, perspectiveFilter }) {
  const [newImpact, setNewImpact] = useState('');
  const [newFinancial, setNewFinancial] = useState('');

  function remove(group, name) {
    setStakeholders((prev) => ({ ...prev, [group]: prev[group].filter((s) => s !== name) }));
  }
  function add(group, value, resetFn) {
    if (!value.trim()) return;
    setStakeholders((prev) => ({ ...prev, [group]: [...prev[group], value.trim()] }));
    resetFn('');
  }

  // Only offer the perspective(s) this assessment actually covers — an
  // Impact-only assessment has no use for Financial stakeholder options,
  // and showing them anyway invites picking ones that can never apply.
  const visibleGroups = perspectiveFilter === 'impact' ? ['impact']
    : perspectiveFilter === 'financial' ? ['financial']
    : ['impact', 'financial']; // 'full'

  return (
    <div className="rounded-2xl p-5 mb-4" style={{ background: 'linear-gradient(160deg, #D79A4C12, var(--color-surface))', borderLeft: '3px solid #D79A4C' }}>
      <p className="text-[12.5px] font-semibold mb-3 flex items-center gap-2"><span className="text-[15px]">🧑‍🤝‍🧑</span>Which group best describes you? — stakeholder options</p>

      {visibleGroups.map((group) => (
        <div key={group} className="mb-4 last:mb-0">
          <p className="text-[10.5px] font-semibold text-text-secondary tracking-wide mb-2">{group === 'impact' ? 'IMPACT PERSPECTIVE' : 'FINANCIAL PERSPECTIVE'}</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {stakeholders[group].map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-[11.5px] bg-surface-2 rounded-full pl-3 pr-2 py-1">
                {s}
                <button onClick={() => remove(group, s)} className="text-text-secondary hover:text-text-primary">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={group === 'impact' ? newImpact : newFinancial}
              onChange={(e) => (group === 'impact' ? setNewImpact(e.target.value) : setNewFinancial(e.target.value))}
              placeholder="Add a stakeholder group…"
              className="flex-1 bg-surface-2 rounded-lg px-3 py-1.5 text-[12px] outline-none"
            />
            <button
              onClick={() => group === 'impact' ? add('impact', newImpact, setNewImpact) : add('financial', newFinancial, setNewFinancial)}
              className="text-[11.5px] border border-border-apus rounded-lg px-3 py-1.5"
            >
              + Add
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TopicsCard({ title, iros, overrides, setOverrides, onDeleteTopic }) {
  const [editingId, setEditingId] = useState(null);

  function get(iro, field) {
    return overrides[iro.id]?.[field] ?? iro[field];
  }
  function set(iroId, field, value) {
    setOverrides((prev) => ({ ...prev, [iroId]: { ...prev[iroId], [field]: value } }));
  }

  function handleDelete(iro) {
    if (window.confirm(`Remove "${get(iro, 'name')}" from this assessment? Experts won't be asked about it, and any ratings already recorded for it here are deleted too. This doesn't touch the master topic library.`)) {
      onDeleteTopic(iro.id);
    }
  }

  return (
    <div className="rounded-2xl p-5 mb-4" style={{ background: 'linear-gradient(160deg, #9B7FE012, var(--color-surface))', borderLeft: '3px solid #9B7FE0' }}>
      <p className="text-[12.5px] font-semibold mb-1 flex items-center gap-2"><span className="text-[15px]">🗂️</span>{title}</p>
      <p className="text-[11px] text-text-secondary mb-3">{iros.length} IROs — edit a topic's name or description if it needs clarifying for participants, or remove one that shouldn't be part of this assessment.</p>
      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
        {iros.map((iro) => (
          <div key={iro.id} className="bg-surface-2 rounded-lg p-3">
            <div className="flex justify-between items-start gap-2">
              {editingId === iro.id ? (
                <div className="flex-1 flex flex-col gap-2">
                  <input
                    value={get(iro, 'name')}
                    onChange={(e) => set(iro.id, 'name', e.target.value)}
                    className="bg-app-black rounded-md px-2.5 py-1.5 text-[12px] outline-none"
                  />
                  <textarea
                    value={get(iro, 'description')}
                    onChange={(e) => set(iro.id, 'description', e.target.value)}
                    className="bg-app-black rounded-md px-2.5 py-1.5 text-[11.5px] outline-none min-h-[50px]"
                    placeholder="Description shown in the info icon…"
                  />
                </div>
              ) : (
                <div className="flex-1">
                  <p className="text-[12px] font-medium">{get(iro, 'name')}</p>
                  {get(iro, 'description') && <p className="text-[11px] text-text-secondary mt-0.5">{get(iro, 'description')}</p>}
                </div>
              )}
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setEditingId(editingId === iro.id ? null : iro.id)} className="text-[11px] text-badge-blue">
                  {editingId === iro.id ? 'Done' : 'Edit'}
                </button>
                <button onClick={() => handleDelete(iro)} className="text-text-secondary hover:text-[#E0645A]" title="Remove this topic from the assessment">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" /></svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SetupReviewStep({
  mode, surveyName, perspectiveFilter, iros,
  welcomeText, setWelcomeText,
  taskText, setTaskText,
  stakeholders, setStakeholders,
  topicOverrides, setTopicOverrides, onDeleteTopic,
  mandatory, setMandatory,
  justificationMode, setJustificationMode,
  onBack, onCreate,
}) {
  const isQual = mode === 'expert_live_session';
  return (
    <div className="max-w-2xl">
      <button onClick={onBack} className="text-[11.5px] text-text-secondary mb-4">← Back to general info</button>
      <div className="flex items-center gap-3 mb-1">
        <h2 className="text-[24px] font-bold text-white">Review & customize</h2>
        <span
          className="text-[11px] font-semibold rounded-full px-2.5 py-1 flex items-center gap-1.5"
          style={{ background: isQual ? 'rgba(76,111,255,0.16)' : 'rgba(94,217,150,0.16)', color: isQual ? '#4C6FFF' : '#5ED996' }}
        >
          {isQual ? '🧭 Expert live session' : '📝 Expert survey'}
        </span>
      </div>
      <p className="text-[12px] text-text-secondary mb-6">This is what participants will see. Edit anything below before creating the {isQual ? 'expert assessment' : 'questionnaire'}.</p>

      <EditableCard title="Introduction" icon="👋" accent="#5ED996" value={welcomeText} onChange={setWelcomeText} />
      <EditableCard title="Rating Criteria" icon="📋" accent="#4C6FFF" value={taskText} onChange={setTaskText} />
      {/* Section 8, New assessment, difference 3: for an Expert live
          session, participants are chosen only on the Recipients ("Who
          participates") page, one page before Kick off — no stakeholder
          section here. The survey mode's StakeholderCard (self-identify
          group options, unrelated to named recipients) is unaffected. */}
      {!isQual && <StakeholderCard stakeholders={stakeholders} setStakeholders={setStakeholders} perspectiveFilter={perspectiveFilter} />}
      <TopicsCard title="Assessment" iros={iros} overrides={topicOverrides} setOverrides={setTopicOverrides} onDeleteTopic={onDeleteTopic} />

      <div className="rounded-2xl p-5 mb-4" style={{ background: 'linear-gradient(160deg, #4C6FFF12, var(--color-surface))', borderLeft: '3px solid #4C6FFF' }}>
        <p className="text-[12.5px] font-semibold mb-3 flex items-center gap-2"><span className="text-[15px]">✍️</span>Justification mode</p>
        <div className="flex flex-col gap-2">
          <label className="flex items-start gap-2.5 bg-surface-2 rounded-lg px-3 py-2.5 cursor-pointer">
            <input type="radio" checked={justificationMode === 'per_criterion'} onChange={() => setJustificationMode('per_criterion')} className="mt-0.5" />
            <span>
              <span className="text-[12.5px] font-medium block">Per criterion (recommended)</span>
              <span className="text-[10.5px] text-text-secondary">The more audit-defensible choice — a justification for each individual rating.</span>
            </span>
          </label>
          <label className="flex items-start gap-2.5 bg-surface-2 rounded-lg px-3 py-2.5 cursor-pointer">
            <input type="radio" checked={justificationMode === 'per_topic'} onChange={() => setJustificationMode('per_topic')} className="mt-0.5" />
            <span>
              <span className="text-[12.5px] font-medium block">Per topic</span>
              <span className="text-[10.5px] text-text-secondary">One justification covering the whole topic — suits smaller or lighter-touch companies.</span>
            </span>
          </label>
        </div>
      </div>

      <div className="bg-surface rounded-2xl p-5 mb-6 flex items-center justify-between">
        <div>
          <p className="text-[12.5px] font-semibold">Require an answer for every question</p>
          <p className="text-[11px] text-text-secondary mt-0.5">Participants can't skip a rating if this is on.</p>
        </div>
        <button
          onClick={() => setMandatory((m) => !m)}
          className="w-11 h-6 rounded-full relative transition-colors shrink-0"
          style={{ background: mandatory ? '#4C6FFF' : '#2A2830' }}
        >
          <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: mandatory ? '22px' : '2px' }} />
        </button>
      </div>

      <button
        onClick={onCreate}
        className="w-full text-[13px] font-semibold rounded-xl py-3.5"
        style={{ background: '#4C6FFF', color: '#F5F6FA' }}
      >
        {isQual ? 'Choose who participates →' : 'Choose who receives it →'}
      </button>
    </div>
  );
}

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

function EditableCard({ title, value, onChange, minHeight = 100 }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="bg-surface rounded-2xl p-5 mb-4">
      <div className="flex justify-between items-center mb-3">
        <p className="text-[12.5px] font-semibold">{title}</p>
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

function ParticipantListCard({ participants, setParticipants }) {
  const [draft, setDraft] = useState({ name: '', title: '', topic: '' });

  function add() {
    if (!draft.name.trim()) return;
    setParticipants((prev) => [...prev, draft]);
    setDraft({ name: '', title: '', topic: '' });
  }
  function remove(i) {
    setParticipants((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="bg-surface rounded-2xl p-5 mb-4">
      <p className="text-[12.5px] font-semibold mb-1">Expected participants</p>
      <p className="text-[11px] text-text-secondary mb-3">Optional — helps the facilitator know who's in the room and what they cover.</p>

      {participants.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3">
          {participants.map((p, i) => (
            <div key={i} className="flex items-center justify-between bg-surface-2 rounded-lg px-3 py-2">
              <span className="text-[12px]">
                <b>{p.name}</b>{p.title && ` · ${p.title}`}{p.topic && ` · covers ${p.topic}`}
              </span>
              <button onClick={() => remove(i)} className="text-text-secondary hover:text-text-primary">×</button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" className="bg-surface-2 rounded-lg px-3 py-2 text-[12px] outline-none" />
        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" className="bg-surface-2 rounded-lg px-3 py-2 text-[12px] outline-none" />
        <input value={draft.topic} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} placeholder="Expert topic" className="bg-surface-2 rounded-lg px-3 py-2 text-[12px] outline-none" />
      </div>
      <button onClick={add} className="text-[11.5px] border border-border-apus rounded-lg px-3 py-1.5 mt-2">+ Add participant</button>
    </div>
  );
}

function StakeholderCard({ stakeholders, setStakeholders }) {
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

  return (
    <div className="bg-surface rounded-2xl p-5 mb-4">
      <p className="text-[12.5px] font-semibold mb-3">Which group best describes you? — stakeholder options</p>

      {['impact', 'financial'].map((group) => (
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

function TopicsCard({ title, iros, overrides, setOverrides }) {
  const [editingId, setEditingId] = useState(null);

  function get(iro, field) {
    return overrides[iro.id]?.[field] ?? iro[field];
  }
  function set(iroId, field, value) {
    setOverrides((prev) => ({ ...prev, [iroId]: { ...prev[iroId], [field]: value } }));
  }

  return (
    <div className="bg-surface rounded-2xl p-5 mb-4">
      <p className="text-[12.5px] font-semibold mb-1">{title}</p>
      <p className="text-[11px] text-text-secondary mb-3">{iros.length} IROs — edit a topic's name or description if it needs clarifying for participants.</p>
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
              <button onClick={() => setEditingId(editingId === iro.id ? null : iro.id)} className="text-[11px] text-badge-blue shrink-0">
                {editingId === iro.id ? 'Done' : 'Edit'}
              </button>
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
  participants, setParticipants,
  topicOverrides, setTopicOverrides,
  mandatory, setMandatory,
  onBack, onCreate,
}) {
  const isQual = mode === 'qualitative';
  return (
    <div className="max-w-2xl">
      <button onClick={onBack} className="text-[11.5px] text-text-secondary mb-4">← Back to general info</button>
      <h2 className="text-[24px] font-bold text-white mb-1">Review & customize</h2>
      <p className="text-[12px] text-text-secondary mb-6">This is what participants will see. Edit anything below before creating the {isQual ? 'expert assessment' : 'questionnaire'}.</p>

      <EditableCard title="Introduction" value={welcomeText} onChange={setWelcomeText} />
      <EditableCard title="Rating Criteria" value={taskText} onChange={setTaskText} />
      {isQual
        ? <ParticipantListCard participants={participants} setParticipants={setParticipants} />
        : <StakeholderCard stakeholders={stakeholders} setStakeholders={setStakeholders} />}
      <TopicsCard title="Assessment" iros={iros} overrides={topicOverrides} setOverrides={setTopicOverrides} />

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
        {isQual ? 'Create expert assessment' : `Create questionnaire — ${surveyName || 'Untitled'}`}
      </button>
    </div>
  );
}

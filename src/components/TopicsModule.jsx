import { useState, useRef } from 'react';
import { ESRS_TOPICS, ESRS_SUBTOPICS, TYPE_LABEL, TYPE_COLOR, PILLAR_COLOR } from '../lib/topics';
import { generateTopicLibraryExampleCsv, parseTopicLibraryCsv } from '../lib/csv';
import DmaMascot from './DmaMascot';
import { TopicsIcon } from './icons';

const EMPTY_DRAFT = {
  iroType: 'neg_impact', esrsTopicId: 'E1', subtopic: '', shortTitle: '', description: '',
  actual: true, valueChain: 'own', timeHorizon: '', potentialHumanRightsImpact: false, clientId: '',
};

const VALUE_CHAIN_LABEL = { own: 'Own operations', upstream: 'Upstream / supply chain', downstream: 'Downstream / product use & end-of-life' };
const TYPE_PREFIX = { neg_impact: 'IMP', pos_impact: 'IMP', risk: 'RSK', opportunity: 'OPP' };
// Section 8, Topics: "the library table filtered by ESRS version"; the
// consultant picks which version she's editing, new topics are tagged with
// it, and the sub-topic list follows it (a custom sub-topic is only offered
// under ESRS 2026, since that list is explicitly non-binding).
const ESRS_VERSION_LABEL = { esrs_2023_amended: 'ESRS 2023 (amended)', esrs_2026: 'ESRS 2026' };
const TIME_HORIZON_LABEL = { short: 'Short term', medium: 'Medium term', long: 'Long term' };

function nextReferenceCode(existing, iroType, esrsTopicId) {
  const prefix = `${TYPE_PREFIX[iroType]}-${esrsTopicId}`;
  const usedNumbers = existing
    .filter((t) => t.referenceCode.startsWith(prefix + '-'))
    .map((t) => parseInt(t.referenceCode.split('-').pop(), 10))
    .filter((n) => !isNaN(n));
  const next = usedNumbers.length ? Math.max(...usedNumbers) + 1 : 1;
  return `${prefix}-${String(next).padStart(2, '0')}`;
}

function TopicForm({ draft, setDraft, onSave, onCancel, esrsVersion, clients = [] }) {
  const [customSubtopic, setCustomSubtopic] = useState(false);
  return (
    <div className="bg-surface-2 rounded-xl p-4 mb-4">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10.5px] text-text-secondary mb-1.5">IRO TYPE</p>
          <select value={draft.iroType} onChange={(e) => setDraft((d) => ({ ...d, iroType: e.target.value }))} className="w-full bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none">
            <option value="neg_impact">Negative impact</option>
            <option value="pos_impact">Positive impact</option>
            <option value="risk">Risk</option>
            <option value="opportunity">Opportunity</option>
          </select>
        </div>
        <div>
          <p className="text-[10.5px] text-text-secondary mb-1.5">ESRS TOPIC</p>
          <select
            value={draft.esrsTopicId}
            onChange={(e) => setDraft((d) => ({ ...d, esrsTopicId: e.target.value, subtopic: '' }))}
            className="w-full bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none"
          >
            {ESRS_TOPICS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10.5px] text-text-secondary">ESRS SUB-TOPIC</p>
            {esrsVersion === 'esrs_2026' && (
              <button type="button" onClick={() => { setCustomSubtopic((c) => !c); setDraft((d) => ({ ...d, subtopic: '' })); }} className="text-[10.5px] font-semibold" style={{ color: '#4C6FFF' }}>
                {customSubtopic ? 'Choose from list instead' : "Type your own instead"}
              </button>
            )}
          </div>
          {customSubtopic && esrsVersion === 'esrs_2026' ? (
            <input
              value={draft.subtopic} onChange={(e) => setDraft((d) => ({ ...d, subtopic: e.target.value }))}
              placeholder="Custom sub-topic — the ESRS 2026 list is non-binding"
              className="w-full bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none"
            />
          ) : (
            <select
              value={draft.subtopic}
              onChange={(e) => setDraft((d) => ({ ...d, subtopic: e.target.value }))}
              className="w-full bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none"
            >
              <option value="">Select the specific disclosure requirement…</option>
              {(ESRS_SUBTOPICS[draft.esrsTopicId] || []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>
        <input value={draft.shortTitle} onChange={(e) => setDraft((d) => ({ ...d, shortTitle: e.target.value }))} placeholder="Short title" className="col-span-2 bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none" />
        <textarea value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} placeholder="Description — what this is and why it occurs" className="col-span-2 bg-app-black rounded-lg px-3 py-2 text-[12px] outline-none min-h-[60px]" />
        <div>
          <p className="text-[10.5px] text-text-secondary mb-1.5">ACTUAL OR POTENTIAL</p>
          <div className="flex gap-1.5">
            {[[true, 'Actual'], [false, 'Potential']].map(([val, label]) => (
              <button key={label} onClick={() => setDraft((d) => ({ ...d, actual: val }))} className="flex-1 text-[11.5px] font-medium rounded-lg py-2" style={{ background: draft.actual === val ? '#4C6FFF' : '#100E15', color: draft.actual === val ? '#F5F6FA' : '#8B8B98' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10.5px] text-text-secondary mb-1.5">VALUE CHAIN LOCATION</p>
          <select value={draft.valueChain} onChange={(e) => setDraft((d) => ({ ...d, valueChain: e.target.value }))} className="w-full bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none">
            {Object.entries(VALUE_CHAIN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {(draft.iroType === 'risk' || draft.iroType === 'opportunity') && (
          <div>
            <p className="text-[10.5px] text-text-secondary mb-1.5">TIME HORIZON — optional</p>
            <select value={draft.timeHorizon} onChange={(e) => setDraft((d) => ({ ...d, timeHorizon: e.target.value }))} className="w-full bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none">
              <option value="">Not set</option>
              {Object.entries(TIME_HORIZON_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        )}
        {draft.iroType === 'neg_impact' && (
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer text-[11.5px]">
              <input type="checkbox" checked={draft.potentialHumanRightsImpact} onChange={(e) => setDraft((d) => ({ ...d, potentialHumanRightsImpact: e.target.checked }))} />
              Potential human rights impact
            </label>
          </div>
        )}
        <div className="col-span-2">
          <p className="text-[10.5px] text-text-secondary mb-1.5">CLIENT — optional, leave blank for a shared master topic</p>
          <select value={draft.clientId || ''} onChange={(e) => setDraft((d) => ({ ...d, clientId: e.target.value || '' }))} className="w-full bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none">
            <option value="">Shared master topic</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} disabled={!draft.shortTitle.trim()} className="text-[12px] font-semibold rounded-lg px-3 py-1.5 disabled:opacity-40" style={{ background: '#4C6FFF', color: '#F5F6FA' }}>Save topic</button>
        <button onClick={onCancel} className="text-[12px] text-text-secondary">Cancel</button>
      </div>
    </div>
  );
}

function TopicRow({ topic, onUpdate, onDelete, esrsVersion, clients, currentUserEmail }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(null);
  const [signing, setSigning] = useState(false);
  const esrs = ESRS_TOPICS.find((t) => t.id === topic.esrsTopicId);
  const pillar = esrs ? PILLAR_COLOR[esrs.cat] : null;
  const isSignedOff = !!topic.signedOffBy;
  const clientName = topic.clientId ? clients.find((c) => c.id === topic.clientId)?.name : null;

  function startEdit() {
    setEditDraft({
      iroType: topic.iroType, esrsTopicId: topic.esrsTopicId, subtopic: topic.subtopic, shortTitle: topic.shortTitle,
      description: topic.description, actual: topic.actual, valueChain: topic.valueChain,
      timeHorizon: topic.timeHorizon || '', potentialHumanRightsImpact: topic.potentialHumanRightsImpact || false, clientId: topic.clientId || '',
    });
    setEditing(true);
    setOpen(true);
  }

  function saveEdit() {
    // Editing a signed-off topic means the thing that was approved no
    // longer matches — the sign-off is cleared rather than silently kept.
    onUpdate(topic.id, { ...editDraft, signedOffBy: null, signedOffAt: null });
    setEditing(false);
  }

  function handleDelete(e) {
    e.stopPropagation();
    if (window.confirm(`Delete "${topic.shortTitle}"? This cannot be undone, and it will be removed from any assessment that references it.`)) {
      onDelete(topic.id);
    }
  }

  function confirmSignOff() {
    onUpdate(topic.id, { signedOffBy: currentUserEmail, signedOffAt: Date.now() });
    setSigning(false);
  }

  function revokeSignOff(e) {
    e.stopPropagation();
    if (window.confirm('Revoke sign-off on this topic?')) {
      onUpdate(topic.id, { signedOffBy: null, signedOffAt: null });
    }
  }

  return (
    <div className="bg-surface-2 rounded-xl overflow-hidden">
      <div className="w-full flex items-center gap-3 px-4 py-3">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          {pillar && <span className="text-[10px] font-bold rounded-md w-6 h-6 flex items-center justify-center shrink-0" style={{ color: pillar.text, background: pillar.bg }}>{esrs.cat}</span>}
          <span className="text-[12.5px] font-medium flex-1 min-w-0 truncate">{topic.shortTitle}</span>
          {isSignedOff && (
            <span className="text-[9.5px] font-semibold rounded-full px-2 py-0.5 shrink-0" style={{ background: 'rgba(94,217,150,0.16)', color: '#5ED996' }} title={`Signed off by ${topic.signedOffBy}`}>
              ✓ Signed off
            </span>
          )}
          <span className="text-[10px] font-mono text-text-secondary shrink-0">{topic.referenceCode}</span>
          <span className="text-[10.5px] font-semibold rounded-full px-2 py-0.5 shrink-0" style={{ color: TYPE_COLOR[topic.iroType].text, background: TYPE_COLOR[topic.iroType].bg }}>{TYPE_LABEL[topic.iroType]}</span>
        </button>
        <button onClick={handleDelete} className="text-text-secondary hover:text-[#E0645A] shrink-0" title="Delete this topic">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" /></svg>
        </button>
        <button onClick={() => setOpen((o) => !o)} className="text-text-secondary shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: open ? 'rotate(180deg)' : 'none' }}><path d="M6 9l6 6 6-6" /></svg>
        </button>
      </div>
      {open && (
        editing ? (
          <div className="px-4 pb-4 border-t border-border-apus pt-3">
            <TopicForm draft={editDraft} setDraft={setEditDraft} onSave={saveEdit} onCancel={() => setEditing(false)} esrsVersion={esrsVersion} clients={clients} />
          </div>
        ) : (
          <div className="px-4 pb-4 text-[12px] text-text-secondary flex flex-col gap-1.5 border-t border-border-apus pt-3">
            <div className="flex justify-end -mt-1 mb-1 gap-3">
              <button onClick={startEdit} className="text-[11.5px] font-semibold" style={{ color: '#4C6FFF' }}>Edit</button>
            </div>
            <p><b className="text-text-primary">ESRS:</b> {esrs?.name}{topic.subtopic && ` · ${topic.subtopic}`}</p>
            {topic.description && <p><b className="text-text-primary">Description:</b> {topic.description}</p>}
            <p><b className="text-text-primary">Actual / Potential:</b> {topic.actual ? 'Actual' : 'Potential'}</p>
            <p><b className="text-text-primary">Value chain:</b> {VALUE_CHAIN_LABEL[topic.valueChain]}</p>
            {topic.timeHorizon && <p><b className="text-text-primary">Time horizon:</b> {TIME_HORIZON_LABEL[topic.timeHorizon]}</p>}
            {topic.potentialHumanRightsImpact && <p><b className="text-text-primary">Potential human rights impact:</b> Yes</p>}
            <p><b className="text-text-primary">Client:</b> {clientName || 'Shared master topic'}</p>

            {isSignedOff ? (
              <div className="rounded-lg px-3 py-2.5 mt-1.5 flex items-center justify-between" style={{ background: 'rgba(94,217,150,0.1)', border: '1px solid rgba(94,217,150,0.3)' }}>
                <p className="text-[11.5px]" style={{ color: '#5ED996' }}>✓ Signed off by <b>{topic.signedOffBy}</b> · {new Date(topic.signedOffAt).toLocaleDateString()}</p>
                <button onClick={revokeSignOff} className="text-[11px] text-text-secondary hover:text-text-primary shrink-0">Revoke</button>
              </div>
            ) : signing ? (
              <div className="bg-app-black rounded-lg p-3 mt-1.5">
                <p className="text-[10.5px] text-text-secondary mb-1.5">Sign off as the logged-in user</p>
                <div className="flex gap-2">
                  <span className="flex-1 text-[12.5px] px-3 py-2">{currentUserEmail}</span>
                  <button onClick={confirmSignOff} className="text-[11.5px] font-semibold rounded-lg px-3 py-2" style={{ background: '#5ED996', color: '#07070B' }}>Confirm</button>
                  <button onClick={() => setSigning(false)} className="text-[11.5px] text-text-secondary px-2">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setSigning(true)} className="self-start text-[11.5px] font-semibold rounded-lg px-3 py-1.5 mt-1.5" style={{ background: 'rgba(94,217,150,0.14)', color: '#5ED996' }}>
                ✓ Sign off this topic
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}

function PerspectiveSection({ title, color, topics, types, addingType, setAddingType, draft, setDraft, onSave, onCancel, filter, onUpdateTopic, onDeleteTopic, esrsVersion, clients, currentUserEmail }) {
  const filtered = topics.filter((t) => types.includes(t.iroType) && t.esrsVersion === esrsVersion && (filter === 'all' || ESRS_TOPICS.find((e) => e.id === t.esrsTopicId)?.cat === filter));
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: color }} />
          <p className="text-[13px] font-semibold">{title}</p>
          <span className="text-[10.5px] text-text-secondary">({filtered.length})</span>
        </div>
        {!addingType && (
          <button onClick={() => setAddingType(types[0])} className="text-[11.5px] font-semibold border border-border-apus rounded-lg px-3 py-1.5">+ Add topic</button>
        )}
      </div>
      {addingType && types.includes(addingType) && (
        <TopicForm draft={draft} setDraft={setDraft} onSave={onSave} onCancel={onCancel} esrsVersion={esrsVersion} clients={clients} />
      )}
      {filtered.length === 0 ? (
        <p className="text-[12px] text-text-secondary py-4 text-center bg-surface-2 rounded-xl">No topics here yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((t) => <TopicRow key={t.id} topic={t} onUpdate={onUpdateTopic} onDelete={onDeleteTopic} esrsVersion={esrsVersion} clients={clients} currentUserEmail={currentUserEmail} />)}
        </div>
      )}
    </div>
  );
}

export default function TopicsModule({ topicLibrary, setTopicLibrary, onGoNext, esrsVersion, setEsrsVersion, clients = [], currentUserEmail }) {
  const [addingType, setAddingType] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [filter, setFilter] = useState('all');
  const [csvErrors, setCsvErrors] = useState([]);
  const fileInputRef = useRef(null);

  function startAdd(type) {
    setDraft({ ...EMPTY_DRAFT, iroType: type });
    setAddingType(type);
  }

  function save() {
    if (!draft.shortTitle.trim()) return;
    const referenceCode = nextReferenceCode(topicLibrary, draft.iroType, draft.esrsTopicId);
    setTopicLibrary((prev) => [...prev, { ...draft, id: crypto.randomUUID(), referenceCode, esrsVersion, clientId: draft.clientId || null }]);
    setAddingType(null);
  }

  function updateTopic(id, fields) {
    setTopicLibrary((prev) => prev.map((t) => (t.id === id ? { ...t, ...fields } : t)));
  }

  function deleteTopic(id) {
    setTopicLibrary((prev) => prev.filter((t) => t.id !== id));
  }

  function handleCsvUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const { topics, errors } = parseTopicLibraryCsv(evt.target.result, ESRS_TOPICS, ESRS_SUBTOPICS);
      setCsvErrors(errors);
      if (topics.length) {
        setTopicLibrary((prev) => {
          let next = [...prev];
          topics.forEach((t) => {
            next = [...next, { ...t, esrsVersion, referenceCode: nextReferenceCode(next, t.iroType, t.esrsTopicId) }];
          });
          return next;
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div>
      <DmaMascot title="How to select IROs">
        <p className="mb-2"><b className="text-text-primary">Start from the ESRS topic list, not a blank page.</b> Each of the 10 standard topics (E1–G1) has typical sub-topics already defined by EFRAG — use those as your checklist rather than inventing categories.</p>
        <p className="mb-2"><b className="text-text-primary">Ask both directions, every time.</b> Does the company's activity affect people or the environment (impact)? Does the topic create a financial risk or opportunity (financial)? A topic can be "in scope" from either direction alone.</p>
        <p className="mb-2"><b className="text-text-primary">Actual vs. potential matters for scoring, not inclusion.</b> Include something even if it's only a potential/future issue — that's a valid IRO, just rated differently later.</p>
        <p><b className="text-text-primary">When in doubt, include it and let the rating decide.</b> A topic that turns out immaterial after rating is a normal, defensible outcome.</p>
      </DmaMascot>

      <h2 className="text-[24px] font-bold text-white mb-1 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg, #7C9BFF, #4C6FFF)', boxShadow: '0 6px 14px -4px rgba(0,0,0,0.4)' }}>
          <TopicsIcon size={19} />
        </span>
        Topics
      </h2>
      <p className="text-[12px] text-text-secondary mb-5">
        The master list of Impacts, Risks, and Opportunities in scope for this engagement — organized by perspective, colour-coded by ESRS pillar. Add topics one at a time below, or upload many at once as a CSV.
      </p>

      <div className="flex gap-1.5 mb-5">
        {Object.entries(ESRS_VERSION_LABEL).map(([v, label]) => (
          <button
            key={v} onClick={() => setEsrsVersion(v)}
            className="text-[11.5px] font-semibold rounded-lg px-3 py-1.5"
            style={{
              background: esrsVersion === v ? '#4C6FFF' : 'transparent',
              color: esrsVersion === v ? '#F5F6FA' : '#8B8B98',
              border: '1px solid ' + (esrsVersion === v ? 'transparent' : '#2A2830'),
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-surface rounded-2xl p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-[12.5px] font-semibold mb-0.5">Bulk upload</p>
          <p className="text-[11px] text-text-secondary">Semicolon-separated CSV — download the template to see the exact columns and valid values.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => {
              const blob = new Blob([generateTopicLibraryExampleCsv(ESRS_SUBTOPICS)], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'topics-template.csv';
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="text-[11.5px] font-semibold border border-border-apus rounded-lg px-3 py-2"
          >
            ⭳ Download template
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="text-[11.5px] font-semibold rounded-lg px-3 py-2" style={{ background: '#4C6FFF', color: '#F5F6FA' }}>
            ⭱ Upload CSV
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
        </div>
      </div>

      {csvErrors.length > 0 && (
        <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(215,154,76,0.1)', border: '1px solid rgba(215,154,76,0.3)' }}>
          <p className="text-[11.5px] font-semibold mb-2" style={{ color: '#D79A4C' }}>{csvErrors.length} row(s) need attention</p>
          <div className="flex flex-col gap-1">
            {csvErrors.map((err, i) => (
              <p key={i} className="text-[11px] text-text-secondary">Row {err.row}: {err.message}</p>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1.5 mb-6">
        {['all', 'E', 'S', 'G'].map((p) => (
          <button
            key={p} onClick={() => setFilter(p)}
            className="text-[11.5px] font-semibold rounded-lg px-3 py-1.5"
            style={{
              background: filter === p ? (p === 'all' ? '#4C6FFF' : PILLAR_COLOR[p]?.bg) : 'transparent',
              color: filter === p ? (p === 'all' ? '#F5F6FA' : PILLAR_COLOR[p]?.text) : '#8B8B98',
              border: '1px solid ' + (filter === p ? 'transparent' : '#2A2830'),
            }}
          >
            {p === 'all' ? 'All' : p === 'E' ? 'Environmental' : p === 'S' ? 'Social' : 'Governance'}
          </button>
        ))}
      </div>

      <PerspectiveSection
        title="Impacts (negative and positive) — impact perspective" color="#5ED996"
        topics={topicLibrary} types={['neg_impact', 'pos_impact']} filter={filter}
        addingType={addingType && ['neg_impact', 'pos_impact'].includes(addingType) ? addingType : null}
        setAddingType={startAdd} draft={draft} setDraft={setDraft} onSave={save} onCancel={() => setAddingType(null)}
        onUpdateTopic={updateTopic} onDeleteTopic={deleteTopic}
        esrsVersion={esrsVersion} clients={clients} currentUserEmail={currentUserEmail}
      />
      <PerspectiveSection
        title="Risks and opportunities — financial perspective" color="#4C6FFF"
        topics={topicLibrary} types={['risk', 'opportunity']} filter={filter}
        addingType={addingType && ['risk', 'opportunity'].includes(addingType) ? addingType : null}
        setAddingType={startAdd} draft={draft} setDraft={setDraft} onSave={save} onCancel={() => setAddingType(null)}
        onUpdateTopic={updateTopic} onDeleteTopic={deleteTopic}
        esrsVersion={esrsVersion} clients={clients} currentUserEmail={currentUserEmail}
      />

      {topicLibrary.some((t) => t.esrsVersion === esrsVersion) && (
        <div className="rounded-2xl p-5 mt-3 flex items-center justify-between" style={{ background: 'linear-gradient(115deg, #3654D6, #2FA88A)' }}>
          <div>
            <p className="text-[14px] font-bold text-white">Topics defined — what's next?</p>
            <p className="text-[12px]" style={{ color: 'rgba(245,246,250,0.9)' }}>Set up an assessment to start rating these topics.</p>
          </div>
          <button onClick={onGoNext} className="text-[13px] font-bold rounded-full px-5 py-2.5 shrink-0" style={{ background: '#F5F6FA', color: '#111318' }}>
            Set up an assessment →
          </button>
        </div>
      )}
    </div>
  );
}

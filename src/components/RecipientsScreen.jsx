import { useState } from 'react';
import { PILLAR_COLOR } from '../lib/topics';

const PILLAR_LABEL = { E: 'Environmental', S: 'Social', G: 'Governance' };
const EMPTY_MEMBER = { name: '', title: '', company: '', email: '', pillars: [], expertise: '' };
const DATA_STATEMENT = "The details you enter about this person are stored securely and used only to organise and document this materiality assessment. Their answers can be connected to them through their invitation or the session attendee list. They may be shared with the client company and its auditor. They can request deletion or anonymisation at any time by contacting: anikalerch@greenfriend.org.";

function isValidEmail(v) {
  return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function downloadCsv(rows, filename) {
  const header = ['Name', 'Title', 'Company', 'Email', 'Stakeholder group', 'Assign'];
  const lines = [header, ...rows.map((r) => [r.name, r.title, r.company, r.email, r.groupName, (r.pillars || []).map((p) => PILLAR_LABEL[p]).join('/')])]
    .map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(','));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function PersonRow({ p, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', p.key); onDragStart?.(); }}
      className="flex items-center gap-3 bg-surface-2 rounded-lg px-3 py-2 cursor-grab"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-text-secondary shrink-0">
        <circle cx="8" cy="6" r="1.6" /><circle cx="16" cy="6" r="1.6" />
        <circle cx="8" cy="12" r="1.6" /><circle cx="16" cy="12" r="1.6" />
        <circle cx="8" cy="18" r="1.6" /><circle cx="16" cy="18" r="1.6" />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-medium truncate">{p.name}</p>
        {(p.title || p.company) && <p className="text-[10.5px] text-text-secondary truncate">{p.title}{p.title && p.company && ' · '}{p.company}</p>}
      </div>
      {(p.pillars || []).map((pillar) => (
        <span key={pillar} className="text-[9.5px] font-semibold rounded-full px-2 py-0.5 shrink-0" style={{ color: PILLAR_COLOR[pillar].text, background: PILLAR_COLOR[pillar].bg }}>
          {PILLAR_LABEL[pillar]}
        </span>
      ))}
    </div>
  );
}

// Section 8, New assessment, difference 2: people are always chosen from
// the master stakeholder map, exactly like the Stakeholders add-contact
// form — pick a group (perspective-limited, silent included), then either
// pick an existing person or add a new one (also saved to the master map).
// The prototype's own layout (grouped headers, drag to exclude/include,
// CSV download, "+ Add more stakeholders") stays; what changed is where
// the underlying people list comes from (live master map, not a snapshot
// carried from an earlier wizard step) and this add-panel.
function AddPersonPanel({ visibleGroups, includedKeys, setStakeholderMap, onAdded }) {
  const [groupId, setGroupId] = useState(visibleGroups[0]?.id ?? '');
  const [mode, setMode] = useState('existing'); // 'existing' | 'new'
  const [memberId, setMemberId] = useState('');
  const [newMember, setNewMember] = useState(EMPTY_MEMBER);
  const [consent, setConsent] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const group = visibleGroups.find((g) => g.id === groupId) ?? null;
  const availableMembers = group ? group.members.filter((m) => !includedKeys.has(`${group.id}::${m.id}`)) : [];

  function togglePillar(p) {
    setNewMember((d) => ({ ...d, pillars: d.pillars.includes(p) ? d.pillars.filter((x) => x !== p) : [...d.pillars, p] }));
  }

  function handleAddExisting() {
    if (!group || !memberId) return;
    onAdded(`${group.id}::${memberId}`);
    setMemberId('');
  }

  const newValid = newMember.name.trim() && newMember.title.trim() && isValidEmail(newMember.email) && consent;

  function handleAddNew() {
    setAttempted(true);
    if (!group || !newValid) return;
    const id = crypto.randomUUID();
    setStakeholderMap((prev) => prev.map((g) => (
      g.id === group.id ? { ...g, members: [...g.members, { ...newMember, id }] } : g
    )));
    onAdded(`${group.id}::${id}`);
    setNewMember(EMPTY_MEMBER);
    setConsent(false);
    setAttempted(false);
  }

  if (!visibleGroups.length) return null;

  return (
    <div className="rounded-xl p-4 mb-5" style={{ background: 'linear-gradient(160deg, rgba(76,111,255,0.12), var(--color-surface-2))', border: '1px solid rgba(76,111,255,0.25)' }}>
      <p className="text-[10.5px] font-semibold tracking-wide mb-2.5" style={{ color: '#4C6FFF' }}>ADD SOMEONE</p>
      <p className="text-[11px] text-text-secondary mb-1.5">STAKEHOLDER GROUP</p>
      <select
        value={groupId}
        onChange={(e) => { setGroupId(e.target.value); setMemberId(''); }}
        className="w-full bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none mb-3"
      >
        {visibleGroups.map((g) => <option key={g.id} value={g.id}>{g.name}{g.type === 'silent' ? ' (silent stakeholder)' : ''}</option>)}
      </select>

      <div className="flex gap-2 mb-3">
        <button type="button" onClick={() => setMode('existing')} className="text-[11.5px] font-semibold rounded-lg px-3 py-1.5" style={{ background: mode === 'existing' ? '#4C6FFF' : 'transparent', color: mode === 'existing' ? '#F5F6FA' : '#8B8B98', border: '1px solid ' + (mode === 'existing' ? 'transparent' : '#2A2830') }}>
          Pick existing person
        </button>
        <button type="button" onClick={() => setMode('new')} className="text-[11.5px] font-semibold rounded-lg px-3 py-1.5" style={{ background: mode === 'new' ? '#4C6FFF' : 'transparent', color: mode === 'new' ? '#F5F6FA' : '#8B8B98', border: '1px solid ' + (mode === 'new' ? 'transparent' : '#2A2830') }}>
          + Add a new person
        </button>
      </div>

      {mode === 'existing' ? (
        <div className="flex gap-2">
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="flex-1 bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none">
            <option value="">
              {availableMembers.length ? 'Choose a person…' : 'Everyone in this group is already included'}
            </option>
            {availableMembers.map((m) => <option key={m.id} value={m.id}>{m.name}{m.title ? ` — ${m.title}` : ''}</option>)}
          </select>
          <button type="button" onClick={handleAddExisting} disabled={!memberId} className="text-[12px] font-semibold rounded-lg px-3.5 py-2 disabled:opacity-40" style={{ background: '#4C6FFF', color: '#07070B' }}>Add</button>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={newMember.name} onChange={(e) => setNewMember((d) => ({ ...d, name: e.target.value }))} placeholder="Name *" className="bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none" style={{ border: attempted && !newMember.name.trim() ? '1px solid #E0645A' : '1px solid transparent' }} />
            <input value={newMember.title} onChange={(e) => setNewMember((d) => ({ ...d, title: e.target.value }))} placeholder="Role *" className="bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none" style={{ border: attempted && !newMember.title.trim() ? '1px solid #E0645A' : '1px solid transparent' }} />
            <input value={newMember.company} onChange={(e) => setNewMember((d) => ({ ...d, company: e.target.value }))} placeholder="Company" className="bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none" />
            <input value={newMember.email} onChange={(e) => setNewMember((d) => ({ ...d, email: e.target.value }))} placeholder="Email" className="bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none" style={{ border: !isValidEmail(newMember.email) ? '1px solid #E0645A' : '1px solid transparent' }} />
          </div>
          {attempted && (!newMember.name.trim() || !newMember.title.trim()) && (
            <p className="text-[11px] mb-2" style={{ color: '#E0645A' }}>Please fill in both name and role.</p>
          )}
          <div className="flex items-center gap-3 mb-3">
            <p className="text-[10.5px] text-text-secondary shrink-0">Expert in:</p>
            <div className="flex gap-1.5">
              {['E', 'S', 'G'].map((p) => (
                <button key={p} type="button" onClick={() => togglePillar(p)} className="text-[11px] font-bold rounded-lg px-2.5 py-1.5" style={{ background: newMember.pillars.includes(p) ? PILLAR_COLOR[p].text : '#100E15', color: newMember.pillars.includes(p) ? '#07070B' : '#8B8B98' }}>
                  {PILLAR_LABEL[p]}
                </button>
              ))}
            </div>
            <input value={newMember.expertise} onChange={(e) => setNewMember((d) => ({ ...d, expertise: e.target.value }))} placeholder="Specific area of expertise…" className="flex-1 bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none" />
          </div>
          <div className="rounded-lg px-3 py-2.5 mb-3" style={{ background: 'rgba(76,111,255,0.08)', border: '1px solid rgba(76,111,255,0.2)' }}>
            <p className="text-[11px] text-text-secondary leading-relaxed mb-2">{DATA_STATEMENT}</p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" required />
              <span className="text-[11.5px]">I have informed this person how their data is used.</span>
            </label>
          </div>
          <button type="button" onClick={handleAddNew} disabled={!consent} className="w-full text-[12.5px] font-bold rounded-xl py-2.5 disabled:opacity-40" style={{ background: '#4C6FFF', color: '#F5F6FA' }}>
            + Add stakeholder
          </button>
        </div>
      )}
    </div>
  );
}

export default function RecipientsScreen({ mode, perspectiveFilter, stakeholderMap, setStakeholderMap, onBack, onContinue, onGoToStakeholders }) {
  const visibleGroups = stakeholderMap.filter((g) => (
    perspectiveFilter === 'financial' ? g.perspectives.includes('financial')
      : perspectiveFilter === 'impact' ? g.perspectives.includes('impact')
      : g.perspectives.includes('impact') || g.perspectives.includes('financial')
  ));

  const allPeople = visibleGroups.flatMap((g) =>
    g.members.map((m) => ({ key: `${g.id}::${m.id}`, groupId: g.id, groupName: g.name, groupType: g.type, stakeholderMemberId: m.id, ...m }))
  );

  const [excluded, setExcluded] = useState(new Set());
  const [dragOverZone, setDragOverZone] = useState(null);

  function drop(zone) {
    return (e) => {
      e.preventDefault();
      const key = e.dataTransfer.getData('text/plain');
      setExcluded((prev) => {
        const next = new Set(prev);
        if (zone === 'excluded') next.add(key); else next.delete(key);
        return next;
      });
      setDragOverZone(null);
    };
  }

  const included = allPeople.filter((p) => !excluded.has(p.key));
  const excludedPeople = allPeople.filter((p) => excluded.has(p.key));
  const includedByGroup = visibleGroups.map((g) => ({
    group: g,
    people: included.filter((p) => p.groupId === g.id),
  }));
  const includedKeys = new Set(included.map((p) => p.key));

  const heading = mode === 'expert_live_session' ? 'Who participates' : 'Who receives the questionnaire';
  const subheading = mode === 'expert_live_session'
    ? 'Everyone from the stakeholder groups that match this session’s perspective is included by default. Drag anyone you don’t want in the room down to Excluded, or add someone new below.'
    : 'Everyone from the stakeholder groups that match this survey’s perspective is included by default. Drag anyone who shouldn’t receive the link down to Excluded, or add someone new below.';

  return (
    <div className="max-w-2xl">
      <button onClick={onBack} className="text-[11.5px] text-text-secondary mb-4">← Back</button>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[24px] font-bold text-white">{heading}</h2>
        <button onClick={onGoToStakeholders} className="text-[11.5px] font-semibold rounded-lg px-3.5 py-2 border border-border-apus">
          + Add more stakeholders
        </button>
      </div>
      <p className="text-[12px] text-text-secondary mb-6">{subheading}</p>

      {visibleGroups.length === 0 ? (
        <div className="bg-surface rounded-2xl p-6 mb-5">
          <p className="text-[12.5px] text-text-secondary mb-3">
            No stakeholder groups exist yet for this perspective — add one in Stakeholders, then come back and continue.
          </p>
          <button onClick={onGoToStakeholders} className="text-[12px] font-semibold rounded-lg px-4 py-2" style={{ background: '#4C6FFF', color: '#07070B' }}>
            Go to Stakeholders
          </button>
        </div>
      ) : (
        <>
          <AddPersonPanel visibleGroups={visibleGroups} includedKeys={includedKeys} setStakeholderMap={setStakeholderMap} onAdded={(key) => setExcluded((prev) => { const next = new Set(prev); next.delete(key); return next; })} />

          <div className="flex items-center justify-between mb-3">
            <p className="text-[12.5px] font-semibold">Included ({included.length})</p>
            <button
              onClick={() => downloadCsv(included, `${heading.toLowerCase().replace(/\s+/g, '-')}.csv`)}
              className="text-[11.5px] font-semibold border border-border-apus rounded-lg px-3 py-1.5"
            >
              ⭳ Download Excel (CSV)
            </button>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOverZone('included'); }}
            onDragLeave={() => setDragOverZone(null)}
            onDrop={drop('included')}
            className="bg-surface rounded-2xl p-4 mb-6"
            style={{ outline: dragOverZone === 'included' ? '2px dashed #4C6FFF' : 'none', minHeight: 80 }}
          >
            {includedByGroup.every(({ people }) => people.length === 0) ? (
              <p className="text-[12px] text-text-secondary text-center py-4">Everyone has been excluded — drag someone back up from below.</p>
            ) : (
              includedByGroup.map(({ group, people }) => people.length > 0 && (
                <div key={group.id} className="mb-4 last:mb-0">
                  <p className="text-[10.5px] font-semibold text-text-secondary tracking-wide mb-2 flex items-center gap-1.5">
                    {group.name.toUpperCase()}
                    {group.type === 'silent' && <span className="text-[9px] font-semibold rounded-full px-1.5 py-0.5 normal-case" style={{ background: 'rgba(94,217,150,0.14)', color: '#5ED996' }}>Silent stakeholder</span>}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {people.map((p) => <PersonRow key={p.key} p={p} />)}
                  </div>
                </div>
              ))
            )}
          </div>

          <p className="text-[10.5px] text-text-secondary mb-2">EXCLUDED — drag here to leave someone out of this assessment</p>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOverZone('excluded'); }}
            onDragLeave={() => setDragOverZone(null)}
            onDrop={drop('excluded')}
            className="rounded-2xl p-4 mb-6"
            style={{ background: 'rgba(139,139,152,0.04)', outline: dragOverZone === 'excluded' ? '2px dashed #8B8B98' : 'none', minHeight: 70 }}
          >
            {excludedPeople.length === 0 ? (
              <p className="text-[11.5px] text-text-secondary text-center py-4">Nobody excluded — drag a name here to leave them out.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {excludedPeople.map((p) => <PersonRow key={p.key} p={p} />)}
              </div>
            )}
          </div>
        </>
      )}

      <button
        onClick={() => onContinue(included)}
        className="text-[13px] font-semibold rounded-xl px-6 py-3"
        style={{ background: '#4C6FFF', color: '#F5F6FA' }}
      >
        Continue →
      </button>
      {included.length === 0 && visibleGroups.length > 0 && (
        <p className="text-[11.5px] mt-2 text-text-secondary">
          {mode === 'expert_live_session'
            ? 'Nobody is included — you can still continue; Kick off stays blocked until someone is added.'
            : 'Nobody is included — you can still continue; add recipients here or from Recipients later.'}
        </p>
      )}
    </div>
  );
}

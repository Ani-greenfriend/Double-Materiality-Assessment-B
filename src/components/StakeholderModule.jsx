import { useState } from 'react';
import { PILLAR_COLOR } from '../lib/topics';
import { StakeholderIcon, ImpactIcon, FinancialIcon } from './icons';

function PoolIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="7" width="18" height="13" rx="1.5" />
      <path d="M3 7l2.5-4h13L21 7M10 12h4" />
    </svg>
  );
}

const PILLAR_LABEL = { E: 'Environmental', S: 'Social', G: 'Governance' };
const EMPTY_MEMBER = { name: '', title: '', company: '', email: '', pillars: [], expertise: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(v) { return !v || EMAIL_RE.test(v); }

// Section 7 GDPR: the consent checkbox and data statement belong on every
// form that adds a named person — this is the stakeholder contact form.
const DATA_STATEMENT = "The details you enter about this person are stored securely and used only to organise and document this materiality assessment. Their answers can be connected to them through their invitation or the session attendee list. They may be shared with the client company and its auditor. They can request deletion or anonymisation at any time by contacting: anikalerch@greenfriend.org.";

// Spec v2.0 amended 5: silent stakeholders are ordinary entries in this same
// list (type 'silent'), not a separate screen — impact perspective only, a
// small marker on the row, and this explanation on hover.
const SILENT_EXPLANATION = "Cannot speak for itself. ESRS allows a proxy — for example an ecologist, a nature NGO or a scientific study. Consider whether this party is affected by the company's activities and, if so, add a representative here.";

function PerspectiveTag({ type }) {
  const style = type === 'impact'
    ? { color: '#5ED996', bg: 'rgba(94,217,150,0.14)' }
    : { color: '#4C6FFF', bg: 'rgba(76,111,255,0.14)' };
  return <span className="text-[10px] font-semibold rounded-full px-2 py-0.5" style={{ color: style.color, background: style.bg }}>{type === 'impact' ? 'Impact' : 'Financial'}</span>;
}

function DragHandle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-text-secondary cursor-grab shrink-0">
      <title>Drag to reorder, or move between Impact, Financial, and the generic pool</title>
      <circle cx="8" cy="6" r="1.6" /><circle cx="16" cy="6" r="1.6" />
      <circle cx="8" cy="12" r="1.6" /><circle cx="16" cy="12" r="1.6" />
      <circle cx="8" cy="18" r="1.6" /><circle cx="16" cy="18" r="1.6" />
    </svg>
  );
}

export const GENERIC_POOL_SUGGESTIONS = [
  'Media / Press', 'Trade unions', 'Industry associations', 'Local government / municipalities',
  'National regulators', 'Legal and regulatory consultants', 'Technology & innovation providers',
  'Insurers', 'Auditors / assurance providers', 'Competitors', 'Academic / research institutions',
  'Local communities near operational sites', 'Environmental NGOs', 'Human rights organizations',
  'Logistics & transport partners', 'Raw material suppliers', 'Waste management partners',
  'Distribution partners / resellers', 'International standard-setting bodies', 'Downstream customers',
];

function GroupRow({ g, onOpenGroup, onRename, onRemove, onSetBoth, editingId, setEditingId, onRowDrop, isDragOver, setDragOverId }) {
  const both = g.perspectives.length === 2;
  const rowStyle = both
    ? { background: 'linear-gradient(90deg, rgba(94,217,150,0.10), rgba(76,111,255,0.10))', border: '1px solid rgba(139,139,152,0.18)' }
    : { background: '#1A1820', border: '1px solid transparent' };

  return (
    <div
      draggable
      onDragStart={(e) => {
        // The whole row is draggable for reordering, but a real mouse click
        // on a button or input inside it must never be swallowed as a drag —
        // that's exactly why clicking Edit appeared to do nothing.
        if (e.target.closest('button, input')) { e.preventDefault(); return; }
        e.dataTransfer.setData('text/plain', g.id);
      }}
      onDragOver={(e) => { e.preventDefault(); setDragOverId(g.id); }}
      onDragLeave={() => setDragOverId(null)}
      onDrop={(e) => { e.preventDefault(); onRowDrop(e.dataTransfer.getData('text/plain'), g.id); setDragOverId(null); }}
      className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
      style={{ ...rowStyle, outline: isDragOver ? '2px solid #4C6FFF' : 'none' }}
    >
      <DragHandle />
      {editingId === g.id ? (
        <input
          autoFocus
          defaultValue={g.name}
          onBlur={(e) => { onRename(g.id, e.target.value); setEditingId(null); }}
          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
          className="bg-app-black rounded-lg px-2 py-1 text-[12.5px] outline-none flex-1 min-w-0"
        />
      ) : (
        <button type="button" onClick={() => onOpenGroup(g.id)} className="text-[12.5px] font-medium text-left flex-1 min-w-0 flex items-center gap-1.5 group" title="Open this group to view or add named contacts">
          <span className="truncate group-hover:underline">{g.name}</span>
          <span className="text-[10px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#4C6FFF' }}>+ add contacts →</span>
        </button>
      )}
      {g.type === 'silent' && (
        <span
          className="text-[9px] font-semibold rounded-full px-1.5 py-0.5 shrink-0 cursor-help"
          style={{ color: '#5ED996', background: 'rgba(94,217,150,0.14)' }}
          title={SILENT_EXPLANATION}
        >
          Silent stakeholder
        </span>
      )}
      {both && <span className="text-[9px] font-semibold rounded-full px-1.5 py-0.5 shrink-0" style={{ color: '#ACACB8', background: 'rgba(139,139,152,0.16)' }}>Both</span>}
      {g.members.length > 0 ? (
        <button type="button" onClick={() => onOpenGroup(g.id)} className="text-[12px] font-bold rounded-full px-3 py-1 shrink-0" style={{ background: 'rgba(76,111,255,0.18)', color: '#7C9BFF' }} title={`${g.members.length} named contact${g.members.length === 1 ? '' : 's'} — click to view`}>
          {g.members.length} {g.members.length === 1 ? 'person' : 'people'}
        </button>
      ) : (
        <button type="button" onClick={() => onOpenGroup(g.id)} className="text-[12px] font-bold rounded-full px-3 py-1 shrink-0 animate-pulse" style={{ background: '#D79A4C', color: '#100E15' }}>
          + Add stakeholders
        </button>
      )}
      {!both && g.type !== 'silent' && (
        <button type="button" onClick={() => onSetBoth(g.id)} className="text-[10px] font-semibold rounded-full px-2 py-0.5 shrink-0 border border-border-apus text-text-secondary hover:text-text-primary hover:border-[#8B8B98]" title="Assign to both perspectives">
          + Both
        </button>
      )}
      <button type="button" onClick={() => setEditingId(g.id)} className="text-text-secondary hover:text-text-primary shrink-0" title="Rename this group">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
      </button>
      <button type="button" onClick={() => onRemove(g.id)} className="text-text-secondary hover:text-[#E0645A] shrink-0" title="Remove stakeholder">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" /></svg>
      </button>
    </div>
  );
}

// A "section" is just a filtered, reorderable view over the one shared array.
// Dropping onto a perspective section adds that perspective to the dropped
// group (without removing any other it already has); dropping onto the
// generic pool clears every perspective — nothing is ever deleted by a drag,
// only re-homed. Dropping directly on a row inserts at that row's position;
// dropping on empty section space appends to the end.
function Section({ title, icon, accentColor, accentBg, perspective, groups, setGroups, onOpenGroup, editingId, setEditingId, emptyHint }) {
  const [dragOverId, setDragOverId] = useState(null);
  const [containerDragOver, setContainerDragOver] = useState(false);
  // Silent stakeholders surface first in whichever list they're in — easy
  // to find, since they're the ones most likely to be forgotten.
  const filtered = (perspective === null
    ? groups.filter((g) => g.perspectives.length === 0)
    : groups.filter((g) => g.perspectives.includes(perspective))
  ).sort((a, b) => (a.type === 'silent' ? 0 : 1) - (b.type === 'silent' ? 0 : 1));

  function reassign(id, insertBeforeId) {
    setGroups((prev) => {
      const dragged = prev.find((g) => g.id === id);
      if (!dragged) return prev;
      // Silent stakeholders are impact perspective only — dropping one onto
      // Financial is a no-op, not a silent downgrade to nothing.
      if (perspective === 'financial' && dragged.type === 'silent') return prev;
      const newPerspectives = perspective === null ? [] : Array.from(new Set([...dragged.perspectives, perspective]));
      const withoutDragged = prev.filter((g) => g.id !== id);
      const updated = { ...dragged, perspectives: newPerspectives };
      if (!insertBeforeId) return [...withoutDragged, updated];
      const targetIndex = withoutDragged.findIndex((g) => g.id === insertBeforeId);
      if (targetIndex === -1) return [...withoutDragged, updated];
      const next = [...withoutDragged];
      next.splice(targetIndex, 0, updated);
      return next;
    });
  }

  function onRename(id, name) {
    if (!name.trim()) return;
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name } : g)));
  }

  function onRemove(id) {
    // Never destroys data — it just clears the perspective(s), which pulls
    // it out of every assessment's stakeholder options, and moves it to the
    // very top of the generic pool so it's the first thing you see if you
    // want to bring it back into a perspective later.
    setGroups((prev) => {
      const target = prev.find((g) => g.id === id);
      if (!target) return prev;
      const rest = prev.filter((g) => g.id !== id);
      return [{ ...target, perspectives: [] }, ...rest];
    });
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: accentColor || '#8B8B98' }}>{icon}</span>
        <p className="text-[12.5px] font-semibold" style={{ color: accentColor || '#ACACB8' }}>{title}</p>
        <span className="text-[10.5px] text-text-secondary">({filtered.length})</span>
      </div>
      <div
        className="rounded-2xl p-3 min-h-[70px]"
        style={{ background: accentBg, outline: containerDragOver ? '2px dashed #4C6FFF' : 'none' }}
        onDragOver={(e) => { e.preventDefault(); setContainerDragOver(true); }}
        onDragLeave={() => setContainerDragOver(false)}
        onDrop={(e) => { e.preventDefault(); reassign(e.dataTransfer.getData('text/plain'), null); setContainerDragOver(false); }}
      >
        {filtered.length === 0 ? (
          <p className="text-[11.5px] text-text-secondary py-4 text-center">{emptyHint}</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filtered.map((g) => (
              <GroupRow
                key={g.id} g={g} onOpenGroup={onOpenGroup} onRename={onRename} onRemove={onRemove}
                onSetBoth={(id) => setGroups((prev) => prev.map((x) => (x.id === id && x.type !== 'silent' ? { ...x, perspectives: ['impact', 'financial'] } : x)))}
                editingId={editingId} setEditingId={setEditingId}
                isDragOver={dragOverId === g.id} setDragOverId={setDragOverId}
                onRowDrop={(draggedId, targetId) => reassign(draggedId, targetId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GroupList({ groups, setGroups, onOpenGroup }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPerspectives, setNewPerspectives] = useState([]);
  const [newSilent, setNewSilent] = useState(false);
  const [editingId, setEditingId] = useState(null);

  function togglePerspective(p) {
    setNewPerspectives((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  function toggleSilent(checked) {
    setNewSilent(checked);
    // Silent stakeholders are impact perspective only.
    if (checked) setNewPerspectives((prev) => prev.filter((p) => p !== 'financial'));
  }

  function addGroup() {
    if (!newName.trim()) return;
    setGroups((prev) => [...prev, { id: crypto.randomUUID(), name: newName, perspectives: newPerspectives, type: newSilent ? 'silent' : null, members: [] }]);
    setNewName(''); setNewPerspectives([]); setNewSilent(false); setAdding(false);
  }

  return (
    <div className="bg-surface rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <p className="font-semibold text-[14px] flex items-center gap-2"><StakeholderIcon size={15} />Stakeholder groups</p>
        <button type="button" onClick={() => setAdding(true)} className="text-[11.5px] font-semibold rounded-lg px-3.5 py-2" style={{ background: '#4C6FFF', color: '#F5F6FA' }}>
          + Add group
        </button>
      </div>
      <p className="text-[11px] text-text-secondary mb-4">
        Drag and drop your stakeholder groups between Impact, Financial, and the generic pool below — or add a group manually with the button above. Relevant to both? Click "+ Both" on any group instead of dragging it twice. Dragging a group down to the pool parks it without deleting it; drag it back up whenever it becomes relevant.
      </p>
      <div className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 mb-5" style={{ background: 'linear-gradient(90deg, rgba(76,111,255,0.14), rgba(94,217,150,0.10))', border: '1px solid rgba(76,111,255,0.22)' }}>
        <span className="text-[14px]">👆</span>
        <p className="text-[11.5px]" style={{ color: '#D8DCFB' }}>
          <b>Click any group's name</b> to open it and add the actual named people — with title, company, and email.
        </p>
      </div>

      {adding && (
        <div className="bg-surface-2 rounded-xl p-4 mb-5">
          <input
            value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Grid Customers, Shareholders & Investors…"
            className="w-full bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none mb-3"
          />
          <p className="text-[10.5px] text-text-secondary mb-2">PERSPECTIVE — optional, leave blank to add it straight to the generic pool instead</p>
          <div className="flex gap-2 mb-3">
            {['impact', 'financial'].filter((p) => !(newSilent && p === 'financial')).map((p) => (
              <button
                key={p}
                onClick={() => togglePerspective(p)}
                className="text-[11.5px] font-semibold rounded-lg px-3 py-1.5"
                style={{
                  background: newPerspectives.includes(p) ? (p === 'impact' ? 'rgba(94,217,150,0.18)' : 'rgba(76,111,255,0.18)') : 'transparent',
                  color: newPerspectives.includes(p) ? (p === 'impact' ? '#5ED996' : '#4C6FFF') : '#8B8B98',
                  border: '1px solid ' + (newPerspectives.includes(p) ? 'transparent' : '#2A2830'),
                }}
              >
                {p === 'impact' ? 'Impact perspective' : 'Financial perspective'}
              </button>
            ))}
          </div>
          {newPerspectives.length === 2 && (
            <p className="text-[10.5px] mb-3" style={{ color: '#ACACB8' }}>This group will appear in both columns below, shown with a blended colour so it's easy to spot at a glance.</p>
          )}
          <label className="flex items-start gap-2 cursor-pointer mb-3">
            <input type="checkbox" checked={newSilent} onChange={(e) => toggleSilent(e.target.checked)} className="mt-0.5" />
            <span className="text-[11.5px]">This is a silent stakeholder (cannot speak for itself — nature, ecosystems, future generations…) — impact perspective only</span>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={addGroup} disabled={!newName.trim()} className="text-[12px] font-semibold rounded-lg px-3 py-1.5 disabled:opacity-40" style={{ background: '#4C6FFF', color: '#F5F6FA' }}>Save</button>
            <button type="button" onClick={() => setAdding(false)} className="text-[12px] text-text-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex gap-5 mb-6">
        <Section
          title="IMPACT PERSPECTIVE" icon={<ImpactIcon size={14} />} accentColor="#5ED996" accentBg="linear-gradient(160deg, rgba(94,217,150,0.12), rgba(94,217,150,0.02))"
          perspective="impact" groups={groups} setGroups={setGroups} onOpenGroup={onOpenGroup}
          editingId={editingId} setEditingId={setEditingId} emptyHint="Drag a group here, or add one above."
        />
        <Section
          title="FINANCIAL PERSPECTIVE" icon={<FinancialIcon size={14} />} accentColor="#4C6FFF" accentBg="linear-gradient(160deg, rgba(76,111,255,0.12), rgba(76,111,255,0.02))"
          perspective="financial" groups={groups} setGroups={setGroups} onOpenGroup={onOpenGroup}
          editingId={editingId} setEditingId={setEditingId} emptyHint="Drag a group here, or add one above."
        />
      </div>

      <div className="border-t border-border-apus pt-5">
        <p className="text-[10.5px] text-text-secondary mb-3">Every group below is a potential stakeholder — drag any of them up into Impact or Financial once you've confirmed they're relevant to this engagement.</p>
        <Section
          title="GENERIC POOL — additional potential stakeholders" icon={<PoolIcon size={14} />} accentColor={null} accentBg="linear-gradient(160deg, rgba(139,139,152,0.08), rgba(139,139,152,0.02))"
          perspective={null} groups={groups} setGroups={setGroups} onOpenGroup={onOpenGroup}
          editingId={editingId} setEditingId={setEditingId} emptyHint="Nothing parked here."
        />
      </div>
    </div>
  );
}

function GroupDetail({ group, updateGroup, onBack }) {
  const [newMember, setNewMember] = useState(EMPTY_MEMBER);
  const [draft, setDraft] = useState(EMPTY_MEMBER);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [attempted, setAttempted] = useState(false);
  const [consent, setConsent] = useState(false);

  const newValid = newMember.name.trim() && newMember.title.trim() && isValidEmail(newMember.email) && consent;

  function addMember() {
    setAttempted(true);
    if (!newValid) return;
    updateGroup((g) => ({ ...g, members: [...g.members, { ...newMember, id: crypto.randomUUID() }] }));
    setNewMember(EMPTY_MEMBER);
    setAttempted(false);
    setConsent(false);
  }

  function saveEditMember() {
    if (!draft.name.trim() || !draft.title.trim() || !isValidEmail(draft.email)) return;
    updateGroup((g) => ({ ...g, members: g.members.map((m) => (m.id === editingMemberId ? { ...draft, id: editingMemberId } : m)) }));
    setEditingMemberId(null);
  }

  function removeMember(id) {
    if (window.confirm('Remove this contact from the group?')) {
      updateGroup((g) => ({ ...g, members: g.members.filter((m) => m.id !== id) }));
    }
  }

  function startEdit(m) {
    setDraft({ name: m.name, title: m.title, company: m.company, email: m.email, pillars: m.pillars ?? (m.pillar ? [m.pillar] : []), expertise: m.expertise ?? '' });
    setEditingMemberId(m.id);
  }

  function togglePillar(list, setFn, p) {
    setFn((d) => ({ ...d, pillars: d.pillars.includes(p) ? d.pillars.filter((x) => x !== p) : [...d.pillars, p] }));
  }

  const rowDraftForm = (onSave, onCancel) => (
    <tr className="border-t border-border-apus">
      <td className="py-2 pr-3"><input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Name *" className="bg-surface-2 rounded-lg px-2.5 py-1.5 text-[12px] outline-none w-full" /></td>
      <td className="py-2 pr-3"><input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Role *" className="bg-surface-2 rounded-lg px-2.5 py-1.5 text-[12px] outline-none w-full" /></td>
      <td className="py-2 pr-3"><input value={draft.company} onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))} placeholder="Company" className="bg-surface-2 rounded-lg px-2.5 py-1.5 text-[12px] outline-none w-full" /></td>
      <td className="py-2 pr-3">
        <input
          value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} placeholder="Email"
          className="bg-surface-2 rounded-lg px-2.5 py-1.5 text-[12px] outline-none w-full"
          style={{ border: !isValidEmail(draft.email) ? '1px solid #E0645A' : '1px solid transparent' }}
        />
      </td>
      <td className="py-2 pr-3">
        <div className="flex gap-1">
          {['E', 'S', 'G'].map((p) => (
            <button key={p} type="button" onClick={() => togglePillar(draft.pillars, setDraft, p)} className="text-[10px] font-bold rounded px-1.5 py-1" style={{ background: draft.pillars.includes(p) ? PILLAR_COLOR[p].text : '#100E15', color: draft.pillars.includes(p) ? '#07070B' : '#8B8B98' }}>
              {p}
            </button>
          ))}
        </div>
      </td>
      <td className="py-2" colSpan={2}>
        <div className="flex gap-2">
          <button type="button" onClick={onSave} disabled={!draft.name.trim() || !draft.title.trim() || !isValidEmail(draft.email)} className="text-[11.5px] font-semibold rounded-lg px-2.5 py-1.5 disabled:opacity-40" style={{ background: '#4C6FFF', color: '#F5F6FA' }}>Save</button>
          <button type="button" onClick={onCancel} className="text-[11.5px] text-text-secondary">Cancel</button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-surface rounded-2xl p-5">
      <button
        type="button" onClick={onBack}
        className="flex items-center gap-2 text-[12px] font-semibold rounded-lg px-3 py-2 mb-4 border border-border-apus hover:bg-surface-2"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
        Back to all groups
      </button>

      <p className="font-semibold text-[16px] flex items-center gap-2 mb-4"><StakeholderIcon size={17} />{group.name}</p>

      <div className="rounded-xl p-4 mb-5" style={{ background: 'linear-gradient(160deg, rgba(76,111,255,0.12), var(--color-surface-2))', border: '1px solid rgba(76,111,255,0.25)' }}>
        <p className="text-[10.5px] font-semibold tracking-wide mb-2.5" style={{ color: '#4C6FFF' }}>ADD A STAKEHOLDER TO THIS GROUP — NAME AND ROLE ARE REQUIRED</p>
        <div className="grid grid-cols-4 gap-2 mb-2">
          <div>
            <input value={newMember.name} onChange={(e) => setNewMember((d) => ({ ...d, name: e.target.value }))} placeholder="Name *" className="bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none w-full" style={{ border: attempted && !newMember.name.trim() ? '1px solid #E0645A' : '1px solid transparent' }} />
          </div>
          <div>
            <input value={newMember.title} onChange={(e) => setNewMember((d) => ({ ...d, title: e.target.value }))} placeholder="Role *" className="bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none w-full" style={{ border: attempted && !newMember.title.trim() ? '1px solid #E0645A' : '1px solid transparent' }} />
          </div>
          <input value={newMember.company} onChange={(e) => setNewMember((d) => ({ ...d, company: e.target.value }))} placeholder="Company" className="bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none" />
          <div>
            <input
              value={newMember.email} onChange={(e) => setNewMember((d) => ({ ...d, email: e.target.value }))} placeholder="Email (optional)"
              className="bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none w-full"
              style={{ border: !isValidEmail(newMember.email) ? '1px solid #E0645A' : '1px solid transparent' }}
            />
          </div>
        </div>
        {attempted && (!newMember.name.trim() || !newMember.title.trim()) && (
          <p className="text-[11px] mb-2" style={{ color: '#E0645A' }}>Please fill in both name and role before adding this stakeholder.</p>
        )}
        {newMember.email && !isValidEmail(newMember.email) && (
          <p className="text-[11px] mb-2" style={{ color: '#E0645A' }}>That doesn't look like a valid email address.</p>
        )}
        <div className="flex items-center gap-3 mb-3">
          <p className="text-[10.5px] text-text-secondary shrink-0">Expert in:</p>
          <div className="flex gap-1.5">
            {['E', 'S', 'G'].map((p) => (
              <button
                key={p} type="button" onClick={() => togglePillar(newMember.pillars, setNewMember, p)}
                className="text-[11px] font-bold rounded-lg px-2.5 py-1.5"
                style={{ background: newMember.pillars.includes(p) ? PILLAR_COLOR[p].text : '#100E15', color: newMember.pillars.includes(p) ? '#07070B' : '#8B8B98' }}
              >
                {PILLAR_LABEL[p]}
              </button>
            ))}
          </div>
          <input
            value={newMember.expertise} onChange={(e) => setNewMember((d) => ({ ...d, expertise: e.target.value }))}
            placeholder="Specific area of expertise (e.g. Climate risk, Labor law)…"
            className="flex-1 bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none"
          />
        </div>
        <div className="rounded-lg px-3 py-2.5 mb-3" style={{ background: 'rgba(76,111,255,0.08)', border: '1px solid rgba(76,111,255,0.2)' }}>
          <p className="text-[11px] text-text-secondary leading-relaxed mb-2">{DATA_STATEMENT}</p>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" required />
            <span className="text-[11.5px]">I have informed this person how their data is used.</span>
          </label>
        </div>
        <button
          type="button" onClick={addMember}
          disabled={!consent}
          className="w-full text-[13px] font-bold rounded-xl py-3 disabled:opacity-40"
          style={{ background: '#4C6FFF', color: '#F5F6FA' }}
        >
          + Add stakeholder
        </button>
      </div>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="text-[10.5px] text-text-secondary tracking-wide">
            <th className="font-medium pb-2 pr-3">NAME</th>
            <th className="font-medium pb-2 pr-3">ROLE</th>
            <th className="font-medium pb-2 pr-3">COMPANY</th>
            <th className="font-medium pb-2 pr-3">EMAIL</th>
            <th className="font-medium pb-2 pr-3">EXPERT IN</th>
            <th className="font-medium pb-2" colSpan={2}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {group.members.map((m) => (
            editingMemberId === m.id ? (
              <>{rowDraftForm(saveEditMember, () => setEditingMemberId(null))}</>
            ) : (
              <tr key={m.id} className="border-t border-border-apus">
                <td className="py-2.5 pr-3 text-[12.5px] font-medium">{m.name}</td>
                <td className="py-2.5 pr-3 text-[12px] text-text-secondary">{m.title}</td>
                <td className="py-2.5 pr-3 text-[12px] text-text-secondary">{m.company}</td>
                <td className="py-2.5 pr-3 text-[12px] text-text-secondary">{m.email}</td>
                <td className="py-2.5 pr-3">
                  <div className="flex flex-wrap gap-1 items-center">
                    {(m.pillars ?? (m.pillar ? [m.pillar] : [])).map((p) => (
                      <span key={p} className="text-[9.5px] font-bold rounded px-1.5 py-0.5" style={{ color: PILLAR_COLOR[p].text, background: PILLAR_COLOR[p].bg }}>{p}</span>
                    ))}
                    {m.expertise && <span className="text-[11px] text-text-secondary">{m.expertise}</span>}
                  </div>
                </td>
                <td className="py-2.5 pr-2">
                  <button type="button" onClick={() => startEdit(m)} className="text-text-secondary hover:text-text-primary" title="Edit this contact's details">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
                  </button>
                </td>
                <td className="py-2.5">
                  <button type="button" onClick={() => removeMember(m.id)} className="text-text-secondary hover:text-[#E0645A]" title="Remove this contact from the group">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" /></svg>
                  </button>
                </td>
              </tr>
            )
          ))}
        </tbody>
      </table>

      {group.members.length === 0 && (
        <p className="text-[12.5px] text-text-secondary py-6 text-center">No named contacts in this group yet — use the form above to add the first one.</p>
      )}
    </div>
  );
}

export default function StakeholderModule({ stakeholderMap, setStakeholderMap, openGroupId, setOpenGroupId, onGoNext }) {
  const openGroup = stakeholderMap.find((g) => g.id === openGroupId);

  function updateOpenGroup(fn) {
    setStakeholderMap((prev) => prev.map((g) => (g.id === openGroupId ? fn(g) : g)));
  }

  const activeGroups = stakeholderMap.filter((g) => g.perspectives.length > 0);
  const totalPeople = activeGroups.reduce((sum, g) => sum + g.members.length, 0);
  const groupsWithPeople = activeGroups.filter((g) => g.members.length > 0).length;

  return (
    <div>
      <h2 className="text-[24px] font-bold text-white mb-1 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg, #5ED996, #2FA88A)', boxShadow: '0 6px 14px -4px rgba(0,0,0,0.4)' }}>
          <StakeholderIcon size={19} />
        </span>
        Stakeholders
      </h2>
      <p className="text-[12px] text-text-secondary mb-4">
        The master map of who's relevant to this engagement, and why — before any single assessment is created.
      </p>

      {!openGroup && (
        <div className="flex gap-3 mb-6">
          <div className="rounded-2xl px-5 py-3.5 flex items-center gap-3" style={{ background: 'linear-gradient(160deg, rgba(76,111,255,0.16), var(--color-surface))', border: '1px solid rgba(76,111,255,0.3)' }}>
            <span className="text-[26px] font-bold" style={{ color: '#4C6FFF' }}>{activeGroups.length}</span>
            <p className="text-[11px] text-text-secondary leading-tight">stakeholder<br />groups selected</p>
          </div>
          <div className="rounded-2xl px-5 py-3.5 flex items-center gap-3" style={{ background: 'linear-gradient(160deg, rgba(94,217,150,0.16), var(--color-surface))', border: '1px solid rgba(94,217,150,0.3)' }}>
            <span className="text-[26px] font-bold" style={{ color: '#5ED996' }}>{totalPeople}</span>
            <p className="text-[11px] text-text-secondary leading-tight">named<br />stakeholders</p>
          </div>
          {activeGroups.length > groupsWithPeople && (
            <div className="rounded-2xl px-5 py-3.5 flex items-center gap-3" style={{ background: 'linear-gradient(160deg, rgba(215,154,76,0.16), var(--color-surface))', border: '1px solid rgba(215,154,76,0.3)' }}>
              <span className="text-[26px] font-bold" style={{ color: '#D79A4C' }}>{activeGroups.length - groupsWithPeople}</span>
              <p className="text-[11px] text-text-secondary leading-tight">group(s) still<br />need people added</p>
            </div>
          )}
        </div>
      )}

      {!openGroup && (
        <div className="grid grid-cols-2 gap-4 mb-7">
          <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'linear-gradient(160deg, rgba(76,111,255,0.14), var(--color-surface))', border: '1px solid rgba(76,111,255,0.3)' }}>
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0" style={{ background: '#4C6FFF', color: '#F5F6FA' }}>1</span>
            <div>
              <p className="text-[13px] font-bold mb-0.5" style={{ color: '#4C6FFF' }}>Select stakeholder groups</p>
              <p className="text-[11.5px] text-text-secondary leading-relaxed">Drag groups into Impact or Financial below — broad categories like "Employees" or "Investors."</p>
            </div>
          </div>
          <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'linear-gradient(160deg, rgba(94,217,150,0.14), var(--color-surface))', border: '1px solid rgba(94,217,150,0.3)' }}>
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0" style={{ background: '#5ED996', color: '#100E15' }}>2</span>
            <div>
              <p className="text-[13px] font-bold mb-0.5" style={{ color: '#5ED996' }}>Add stakeholders in detail</p>
              <p className="text-[11.5px] text-text-secondary leading-relaxed">Click into a group to add the actual named people — name, role, company, and email.</p>
            </div>
          </div>
        </div>
      )}

      {openGroup ? (
        <GroupDetail group={openGroup} updateGroup={updateOpenGroup} onBack={() => setOpenGroupId(null)} />
      ) : (
        <GroupList groups={stakeholderMap} setGroups={setStakeholderMap} onOpenGroup={setOpenGroupId} />
      )}

      {!openGroup && (
        <div className="rounded-2xl p-5 mt-7 flex items-center justify-between" style={{ background: 'linear-gradient(115deg, #3654D6, #2FA88A)' }}>
          <div>
            <p className="text-[14px] font-bold text-white">Stakeholders mapped — what's next?</p>
            <p className="text-[12px]" style={{ color: 'rgba(245,246,250,0.9)' }}>Define the Impacts, Risks, and Opportunities (IROs) you'll assess against this stakeholder map.</p>
          </div>
          <button onClick={onGoNext} className="text-[13px] font-bold rounded-full px-5 py-2.5 shrink-0" style={{ background: '#F5F6FA', color: '#111318' }}>
            Define your topics (IROs) →
          </button>
        </div>
      )}
    </div>
  );
}

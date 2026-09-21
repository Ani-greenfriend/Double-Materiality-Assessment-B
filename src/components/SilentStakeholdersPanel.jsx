import { useState } from 'react';
import { PILLAR_COLOR } from '../lib/topics';
import { StakeholderIcon } from './icons';
import { addSilentStakeholderGroup, addSilentStakeholderMember, removeSilentStakeholderGroup, removeSilentStakeholderMember } from '../lib/data';

// Section 8, Stakeholders: "Groups by type — Impact, Financial and Silent
// stakeholders". Silent groups are not part of StakeholderModule.jsx's own
// model (no concept of "silent" exists in the prototype at all — it's a v2.0
// addition, CLAUDE.md's "silent stakeholders are only group options"), so
// this is a new, non-prototype panel rendered alongside the ported module,
// hidden while a specific Impact/Financial group is open.
const DATA_STATEMENT = "The details you enter about this person are stored securely and used only to organise and document this materiality assessment. Their answers can be connected to them through their invitation or the session attendee list. They may be shared with the client company and its auditor. They can request deletion or anonymisation at any time by contacting: anikalerch@greenfriend.org.";
const EMPTY_MEMBER = { name: '', role: '', company: '', email: '', pillars: [], expertise: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(v) { return !v || EMAIL_RE.test(v); }

function SilentGroupCard({ group, onChanged }) {
  const [adding, setAdding] = useState(false);
  const [member, setMember] = useState(EMPTY_MEMBER);
  const [consent, setConsent] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function togglePillar(p) {
    setMember((m) => ({ ...m, pillars: m.pillars.includes(p) ? m.pillars.filter((x) => x !== p) : [...m.pillars, p] }));
  }

  async function handleAdd(e) {
    e.preventDefault();
    setAttempted(true);
    if (!member.name.trim() || !member.role.trim() || !isValidEmail(member.email) || !consent) return;
    setBusy(true);
    setError('');
    try {
      await addSilentStakeholderMember({ groupId: group.id, ...member });
      setMember(EMPTY_MEMBER);
      setConsent(false);
      setAttempted(false);
      setAdding(false);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMember(id) {
    if (!window.confirm('Remove this contact from the group?')) return;
    try {
      await removeSilentStakeholderMember(id);
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemoveGroup() {
    if (!window.confirm(`Remove "${group.name}" and its contacts?`)) return;
    try {
      await removeSilentStakeholderGroup(group.id);
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="bg-surface-2 rounded-xl p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[12.5px] font-semibold">{group.name}</p>
        <div className="flex items-center gap-2.5">
          <span className="text-[10.5px] text-text-secondary">{group.members.length} contact{group.members.length === 1 ? '' : 's'}</span>
          {group.isCustom && (
            <button type="button" onClick={handleRemoveGroup} className="text-text-secondary hover:text-[#E0645A]" title="Remove this group">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" /></svg>
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-[11px] text-badge-amber mb-2">{error}</p>}

      {group.members.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-2">
          {group.members.map((m) => (
            <div key={m.id} className="text-[11.5px] text-text-secondary flex flex-wrap items-center gap-x-2 bg-app-black rounded-lg px-3 py-1.5">
              <span className="text-text-primary font-medium">{m.name}</span>
              <span>{m.role}</span>
              {m.company && <span>· {m.company}</span>}
              {(m.pillars ?? []).length > 0 && <span>· {m.pillars.join('/')}</span>}
              <button type="button" onClick={() => handleRemoveMember(m.id)} className="text-text-secondary hover:text-[#E0645A] ml-auto" title="Remove this contact">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <form onSubmit={handleAdd} className="bg-app-black rounded-lg p-3 mt-2">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={member.name} onChange={(e) => setMember((m) => ({ ...m, name: e.target.value }))} placeholder="Name *" className="bg-surface-2 rounded-lg px-2.5 py-1.5 text-[12px] outline-none" style={{ border: attempted && !member.name.trim() ? '1px solid #E0645A' : '1px solid transparent' }} />
            <input value={member.role} onChange={(e) => setMember((m) => ({ ...m, role: e.target.value }))} placeholder="Role *" className="bg-surface-2 rounded-lg px-2.5 py-1.5 text-[12px] outline-none" style={{ border: attempted && !member.role.trim() ? '1px solid #E0645A' : '1px solid transparent' }} />
            <input value={member.company} onChange={(e) => setMember((m) => ({ ...m, company: e.target.value }))} placeholder="Company" className="bg-surface-2 rounded-lg px-2.5 py-1.5 text-[12px] outline-none" />
            <input value={member.email} onChange={(e) => setMember((m) => ({ ...m, email: e.target.value }))} placeholder="Email (optional)" className="bg-surface-2 rounded-lg px-2.5 py-1.5 text-[12px] outline-none" style={{ border: !isValidEmail(member.email) ? '1px solid #E0645A' : '1px solid transparent' }} />
          </div>
          {attempted && (!member.name.trim() || !member.role.trim()) && (
            <p className="text-[11px] mb-2" style={{ color: '#E0645A' }}>Please fill in both name and role before adding this stakeholder.</p>
          )}
          <div className="flex items-center gap-2 mb-2.5">
            <p className="text-[10.5px] text-text-secondary shrink-0">Expert in:</p>
            {['E', 'S', 'G'].map((p) => (
              <button key={p} type="button" onClick={() => togglePillar(p)} className="text-[10px] font-bold rounded px-1.5 py-1" style={{ background: member.pillars.includes(p) ? PILLAR_COLOR[p].text : '#100E15', color: member.pillars.includes(p) ? '#07070B' : '#8B8B98' }}>
                {p}
              </button>
            ))}
            <input value={member.expertise} onChange={(e) => setMember((m) => ({ ...m, expertise: e.target.value }))} placeholder="Area of expertise" className="flex-1 bg-surface-2 rounded-lg px-2.5 py-1.5 text-[12px] outline-none" />
          </div>
          <div className="rounded-lg px-3 py-2.5 mb-2.5" style={{ background: 'rgba(76,111,255,0.08)', border: '1px solid rgba(76,111,255,0.2)' }}>
            <p className="text-[11px] text-text-secondary leading-relaxed mb-2">{DATA_STATEMENT}</p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" required />
              <span className="text-[11.5px]">I have informed this person how their data is used.</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !consent} className="text-[11.5px] font-semibold rounded-lg px-3 py-1.5 disabled:opacity-40" style={{ background: '#4C6FFF', color: '#F5F6FA' }}>{busy ? 'Adding…' : 'Add stakeholder'}</button>
            <button type="button" onClick={() => setAdding(false)} className="text-[11.5px] text-text-secondary">Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="text-[11.5px] font-semibold" style={{ color: '#4C6FFF' }}>+ Add a representative</button>
      )}
    </div>
  );
}

export default function SilentStakeholdersPanel({ groups, onChanged }) {
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [error, setError] = useState('');

  async function handleAddGroup() {
    if (!newGroupName.trim()) return;
    try {
      await addSilentStakeholderGroup(newGroupName.trim());
      setNewGroupName('');
      setAddingGroup(false);
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="bg-surface rounded-2xl p-5 mt-6">
      <p className="font-semibold text-[14px] flex items-center gap-2 mb-2"><StakeholderIcon size={15} />Silent stakeholders</p>
      <p className="text-[11.5px] text-text-secondary mb-4 leading-relaxed">
        Nature and other silent stakeholders cannot speak for themselves. ESRS allows a proxy — for example an ecologist, a nature NGO or a scientific study. Consider whether any silent stakeholder is affected by this company's activities and, if so, add a representative.
      </p>
      {error && <p className="text-[12px] text-badge-amber mb-3">{error}</p>}

      {groups.map((g) => <SilentGroupCard key={g.id} group={g} onChanged={onChanged} />)}

      {addingGroup ? (
        <div className="flex gap-2 mt-2">
          <input
            value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Custom silent stakeholder group name…" autoFocus
            className="flex-1 bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none"
          />
          <button onClick={handleAddGroup} disabled={!newGroupName.trim()} className="text-[12px] font-semibold rounded-lg px-3 py-1.5 disabled:opacity-40" style={{ background: '#4C6FFF', color: '#F5F6FA' }}>Save</button>
          <button onClick={() => setAddingGroup(false)} className="text-[12px] text-text-secondary">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setAddingGroup(true)} className="text-[11.5px] font-semibold rounded-lg px-3 py-2 border border-border-apus mt-2">
          + Add a custom silent stakeholder group
        </button>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  listTeamMembers, createTeamMember, updateTeamMemberAccess, updateTeamMemberAdmin, updateTeamMemberActive,
} from '../lib/data';

// Tool Owner isn't listed here — it's not a role this screen assigns (set
// only from the Supabase dashboard, and exactly one person holds it), so it
// doesn't belong next to roles someone actually picks from this table.
const ROLE_LEGEND = [
  { label: 'Admin', color: '#4C6FFF', text: 'Full data access, plus team management — can change access levels and sign-off permissions, but not another member’s Admin status.' },
  { label: 'Full access', color: '#5ED996', text: 'Full data access, no team-management rights — cannot open this screen.' },
  { label: 'Sign-off only', color: '#D79A4C', text: 'Read-only everywhere it can see at all, with exactly the sign-off actions its two permissions grant. Dashboard and Report are refused outright.' },
];

const emptyForm = { email: '', name: '', roleTitle: '', accessLevel: 'full', canSignoffTopics: false, canSignoffResults: false };

export default function AdminRolesTab({ me, onChanged }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState('');

  const canManageTeam = me.isOwner || me.isAdmin;

  function reload() {
    setLoading(true);
    listTeamMembers()
      .then(setMembers)
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (canManageTeam) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageTeam]);

  if (!canManageTeam) {
    return (
      <div className="bg-surface rounded-2xl p-10 text-center text-text-secondary text-[13px]">
        Admin & Roles is refused — only the Tool Owner and Admin can open this screen.
      </div>
    );
  }

  const owner = members.find((m) => m.isOwner);

  const filtered = members.filter((m) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return m.name?.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.roleTitle?.toLowerCase().includes(q);
  });

  async function handleFieldChange(member, patch) {
    setRowError('');
    try {
      await updateTeamMemberAccess(member.id, {
        roleTitle: patch.roleTitle ?? member.roleTitle,
        accessLevel: patch.accessLevel ?? member.accessLevel,
        canSignoffTopics: patch.canSignoffTopics ?? member.canSignoffTopics,
        canSignoffResults: patch.canSignoffResults ?? member.canSignoffResults,
      });
      // Sign-off only is a restricted-data-access role — it has no defined
      // "and also Admin" variant (Admin's whole definition is full data
      // access plus team management). Switching a current Admin to
      // Sign-off only clears the now-contradictory flag rather than
      // leaving it stale and invisible once the checkbox below disappears.
      if (patch.accessLevel === 'signoff' && member.isAdmin) {
        await updateTeamMemberAdmin(member.id, false);
      }
      reload();
      onChanged?.();
    } catch (err) {
      setRowError(err.message);
    }
  }

  async function handleAdminToggle(member, value) {
    setRowError('');
    try {
      await updateTeamMemberAdmin(member.id, value);
      reload();
      onChanged?.();
    } catch (err) {
      setRowError(err.message);
    }
  }

  async function handleActiveToggle(member, value) {
    setRowError('');
    try {
      await updateTeamMemberActive(member.id, value);
      reload();
      onChanged?.();
    } catch (err) {
      setRowError(err.message);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setRowError('');
    try {
      await createTeamMember(newForm);
      setNewForm(emptyForm);
      setShowNewForm(false);
      reload();
      onChanged?.();
    } catch (err) {
      setRowError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-[20px] font-semibold">Admin &amp; Roles</h1>
        <button
          onClick={() => setShowNewForm((s) => !s)}
          className="text-[12px] font-semibold rounded-lg px-3.5 py-2"
          style={{ background: '#4C6FFF', color: '#07070B' }}
        >
          + New team member
        </button>
      </div>
      <p className="text-[12.5px] text-text-secondary mb-5">
        Tool Owner and Admin only. Add a row once the person already has a Supabase Auth login (invited from the Supabase dashboard) — their identity links to this row automatically the first time they sign in.
      </p>

      <div className="bg-surface rounded-2xl p-5 mb-5">
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-3">Legend</p>
        <div className="grid grid-cols-2 gap-3">
          {ROLE_LEGEND.map((r) => (
            <div key={r.label} className="flex gap-2.5">
              <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: r.color }} />
              <div>
                <p className="text-[12.5px] font-semibold">{r.label}</p>
                <p className="text-[11.5px] text-text-secondary">{r.text}</p>
              </div>
            </div>
          ))}
        </div>
        {owner && (
          <p className="text-[11.5px] text-text-secondary border-t border-border-apus pt-3 mt-3">
            Need something none of these cover — a role change beyond what's here, or an access question? Reach out to the Tool Owner, {owner.name || owner.email} ({owner.email}).
          </p>
        )}
      </div>

      {showNewForm && (
        <form onSubmit={handleCreate} className="bg-surface rounded-2xl p-5 mb-5">
          <p className="text-[12.5px] font-semibold mb-3">New team member</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-[10.5px] text-text-secondary mb-1">EMAIL (must already have a Supabase Auth login)</p>
              <input
                type="email" required value={newForm.email}
                onChange={(e) => setNewForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full bg-app-black border border-border-apus rounded-lg px-3 py-2 text-[12.5px] outline-none"
              />
            </div>
            <div>
              <p className="text-[10.5px] text-text-secondary mb-1">NAME</p>
              <input
                required value={newForm.name}
                onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-app-black border border-border-apus rounded-lg px-3 py-2 text-[12.5px] outline-none"
              />
            </div>
            <div>
              <p className="text-[10.5px] text-text-secondary mb-1">ROLE TITLE (optional)</p>
              <input
                value={newForm.roleTitle}
                onChange={(e) => setNewForm((f) => ({ ...f, roleTitle: e.target.value }))}
                className="w-full bg-app-black border border-border-apus rounded-lg px-3 py-2 text-[12.5px] outline-none"
              />
            </div>
            <div>
              <p className="text-[10.5px] text-text-secondary mb-1">ACCESS LEVEL</p>
              <select
                value={newForm.accessLevel}
                onChange={(e) => setNewForm((f) => ({ ...f, accessLevel: e.target.value }))}
                className="w-full bg-app-black border border-border-apus rounded-lg px-3 py-2 text-[12.5px] outline-none"
              >
                <option value="full">Full access</option>
                <option value="signoff">Sign-off only</option>
              </select>
            </div>
          </div>
          {newForm.accessLevel === 'signoff' && (
            <div className="flex gap-5 mb-4">
              <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                <input type="checkbox" checked={newForm.canSignoffTopics} onChange={(e) => setNewForm((f) => ({ ...f, canSignoffTopics: e.target.checked }))} />
                Sign off Topics
              </label>
              <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                <input type="checkbox" checked={newForm.canSignoffResults} onChange={(e) => setNewForm((f) => ({ ...f, canSignoffResults: e.target.checked }))} />
                Sign off Results
              </label>
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="text-[12px] font-semibold rounded-lg px-3.5 py-2 disabled:opacity-40" style={{ background: '#4C6FFF', color: '#07070B' }}>
              {saving ? 'Adding…' : 'Add team member'}
            </button>
            <button type="button" onClick={() => { setShowNewForm(false); setNewForm(emptyForm); }} className="text-[12px] font-semibold rounded-lg px-3.5 py-2 border border-border-apus">
              Cancel
            </button>
          </div>
        </form>
      )}

      {rowError && <p className="text-[12px] text-badge-amber mb-3">{rowError}</p>}
      {loadError && <p className="text-[12px] text-badge-amber mb-3">{loadError}</p>}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email or role title…"
        className="w-full bg-surface border border-border-apus rounded-lg px-3 py-2.5 text-[12.5px] outline-none mb-4"
      />

      {loading ? (
        <p className="text-[12.5px] text-text-secondary">Loading…</p>
      ) : (
        <div className="bg-surface rounded-2xl overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-border-apus text-text-secondary text-[10.5px] uppercase tracking-wide">
                <th className="text-left px-4 py-3">Member</th>
                <th className="text-left px-4 py-3">Role title</th>
                <th className="text-left px-4 py-3">Access level</th>
                <th className="text-left px-4 py-3">Sign off</th>
                <th className="text-left px-4 py-3">Admin</th>
                <th className="text-left px-4 py-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const isSelf = m.id === me.id;
                const adminLocked = m.isOwner || isSelf || !me.isOwner;
                const activeLocked = isSelf;
                return (
                  <tr key={m.id} className="border-b border-border-apus last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {m.avatarUrl ? (
                          <img src={m.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0" style={{ background: '#2A2830' }}>
                            {(m.name || m.email)[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{m.name || '—'}{!m.authUserId && <span className="ml-1.5 text-[10px] text-badge-amber font-normal">not linked yet</span>}</p>
                          <p className="text-[11px] text-text-secondary truncate">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        defaultValue={m.roleTitle || ''}
                        onBlur={(e) => { if (e.target.value !== (m.roleTitle || '')) handleFieldChange(m, { roleTitle: e.target.value }); }}
                        className="bg-transparent border border-transparent hover:border-border-apus focus:border-border-apus rounded px-1.5 py-1 text-[12.5px] outline-none w-full"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={m.accessLevel}
                        onChange={(e) => handleFieldChange(m, { accessLevel: e.target.value })}
                        className="bg-app-black border border-border-apus rounded-lg px-2 py-1 text-[12px] outline-none"
                      >
                        <option value="full">Full access</option>
                        <option value="signoff">Sign-off only</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {m.accessLevel === 'signoff' ? (
                        <div className="flex flex-col gap-1">
                          <label className="flex items-center gap-1.5 text-[11.5px] cursor-pointer">
                            <input type="checkbox" checked={m.canSignoffTopics} onChange={(e) => handleFieldChange(m, { canSignoffTopics: e.target.checked })} />
                            Topics
                          </label>
                          <label className="flex items-center gap-1.5 text-[11.5px] cursor-pointer">
                            <input type="checkbox" checked={m.canSignoffResults} onChange={(e) => handleFieldChange(m, { canSignoffResults: e.target.checked })} />
                            Results
                          </label>
                        </div>
                      ) : (
                        <span className="text-text-secondary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {m.isOwner ? (
                        <span className="text-[10.5px] font-semibold rounded-full px-2 py-0.5" style={{ background: 'rgba(155,127,224,0.15)', color: '#9B7FE0' }}>Owner</span>
                      ) : m.accessLevel === 'signoff' ? (
                        // Sign-off only has no "and also Admin" variant — Admin means
                        // full data access plus team management, which contradicts
                        // this role's restricted, read-only data access. Not offered.
                        <span className="text-text-secondary" title="Sign-off only cannot also be Admin.">—</span>
                      ) : (
                        <label className={`flex items-center gap-1.5 text-[11.5px] ${adminLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`} title={adminLocked ? (isSelf ? "You cannot change your own Admin status." : "Only the Tool Owner can grant or revoke Admin.") : ''}>
                          <input type="checkbox" checked={m.isAdmin} disabled={adminLocked} onChange={(e) => handleAdminToggle(m, e.target.checked)} />
                          Admin
                        </label>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <label className={`flex items-center gap-1.5 text-[11.5px] ${activeLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`} title={activeLocked ? 'You cannot deactivate yourself.' : ''}>
                        <input type="checkbox" checked={m.active} disabled={activeLocked} onChange={(e) => handleActiveToggle(m, e.target.checked)} />
                        {m.active ? 'Active' : 'Inactive'}
                      </label>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary">No team members match “{search}”.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

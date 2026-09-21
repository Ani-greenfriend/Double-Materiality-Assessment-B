import { useEffect, useState } from 'react';
import { fetchInvitations, createInvitation, deleteInvitation, markInvitationSent, anonymiseInvitation, buildPersonalLink } from '../lib/data';

const STATUS_COLOR = {
  invited: { text: '#8A8894', bg: 'rgba(138,136,148,0.14)' },
  opened: { text: '#D79A4C', bg: 'rgba(215,154,76,0.14)' },
  saved: { text: '#4C6FFF', bg: 'rgba(76,111,255,0.14)' },
  submitted: { text: '#5ED996', bg: 'rgba(94,217,150,0.14)' },
};

const DATA_STATEMENT = "The details you enter about this person are stored securely and used only to organise and document this materiality assessment. Their answers can be connected to them through their invitation or the session attendee list. They may be shared with the client company and its auditor. They can request deletion or anonymisation at any time by contacting: anikalerch@greenfriend.org.";

export default function InvitationsPanel({ assessment, stakeholderMaster, onClose }) {
  const [invitations, setInvitations] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [groupId, setGroupId] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  function reload() {
    fetchInvitations(assessment.id).then(setInvitations).catch((err) => setLoadError(err.message));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessment.id]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!consent) return;
    setBusy(true);
    setError('');
    try {
      await createInvitation({ assessmentId: assessment.id, name: name.trim(), email: email.trim(), stakeholderGroupId: groupId });
      setName('');
      setEmail('');
      setGroupId('');
      setConsent(false);
      setAdding(false);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy(inv) {
    const link = buildPersonalLink(assessment.slug, inv.linkCode);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      window.prompt('Copy this link:', link);
    }
  }

  async function handleMarkSent(id) {
    await markInvitationSent(id);
    reload();
  }

  async function handleDelete(inv) {
    if (!window.confirm(`Remove the invitation for "${inv.name}"? Only possible before they've opened the link.`)) return;
    try {
      await deleteInvitation(inv.id);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAnonymise(inv) {
    if (!window.confirm(`Anonymise "${inv.name}"'s invitation? Their name and email will be replaced; their ratings stay.`)) return;
    await anonymiseInvitation(inv.id);
    reload();
  }

  const byGroup = new Map();
  for (const inv of invitations) {
    const key = inv.groupName ?? 'Unspecified';
    if (!byGroup.has(key)) byGroup.set(key, { invited: 0, submitted: 0 });
    byGroup.get(key).invited += 1;
    if (inv.status === 'submitted') byGroup.get(key).submitted += 1;
  }

  return (
    <div className="bg-surface-2 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13.5px] font-semibold">Invitations — {assessment.name}</p>
        <button onClick={onClose} className="text-[12px] text-text-secondary hover:text-text-primary">Close</button>
      </div>

      {loadError && <p className="text-[11.5px] text-badge-amber mb-3">{loadError}</p>}

      {byGroup.size > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {[...byGroup.entries()].map(([group, counts]) => (
            <span key={group} className="text-[10.5px] rounded-full px-2.5 py-1 bg-app-black text-text-secondary">
              {group}: {counts.submitted}/{counts.invited} submitted
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 mb-3">
        {invitations.length === 0 ? (
          <p className="text-[12px] text-text-secondary">No invitations yet.</p>
        ) : (
          invitations.map((inv) => {
            const color = STATUS_COLOR[inv.status] ?? STATUS_COLOR.invited;
            return (
              <div key={inv.id} className="bg-app-black rounded-lg px-3.5 py-2.5 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-[12.5px] font-medium">{inv.anonymisedAt ? <i>Anonymised</i> : inv.name}</span>
                  <span className="text-[10.5px] text-text-secondary">{inv.groupName ?? 'No group'}</span>
                  <span className="text-[9.5px] font-semibold rounded-full px-2 py-0.5 uppercase tracking-wide" style={{ color: color.text, background: color.bg }}>{inv.status}</span>
                  {inv.sentAt && <span className="text-[10px] text-text-secondary">sent</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleCopy(inv)} className="text-[11px] text-text-secondary hover:text-text-primary">
                    {copiedId === inv.id ? 'Copied' : 'Copy link'}
                  </button>
                  {!inv.sentAt && (
                    <button onClick={() => handleMarkSent(inv.id)} className="text-[11px] text-text-secondary hover:text-text-primary">Mark as sent</button>
                  )}
                  {!inv.openedAt && !inv.anonymisedAt && (
                    <button onClick={() => handleDelete(inv)} className="text-[11px] text-text-secondary hover:text-badge-amber">Remove</button>
                  )}
                  {!inv.anonymisedAt && (
                    <button onClick={() => handleAnonymise(inv)} className="text-[11px] text-text-secondary hover:text-badge-amber">Anonymise</button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && <p className="text-[11.5px] text-badge-amber mb-3">{error}</p>}

      {!adding ? (
        <button onClick={() => setAdding(true)} className="text-[12px] border border-border-apus rounded-lg px-3 py-1.5">+ Add invitation</button>
      ) : (
        <form onSubmit={handleAdd} className="bg-app-black rounded-xl p-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-[10.5px] text-text-secondary mb-1">NAME</p>
              <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-surface-2 rounded-lg px-3 py-2 text-[12.5px] outline-none" />
            </div>
            <div>
              <p className="text-[10.5px] text-text-secondary mb-1">EMAIL</p>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-surface-2 rounded-lg px-3 py-2 text-[12.5px] outline-none" />
            </div>
          </div>
          <p className="text-[10.5px] text-text-secondary mb-1">STAKEHOLDER GROUP</p>
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)} required className="w-full bg-surface-2 rounded-lg px-3 py-2 text-[12.5px] outline-none mb-3">
            <option value="">Select a group…</option>
            {stakeholderMaster.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>

          <div className="rounded-lg px-3 py-2.5 mb-3" style={{ background: 'rgba(76,111,255,0.08)', border: '1px solid rgba(76,111,255,0.2)' }}>
            <p className="text-[11px] text-text-secondary leading-relaxed mb-2">{DATA_STATEMENT}</p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" required />
              <span className="text-[11.5px]">I have informed this person how their data is used.</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={busy || !consent} className="text-[12px] font-semibold rounded-lg px-3 py-1.5 disabled:opacity-40" style={{ background: '#4C6FFF', color: '#07070B' }}>
              {busy ? 'Adding…' : 'Add invitation'}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="text-[12px] text-text-secondary px-3 py-1.5">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

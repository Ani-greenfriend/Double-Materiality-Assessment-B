import { useEffect, useState } from 'react';
import { fetchLiveSessionWithParticipants, setLiveSessionFacilitator, addParticipant, removeParticipant } from '../lib/data';
import { ESRS_TOPICS } from '../lib/topics';

const DATA_STATEMENT = "The details you enter about this person are stored securely and used only to organise and document this materiality assessment. Their answers can be connected to them through their invitation or the session attendee list. They may be shared with the client company and its auditor. They can request deletion or anonymisation at any time by contacting: anikalerch@greenfriend.org.";

export default function ParticipantsPanel({ assessment, stakeholderMaster, userId, onClose }) {
  const [liveSession, setLiveSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [facilitator, setFacilitator] = useState('');

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [expertise, setExpertise] = useState(new Set());
  const [representsGroupId, setRepresentsGroupId] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const silentGroups = stakeholderMaster.filter((g) => g.type === 'silent');

  function reload() {
    fetchLiveSessionWithParticipants(assessment.id)
      .then(({ liveSession: ls, participants: p }) => {
        setLiveSession(ls);
        setFacilitator(ls.facilitator ?? '');
        setParticipants(p);
      })
      .catch((err) => setLoadError(err.message));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessment.id]);

  async function handleSaveFacilitator() {
    if (!liveSession) return;
    await setLiveSessionFacilitator(liveSession.id, facilitator.trim() || null);
    reload();
  }

  function toggleExpertise(topicId) {
    setExpertise((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!consent || expertise.size === 0) return;
    setBusy(true);
    setError('');
    try {
      await addParticipant({
        liveSessionId: liveSession.id,
        name: name.trim(),
        expertise: [...expertise],
        representsGroupId: representsGroupId || null,
        changedBy: userId,
      });
      setName('');
      setExpertise(new Set());
      setRepresentsGroupId('');
      setConsent(false);
      setAdding(false);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(p) {
    const reason = window.prompt(`Remove "${p.name}"? Give a reason (kept in the attendance edit log):`);
    if (reason === null) return;
    await removeParticipant({ liveSessionId: liveSession.id, participantId: p.id, reason, changedBy: userId });
    reload();
  }

  if (!liveSession) {
    return (
      <div className="bg-surface-2 rounded-xl p-4">
        {loadError ? <p className="text-[11.5px] text-badge-amber">{loadError}</p> : <p className="text-[12px] text-text-secondary">Loading…</p>}
      </div>
    );
  }

  const active = participants.filter((p) => !p.removed_at);
  const removed = participants.filter((p) => p.removed_at);

  return (
    <div className="bg-surface-2 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13.5px] font-semibold">Participants — {assessment.name}</p>
        <button onClick={onClose} className="text-[12px] text-text-secondary hover:text-text-primary">Close</button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <p className="text-[10.5px] text-text-secondary shrink-0">FACILITATOR</p>
        <input
          value={facilitator}
          onChange={(e) => setFacilitator(e.target.value)}
          onBlur={handleSaveFacilitator}
          className="flex-1 bg-app-black rounded-lg px-3 py-1.5 text-[12.5px] outline-none"
        />
      </div>

      <div className="flex flex-col gap-2 mb-3">
        {active.length === 0 ? (
          <p className="text-[12px] text-text-secondary">No attendees yet.</p>
        ) : (
          active.map((p) => (
            <div key={p.id} className="bg-app-black rounded-lg px-3.5 py-2.5 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[12.5px] font-medium">{p.name}</span>
                <span className="text-[10.5px] text-text-secondary">{(p.expertise ?? []).join(', ')}</span>
                {p.represents_group_id && (
                  <span className="text-[9.5px] rounded-full px-2 py-0.5" style={{ background: 'rgba(155,127,224,0.14)', color: '#9B7FE0' }}>
                    represents {stakeholderMaster.find((g) => g.id === p.represents_group_id)?.name ?? 'a silent stakeholder'}
                  </span>
                )}
              </div>
              <button onClick={() => handleRemove(p)} className="text-[11px] text-text-secondary hover:text-badge-amber shrink-0">Remove</button>
            </div>
          ))
        )}
      </div>

      {removed.length > 0 && (
        <details className="mb-3">
          <summary className="text-[11px] text-text-secondary cursor-pointer">{removed.length} removed</summary>
          <div className="flex flex-col gap-1.5 mt-2">
            {removed.map((p) => (
              <div key={p.id} className="text-[11px] text-text-secondary px-3">{p.name} — {p.removed_reason || 'no reason given'}</div>
            ))}
          </div>
        </details>
      )}

      {error && <p className="text-[11.5px] text-badge-amber mb-3">{error}</p>}

      {!adding ? (
        <button onClick={() => setAdding(true)} className="text-[12px] border border-border-apus rounded-lg px-3 py-1.5">+ Add attendee</button>
      ) : (
        <form onSubmit={handleAdd} className="bg-app-black rounded-xl p-4">
          <p className="text-[10.5px] text-text-secondary mb-1">NAME</p>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-surface-2 rounded-lg px-3 py-2 text-[12.5px] outline-none mb-3" />

          <p className="text-[10.5px] text-text-secondary mb-1.5">FIELD OF EXPERTISE (at least one)</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {ESRS_TOPICS.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => toggleExpertise(t.id)}
                className={`text-[11px] rounded-md px-2.5 py-1.5 ${expertise.has(t.id) ? 'bg-emerald text-app-black font-semibold' : 'border border-border-apus text-text-secondary'}`}
              >
                {t.id}
              </button>
            ))}
          </div>

          {silentGroups.length > 0 && (
            <>
              <p className="text-[10.5px] text-text-secondary mb-1">REPRESENTS A SILENT STAKEHOLDER (optional)</p>
              <select value={representsGroupId} onChange={(e) => setRepresentsGroupId(e.target.value)} className="w-full bg-surface-2 rounded-lg px-3 py-2 text-[12.5px] outline-none mb-3">
                <option value="">None</option>
                {silentGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </>
          )}

          <div className="rounded-lg px-3 py-2.5 mb-3" style={{ background: 'rgba(76,111,255,0.08)', border: '1px solid rgba(76,111,255,0.2)' }}>
            <p className="text-[11px] text-text-secondary leading-relaxed mb-2">{DATA_STATEMENT}</p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" required />
              <span className="text-[11.5px]">I have informed this person how their data is used.</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={busy || !consent || expertise.size === 0} className="text-[12px] font-semibold rounded-lg px-3 py-1.5 disabled:opacity-40" style={{ background: '#4C6FFF', color: '#07070B' }}>
              {busy ? 'Adding…' : 'Add attendee'}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="text-[12px] text-text-secondary px-3 py-1.5">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

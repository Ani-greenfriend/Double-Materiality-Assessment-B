import { useState, useEffect } from 'react';
import TopicsModule from './TopicsModule';
import { loadTopicLibraryForModule, saveTopicLibraryForModule, signOffTopicLibraryEntry, revokeTopicLibraryEntrySignoff } from '../lib/data';

// Section 8: "Topics (master IRO library — independent of any single
// cycle)". TopicsModule.jsx is the ported prototype screen — this wrapper
// owns the Supabase-backed state it expects (same useState-shaped
// topicLibrary/setTopicLibrary contract as Stakeholders) and supplies the
// v2.0 context the component needs but the prototype never had: which ESRS
// version is being edited, the client list (for the optional per-topic
// client field) and the logged-in user (for sign-off).
//
// v2.1 correction: this screen, not a per-assessment step, is "IRO
// signoff" — Sign-off only reads the whole master list here and signs off
// individual entries once, gated by can_signoff_topics. readOnly disables
// everything else (add/edit/delete/CSV/the generic bulk save below); the
// sign-off/revoke actions instead go through two scoped SECURITY DEFINER
// functions that touch only signed_off_by/signed_off_at.
export default function TopicsTab({ clients, currentUserEmail, onGoNext, readOnly, canSignoffTopics }) {
  const [topicLibrary, setTopicLibraryLocal] = useState([]);
  const [esrsVersion, setEsrsVersion] = useState('esrs_2023_amended');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTopicLibraryForModule()
      .then(setTopicLibraryLocal)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function setTopicLibrary(updater) {
    setTopicLibraryLocal((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveTopicLibraryForModule(next).catch((err) => setError(err.message));
      return next;
    });
  }

  async function handleSignOffEntry(topicId) {
    setError('');
    try {
      await signOffTopicLibraryEntry(topicId);
      setTopicLibraryLocal((prev) => prev.map((t) => (t.id === topicId ? { ...t, signedOffBy: currentUserEmail, signedOffAt: Date.now() } : t)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRevokeSignOffEntry(topicId) {
    setError('');
    try {
      await revokeTopicLibraryEntrySignoff(topicId);
      setTopicLibraryLocal((prev) => prev.map((t) => (t.id === topicId ? { ...t, signedOffBy: null, signedOffAt: null } : t)));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="text-[13px] text-text-secondary">Loading…</p>;

  return (
    <div>
      {error && <p className="text-[12px] text-badge-amber mb-4">{error}</p>}
      {readOnly && (
        <div className="rounded-xl p-3.5 mb-5" style={{ background: 'rgba(76,111,255,0.08)', border: '1px solid rgba(76,111,255,0.25)' }}>
          <p className="text-[12px] font-semibold" style={{ color: '#4C6FFF' }}>You're reviewing the master topic list</p>
          <p className="text-[11px] text-text-secondary mt-0.5">
            {canSignoffTopics
              ? 'Read-only except sign-off: open a topic and use "Sign off this topic" once you\'ve reviewed it. This is a one-time check per entry, not per assessment — assessments snapshot whatever is signed off (or not) at the moment they\'re created.'
              : 'Read-only — you don\'t have sign-off rights for topics. Ask your Admin if this is unexpected.'}
          </p>
        </div>
      )}
      <TopicsModule
        topicLibrary={topicLibrary} setTopicLibrary={setTopicLibrary} onGoNext={onGoNext}
        esrsVersion={esrsVersion} setEsrsVersion={setEsrsVersion}
        clients={clients} currentUserEmail={currentUserEmail}
        readOnly={readOnly} canSignoffTopics={canSignoffTopics}
        onSignOffEntry={readOnly ? handleSignOffEntry : null}
        onRevokeSignOffEntry={readOnly ? handleRevokeSignOffEntry : null}
      />
    </div>
  );
}

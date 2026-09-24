import { useState, useEffect } from 'react';
import TopicsModule from './TopicsModule';
import { loadTopicLibraryForModule, saveTopicLibraryForModule } from '../lib/data';

// Section 8: "Topics (master IRO library — independent of any single
// cycle)". TopicsModule.jsx is the ported prototype screen — this wrapper
// owns the Supabase-backed state it expects (same useState-shaped
// topicLibrary/setTopicLibrary contract as Stakeholders) and supplies the
// v2.0 context the component needs but the prototype never had: which ESRS
// version is being edited, the client list (for the optional per-topic
// client field) and the logged-in user (for sign-off).
export default function TopicsTab({ clients, currentUserEmail, onGoNext }) {
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

  if (loading) return <p className="text-[13px] text-text-secondary">Loading…</p>;

  return (
    <div>
      {error && <p className="text-[12px] text-badge-amber mb-4">{error}</p>}
      <TopicsModule
        topicLibrary={topicLibrary} setTopicLibrary={setTopicLibrary} onGoNext={onGoNext}
        esrsVersion={esrsVersion} setEsrsVersion={setEsrsVersion}
        clients={clients} currentUserEmail={currentUserEmail}
      />
    </div>
  );
}

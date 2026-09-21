import { useState, useEffect } from 'react';
import StakeholderModule from './StakeholderModule';
import { loadStakeholderMapForModule, saveStakeholderMapForModule } from '../lib/data';

// Section 8: "Stakeholders (master map — independent of any single cycle)".
// StakeholderModule.jsx is the ported prototype screen — this wrapper owns
// the Supabase-backed state it expects (stakeholderMap/setStakeholderMap
// behave exactly like a React useState pair, per the prototype's own
// contract). Silent stakeholders (spec v2.0 amended 5) are ordinary entries
// in this same map, marked `type: 'silent'` — no separate panel or scope.
export default function StakeholdersTab({ openGroupId, setOpenGroupId, onGoNext, onChanged }) {
  const [stakeholderMap, setStakeholderMapLocal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStakeholderMapForModule()
      .then(setStakeholderMapLocal)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function setStakeholderMap(updater) {
    setStakeholderMapLocal((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveStakeholderMapForModule(next)
        .then(() => onChanged?.())
        .catch((err) => setError(err.message));
      return next;
    });
  }

  if (loading) return <p className="text-[13px] text-text-secondary">Loading…</p>;

  return (
    <div>
      {error && <p className="text-[12px] text-badge-amber mb-4">{error}</p>}
      <StakeholderModule
        stakeholderMap={stakeholderMap} setStakeholderMap={setStakeholderMap}
        openGroupId={openGroupId} setOpenGroupId={setOpenGroupId}
        onGoNext={onGoNext}
      />
    </div>
  );
}

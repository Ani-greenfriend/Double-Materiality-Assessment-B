import { useState, useEffect, useCallback } from 'react';
import StakeholderModule from './StakeholderModule';
import SilentStakeholdersPanel from './SilentStakeholdersPanel';
import { loadStakeholderMapForModule, saveStakeholderMapForModule, loadSilentStakeholderGroups } from '../lib/data';

// Section 8: "Stakeholders (master map — independent of any single cycle)".
// StakeholderModule.jsx is the ported prototype screen (Impact/Financial
// perspectives + generic pool) — this wrapper owns the Supabase-backed state
// it expects (stakeholderMap/setStakeholderMap behave exactly like a React
// useState pair, per the prototype's own contract) and adds the Silent
// stakeholders section alongside it, a v2.0 concept the prototype has no
// equivalent of at all.
export default function StakeholdersTab({ openGroupId, setOpenGroupId, onGoNext, onChanged }) {
  const [stakeholderMap, setStakeholderMapLocal] = useState([]);
  const [silentGroups, setSilentGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reloadSilent = useCallback(() => {
    loadSilentStakeholderGroups().then(setSilentGroups).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    Promise.all([loadStakeholderMapForModule(), loadSilentStakeholderGroups()])
      .then(([map, silent]) => {
        setStakeholderMapLocal(map);
        setSilentGroups(silent);
      })
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

  function handleSilentChanged() {
    reloadSilent();
    onChanged?.();
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
      {!openGroupId && <SilentStakeholdersPanel groups={silentGroups} onChanged={handleSilentChanged} />}
    </div>
  );
}

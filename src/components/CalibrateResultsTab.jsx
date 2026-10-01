import { useState } from 'react';
import ResultsScreen from './ResultsScreen';
import CalibrationTab from './CalibrationTab';
import { CalibrationIcon } from './icons';
import { signOffCycleResults, revokeCycleResultsSignoff } from '../lib/data';

const ESRS_LABEL = { esrs_2023_amended: 'ESRS 2023 as amended', esrs_2026: 'ESRS 2026' };

// Section 8, Calibrate & Results workspace (v2.0 amended 9): "only the
// financial year and the filters... that persist across the three tabs.
// There is no global stage banner... no 'require both sources' setting and
// no Start calibration... — sign-off is per IRO, as in the prototype." That
// is still true of cycles.stage (retired, never read) and the per-IRO
// reviewed_with_owner tick below, unchanged. The v2.1 access stage then
// added a *separate* concept on top: cycles.results_signed_off, a real
// data lock (not advisory) gated by the can_signoff_results permission —
// CLAUDE.md's "RLS and roles" section and docs/access-matrix.md are
// authoritative here and postdate the v2.0-amended-9 line above; this is
// the "Calibration sign off functionality" the builder asked be reachable,
// not a reversal of the per-IRO decision.
function WorkspaceHeader({ cycle, allSignedOff, canSignoffResults, readOnly, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSignOff() {
    setBusy(true);
    setError('');
    try {
      await signOffCycleResults(cycle.id);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke() {
    if (!window.confirm('Revoke the results sign-off for this cycle? Calibrated values become editable again.')) return;
    setBusy(true);
    setError('');
    try {
      await revokeCycleResultsSignoff(cycle.id);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-surface border border-border-apus rounded-2xl p-5 mb-5">
      <div className="flex items-center gap-3 flex-wrap">
        {cycle.clientLogoUrl && <img src={cycle.clientLogoUrl} alt="" className="w-6 h-6 rounded object-contain bg-white" />}
        <span className="text-[13.5px] font-semibold">{cycle.clientName ?? 'Unknown client'}</span>
        <span className="text-[12.5px] text-text-secondary">FY{cycle.financialYear}</span>
        <span className="text-[10px] text-text-secondary">{ESRS_LABEL[cycle.esrsVersion] ?? cycle.esrsVersion}</span>
        <span className="text-[9.5px] font-semibold rounded-full px-2 py-0.5 uppercase tracking-wide border border-border-apus text-text-secondary">
          {allSignedOff ? 'Final' : 'Provisional'}
        </span>
        <span className="text-[11px] text-text-secondary ml-auto">
          Impact threshold <b className="text-text-primary">{Number(cycle.impactThreshold).toFixed(1)}</b> · Financial threshold <b className="text-text-primary">{Number(cycle.financialThreshold).toFixed(1)}</b>
        </span>
      </div>

      <div className="flex items-center gap-3 flex-wrap mt-3 pt-3 border-t border-border-apus">
        <p className="text-[11.5px] font-semibold" style={{ color: cycle.resultsSignedOff ? '#5ED996' : undefined }}>
          {cycle.resultsSignedOff ? '✓ Results signed off' : 'Results not yet signed off'}
        </p>
        {cycle.resultsSignedOff && cycle.resultsSignedOffAt && (
          <span className="text-[10.5px] text-text-secondary">{new Date(cycle.resultsSignedOffAt).toLocaleString()} — calibrated values are locked until revoked.</span>
        )}
        {!cycle.resultsSignedOff && (
          <span className="text-[10.5px] text-text-secondary">Locks every IRO's calibrated value for this cycle until revoked.</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {!cycle.resultsSignedOff && canSignoffResults && (
            <button onClick={handleSignOff} disabled={busy} className="text-[11.5px] font-semibold rounded-lg px-3.5 py-1.5 disabled:opacity-40" style={{ background: '#5ED996', color: '#07070B' }}>
              {busy ? 'Signing off…' : 'Sign off results'}
            </button>
          )}
          {cycle.resultsSignedOff && !readOnly && (
            <button onClick={handleRevoke} disabled={busy} title="Only Owner/Admin/Full access can revoke — Sign-off only can sign off but never revoke" className="text-[11.5px] font-semibold text-text-secondary hover:text-text-primary px-2 py-1.5 disabled:opacity-40">
              {busy ? 'Revoking…' : 'Revoke'}
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-[11px] mt-2" style={{ color: '#D79A4C' }}>{error}</p>}
    </div>
  );
}

// The E/S/G and material/not-material filters used to live only inside
// ResultsScreen.jsx's Matrix — now owned here instead, so the same
// selection stays in effect when switching from Results to Calibrate,
// per the builder's direct request for filters shared across the
// workspace, not just one chart.
function FilterBar({ activeCats, setActiveCats, showMaterial, setShowMaterial, showNotMaterial, setShowNotMaterial }) {
  return (
    <div className="flex gap-3 mb-5 flex-wrap items-center">
      <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Filter</span>
      {['E', 'S', 'G'].map((c) => (
        <label key={c} className="text-[12px] font-medium flex items-center gap-1.5">
          <input type="checkbox" checked={activeCats.includes(c)} onChange={() => setActiveCats((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])} />
          {c}
        </label>
      ))}
      <label className="text-[12px] font-medium flex items-center gap-1.5">
        <input type="checkbox" checked={showMaterial} onChange={() => setShowMaterial((v) => !v)} /> Material
      </label>
      <label className="text-[12px] font-medium flex items-center gap-1.5">
        <input type="checkbox" checked={showNotMaterial} onChange={() => setShowNotMaterial((v) => !v)} /> Not material
      </label>
    </div>
  );
}

// Section 8: "calibration and results merge into one Calibrate & Results
// workspace". This wraps the existing Results/Calibration screens under one
// nav destination with an internal switcher and a shared filter bar, so the
// nav item count matches the spec's six process steps. Calibration and
// threshold edits are always available (v2.0 amended 9) — there's no more
// "locked" / stage-gated read-only state to thread through.
export default function CalibrateResultsTab({ iros, thresholds, cycle, userId, canSignoffResults, onChanged, initialSub = 'results', readOnly }) {
  const [sub, setSub] = useState(initialSub);
  const [activeCats, setActiveCats] = useState(['E', 'S', 'G']);
  const [showMaterial, setShowMaterial] = useState(true);
  const [showNotMaterial, setShowNotMaterial] = useState(true);

  const allSignedOff = iros.length > 0 && iros.every((iro) => iro.calibration?.reviewed_with_owner);
  // Full access can always sign off; Sign-off only needs the specific grant.
  const canSignOffResultsNow = !readOnly || canSignoffResults;

  return (
    <div>
      <h2 className="text-[24px] font-bold flex items-center gap-3 mb-1">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #E8B26B, #D79A4C)' }}>
          <CalibrationIcon size={19} />
        </span>
        Calibrate &amp; Results
      </h2>
      <p className="text-[12px] text-text-secondary mb-4">One workspace — results as calculated, and calibration where the group agrees an adjustment is needed.</p>

      {cycle && <WorkspaceHeader cycle={cycle} allSignedOff={allSignedOff} canSignoffResults={canSignOffResultsNow} readOnly={readOnly} onChanged={onChanged} />}

      <div className="flex gap-2 mb-5 border-b border-border-apus">
        {[{ id: 'results', label: 'Results' }, { id: 'calibrate', label: 'Calibrate' }].map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`text-[13px] px-3 py-2 -mb-px border-b-2 ${sub === t.id ? 'border-badge-blue text-text-primary' : 'border-transparent text-text-secondary'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <FilterBar activeCats={activeCats} setActiveCats={setActiveCats} showMaterial={showMaterial} setShowMaterial={setShowMaterial} showNotMaterial={showNotMaterial} setShowNotMaterial={setShowNotMaterial} />

      {sub === 'results' && (
        <ResultsScreen iros={iros} thresholds={thresholds} activeCats={activeCats} showMaterial={showMaterial} showNotMaterial={showNotMaterial} cycle={cycle} userId={userId} onChanged={onChanged} readOnly={readOnly} />
      )}
      {sub === 'calibrate' && (
        <CalibrationTab iros={iros} thresholds={thresholds} cycleId={cycle?.id ?? null} userId={userId} onChanged={onChanged} activeCats={activeCats} showMaterial={showMaterial} showNotMaterial={showNotMaterial} readOnly={readOnly} resultsLocked={!!cycle?.resultsSignedOff} />
      )}
    </div>
  );
}

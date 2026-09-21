import { useState } from 'react';
import ResultsTab from './ResultsTab';
import CalibrationTab from './CalibrationTab';
import { CalibrationIcon } from './icons';
import { startCalibration, signOffCycle, revokeCycleSignOff, setRequireBothSources, purgeUnfinishedDrafts } from '../lib/data';

const STAGE_LABEL = { collecting: 'Collecting', calibrating: 'Calibrating', signed_off: 'Signed off' };
const ESRS_LABEL = { esrs_2023_amended: 'ESRS 2023 as amended', esrs_2026: 'ESRS 2026' };
const TYPE_LABEL = { expert_survey: 'Expert survey', expert_live_session: 'Expert live session' };

// Section 8, Calibrate & Results workspace: the shared header carries what
// used to live on the (now removed, v2.0 amended 6) Cycles screen — stage,
// sign-off, require both sources, Delete unfinished drafts — alongside the
// client/financial-year/ESRS-version/threshold display and the
// Provisional/Final label. "Cycle" is never said to the user, even though
// this all still operates on the cycles row under the hood.
function WorkspaceHeader({ cycle, userId, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [signingOff, setSigningOff] = useState(false);
  const [approverName, setApproverName] = useState(cycle.approverName ?? '');
  const [approverRole, setApproverRole] = useState(cycle.approverRole ?? '');
  const [minutesReference, setMinutesReference] = useState(cycle.minutesReference ?? '');

  const missingSources = cycle.requireBothSources
    ? ['expert_survey', 'expert_live_session'].filter((s) => !cycle.submittedSources.has(s))
    : [];

  async function run(fn) {
    setBusy(true);
    setError('');
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmSignOff() {
    if (!approverName.trim() || !approverRole.trim()) return;
    await run(async () => {
      await signOffCycle({ cycleId: cycle.id, approverName: approverName.trim(), approverRole: approverRole.trim(), minutesReference: minutesReference.trim(), recordedBy: userId });
      setSigningOff(false);
    });
  }

  async function handleRevoke() {
    if (window.confirm('Revoke sign-off? Results return to Provisional.')) {
      await run(() => revokeCycleSignOff(cycle.id));
    }
  }

  async function handlePurgeDrafts() {
    if (window.confirm('Delete every unfinished draft in this round? Submitted responses are never affected. This cannot be undone.')) {
      await run(() => purgeUnfinishedDrafts(cycle.id));
    }
  }

  const stageColor = { collecting: '#D79A4C', calibrating: '#4C6FFF', signed_off: '#5ED996' }[cycle.stage] ?? '#D79A4C';

  return (
    <div className="bg-surface border border-border-apus rounded-2xl p-5 mb-5">
      <div className="flex items-center gap-3 flex-wrap mb-3">
        {cycle.clientLogoUrl && <img src={cycle.clientLogoUrl} alt="" className="w-6 h-6 rounded object-contain bg-white" />}
        <span className="text-[13.5px] font-semibold">{cycle.clientName ?? 'Unknown client'}</span>
        <span className="text-[12.5px] text-text-secondary">FY{cycle.financialYear}</span>
        <span className="text-[10px] text-text-secondary">{ESRS_LABEL[cycle.esrsVersion] ?? cycle.esrsVersion}</span>
        <span className="text-[9.5px] font-semibold rounded-full px-2 py-0.5 uppercase tracking-wide" style={{ color: stageColor, background: `${stageColor}22` }}>
          {STAGE_LABEL[cycle.stage] ?? cycle.stage}
        </span>
        <span className="text-[9.5px] font-semibold rounded-full px-2 py-0.5 uppercase tracking-wide border border-border-apus text-text-secondary">
          {cycle.stage === 'signed_off' ? 'Final' : 'Provisional'}
        </span>
        <span className="text-[11px] text-text-secondary ml-auto">
          Impact threshold <b className="text-text-primary">{Number(cycle.impactThreshold).toFixed(1)}</b> · Financial threshold <b className="text-text-primary">{Number(cycle.financialThreshold).toFixed(1)}</b>
        </span>
      </div>

      {error && <p className="text-[11.5px] text-badge-amber mb-3">{error}</p>}

      <div className="flex flex-wrap gap-2 items-center">
        {cycle.stage === 'collecting' && (
          <button onClick={() => run(() => startCalibration(cycle.id))} disabled={busy} className="text-[12px] font-semibold rounded-lg px-3 py-1.5 disabled:opacity-40" style={{ background: '#4C6FFF', color: '#07070B' }}>
            Start calibration
          </button>
        )}
        {cycle.stage === 'calibrating' && !signingOff && (
          <button onClick={() => setSigningOff(true)} disabled={busy} className="text-[12px] font-semibold rounded-lg px-3 py-1.5 disabled:opacity-40" style={{ background: '#5ED996', color: '#07070B' }}>
            Sign off
          </button>
        )}
        {cycle.stage === 'signed_off' && (
          <button onClick={handleRevoke} disabled={busy} className="text-[12px] border border-border-apus rounded-lg px-3 py-1.5 disabled:opacity-40">
            Revoke sign-off
          </button>
        )}
        {(cycle.stage === 'calibrating' || cycle.stage === 'signed_off') && cycle.hasAnyDraft && (
          <button onClick={handlePurgeDrafts} disabled={busy} className="text-[12px] text-text-secondary hover:text-badge-amber px-3 py-1.5 disabled:opacity-40">
            Delete unfinished drafts
          </button>
        )}
        <label className="flex items-center gap-2 ml-auto cursor-pointer">
          <span className="text-[11.5px] text-text-secondary">Require both sources</span>
          <button
            type="button"
            onClick={() => run(() => setRequireBothSources(cycle.id, !cycle.requireBothSources))}
            disabled={busy}
            className="w-9 h-5 rounded-full relative transition-colors shrink-0"
            style={{ background: cycle.requireBothSources ? '#4C6FFF' : '#2A2830' }}
          >
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: cycle.requireBothSources ? '18px' : '2px' }} />
          </button>
        </label>
      </div>

      {signingOff && (
        <div className="bg-app-black rounded-xl p-4 mt-3">
          <p className="text-[11.5px] text-text-secondary mb-3">
            This records the round as signed off — results become <b className="text-text-primary">Final</b> and new ratings/edits are blocked until revoked.
          </p>
          {missingSources.length > 0 && (
            <p className="text-[11.5px] mb-3" style={{ color: '#D79A4C' }}>
              "Require both sources" is on, and {missingSources.map((s) => TYPE_LABEL[s]).join(' and ')} {missingSources.length === 1 ? 'has' : 'have'} no submitted data yet — sign-off is blocked until it does.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-[10.5px] text-text-secondary mb-1">APPROVER NAME</p>
              <input value={approverName} onChange={(e) => setApproverName(e.target.value)} className="w-full bg-surface-2 rounded-lg px-3 py-2 text-[12.5px] outline-none" />
            </div>
            <div>
              <p className="text-[10.5px] text-text-secondary mb-1">APPROVER ROLE</p>
              <input value={approverRole} onChange={(e) => setApproverRole(e.target.value)} className="w-full bg-surface-2 rounded-lg px-3 py-2 text-[12.5px] outline-none" />
            </div>
          </div>
          <p className="text-[10.5px] text-text-secondary mb-1">MINUTES REFERENCE (optional)</p>
          <input value={minutesReference} onChange={(e) => setMinutesReference(e.target.value)} className="w-full bg-surface-2 rounded-lg px-3 py-2 text-[12.5px] outline-none mb-3" />
          <div className="flex gap-2">
            <button
              onClick={handleConfirmSignOff}
              disabled={busy || !approverName.trim() || !approverRole.trim() || missingSources.length > 0}
              className="text-[12px] font-semibold rounded-lg px-3 py-1.5 disabled:opacity-40"
              style={{ background: '#5ED996', color: '#07070B' }}
            >
              Confirm sign-off
            </button>
            <button onClick={() => setSigningOff(false)} className="text-[12px] text-text-secondary px-3 py-1.5">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Section 8: "calibration and results merge into one Calibrate & Results
// workspace". This wraps the existing Results/Calibration screens (still
// their session-1 shape — the full redesigned workspace with the Matrix
// tab and persistent filters is separate, later work) under one nav
// destination with an internal switcher, so the nav item count matches
// the spec's six process steps.
export default function CalibrateResultsTab({ iros, thresholds, cycle, userId, locked, onChanged, initialSub = 'results' }) {
  const [sub, setSub] = useState(initialSub);

  return (
    <div>
      <h2 className="text-[24px] font-bold flex items-center gap-3 mb-1">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #E8B26B, #D79A4C)' }}>
          <CalibrationIcon size={19} />
        </span>
        Calibrate &amp; Results
      </h2>
      <p className="text-[12px] text-text-secondary mb-4">One workspace — results as calculated, and calibration where the group agrees an adjustment is needed.</p>

      {cycle && <WorkspaceHeader cycle={cycle} userId={userId} onChanged={onChanged} />}

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

      {sub === 'results' && <ResultsTab iros={iros} thresholds={thresholds} />}
      {sub === 'calibrate' && (
        <CalibrationTab iros={iros} thresholds={thresholds} cycleId={cycle?.id ?? null} locked={locked} onChanged={onChanged} />
      )}
    </div>
  );
}

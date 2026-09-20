import { useState } from 'react';
import { startCalibration, signOffCycle, revokeCycleSignOff, deleteCycle, deleteAssessment, purgeUnfinishedDrafts } from '../lib/data';
import { CycleIcon } from './icons';
import NewCycleWizard from './NewCycleWizard';

const STAGE_LABEL = { collecting: 'Collecting', calibrating: 'Calibrating', signed_off: 'Signed off' };
const STAGE_COLOR = {
  collecting: { text: '#D79A4C', bg: 'rgba(215,154,76,0.14)' },
  calibrating: { text: '#4C6FFF', bg: 'rgba(76,111,255,0.14)' },
  signed_off: { text: '#5ED996', bg: 'rgba(94,217,150,0.14)' },
};
const ESRS_LABEL = { esrs_2023_amended: 'ESRS 2023 as amended', esrs_2026: 'ESRS 2026' };
const TYPE_LABEL = { expert_survey: 'Expert survey', expert_live_session: 'Expert live session' };

function fmt(v) {
  return v === null || v === undefined ? '–' : Number(v).toFixed(1);
}

export default function CyclesTab({ cycles, userId, onChanged }) {
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[24px] font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #6C8CFF, #4C6FFF)' }}>
            <CycleIcon size={19} />
          </span>
          Cycles
        </h2>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="text-[12.5px] font-semibold rounded-lg px-3.5 py-2"
            style={{ background: '#4C6FFF', color: '#07070B' }}
          >
            + New cycle
          </button>
        )}
      </div>
      <p className="text-[12px] text-text-secondary mb-5">One DMA round per client and financial year — assessments, calibration and sign-off all live inside a cycle.</p>

      {creating && (
        <div className="mb-6">
          <NewCycleWizard
            userId={userId}
            onCancel={() => setCreating(false)}
            onCreated={(newCycleId) => {
              setCreating(false);
              setOpenId(newCycleId);
              onChanged();
            }}
          />
        </div>
      )}

      {cycles.length === 0 ? (
        <div className="bg-surface rounded-2xl p-10 text-center text-text-secondary text-[13px]">No cycles yet — create one to get started.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {cycles.map((cycle) => (
            <CycleRow key={cycle.id} cycle={cycle} isOpen={openId === cycle.id} onToggle={() => setOpenId((id) => (id === cycle.id ? null : cycle.id))} userId={userId} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}

function CycleRow({ cycle, isOpen, onToggle, userId, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [signingOff, setSigningOff] = useState(false);
  const [approverName, setApproverName] = useState(cycle.approverName ?? '');
  const [approverRole, setApproverRole] = useState(cycle.approverRole ?? '');
  const [minutesReference, setMinutesReference] = useState(cycle.minutesReference ?? '');

  const stageColor = STAGE_COLOR[cycle.stage] ?? STAGE_COLOR.collecting;

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

  async function handleStartCalibration() {
    await run(() => startCalibration(cycle.id));
  }

  async function handleConfirmSignOff() {
    if (!approverName.trim() || !approverRole.trim()) return;
    await run(async () => {
      await signOffCycle({ cycleId: cycle.id, approverName: approverName.trim(), approverRole: approverRole.trim(), minutesReference: minutesReference.trim(), recordedBy: userId });
      setSigningOff(false);
    });
  }

  async function handleRevoke() {
    if (window.confirm('Revoke sign-off? This cycle returns to Calibrating and its results show as Provisional again.')) {
      await run(() => revokeCycleSignOff(cycle.id));
    }
  }

  async function handleDeleteCycle() {
    if (window.confirm(`Delete cycle "${cycle.name}"? This only succeeds if no response exists anywhere in it.`)) {
      await run(() => deleteCycle(cycle.id));
    }
  }

  async function handleDeleteAssessment(assessmentId, name) {
    if (window.confirm(`Delete assessment "${name}"? This only succeeds if it has no responses at all.`)) {
      await run(() => deleteAssessment(assessmentId));
    }
  }

  async function handlePurgeDrafts() {
    if (window.confirm('Delete every unfinished draft in this cycle? Submitted responses are never affected. This cannot be undone.')) {
      await run(() => purgeUnfinishedDrafts(cycle.id));
    }
  }

  return (
    <div className="rounded-xl overflow-hidden bg-surface border border-border-apus">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
        <div className="flex items-center gap-3 flex-wrap">
          {cycle.clientLogoUrl && <img src={cycle.clientLogoUrl} alt="" className="w-6 h-6 rounded object-contain bg-white" />}
          <span className="text-[13.5px] font-semibold">{cycle.clientName ?? 'Unknown client'}</span>
          <span className="text-[12.5px] text-text-secondary">{cycle.name} · FY{cycle.financialYear}</span>
          <span className="text-[10px] text-text-secondary">{ESRS_LABEL[cycle.esrsVersion] ?? cycle.esrsVersion}</span>
          <span className="text-[9.5px] font-semibold rounded-full px-2 py-0.5 uppercase tracking-wide" style={{ color: stageColor.text, background: stageColor.bg }}>
            {STAGE_LABEL[cycle.stage] ?? cycle.stage}
          </span>
        </div>
        <span className="text-[11px] text-text-secondary shrink-0">
          {cycle.assessments.length} assessment{cycle.assessments.length === 1 ? '' : 's'} {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div className="bg-surface-2 p-4">
          <div className="flex gap-4 text-[11.5px] text-text-secondary mb-4">
            <span>Impact threshold <b className="text-text-primary">{fmt(cycle.impactThreshold)}</b> (baseline {fmt(cycle.baselineImpactThreshold)})</span>
            <span>Financial threshold <b className="text-text-primary">{fmt(cycle.financialThreshold)}</b> (baseline {fmt(cycle.baselineFinancialThreshold)})</span>
          </div>

          {cycle.silentStakeholdersConsidered && (
            <div className="rounded-lg px-3 py-2.5 mb-4" style={{ background: 'rgba(155,127,224,0.1)', border: '1px solid rgba(155,127,224,0.3)' }}>
              <p className="text-[10.5px] font-semibold mb-1" style={{ color: '#9B7FE0' }}>SILENT STAKEHOLDERS CONSIDERED</p>
              <p className="text-[12px] text-text-secondary">{cycle.silentStakeholdersNote || 'No note recorded.'}</p>
            </div>
          )}

          <p className="text-[10.5px] font-semibold text-text-secondary uppercase tracking-wide mb-2">Assessments</p>
          {cycle.assessments.length === 0 ? (
            <p className="text-[12px] text-text-secondary mb-4">No assessments yet.</p>
          ) : (
            <div className="flex flex-col gap-2 mb-4">
              {cycle.assessments.map((a) => (
                <div key={a.id} className="bg-app-black rounded-lg px-3.5 py-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-[12.5px] font-medium">{a.name} <span className="text-[10.5px] text-text-secondary">· {TYPE_LABEL[a.type] ?? a.type}</span></p>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      {a.type === 'expert_survey'
                        ? Object.entries(a.invitationStatusCounts).length
                          ? Object.entries(a.invitationStatusCounts).map(([status, count]) => `${count} ${status}`).join(' · ')
                          : 'No invitations yet'
                        : a.liveSession
                          ? `Session ${a.liveSession.status}${a.liveSession.facilitator ? ` · facilitated by ${a.liveSession.facilitator}` : ''}`
                          : 'Not started'}
                      {a.draftCount > 0 && ` · ${a.draftCount} draft${a.draftCount === 1 ? '' : 's'}`}
                      {a.submittedCount > 0 && ` · ${a.submittedCount} submitted`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteAssessment(a.id, a.name)}
                    disabled={busy}
                    className="text-[11px] text-text-secondary hover:text-badge-amber shrink-0 disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            disabled
            title="New assessment wizard — coming next (this session's build order)"
            className="text-[12px] border border-border-apus rounded-lg px-3 py-1.5 opacity-40 mb-4"
          >
            + New assessment
          </button>

          {error && <p className="text-[11.5px] text-badge-amber mb-3">{error}</p>}

          <div className="flex flex-wrap gap-2 items-start">
            {cycle.stage === 'collecting' && (
              <button onClick={handleStartCalibration} disabled={busy} className="text-[12px] font-semibold rounded-lg px-3 py-1.5 disabled:opacity-40" style={{ background: '#4C6FFF', color: '#07070B' }}>
                Start calibration
              </button>
            )}

            {cycle.stage === 'calibrating' && !signingOff && (
              <button onClick={() => setSigningOff(true)} disabled={busy} className="text-[12px] font-semibold rounded-lg px-3 py-1.5 disabled:opacity-40" style={{ background: '#5ED996', color: '#07070B' }}>
                Sign off cycle
              </button>
            )}

            {cycle.stage === 'signed_off' && (
              <button onClick={handleRevoke} disabled={busy} className="text-[12px] border border-border-apus rounded-lg px-3 py-1.5 disabled:opacity-40">
                Revoke sign-off
              </button>
            )}

            {(cycle.stage === 'calibrating' || cycle.stage === 'signed_off') && cycle.hasAnyDraft && (
              <button
                onClick={handlePurgeDrafts}
                disabled={busy}
                className="text-[12px] text-text-secondary hover:text-badge-amber px-3 py-1.5 disabled:opacity-40"
              >
                Delete unfinished drafts
              </button>
            )}

            <button onClick={handleDeleteCycle} disabled={busy} className="text-[12px] text-text-secondary hover:text-badge-amber px-3 py-1.5 disabled:opacity-40 ml-auto">
              Delete cycle
            </button>
          </div>

          {signingOff && (
            <div className="bg-app-black rounded-xl p-4 mt-3">
              <p className="text-[11.5px] text-text-secondary mb-3">
                This records the cycle as signed off — results become <b className="text-text-primary">Final</b> and new ratings/edits are blocked until revoked.
              </p>
              {missingSources.length > 0 && (
                <p className="text-[11.5px] mb-3" style={{ color: '#D79A4C' }}>
                  "Require both sources" is on for this cycle, and {missingSources.map((s) => TYPE_LABEL[s]).join(' and ')} {missingSources.length === 1 ? 'has' : 'have'} no submitted data yet — sign-off is blocked until it does.
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
      )}
    </div>
  );
}

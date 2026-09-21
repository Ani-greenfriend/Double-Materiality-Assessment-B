import { useState } from 'react';
import { aggregateIro, hasImpactAxis, MAGNITUDE_BANDS, CALC_METHODOLOGY_VERSION } from '../lib/calc';
import { PILLAR_COLOR, TYPE_LABEL, TYPE_COLOR, pillarFor } from '../lib/topics';
import { saveCalibrationAdjustment, resetCalibrationToCalculated, setReviewedWithOwner, updateCalibrationFields } from '../lib/data';
import DmaMascot from './DmaMascot';

function fmt(v) {
  return v === null || v === undefined ? '–' : v.toFixed(1);
}

export default function CalibrationTab({ iros, thresholds, cycleId, locked, onChanged }) {
  const [openId, setOpenId] = useState(null);

  const flagged = iros.filter((iro) => {
    const agg = aggregateIro(iro, thresholds);
    return agg.overrideTriggered || agg.discrepancy;
  });

  if (!iros.length) {
    return (
      <div>
        <DmaMascot title="What is calibration?">
          <p>Ratings rarely agree perfectly. Calibration is where leadership or subject-matter experts review the calculated results together and, where the group agrees, adjust them with a documented reason.</p>
        </DmaMascot>
        <div className="bg-surface rounded-2xl p-10 text-center text-text-secondary text-[13px]">This assessment has no IROs yet.</div>
      </div>
    );
  }

  return (
    <div>
      <DmaMascot title="What is calibration?">
        <p className="mb-2">Ratings — especially from a broad questionnaire — rarely agree perfectly. Calibration is where leadership or subject-matter experts review the calculated results together and decide whether any need adjusting.</p>
        <p>The original calculated value is always kept, and any change needs a stated reason — nothing is overwritten silently.</p>
      </DmaMascot>

      <p className="text-[12px] text-text-secondary mb-1">This step is done together with leadership or subject-matter experts — review the calculated results and adjust only where the group agrees it's needed.</p>
      <p className="text-[12px] text-text-secondary mb-1">{flagged.length} of {iros.length} topics are flagged for a closer look — override triggered, or ratings diverged.</p>
      {locked && (
        <p className="text-[12px] mb-5" style={{ color: '#D79A4C' }}>
          Calibration is editable only in the Calibrating stage — this round is not in that stage, so adjustments are read-only here.
        </p>
      )}
      {!locked && <div className="mb-5" />}

      <div className="flex flex-col gap-2 bg-surface rounded-2xl p-2">
        {iros.map((iro) => (
          <CalibrationRow
            key={iro.id}
            iro={iro}
            thresholds={thresholds}
            cycleId={cycleId}
            locked={locked}
            isOpen={openId === iro.id}
            onToggle={() => setOpenId((id) => (id === iro.id ? null : iro.id))}
            onChanged={onChanged}
          />
        ))}
      </div>
    </div>
  );
}

function CalibrationRow({ iro, thresholds, cycleId, locked, isOpen, onToggle, onChanged }) {
  const agg = aggregateIro(iro, thresholds);
  const calculated = hasImpactAxis(iro.iroType) ? agg.impactScore : agg.financialScore;
  const cal = iro.calibration;
  const history = iro.calibrationHistory ?? [];
  const pillar = PILLAR_COLOR[pillarFor(iro.topic)];

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [draftValue, setDraftValue] = useState(cal?.calibrated_value ?? calculated ?? 2.5);
  const [draftNotes, setDraftNotes] = useState('');

  const flagged = agg.overrideTriggered || agg.discrepancy;
  const isCalibrated = cal?.calibrated_value !== null && cal?.calibrated_value !== undefined;
  const isReviewedWithOwner = !!cal?.reviewed_with_owner;
  const currentValue = agg.effectiveValue;
  const moderatorBlocked = cal?.moderator && cal.moderator === cal.owner && cal.moderator;

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

  function openAdjust() {
    setDraftValue(cal?.calibrated_value ?? calculated ?? 2.5);
    setDraftNotes('');
    setAdjusting(true);
  }

  async function saveAdjustment() {
    const fromValue = isCalibrated ? cal.calibrated_value : calculated;
    if (!window.confirm(`Calibrate "${iro.name}" from ${fmt(fromValue)} to ${draftValue.toFixed(1)}?`)) return;
    await run(async () => {
      await saveCalibrationAdjustment({ iroId: iro.id, cycleId, calibration: cal, fromValue, toValue: draftValue, notes: draftNotes, changedBy: cal?.moderator || cal?.owner || 'Unspecified' });
      setAdjusting(false);
    });
  }

  async function resetToCalculated() {
    if (!window.confirm('Reset to the calculated value? The history trail is kept.')) return;
    await run(() => resetCalibrationToCalculated({ iroId: iro.id, cycleId, calibration: cal, fromValue: cal.calibrated_value, changedBy: cal?.moderator || cal?.owner || 'Unspecified' }));
  }

  async function toggleReviewedWithOwner() {
    await run(() => setReviewedWithOwner({ iroId: iro.id, cycleId, calibration: cal, reviewed: !isReviewedWithOwner }));
  }

  async function setBandValue(value) {
    await run(() => updateCalibrationFields({ iroId: iro.id, cycleId, calibration: cal, patch: { band_value: value } }));
  }

  async function setField(field, value) {
    await run(() => updateCalibrationFields({ iroId: iro.id, cycleId, calibration: cal, patch: { [field]: value } }));
  }

  return (
    <div className="rounded-xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 text-left" style={{ background: pillar.bg }}>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[9.5px] font-semibold rounded px-1.5 py-0.5" style={{ color: pillar.text, background: '#07070B' }}>{iro.topic}</span>
          <span className="text-[12.5px] font-semibold" style={{ color: pillar.text }}>{iro.name}</span>
          {flagged && <span className="text-[9.5px] font-semibold rounded-full px-2 py-0.5 border border-text-secondary text-text-secondary">Needs review</span>}
          {isCalibrated && <span className="text-[9.5px] font-semibold rounded-full px-2 py-0.5" style={{ background: '#07070B', color: '#4C6FFF' }}>Calibrated</span>}
          {isReviewedWithOwner && <span className="text-[9.5px] font-semibold rounded-full px-2 py-0.5" style={{ background: '#07070B', color: '#5ED996' }}>✓ Reviewed with owner</span>}
        </div>
        <span className="text-[11px]" style={{ color: pillar.text }}>{fmt(calculated)} {isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="bg-surface-2 p-4">
          <div className="flex justify-between items-start mb-3.5">
            <span className="text-[10px] font-semibold rounded px-1.5 py-0.5" style={{ color: TYPE_COLOR[iro.iroType].text, background: TYPE_COLOR[iro.iroType].bg }}>{TYPE_LABEL[iro.iroType]}</span>
            <span className="text-[10px] text-text-secondary font-mono">{CALC_METHODOLOGY_VERSION}</span>
          </div>

          {iro.description && <p className="text-[12px] text-text-secondary mb-3.5">{iro.description}</p>}

          {iro.sessionNotes && (
            <div className="rounded-lg px-3 py-2.5 mb-3.5" style={{ background: 'rgba(76,111,255,0.08)', border: '1px solid rgba(76,111,255,0.2)' }}>
              <p className="text-[10.5px] font-semibold mb-1" style={{ color: '#4C6FFF' }}>NOTES FROM THE EXPERT SESSION</p>
              <p className="text-[12px] text-text-secondary">{iro.sessionNotes}</p>
            </div>
          )}

          <p className="text-[11.5px] text-text-secondary mb-3.5">
            {agg.overrideTriggered && 'Override triggered — severity set to maximum. '}
            {agg.discrepancy && 'High discrepancy — clarification required. '}
            Calculated: {fmt(calculated)}
            {isCalibrated && <span style={{ color: '#4C6FFF' }}> · Calibrated: {fmt(cal.calibrated_value)}</span>}
          </p>

          {isReviewedWithOwner && (
            <div className="rounded-lg px-3 py-2.5 mb-3.5 flex items-center justify-between" style={{ background: 'rgba(94,217,150,0.1)', border: '1px solid rgba(94,217,150,0.3)' }}>
              <p className="text-[11.5px]" style={{ color: '#5ED996' }}>✓ Reviewed with owner at {fmt(currentValue)} · {cal.reviewed_with_owner_at ? new Date(cal.reviewed_with_owner_at).toLocaleDateString() : ''}</p>
              <button onClick={toggleReviewedWithOwner} disabled={busy || locked} className="text-[11px] text-text-secondary hover:text-text-primary shrink-0 disabled:opacity-40">Unmark</button>
            </div>
          )}

          {flagged && (
            <div className="grid grid-cols-2 gap-3 mb-3.5">
              <div>
                <p className="text-[10.5px] text-text-secondary mb-1">OWNER</p>
                <input defaultValue={cal?.owner ?? ''} onBlur={(e) => setField('owner', e.target.value)} disabled={locked} className="w-full bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none disabled:opacity-50" />
              </div>
              <div>
                <p className="text-[10.5px] text-text-secondary mb-1">MODERATOR (should differ from owner)</p>
                <input defaultValue={cal?.moderator ?? ''} onBlur={(e) => setField('moderator', e.target.value)} disabled={locked} className={`w-full bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none border disabled:opacity-50 ${moderatorBlocked ? 'border-badge-amber' : 'border-transparent'}`} />
                {moderatorBlocked && <p className="text-[10.5px] text-badge-amber mt-1">Moderator matches the IRO owner — a warning, not a block; consider a different reviewer.</p>}
              </div>
            </div>
          )}

          {!hasImpactAxis(iro.iroType) && (
            <div className="mb-3.5">
              <p className="text-[10.5px] text-text-secondary mb-1.5">MAGNITUDE BAND</p>
              <div className="flex gap-1.5 flex-wrap">
                {MAGNITUDE_BANDS.map((b) => (
                  <button key={b.value} onClick={() => setBandValue(b.value)} disabled={busy || locked} className={`text-[11px] rounded-md px-2.5 py-1.5 disabled:opacity-40 ${cal?.band_value === b.value ? 'bg-emerald text-app-black font-semibold' : 'border border-border-apus text-text-secondary'}`}>
                    {b.label} · {b.value}
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="mb-3.5">
              <p className="text-[10.5px] font-semibold text-text-secondary mb-2">CHANGE HISTORY</p>
              <div className="flex flex-col gap-2">
                {[...history].reverse().map((h) => (
                  <div key={h.id} className="bg-app-black rounded-lg px-3 py-2.5">
                    <div className="flex items-center gap-2 text-[12px] mb-1">
                      <span className="text-text-secondary">{fmt(h.from_value)}</span>
                      <span className="text-text-secondary">→</span>
                      <span className="font-semibold" style={{ color: '#4C6FFF' }}>{fmt(h.to_value)}</span>
                      <span className="text-[10px] text-text-secondary ml-auto">{new Date(h.changed_at).toLocaleString()}</span>
                    </div>
                    {h.notes && <p className="text-[11.5px] text-text-secondary">{h.notes}</p>}
                    <p className="text-[10.5px] text-text-secondary mt-1">Changed by {h.changed_by}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-[11.5px] text-badge-amber mb-2">{error}</p>}

          {!adjusting ? (
            <div className="flex gap-2 flex-wrap">
              <button onClick={openAdjust} disabled={locked || busy} className="text-[12px] border border-border-apus rounded-lg px-3 py-1.5 disabled:opacity-40">
                {isCalibrated ? 'Edit calibration' : 'Adjust this topic'}
              </button>
              {isCalibrated && (
                <button onClick={resetToCalculated} disabled={locked || busy} className="text-[12px] text-text-secondary px-3 py-1.5 disabled:opacity-40">↺ Reset to calculated</button>
              )}
              {!isReviewedWithOwner && (
                <button onClick={toggleReviewedWithOwner} disabled={locked || busy} className="text-[12px] font-semibold rounded-lg px-3 py-1.5 ml-auto disabled:opacity-40" style={{ background: '#5ED996', color: '#07070B' }}>✓ Reviewed with owner</button>
              )}
            </div>
          ) : (
            <div className="bg-app-black rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <p className="text-[10.5px] text-text-secondary">CALIBRATED VALUE</p>
                <input type="range" min="0" max="5" step="0.1" value={draftValue} onChange={(e) => setDraftValue(parseFloat(e.target.value))} className="w-full apus-slider" style={{ accentColor: '#4C6FFF', color: '#4C6FFF' }} />
                <span className="text-[13px] font-bold w-10 text-right" style={{ color: '#4C6FFF' }}>{draftValue.toFixed(1)}</span>
              </div>
              <p className="text-[10.5px] text-text-secondary mb-1">NOTES (why does this differ from the calculated value?)</p>
              <textarea value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} className="w-full bg-surface-2 rounded-lg px-3 py-2 text-[12px] outline-none min-h-[60px] mb-3" placeholder="Explain the group's reasoning…" />
              <div className="flex gap-2">
                <button onClick={saveAdjustment} disabled={busy} className="text-[12px] font-semibold rounded-lg px-3 py-1.5" style={{ background: '#4C6FFF', color: '#07070B' }}>Save calibration</button>
                <button onClick={() => setAdjusting(false)} className="text-[12px] text-text-secondary px-3 py-1.5">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { aggregateIro, hasImpactAxis, MAGNITUDE_BANDS, CALC_METHODOLOGY_VERSION } from '../lib/calc';
import { PILLAR_COLOR, ESRS_TOPICS, TYPE_LABEL, TYPE_COLOR } from '../lib/topics';
import { CalibrationIcon } from './icons';
import DmaMascot from './DmaMascot';

export default function CalibrationScreen({ iros, calibrations, setCalibrations, assessments = [] }) {
  const [openId, setOpenId] = useState(null);
  const [assessmentFilter, setAssessmentFilter] = useState('all');

  const scopedIros = assessmentFilter === 'all'
    ? iros
    : iros.filter((iro) => assessments.find((a) => a.id === assessmentFilter)?.iroIds?.includes(iro.id));

  const flagged = scopedIros.filter((iro) => {
    const agg = aggregateIro(iro);
    return agg.overrideTriggered || agg.discrepancy;
  });

  if (!iros.length) {
    return (
      <div>
        <DmaMascot title="What is calibration?">
          <p className="mb-2">
            Ratings — especially from a broad questionnaire — rarely agree perfectly. Calibration is where leadership or subject-matter experts review the calculated results together and decide whether any need adjusting.
          </p>
          <p>
            The original calculated value is always kept, and any change needs a stated reason — nothing is overwritten silently.
          </p>
        </DmaMascot>
        <h2 className="text-[24px] font-bold text-white mb-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg, #E8B26B, #D79A4C)', boxShadow: '0 6px 14px -4px rgba(0,0,0,0.4)' }}>
            <CalibrationIcon size={19} />
          </span>
          Calibration
        </h2>
        <div className="bg-surface rounded-2xl p-10 text-center text-text-secondary text-[13px]">Complete a qualitative assessment first.</div>
      </div>
    );
  }

  return (
    <div>
      <DmaMascot title="What is calibration?">
        <p className="mb-2">
          Ratings — especially from a broad questionnaire — rarely agree perfectly. Calibration is where leadership or subject-matter experts review the calculated results together and decide whether any need adjusting.
        </p>
        <p>
          The original calculated value is always kept, and any change needs a stated reason — nothing is overwritten silently.
        </p>
      </DmaMascot>

      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[24px] font-bold text-white flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg, #E8B26B, #D79A4C)', boxShadow: '0 6px 14px -4px rgba(0,0,0,0.4)' }}>
            <CalibrationIcon size={19} />
          </span>
          Calibration
        </h2>
        {assessments.length > 0 && (
          <select
            value={assessmentFilter}
            onChange={(e) => setAssessmentFilter(e.target.value)}
            className="bg-surface border border-border-apus rounded-lg px-3 py-1.5 text-[11.5px] outline-none"
          >
            <option value="all">All assessments</option>
            {assessments.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}
      </div>
      <p className="text-[12px] text-text-secondary mb-1">
        This step is done together with leadership or subject-matter experts — review the calculated results and adjust only where the group agrees it's needed.
      </p>
      <p className="text-[12px] text-text-secondary mb-5">
        {flagged.length} of {scopedIros.length} topics are flagged for a closer look — override triggered, or ratings diverged.
      </p>
      <div className="flex flex-col gap-2 bg-surface rounded-2xl p-2">
        {scopedIros.map((iro) => (
          <CalibrationAccordionRow
            key={iro.id}
            iro={iro}
            isOpen={openId === iro.id}
            onToggle={() => setOpenId((id) => (id === iro.id ? null : iro.id))}
            calibration={calibrations[iro.id]}
            onChange={(c) => setCalibrations((prev) => ({ ...prev, [iro.id]: c }))}
          />
        ))}
      </div>
    </div>
  );
}

function CalibrationAccordionRow({ iro, isOpen, onToggle, calibration, onChange }) {
  const agg = aggregateIro(iro);
  const calculated = hasImpactAxis(iro.iroType) ? agg.impactScore : agg.financialScore;
  const cal = calibration ?? { owner: iro.assessments[0]?.assessor ?? '', moderator: '', calibratedValue: null, notes: '', bandValue: null, history: [], signedOffBy: null, signedOffAt: null };
  const history = cal.history ?? [];
  const topic = ESRS_TOPICS.find((t) => t.id === iro.topic);
  const pillar = PILLAR_COLOR[topic?.cat] ?? PILLAR_COLOR.E;

  const [adjusting, setAdjusting] = useState(false);
  const [draftValue, setDraftValue] = useState(cal.calibratedValue ?? calculated ?? 2.5);
  const [draftNotes, setDraftNotes] = useState('');
  const [signing, setSigning] = useState(false);
  const [signerName, setSignerName] = useState('');

  const flagged = agg.overrideTriggered || agg.discrepancy;
  const moderatorBlocked = cal.moderator && cal.moderator === cal.owner;
  const isCalibrated = cal.calibratedValue !== null && cal.calibratedValue !== undefined;
  const isSignedOff = !!cal.signedOffBy;

  function update(patch) {
    onChange({ ...cal, ...patch });
  }

  function openAdjust() {
    setDraftValue(cal.calibratedValue ?? calculated ?? 2.5);
    setDraftNotes('');
    setAdjusting(true);
  }

  function saveAdjustment() {
    const fromValue = isCalibrated ? cal.calibratedValue : calculated;
    if (!window.confirm(`Are you sure you want to calibrate this result?\n\n"${iro.name}" will change from ${fromValue !== null ? fromValue.toFixed(1) : 'not yet rated'} to ${draftValue.toFixed(1)}.`)) {
      return;
    }
    // Every change is appended, never overwritten — the full old-to-new
    // trail stays visible, and sign-off is invalidated since the number
    // it approved no longer holds.
    const entry = { fromValue, toValue: draftValue, notes: draftNotes, changedBy: cal.moderator || cal.owner || 'Unspecified', changedAt: Date.now() };
    update({ calibratedValue: draftValue, notes: draftNotes, calibratedAt: Date.now(), history: [...history, entry], signedOffBy: null, signedOffAt: null });
    setAdjusting(false);
  }

  function resetToCalculated() {
    if (!window.confirm('Reset to the calculated value? The history trail is kept.')) return;
    const entry = { fromValue: cal.calibratedValue, toValue: calculated, notes: 'Reset to calculated value', changedBy: cal.moderator || cal.owner || 'Unspecified', changedAt: Date.now() };
    update({ calibratedValue: null, history: [...history, entry], signedOffBy: null, signedOffAt: null });
  }

  function confirmSignOff() {
    if (!signerName.trim()) return;
    update({ signedOffBy: signerName.trim(), signedOffAt: Date.now() });
    setSigning(false);
    setSignerName('');
  }

  function revokeSignOff() {
    if (window.confirm('Revoke sign-off? This topic will need re-approval before it counts as finalized.')) {
      update({ signedOffBy: null, signedOffAt: null });
    }
  }

  const currentValue = isCalibrated ? cal.calibratedValue : calculated;

  return (
    <div className="rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
        style={{ background: pillar.bg }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[9.5px] font-semibold rounded px-1.5 py-0.5" style={{ color: pillar.text, background: '#07070B' }}>{topic?.id ?? '–'}</span>
          <span className="text-[12.5px] font-semibold" style={{ color: pillar.text }}>{iro.name}</span>
          {flagged && <span className="text-[9.5px] font-semibold rounded-full px-2 py-0.5 border border-text-secondary text-text-secondary">Needs review</span>}
          {isCalibrated && <span className="text-[9.5px] font-semibold rounded-full px-2 py-0.5" style={{ background: '#07070B', color: '#4C6FFF' }}>Calibrated</span>}
          {isSignedOff && <span className="text-[9.5px] font-semibold rounded-full px-2 py-0.5 flex items-center gap-1" style={{ background: '#07070B', color: '#5ED996' }}>✓ Signed off</span>}
        </div>
        <span className="text-[11px]" style={{ color: pillar.text }}>{calculated !== null ? calculated.toFixed(1) : '–'} {isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="bg-surface-2 p-4">
          <div className="flex justify-between items-start mb-3.5">
            <span className="text-[10px] font-semibold rounded px-1.5 py-0.5" style={{ color: TYPE_COLOR[iro.iroType].text, background: TYPE_COLOR[iro.iroType].bg }}>
              {TYPE_LABEL[iro.iroType]}
            </span>
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
            Calculated: {calculated !== null ? calculated.toFixed(1) : '–'}
            {isCalibrated && <span style={{ color: '#4C6FFF' }}> · Calibrated: {cal.calibratedValue.toFixed(1)}</span>}
          </p>

          {isSignedOff && (
            <div className="rounded-lg px-3 py-2.5 mb-3.5 flex items-center justify-between" style={{ background: 'rgba(94,217,150,0.1)', border: '1px solid rgba(94,217,150,0.3)' }}>
              <p className="text-[11.5px]" style={{ color: '#5ED996' }}>
                ✓ Signed off by <b>{cal.signedOffBy}</b> at {currentValue !== null ? currentValue.toFixed(1) : '–'} · {new Date(cal.signedOffAt).toLocaleDateString()}
              </p>
              <button onClick={revokeSignOff} className="text-[11px] text-text-secondary hover:text-text-primary shrink-0">Revoke</button>
            </div>
          )}

          {flagged && (
            <div className="grid grid-cols-2 gap-3 mb-3.5">
              <div>
                <p className="text-[10.5px] text-text-secondary mb-1">OWNER</p>
                <input
                  value={cal.owner}
                  onChange={(e) => update({ owner: e.target.value })}
                  className="w-full bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none"
                />
              </div>
              <div>
                <p className="text-[10.5px] text-text-secondary mb-1">MODERATOR (must differ from owner)</p>
                <input
                  value={cal.moderator}
                  onChange={(e) => update({ moderator: e.target.value })}
                  className={`w-full bg-app-black rounded-lg px-3 py-2 text-[12.5px] outline-none border ${moderatorBlocked ? 'border-badge-amber' : 'border-transparent'}`}
                />
                {moderatorBlocked && <p className="text-[10.5px] text-badge-amber mt-1">Moderator cannot match the IRO owner — assign a different reviewer.</p>}
              </div>
            </div>
          )}

          {!hasImpactAxis(iro.iroType) && (
            <div className="mb-3.5">
              <p className="text-[10.5px] text-text-secondary mb-1.5">MAGNITUDE BAND</p>
              <div className="flex gap-1.5 flex-wrap">
                {MAGNITUDE_BANDS.map((b) => (
                  <button
                    key={b.value}
                    onClick={() => update({ bandValue: b.value })}
                    className={`text-[11px] rounded-md px-2.5 py-1.5 ${cal.bandValue === b.value ? 'bg-emerald text-app-black font-semibold' : 'border border-border-apus text-text-secondary'}`}
                  >
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
                {[...history].reverse().map((h, i) => (
                  <div key={i} className="bg-app-black rounded-lg px-3 py-2.5">
                    <div className="flex items-center gap-2 text-[12px] mb-1">
                      <span className="text-text-secondary">{h.fromValue !== null && h.fromValue !== undefined ? h.fromValue.toFixed(1) : '–'}</span>
                      <span className="text-text-secondary">→</span>
                      <span className="font-semibold" style={{ color: '#4C6FFF' }}>{h.toValue.toFixed(1)}</span>
                      <span className="text-[10px] text-text-secondary ml-auto">{new Date(h.changedAt).toLocaleString()}</span>
                    </div>
                    {h.notes && <p className="text-[11.5px] text-text-secondary">{h.notes}</p>}
                    <p className="text-[10.5px] text-text-secondary mt-1">Changed by {h.changedBy}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!adjusting && !signing ? (
            <div className="flex gap-2 flex-wrap">
              <button onClick={openAdjust} disabled={isSignedOff} className="text-[12px] border border-border-apus rounded-lg px-3 py-1.5 disabled:opacity-40">
                {isCalibrated ? 'Edit calibration' : 'Adjust this topic'}
              </button>
              {isCalibrated && (
                <button onClick={resetToCalculated} disabled={isSignedOff} className="text-[12px] text-text-secondary px-3 py-1.5 disabled:opacity-40">
                  ↺ Reset to calculated
                </button>
              )}
              {!isSignedOff && (
                <button onClick={() => setSigning(true)} className="text-[12px] font-semibold rounded-lg px-3 py-1.5 ml-auto" style={{ background: '#5ED996', color: '#07070B' }}>
                  ✓ Sign off this result
                </button>
              )}
            </div>
          ) : signing ? (
            <div className="bg-app-black rounded-xl p-4">
              <p className="text-[11.5px] text-text-secondary mb-2.5">
                This confirms the result at <b className="text-text-primary">{currentValue !== null ? currentValue.toFixed(1) : '–'}</b> is approved as final. Editing or resetting the calibration later will revoke this sign-off automatically.
              </p>
              <p className="text-[10.5px] text-text-secondary mb-1">YOUR NAME (real sign-in comes later)</p>
              <input
                value={signerName} onChange={(e) => setSignerName(e.target.value)}
                placeholder="Full name" autoFocus
                className="w-full bg-surface-2 rounded-lg px-3 py-2 text-[12.5px] outline-none mb-3"
              />
              <div className="flex gap-2">
                <button onClick={confirmSignOff} disabled={!signerName.trim()} className="text-[12px] font-semibold rounded-lg px-3 py-1.5 disabled:opacity-40" style={{ background: '#5ED996', color: '#07070B' }}>
                  Confirm sign-off
                </button>
                <button onClick={() => setSigning(false)} className="text-[12px] text-text-secondary px-3 py-1.5">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="bg-app-black rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <p className="text-[10.5px] text-text-secondary">CALIBRATED VALUE</p>
                <input
                  type="range" min="0" max="5" step="0.1"
                  value={draftValue}
                  onChange={(e) => setDraftValue(parseFloat(e.target.value))}
                  className="w-full apus-slider"
                  style={{ accentColor: '#4C6FFF', color: '#4C6FFF' }}
                />
                <span className="text-[13px] font-bold w-10 text-right" style={{ color: '#4C6FFF' }}>{draftValue.toFixed(1)}</span>
              </div>
              <p className="text-[10.5px] text-text-secondary mb-1">NOTES (why does this differ from the calculated value?)</p>
              <textarea
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                className="w-full bg-surface-2 rounded-lg px-3 py-2 text-[12px] outline-none min-h-[60px] mb-3"
                placeholder="Explain the group's reasoning…"
              />
              <div className="flex gap-2">
                <button onClick={saveAdjustment} className="text-[12px] font-semibold rounded-lg px-3 py-1.5" style={{ background: '#4C6FFF', color: '#07070B' }}>
                  Save calibration
                </button>
                <button onClick={() => setAdjusting(false)} className="text-[12px] text-text-secondary px-3 py-1.5">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

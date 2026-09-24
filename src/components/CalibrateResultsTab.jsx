import { useState } from 'react';
import ResultsScreen from './ResultsScreen';
import CalibrationTab from './CalibrationTab';
import { CalibrationIcon } from './icons';

const ESRS_LABEL = { esrs_2023_amended: 'ESRS 2023 as amended', esrs_2026: 'ESRS 2026' };

// Section 8, Calibrate & Results workspace (v2.0 amended 9): "only the
// financial year and the filters... that persist across the three tabs.
// There is no global stage banner, no global sign-off, no 'require both
// sources' setting and no Start calibration or Revoke controls — sign-off
// is per IRO, as in the prototype." This header is now purely
// informational — client/financial year/ESRS version/thresholds, and a
// Provisional/Final label computed from whether every IRO has been signed
// off (not the retired cycles.stage column, never read here).
function WorkspaceHeader({ cycle, allSignedOff }) {
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
export default function CalibrateResultsTab({ iros, thresholds, cycle, userId, onChanged, initialSub = 'results', readOnly }) {
  const [sub, setSub] = useState(initialSub);
  const [activeCats, setActiveCats] = useState(['E', 'S', 'G']);
  const [showMaterial, setShowMaterial] = useState(true);
  const [showNotMaterial, setShowNotMaterial] = useState(true);

  const allSignedOff = iros.length > 0 && iros.every((iro) => iro.calibration?.reviewed_with_owner);

  return (
    <div>
      <h2 className="text-[24px] font-bold flex items-center gap-3 mb-1">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #E8B26B, #D79A4C)' }}>
          <CalibrationIcon size={19} />
        </span>
        Calibrate &amp; Results
      </h2>
      <p className="text-[12px] text-text-secondary mb-4">One workspace — results as calculated, and calibration where the group agrees an adjustment is needed.</p>

      {cycle && <WorkspaceHeader cycle={cycle} allSignedOff={allSignedOff} />}

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
        <CalibrationTab iros={iros} thresholds={thresholds} cycleId={cycle?.id ?? null} userId={userId} onChanged={onChanged} activeCats={activeCats} showMaterial={showMaterial} showNotMaterial={showNotMaterial} readOnly={readOnly} />
      )}
    </div>
  );
}

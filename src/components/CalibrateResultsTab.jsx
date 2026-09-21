import { useState } from 'react';
import ResultsTab from './ResultsTab';
import CalibrationTab from './CalibrationTab';
import { CalibrationIcon } from './icons';

// Section 8: "calibration and results merge into one Calibrate & Results
// workspace". This wraps the existing Results/Calibration screens (still
// their session-1 shape — the full redesigned workspace with the shared
// header, Matrix tab and persistent filters is separate, later work) under
// one nav destination with an internal switcher, so the nav item count
// matches the spec's six process steps.
export default function CalibrateResultsTab({ iros, thresholds, cycleId, locked, onChanged, initialSub = 'results' }) {
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
        <CalibrationTab iros={iros} thresholds={thresholds} cycleId={cycleId} locked={locked} onChanged={onChanged} />
      )}
    </div>
  );
}

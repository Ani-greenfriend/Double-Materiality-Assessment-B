import { useState } from 'react';
import { PILLAR_COLOR, ESRS_TOPICS, TYPE_LABEL, TYPE_COLOR } from '../lib/topics';
import {
  hasImpactAxis, SCALE_LABELS, SCOPE_LABELS, IRREMEDIABILITY_LABELS,
  IMPACT_LIKELIHOOD_LABELS, FINANCIAL_LIKELIHOOD_LABELS, RISK_MAGNITUDE_LABELS, OPPORTUNITY_MAGNITUDE_LABELS,
} from '../lib/calc';

function DescriptionInfo({ description }) {
  const [open, setOpen] = useState(false);
  if (!description) return null;
  return (
    <span className="relative inline-flex items-center ml-1.5" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <span className="w-4 h-4 rounded-full border border-text-secondary text-text-secondary text-[9px] flex items-center justify-center cursor-default select-none">i</span>
      {open && (
        <div className="absolute left-0 top-full mt-2 z-20 w-60 bg-surface-2 border border-border-apus rounded-xl p-2.5 text-[11px] leading-snug shadow-lg">
          {description}
        </div>
      )}
    </span>
  );
}

function DotCell({ labels, value, onChange, disabled }) {
  const [hoverVal, setHoverVal] = useState(null);
  return (
    <div className="relative flex gap-1.5 justify-center">
      {hoverVal !== null && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-surface-2 border border-border-apus rounded-lg px-2 py-1 text-[10px] whitespace-nowrap z-10 shadow-lg">
          <b>{hoverVal}</b> — {labels[hoverVal]}
        </div>
      )}
      {[0, 1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          type="button"
          disabled={disabled}
          onMouseEnter={() => !disabled && setHoverVal(v)}
          onMouseLeave={() => setHoverVal(null)}
          onClick={() => onChange(v)}
          className="w-4 h-4 rounded-full border transition-colors"
          style={{
            borderColor: disabled ? '#2A2830' : value === v ? '#4C6FFF' : '#3A3840',
            background: !disabled && value === v ? '#4C6FFF' : 'transparent',
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.3 : 1,
          }}
        />
      ))}
    </div>
  );
}

const COLUMNS_FOR = {
  neg_impact: [
    { key: 'scale', label: 'Scale', labels: SCALE_LABELS },
    { key: 'scope', label: 'Scope', labels: SCOPE_LABELS },
    { key: 'irreversibility', label: 'Irremediability', labels: IRREMEDIABILITY_LABELS },
    { key: 'likelihood', label: 'Likelihood', labels: IMPACT_LIKELIHOOD_LABELS },
  ],
  pos_impact: [
    { key: 'scale', label: 'Scale', labels: SCALE_LABELS },
    { key: 'scope', label: 'Scope', labels: SCOPE_LABELS },
    { key: 'irreversibility', label: 'Irremediability', labels: IRREMEDIABILITY_LABELS, disabled: true },
    { key: 'likelihood', label: 'Likelihood', labels: IMPACT_LIKELIHOOD_LABELS },
  ],
  risk: [
    { key: 'magnitude', label: 'Magnitude', labels: RISK_MAGNITUDE_LABELS },
    { key: 'financialLikelihood', label: 'Likelihood', labels: FINANCIAL_LIKELIHOOD_LABELS },
  ],
  opportunity: [
    { key: 'magnitude', label: 'Magnitude', labels: OPPORTUNITY_MAGNITUDE_LABELS },
    { key: 'financialLikelihood', label: 'Likelihood', labels: FINANCIAL_LIKELIHOOD_LABELS },
  ],
};

const ALL_COLUMNS = [
  { key: 'scale', label: 'Scale' },
  { key: 'scope', label: 'Scope' },
  { key: 'irreversibility', label: 'Irremediability' },
  { key: 'likelihood', label: 'Likelihood' },
  { key: 'magnitude', label: 'Magnitude' },
  { key: 'financialLikelihood', label: 'Fin. Likelihood' },
];

export default function QuantAssessmentGrid({ perspectiveFilter, iros, onFinish, topicOverrides = {}, mandatory = false }) {
  const relevantIros = iros.filter((i) => {
    if (perspectiveFilter === 'impact') return hasImpactAxis(i.iroType);
    if (perspectiveFilter === 'financial') return !hasImpactAxis(i.iroType);
    return true; // full
  });
  const isFull = perspectiveFilter === 'full';
  const headerColumns = isFull ? ALL_COLUMNS : perspectiveFilter === 'impact' ? COLUMNS_FOR.neg_impact : COLUMNS_FOR.risk;

  const [ratings, setRatings] = useState(() => {
    const init = {};
    relevantIros.forEach((iro) => { init[iro.id] = {}; });
    return init;
  });

  if (!relevantIros.length) {
    return <div className="bg-surface rounded-2xl p-10 text-center text-text-secondary text-[13px]">No matching IROs in this upload for the selected scope.</div>;
  }

  function setCell(iroId, key, val) {
    setRatings((prev) => ({ ...prev, [iroId]: { ...prev[iroId], [key]: val } }));
  }

  function isRowComplete(iro) {
    const rowCriteria = COLUMNS_FOR[iro.iroType].filter((c) => !c.disabled);
    return rowCriteria.every((c) => ratings[iro.id]?.[c.key] !== undefined);
  }

  const incompleteIros = relevantIros.filter((iro) => !isRowComplete(iro));
  const proceedBlocked = mandatory && incompleteIros.length > 0;

  return (
    <div>
      <p className="text-[12px] text-text-secondary mb-4">
        Click a dot per criterion for each topic — hover a dot to see what it means. This is the quantitative, spreadsheet-style rating pass.
        {mandatory && <span> Every topic requires an answer before you can submit.</span>}
      </p>

      <div className="bg-surface rounded-2xl p-4 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[10.5px] text-text-secondary font-medium pb-3 pr-4">Topics</th>
              {headerColumns.map((c) => (
                <th key={c.key} className="text-[10.5px] text-text-secondary font-medium pb-3 px-2 text-center">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {relevantIros.map((iro) => {
              const topic = ESRS_TOPICS.find((t) => t.id === iro.topic);
              const pillar = PILLAR_COLOR[topic?.cat] ?? PILLAR_COLOR.E;
              const rowCriteria = COLUMNS_FOR[iro.iroType];
              const rowIncomplete = mandatory && !isRowComplete(iro);
              return (
                <tr key={iro.id} className="border-t border-border-apus" style={rowIncomplete ? { background: 'rgba(215,154,76,0.05)' } : undefined}>
                  <td className="py-2.5 pr-4">
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1.5">
                        {rowIncomplete && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#D79A4C' }} title="Not yet complete" />}
                        <span className="text-[9.5px] font-semibold rounded px-1.5 py-0.5" style={{ color: pillar.text, background: pillar.bg }}>{topic?.id ?? '–'}</span>
                        <span className="text-[11.5px] font-medium text-text-primary">{topicOverrides[iro.id]?.name ?? iro.name}</span>
                        <DescriptionInfo description={topicOverrides[iro.id]?.description ?? iro.description} />
                      </span>
                      <span className="flex gap-1">
                        <span className="text-[9.5px] font-semibold rounded px-1.5 py-0.5 w-fit" style={{ color: TYPE_COLOR[iro.iroType].text, background: TYPE_COLOR[iro.iroType].bg }}>
                          {TYPE_LABEL[iro.iroType]}
                        </span>
                        <span className="text-[9.5px] font-medium rounded px-1.5 py-0.5 w-fit border border-text-secondary text-text-secondary">
                          {iro.actual ? 'Actual' : 'Potential'}
                        </span>
                      </span>
                    </div>
                  </td>
                  {headerColumns.map((headerCol) => {
                    const c = rowCriteria.find((rc) => rc.key === headerCol.key);
                    return (
                      <td key={headerCol.key} className="py-2.5 px-2">
                        {c ? (
                          <DotCell
                            labels={c.labels}
                            value={ratings[iro.id]?.[c.key]}
                            disabled={c.disabled}
                            onChange={(v) => setCell(iro.id, c.key, v)}
                          />
                        ) : (
                          <div className="flex gap-1.5 justify-center opacity-20">
                            {[0, 1, 2, 3, 4, 5].map((v) => (
                              <span key={v} className="w-4 h-4 rounded-full border" style={{ borderColor: '#2A2830' }} />
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {proceedBlocked && (
        <p className="text-[11.5px] mt-3" style={{ color: '#D79A4C' }}>
          {incompleteIros.length} topic{incompleteIros.length > 1 ? 's' : ''} still need{incompleteIros.length === 1 ? 's' : ''} an answer — marked with a dot above.
        </p>
      )}
      <button
        onClick={() => onFinish(ratings, relevantIros)}
        disabled={proceedBlocked}
        className="text-[13px] font-semibold rounded-xl px-6 py-3 mt-3 disabled:opacity-40"
        style={{ background: '#4C6FFF', color: '#F5F6FA' }}
      >
        Proceed →
      </button>
    </div>
  );
}

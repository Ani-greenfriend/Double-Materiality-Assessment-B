// Anchor labels — per the official reference scale definitions
export const SCALE_LABELS = ['None', 'Minimal', 'Low', 'Medium', 'High', 'Very High'];
export const SCOPE_LABELS = ['None', 'Local', 'Regional', 'National', 'Continental', 'Global'];
export const IRREMEDIABILITY_LABELS = ['None', 'Easily remediable', 'Remediable with cost', 'Difficult', 'Very difficult', 'Irreversible'];
export const IMPACT_LIKELIHOOD_LABELS = ['None', 'Very unlikely & long-term', 'Unlikely & long-term', 'Likely & mid-term', 'Probable & short-term', 'Certain or already occurred'];
export const FINANCIAL_LIKELIHOOD_LABELS = ['None', 'Very unlikely & long-term', 'Unlikely & long-term', 'Likely & medium-term', 'Likely & short-term', 'Certain or already occurred'];
export const RISK_MAGNITUDE_LABELS = ['None', 'Minimal', 'Noticeable impact', 'Impact on business', 'High financial loss', 'Threat to operations'];
export const OPPORTUNITY_MAGNITUDE_LABELS = ['None', 'Minimal', 'Noticeable financial opportunity', 'Positive impact on business', 'High financial gains', 'Growth opportunity of significance'];
// Backward-compat alias used by a couple of older call sites
export const LIKELIHOOD_LABELS = IMPACT_LIKELIHOOD_LABELS;
export const MAGNITUDE_LABELS = RISK_MAGNITUDE_LABELS;
export const CALC_METHODOLOGY_VERSION = 'severity-avg-with-override-v1';

export const MAGNITUDE_BANDS = [
  { max: 0.5, value: 1, label: '< 0.5% of EBITDA' },
  { max: 1, value: 2, label: '0.5–1% of EBITDA' },
  { max: 2.5, value: 3, label: '1–2.5% of EBITDA' },
  { max: 5, value: 4, label: '2.5–5% of EBITDA' },
  { max: Infinity, value: 5, label: '> 5% of EBITDA' },
];

function avg(nums) {
  const vals = nums.filter((n) => n !== null && n !== undefined && !Number.isNaN(n));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function hasImpactAxis(iroType) {
  return iroType === 'neg_impact' || iroType === 'pos_impact';
}

// Severity for ONE assessment row (one assessor's rating of one IRO)
export function assessmentSeverity(iro, a) {
  if (iro.iroType === 'neg_impact') {
    const dims = [a.scale, a.scope, a.irreversibility];
    if (dims.some((d) => d === 5)) return 5; // override — precautionary principle
    return avg(dims);
  }
  if (iro.iroType === 'pos_impact') {
    return avg([a.scale, a.scope]); // no irreversibility, no override
  }
  return null; // risk/opportunity has no impact-axis severity
}

// Likelihood is captured on the same 0-5 scale as every other criterion
// (for a consistent input UX), but the materiality formula needs it as a
// 0-1 probability fraction — converted here, once, at the point of use.
export function assessmentImpactScore(iro, a) {
  const severity = assessmentSeverity(iro, a);
  if (severity === null) return null;
  // Prefer the answered value; only default actual impacts to maximum when no value was ever collected
  // (e.g. data arriving without a likelihood question at all) — the live questionnaire always asks it now.
  const rawLikelihood = a.likelihood ?? (iro.actual ? 5 : null);
  if (rawLikelihood === null) return severity; // not possible to rate likelihood — show severity unscaled, flagged upstream
  return severity * (rawLikelihood / 5);
}

export function assessmentFinancialScore(a) {
  if (a.magnitude === null || a.magnitude === undefined || a.financialLikelihood === null || a.financialLikelihood === undefined) {
    return null;
  }
  return a.magnitude * (a.financialLikelihood / 5); // no override — symmetric, expected-value approach
}

// Aggregate all assessment rows for one IRO
export function aggregateIro(iro) {
  const impactScores = iro.assessments.map((a) => assessmentImpactScore(iro, a)).filter((v) => v !== null);
  const financialScores = iro.assessments.map((a) => assessmentFinancialScore(a)).filter((v) => v !== null);

  const impactScore = hasImpactAxis(iro.iroType) ? avg(impactScores) : null;
  const financialScore = avg(financialScores);

  const spread = (arr) => (arr.length > 1 ? Math.max(...arr) - Math.min(...arr) : 0);
  const discrepancy = hasImpactAxis(iro.iroType)
    ? spread(impactScores) >= 1.5
    : spread(financialScores) >= 1.5;

  const overrideTriggered = hasImpactAxis(iro.iroType) && iro.assessments.some((a) => assessmentSeverity(iro, a) === 5 &&
    ((iro.iroType === 'neg_impact' && [a.scale, a.scope, a.irreversibility].includes(5))));

  const overrideDimension = overrideTriggered
    ? iro.assessments.flatMap((a) => {
        const dims = [];
        if (a.scale === 5) dims.push('scale');
        if (a.scope === 5) dims.push('scope');
        if (a.irreversibility === 5) dims.push('irremediability');
        return dims;
      })[0]
    : null;

  const isMaterial =
    (hasImpactAxis(iro.iroType) && impactScore !== null && impactScore >= iro.impactThreshold) ||
    (!hasImpactAxis(iro.iroType) && financialScore !== null && financialScore >= iro.financialThreshold);

  return {
    impactScore,
    financialScore,
    isMaterial,
    discrepancy,
    overrideTriggered,
    overrideDimension,
    n: iro.assessments.length,
  };
}

// Topic-level roll-up (Section 9, Step 4)
export function aggregateTopic(topicId, iros) {
  const topicIros = iros.filter((i) => i.topic === topicId);
  if (!topicIros.length) return null;
  const impactVals = topicIros.filter((i) => hasImpactAxis(i.iroType)).map((i) => aggregateIro(i).impactScore).filter((v) => v !== null);
  const financialVals = topicIros.filter((i) => !hasImpactAxis(i.iroType)).map((i) => aggregateIro(i).financialScore).filter((v) => v !== null);
  const impactScore = impactVals.length ? avg(impactVals) : 1; // no impact-type IRO on this topic — baseline, not assessed
  const financialScore = financialVals.length ? avg(financialVals) : 1; // no risk/opportunity IRO on this topic — baseline, not assessed
  const isMaterial = topicIros.some((i) => aggregateIro(i).isMaterial);
  return { topicId, impactScore, financialScore, isMaterial, iros: topicIros };
}

export function magnitudeBandFor(pct) {
  return MAGNITUDE_BANDS.find((b) => pct <= b.max) ?? MAGNITUDE_BANDS[MAGNITUDE_BANDS.length - 1];
}

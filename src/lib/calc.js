// Ported verbatim from reference-prototype/src/lib/calc.js per CLAUDE.md —
// this is the exact methodology from product-spec.md Section 9 and must not
// be re-derived. Field names on the `a` (assessment row) objects are
// camelCase to match the reference; src/lib/data.js maps the DB's
// snake_case assessor_ratings columns into this shape.
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

export function assessmentImpactScore(iro, a) {
  const severity = assessmentSeverity(iro, a);
  if (severity === null) return null;
  const rawLikelihood = a.likelihood ?? (iro.actual ? 5 : null);
  if (rawLikelihood === null) return severity;
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
  const impactScore = impactVals.length ? avg(impactVals) : 1;
  const financialScore = financialVals.length ? avg(financialVals) : 1;
  const isMaterial = topicIros.some((i) => aggregateIro(i).isMaterial);
  return { topicId, impactScore, financialScore, isMaterial, iros: topicIros };
}

export function magnitudeBandFor(pct) {
  return MAGNITUDE_BANDS.find((b) => pct <= b.max) ?? MAGNITUDE_BANDS[MAGNITUDE_BANDS.length - 1];
}

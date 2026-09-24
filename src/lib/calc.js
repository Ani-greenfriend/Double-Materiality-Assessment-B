// Ported from reference-prototype/src/lib/calc.js per CLAUDE.md, then the
// v2.0 changes from product-spec.md Section 9 applied: no financialLikelihood
// (a risk/opportunity's `likelihood` row IS the financial likelihood),
// potential-human-rights-impact IROs score on severity alone, and thresholds
// live on the cycle, not the IRO. Field names on the `a` (assessment row)
// objects are camelCase; src/lib/data.js maps the DB's snake_case
// combined_ratings rows into this shape.

// Anchor labels — restored verbatim from the prototype for the ported
// Questionnaire.jsx/AssessmentReviewHub.jsx screens, which display them
// as-is; purely descriptive text, unrelated to the v2.0
// scoring changes below. FINANCIAL_LIKELIHOOD_LABELS is still exported (its
// wording differs slightly from IMPACT_LIKELIHOOD_LABELS) for the same
// reason — the retired `financialLikelihood` *criterion key* only affects
// which DB column a value is stored under (see src/lib/data.js's mapping at
// the assessment-flow wrapper boundary), not which label text a risk or
// opportunity's likelihood axis shows.
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

export const CALC_METHODOLOGY_VERSION = 'severity-avg-with-override-v2';

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
  // Actual impacts and potential-human-rights-impact IROs are never asked
  // likelihood — severity alone, unscaled (Section 9: "severity takes precedence").
  if (iro.actual || iro.potentialHumanRightsImpact) return severity;
  const rawLikelihood = a.likelihood;
  if (rawLikelihood === null || rawLikelihood === undefined) return severity; // not recorded — show unscaled, flagged upstream
  return severity * (rawLikelihood / 5);
}

export function assessmentFinancialScore(a) {
  // Risks/opportunities have no separate financialLikelihood column — the
  // `likelihood` criterion IS the financial likelihood for these IRO types.
  if (a.magnitude === null || a.magnitude === undefined || a.likelihood === null || a.likelihood === undefined) {
    return null;
  }
  return a.magnitude * (a.likelihood / 5); // no override — symmetric, expected-value approach
}

// The effective value used for materiality: the calibrated value where one
// exists, otherwise the calculated score for the IRO's axis (Section 9).
export function effectiveValue(iro, { impactScore, financialScore }) {
  const calibrated = iro.calibration?.calibrated_value;
  if (calibrated !== null && calibrated !== undefined) return calibrated;
  return hasImpactAxis(iro.iroType) ? impactScore : financialScore;
}

// Aggregate all assessment rows for one IRO. `thresholds` is the cycle's
// { impact, financial } pair — thresholds live on the cycle, not the IRO.
// thresholds defaults to the cycle default (3.0/3.0) — restored prototype
// screens that only need assessor counts (e.g. Dashboard's progress %) call
// this with one argument, exactly as reference-prototype/ always did.
export function aggregateIro(iro, thresholds = { impact: 3.0, financial: 3.0 }) {
  const bySource = (source) => iro.assessments.filter((a) => a.source === source);
  const scoresFor = (rows) => ({
    impact: rows.map((a) => assessmentImpactScore(iro, a)).filter((v) => v !== null),
    financial: rows.map((a) => assessmentFinancialScore(a)).filter((v) => v !== null),
  });

  const all = scoresFor(iro.assessments);
  const impactScore = hasImpactAxis(iro.iroType) ? avg(all.impact) : null;
  const financialScore = avg(all.financial);

  const surveyScores = scoresFor(bySource('expert_survey'));
  const sessionScores = scoresFor(bySource('expert_live_session'));
  const axisScores = (s) => (hasImpactAxis(iro.iroType) ? s.impact : s.financial);
  const surveyAvg = surveyScores.impact.length || surveyScores.financial.length ? avg(axisScores(surveyScores)) : null;
  const sessionAvg = sessionScores.impact.length || sessionScores.financial.length ? avg(axisScores(sessionScores)) : null;
  const sourceBasis = surveyAvg !== null && sessionAvg !== null ? 'combined' : surveyAvg !== null ? 'survey only' : sessionAvg !== null ? 'session only' : 'unrated';
  const sourceGap = surveyAvg !== null && sessionAvg !== null && Math.abs(surveyAvg - sessionAvg) >= 1.5;

  const spread = (arr) => (arr.length > 1 ? Math.max(...arr) - Math.min(...arr) : 0);
  const assessorSpread = hasImpactAxis(iro.iroType) ? spread(all.impact) : spread(all.financial);
  const discrepancy = assessorSpread >= 1.5 || sourceGap;

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

  const effective = effectiveValue(iro, { impactScore, financialScore });
  const axisThreshold = hasImpactAxis(iro.iroType) ? thresholds.impact : thresholds.financial;
  const isMaterial = effective !== null && effective >= axisThreshold;

  return {
    impactScore,
    financialScore,
    effectiveValue: effective,
    surveyAvg,
    sessionAvg,
    sourceBasis,
    sourceGap,
    isMaterial,
    discrepancy,
    overrideTriggered,
    overrideDimension,
    n: iro.assessments.length,
  };
}

// Topic-level roll-up (Section 9, Step 4) — uses each IRO's effective value
// (calibrated where set, otherwise calculated).
export function aggregateTopic(topicId, iros, thresholds = { impact: 3.0, financial: 3.0 }) {
  const topicIros = iros.filter((i) => i.topic === topicId);
  if (!topicIros.length) return null;
  const pairs = topicIros.map((iro) => ({ iro, agg: aggregateIro(iro, thresholds) }));
  const impactVals = pairs.filter((p) => hasImpactAxis(p.iro.iroType)).map((p) => p.agg.effectiveValue).filter((v) => v !== null);
  const financialVals = pairs.filter((p) => !hasImpactAxis(p.iro.iroType)).map((p) => p.agg.effectiveValue).filter((v) => v !== null);
  const impactScore = impactVals.length ? avg(impactVals) : 1;
  const financialScore = financialVals.length ? avg(financialVals) : 1;
  const isMaterial = pairs.some((p) => p.agg.isMaterial);
  return { topicId, impactScore, financialScore, isMaterial, iros: topicIros };
}

export function magnitudeBandFor(pct) {
  return MAGNITUDE_BANDS.find((b) => pct <= b.max) ?? MAGNITUDE_BANDS[MAGNITUDE_BANDS.length - 1];
}

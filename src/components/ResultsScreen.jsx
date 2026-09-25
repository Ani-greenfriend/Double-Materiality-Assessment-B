import { useEffect, useMemo, useRef, useState } from 'react';
import { aggregateIro, aggregateTopic, hasImpactAxis, assessmentSeverity } from '../lib/calc';
import { ESRS_TOPICS, TYPE_LABEL, PILLAR_COLOR } from '../lib/topics';
import { ResultsIcon } from './icons';
import { updateCycleThresholds } from '../lib/data';
import DmaMascot from './DmaMascot';

function pillarOf(topicId) {
  return ESRS_TOPICS.find((t) => t.id === topicId)?.cat;
}
function pillarColor(topicId) {
  return PILLAR_COLOR[pillarOf(topicId)]?.text ?? '#8B8B98';
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Rasterizes an on-screen <svg> element to a PNG at 2x for crisp text, by
// serializing it (with its actual pixel size preserved), drawing it into an
// offscreen canvas via an Image, and reading the canvas back out as a PNG.
function svgToPngBlob(svgEl, scale = 2) {
  return new Promise((resolve, reject) => {
    const rect = svgEl.getBoundingClientRect();
    const clone = svgEl.cloneNode(true);
    clone.setAttribute('width', rect.width);
    clone.setAttribute('height', rect.height);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    // A solid background rect behind everything — otherwise PNG export is
    // transparent, which prints and pastes badly onto white documents.
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%'); bg.setAttribute('fill', '#07070B');
    clone.insertBefore(bg, clone.firstChild);
    const svgText = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = rect.width * scale; canvas.height = rect.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas export failed'))), 'image/png');
    };
    img.onerror = reject;
    img.src = url;
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function exportChartsAsPng(charts) {
  for (const { svgEl, filename } of charts) {
    if (!svgEl) continue;
    const blob = await svgToPngBlob(svgEl);
    downloadBlob(blob, filename);
  }
}

// Ported from reference-prototype/src/components/ResultsScreen.jsx. Kept
// verbatim except: (a) the builder's direct request to drop the "TOPIC
// SUMMARY" ESRS-topic cards; (b) a `thresholds` prop threaded into every
// aggregateIro call so isMaterial reflects the cycle's real threshold
// instead of the prototype's hardcoded default; (c) scoredIros reads
// `agg.effectiveValue` (v2.0's calc.js already prefers the calibrated value
// there) instead of a separate `calibrations` prop — there's no such
// separate map in the v2.0 shape, calibration is embedded per-iro and
// calc.js already resolves it; (d) financialPoints reads
// `a.likelihood`, not `a.financialLikelihood` — the latter was retired as
// a criterion key in v2.0 (a risk/opportunity's likelihood IS `likelihood`,
// same key as an impact IRO's); (e) PDF export dropped per CLAUDE.md's Arms
// section ("Results keeps the prototype's PNG and CSV downloads; the
// report builder is the PDF export") — CSV and PNG only; (f) the threshold
// number inputs are wired to a real Apply-with-reason flow (CLAUDE.md
// Business Rules: "editable at any time... via Apply with a reason logged
// to threshold_changes") instead of being a disconnected local preview —
// the prototype's own inputs never persisted anywhere, which is exactly
// why they could drift from the Calibrate & Results header's display; now
// both always read the same cycle-stored value, and the only way they
// differ is a live, unapplied edit in progress; (g) scoredIros no longer
// drops IROs with no score — every topic shows in the primary bar chart,
// unrated ones included, per the builder's direct request; an unrated bar
// renders at 0 width with a "–" label instead of being hidden; (h) the
// topic matrix (the third chart, plotting one dot per ESRS topic) was cut
// per the builder's direct request — this screen keeps only the bar chart
// and the two heatmaps, which plot every rated IRO directly. The E/S/G and
// material/not-material filters CalibrateResultsTab.jsx passes down are no
// longer used here (they still apply to CalibrationTab.jsx's row list).
export default function ResultsScreen({ iros, thresholds, cycle, userId, onChanged, readOnly }) {
  const [impactTh, setImpactTh] = useState(thresholds?.impact ?? 3.0);
  const [financialTh, setFinancialTh] = useState(thresholds?.financial ?? 3.0);
  const [thresholdReason, setThresholdReason] = useState('');
  const [thresholdBusy, setThresholdBusy] = useState(false);
  const [thresholdError, setThresholdError] = useState('');

  // Keep the draft in step with the persisted value — after a successful
  // Apply (below), or if it changed from anywhere else (another tab,
  // another session), the inputs snap back to matching the real number
  // rather than silently keeping a stale local copy.
  useEffect(() => { setImpactTh(thresholds?.impact ?? 3.0); }, [thresholds?.impact]);
  useEffect(() => { setFinancialTh(thresholds?.financial ?? 3.0); }, [thresholds?.financial]);

  const thresholdsDirty = impactTh !== (thresholds?.impact ?? 3.0) || financialTh !== (thresholds?.financial ?? 3.0);

  async function handleApplyThresholds() {
    if (readOnly) return;
    setThresholdBusy(true);
    setThresholdError('');
    try {
      await updateCycleThresholds({
        cycleId: cycle.id,
        oldImpact: thresholds?.impact ?? 3.0,
        newImpact: impactTh,
        oldFinancial: thresholds?.financial ?? 3.0,
        newFinancial: financialTh,
        reason: thresholdReason.trim(),
        changedBy: userId,
      });
      setThresholdReason('');
      onChanged();
    } catch (err) {
      setThresholdError(err.message);
    } finally {
      setThresholdBusy(false);
    }
  }

  const [downloadSections, setDownloadSections] = useState({ bar: true, heatmaps: true });
  const [downloadFormat, setDownloadFormat] = useState('csv'); // 'csv' | 'png'
  const [downloading, setDownloading] = useState(false);
  const impactSvgRef = useRef(null);
  const financialSvgRef = useRef(null);

  // Every IRO appears here, rated or not — per the builder's direct
  // request, an unrated topic isn't hidden from the primary chart, it just
  // sorts to the bottom with a "–" instead of a score.
  const scoredIros = useMemo(() => iros
    .map((iro) => {
      const agg = aggregateIro(iro, thresholds);
      return { iro, agg, score: agg.effectiveValue };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1)), [iros, thresholds]);

  const maxScore = Math.max(5, ...scoredIros.map((x) => x.score).filter((s) => s !== null));

  // The bar chart's own agg per IRO, reused so the heatmaps mark the exact
  // same Material/Not material status instead of guessing it from a raw
  // axis position — isMaterial already accounts for likelihood scaling,
  // the severity override and any calibration, which a y-value threshold
  // check alone would miss.
  const aggByIroId = new Map(scoredIros.map(({ iro, agg }) => [iro.id, agg]));

  // Topic-level roll-up (calc.js's aggregateTopic, already used by the PDF
  // report's own Topic Matrix and methodology text — "a topic is material if
  // any one of its underlying IROs meets or exceeds the applicable
  // threshold") — added back above the per-IRO bar chart per the builder's
  // direct request, alongside it rather than replacing it. "Topic" here is
  // the ESRS category (E1-E5/S1-S4/G1) an IRO belongs to, not the IRO's own
  // name — a topic can have both impact-type and financial-type IROs under
  // it, which is the only way a single row can carry both an Impact Score
  // and a Financial Score.
  const presentTopicIds = ESRS_TOPICS.filter((t) => iros.some((i) => i.topic === t.id)).map((t) => t.id);
  const topicSummaries = presentTopicIds.map((id) => {
    const topicIros = iros.filter((i) => i.topic === id);
    const hasImpact = topicIros.some((i) => hasImpactAxis(i.iroType) && i.assessments.length);
    const hasFinancial = topicIros.some((i) => !hasImpactAxis(i.iroType) && i.assessments.length);
    const ta = aggregateTopic(id, iros, thresholds);
    const impactScore = hasImpact ? ta.impactScore : null;
    const financialScore = hasFinancial ? ta.financialScore : null;
    const overall = impactScore === null && financialScore === null ? null : Math.max(impactScore ?? -Infinity, financialScore ?? -Infinity);
    const overallAxis = overall === null ? null : (financialScore !== null && financialScore >= (impactScore ?? -Infinity) ? 'Financial' : 'Impact');
    return { id, meta: ESRS_TOPICS.find((t) => t.id === id), impactScore, financialScore, overall, overallAxis, isMaterial: ta.isMaterial };
  });

  // Two-axis points for the heatmaps — severity/likelihood for impact IROs,
  // magnitude/likelihood for financial IROs. These are the raw dimensions
  // behind the single combined score, so they need their own averaging
  // rather than reusing impactScore/financialScore directly.
  const impactPoints = iros
    .filter((iro) => hasImpactAxis(iro.iroType) && iro.assessments.length)
    .map((iro) => {
      const severities = iro.assessments.map((a) => assessmentSeverity(iro, a));
      const likelihoods = iro.assessments.map((a) => a.likelihood).filter((v) => v !== null && v !== undefined);
      if (!severities.length || !likelihoods.length) return null;
      const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
      return { id: iro.id, label: iro.name, x: avg(likelihoods), y: avg(severities), iroType: iro.iroType, topic: iro.topic, isMaterial: aggByIroId.get(iro.id)?.isMaterial ?? false };
    })
    .filter(Boolean);

  const financialPoints = iros
    .filter((iro) => !hasImpactAxis(iro.iroType) && iro.assessments.length)
    .map((iro) => {
      const magnitudes = iro.assessments.map((a) => a.magnitude).filter((v) => v !== null && v !== undefined);
      const likelihoods = iro.assessments.map((a) => a.likelihood).filter((v) => v !== null && v !== undefined);
      if (!magnitudes.length || !likelihoods.length) return null;
      const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
      return { id: iro.id, label: iro.name, x: avg(likelihoods), y: avg(magnitudes), iroType: iro.iroType, topic: iro.topic, isMaterial: aggByIroId.get(iro.id)?.isMaterial ?? false };
    })
    .filter(Boolean);

  async function handleDownload() {
    if (downloadFormat === 'csv') {
      if (downloadSections.bar) {
        downloadCsv('bar-chart-iro-scores.csv', [
          ['IRO', 'ESRS Topic', 'IRO Type', 'Score', 'Material'],
          ...scoredIros.map(({ iro, score, agg }) => [iro.name, iro.topic, TYPE_LABEL[iro.iroType], score !== null ? score.toFixed(2) : '', agg.isMaterial ? 'Yes' : 'No']),
        ]);
      }
      if (downloadSections.heatmaps) {
        downloadCsv('heatmap-impact-financial.csv', [
          ['Axis', 'IRO', 'ESRS Topic', 'IRO Type', 'X (Likelihood)', 'Y (Severity or Magnitude)'],
          ...impactPoints.map((p) => ['Impact', p.label, p.topic, TYPE_LABEL[p.iroType], p.x.toFixed(2), p.y.toFixed(2)]),
          ...financialPoints.map((p) => ['Financial', p.label, p.topic, TYPE_LABEL[p.iroType], p.x.toFixed(2), p.y.toFixed(2)]),
        ]);
      }
      return;
    }

    // PNG only covers the two heatmaps — those are the actual charts (SVG).
    // The bar chart is a plain list of bars, not a chart with axes to
    // export as an image; CSV still covers it above.
    const charts = [];
    if (downloadSections.heatmaps) {
      charts.push({ svgEl: impactSvgRef.current, filename: 'impact-heatmap.png' });
      charts.push({ svgEl: financialSvgRef.current, filename: 'financial-heatmap.png' });
    }
    if (!charts.length) return;
    setDownloading(true);
    try {
      await exportChartsAsPng(charts);
    } finally {
      setDownloading(false);
    }
  }

  if (!iros.length) {
    return <div className="bg-surface rounded-2xl p-10 text-center text-text-secondary text-[13px]">This assessment has no IROs yet.</div>;
  }

  return (
    <div>
      <DmaMascot title="How is this calculated?">
        <p className="mb-2">
          <b className="text-text-primary">Impact score</b> = severity × (likelihood ÷ 5). Severity is the average of Scale, Scope, and Irremediability — unless any one of them is rated 5, in which case severity is forced to 5 regardless of the others (the precautionary override).
        </p>
        <p className="mb-2">
          <b className="text-text-primary">Financial score</b> = magnitude × (likelihood ÷ 5) — the same expected-value logic, with no override.
        </p>
        <p className="mb-2">
          The two heatmaps below plot every rated IRO on its own two raw dimensions — severity/likelihood for impact, magnitude/likelihood for financial — with a reference line at your current threshold, and a ring around any dot that's actually Material.
        </p>
        <p>
          Your two materiality thresholds (adjustable below, default 3.0) decide which scores in the bar chart above count as <b className="text-text-primary">Material</b>.
        </p>
      </DmaMascot>

      <h2 className="text-[26px] font-bold text-white mb-4 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg, #B79BF0, #9B7FE0)', boxShadow: '0 6px 14px -4px rgba(0,0,0,0.4)' }}>
          <ResultsIcon size={19} />
        </span>
        Results
      </h2>

      {/* TOPIC SUMMARY — one row per ESRS topic, both axes + the OR rule */}
      <p className="text-[13px] font-bold text-text-secondary tracking-wide mb-2">TOPIC SUMMARY — IMPACT vs FINANCIAL, BY ESRS TOPIC</p>
      <div className="bg-surface rounded-2xl p-4 mb-1 overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-wide text-text-secondary text-left">
              <th className="pb-2 font-semibold">Topic</th>
              <th className="pb-2 font-semibold text-right">Impact score</th>
              <th className="pb-2 font-semibold text-right">Financial score</th>
              <th className="pb-2 font-semibold text-right">Overall (max)</th>
              <th className="pb-2 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {topicSummaries.map((t) => (
              <tr key={t.id} className="border-t border-border-apus">
                <td className="py-2 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: pillarColor(t.id) }} />
                  {t.meta?.name ?? t.id}
                </td>
                <td className="py-2 text-right tabular-nums">{t.impactScore !== null ? t.impactScore.toFixed(1) : '–'}</td>
                <td className="py-2 text-right tabular-nums">{t.financialScore !== null ? t.financialScore.toFixed(1) : '–'}</td>
                <td className="py-2 text-right font-bold tabular-nums">{t.overall !== null ? `${t.overall.toFixed(1)} (${t.overallAxis})` : '–'}</td>
                <td className="py-2 text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: t.overall === null ? '#5B5B66' : t.isMaterial ? '#D79A4C' : '#5B5B66' }}>
                    {t.overall === null ? '–' : t.isMaterial ? 'Material' : 'Not material'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-text-secondary mb-6">
        A topic is Material if any one of its underlying IROs meets or exceeds the applicable threshold on its own axis (the "OR" rule) — Overall is the higher of the topic's two axis scores, shown for reference; materiality itself is decided per-IRO, not by comparing this max to a single line.
      </p>

      {/* PRIMARY — BAR CHART */}
      <p className="text-[13px] font-bold text-text-secondary tracking-wide mb-2">PRIMARY — IROs BY SCORE</p>
      <div className="bg-surface rounded-2xl p-4 mb-1">
        {scoredIros.map(({ iro, score, agg }) => {
          const color = pillarColor(iro.topic);
          // Material vs not material is the one status that matters most on
          // this chart — every bar was the same pillar color before, so a
          // just-under-threshold IRO looked identical to a clearly material
          // one. Only a material bar keeps its full pillar color; a
          // not-material one dims to grey, and the label spells it out.
          const barColor = score === null ? '#3A3842' : agg.isMaterial ? color : '#3A3842';
          return (
            <div key={iro.id} className="flex items-center gap-3 mb-2.5 last:mb-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-[13px] font-semibold w-48 truncate">{iro.name}</span>
              <div className="flex-1 bg-surface-2 rounded h-5 relative overflow-hidden">
                <div className="h-full rounded" style={{ width: score !== null ? `${(score / maxScore) * 100}%` : '0%', background: barColor }} />
              </div>
              <span
                className="text-[10px] font-bold w-[74px] text-right uppercase tracking-wide shrink-0"
                style={{ color: score === null ? '#5B5B66' : agg.isMaterial ? '#D79A4C' : '#5B5B66' }}
              >
                {score === null ? '–' : agg.isMaterial ? 'Material' : 'Not material'}
              </span>
              <span className="text-[13px] font-bold w-10 text-right">{score !== null ? score.toFixed(1) : '–'}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-text-secondary mb-6">
        <span style={{ color: '#D79A4C' }}>●</span> Material (score ≥ threshold) · <span style={{ color: '#5B5B66' }}>●</span> Not material
      </p>

      {/* SECONDARY — HEATMAPS */}
      <p className="text-[13px] font-bold text-text-secondary tracking-wide mb-2">SECONDARY — IMPACT &amp; FINANCIAL HEATMAPS</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Heatmap
          title="Impact (Severity × Likelihood)" note="Asymmetric — high severity stays flagged even at low likelihood"
          points={impactPoints} xLabel="Likelihood" yLabel="Severity"
          shapeA="neg_impact" shapeALabel="Negative impact" shapeB="pos_impact" shapeBLabel="Positive impact"
          threshold={thresholds?.impact ?? 3.0}
          svgRef={impactSvgRef}
        />
        <Heatmap
          title="Financial (Magnitude × Likelihood)" note="Symmetric — no precautionary override on this axis"
          points={financialPoints} xLabel="Likelihood" yLabel="Magnitude"
          shapeA="risk" shapeALabel="Risk" shapeB="opportunity" shapeBLabel="Opportunity"
          threshold={thresholds?.financial ?? 3.0}
          svgRef={financialSvgRef}
        />
      </div>

      {/* MATERIALITY THRESHOLDS */}
      <p className="text-[13px] font-bold text-text-secondary tracking-wide mb-1">MATERIALITY THRESHOLDS</p>
      {!cycle || readOnly ? (
        <p className="text-[12px] text-text-secondary mb-6">
          Impact threshold <b className="text-text-primary">{(thresholds?.impact ?? 3.0).toFixed(1)}</b> · Financial threshold <b className="text-text-primary">{(thresholds?.financial ?? 3.0).toFixed(1)}</b>
        </p>
      ) : (
        <div className="mb-6">
          <div className="flex gap-3 flex-wrap items-center">
            <span className="text-[12px] font-semibold">Impact threshold</span>
            <input type="number" step="0.1" min="1" max="5" value={impactTh} onChange={(e) => setImpactTh(parseFloat(e.target.value) || 3)} className="w-14 bg-surface-2 rounded px-2 py-1 text-[12px] font-semibold" />
            <span className="text-[12px] font-semibold">Financial threshold</span>
            <input type="number" step="0.1" min="1" max="5" value={financialTh} onChange={(e) => setFinancialTh(parseFloat(e.target.value) || 3)} className="w-14 bg-surface-2 rounded px-2 py-1 text-[12px] font-semibold" />
          </div>
          {thresholdsDirty && (
            <div className="bg-surface border border-border-apus rounded-xl p-3 mt-2">
              <p className="text-[11.5px] text-text-secondary mb-2">
                Not yet applied — materiality across the workspace (including the header above) still uses <b className="text-text-primary">{(thresholds?.impact ?? 3.0).toFixed(1)}</b> / <b className="text-text-primary">{(thresholds?.financial ?? 3.0).toFixed(1)}</b> until you apply this change, with a reason.
              </p>
              <input value={thresholdReason} onChange={(e) => setThresholdReason(e.target.value)} placeholder="Why is the threshold changing?" className="w-full bg-surface-2 rounded-lg px-3 py-2 text-[12px] outline-none mb-2" />
              {thresholdError && <p className="text-[11.5px] text-badge-amber mb-2">{thresholdError}</p>}
              <div className="flex gap-2">
                <button onClick={handleApplyThresholds} disabled={thresholdBusy || !thresholdReason.trim()} className="text-[12px] font-semibold rounded-lg px-3 py-1.5 disabled:opacity-40" style={{ background: '#4C6FFF', color: '#07070B' }}>Apply to this round</button>
                <button onClick={() => { setImpactTh(thresholds?.impact ?? 3.0); setFinancialTh(thresholds?.financial ?? 3.0); setThresholdReason(''); setThresholdError(''); }} className="text-[12px] text-text-secondary px-3 py-1.5">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DOWNLOAD */}
      <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(160deg, rgba(76,111,255,0.1), var(--color-surface))', border: '1px solid rgba(76,111,255,0.25)' }}>
        <p className="text-[14px] font-bold mb-1">⭳ Download the data behind these charts</p>
        <p className="text-[12px] text-text-secondary mb-3">Same detail as the charts above — each IRO's scores and material status. Pick what you need.</p>
        <div className="flex items-center gap-4 flex-wrap mb-3">
          <label className="text-[12.5px] font-medium flex items-center gap-1.5">
            <input type="checkbox" checked={downloadSections.bar} onChange={() => setDownloadSections((s) => ({ ...s, bar: !s.bar }))} disabled={downloadFormat !== 'csv'} /> Bar chart (IROs by score)
          </label>
          <label className="text-[12.5px] font-medium flex items-center gap-1.5">
            <input type="checkbox" checked={downloadSections.heatmaps} onChange={() => setDownloadSections((s) => ({ ...s, heatmaps: !s.heatmaps }))} /> Impact &amp; Financial heatmaps
          </label>
        </div>
        <div className="flex items-center gap-1.5 mb-4">
          <span className="text-[11.5px] font-semibold text-text-secondary mr-1">FORMAT</span>
          {[['csv', 'Data (CSV)'], ['png', 'Image (PNG)']].map(([val, label]) => (
            <button
              key={val} onClick={() => setDownloadFormat(val)}
              className="text-[11.5px] font-semibold rounded-lg px-3 py-1.5"
              style={{ background: downloadFormat === val ? '#4C6FFF' : 'transparent', color: downloadFormat === val ? '#F5F6FA' : '#8B8B98', border: '1px solid ' + (downloadFormat === val ? 'transparent' : '#2A2830') }}
            >
              {label}
            </button>
          ))}
        </div>
        {downloadFormat !== 'csv' && (
          <p className="text-[11px] text-text-secondary mb-3">
            One PNG per selected chart. The bar chart isn't included here — it's a plain list, not a chart with axes; use CSV for that one.
          </p>
        )}
        <button
          onClick={handleDownload}
          disabled={downloading || (downloadFormat === 'csv' ? (!downloadSections.bar && !downloadSections.heatmaps) : !downloadSections.heatmaps)}
          className="text-[13px] font-bold rounded-xl px-5 py-2.5 disabled:opacity-40"
          style={{ background: '#4C6FFF', color: '#F5F6FA' }}
        >
          {downloading ? 'Preparing…' : `Download selected (${downloadFormat.toUpperCase()})`}
        </button>
      </div>
    </div>
  );
}

function Heatmap({ title, note, points = [], xLabel, yLabel, shapeA, shapeALabel, shapeB, shapeBLabel, threshold = 3.0, svgRef }) {
  // One unified SVG (background heat + threshold + axis + points) instead of
  // a CSS grid with an overlay — bigger, sharper, and exportable as a single
  // image since it's all one element now.
  const W = 400, H = 300, M = 40, BOTTOM = 34;
  const plotW = W - M - 14, plotH = H - M - BOTTOM;
  const sx = (v) => M + ((v - 1) / 4) * plotW;
  const sy = (v) => (H - BOTTOM) - ((v - 1) / 4) * plotH;
  // The cycle's real, applied threshold — not a fixed 3 — so moving it in
  // MATERIALITY THRESHOLDS above actually moves this zone instead of the
  // heatmap silently ignoring it.
  const REF = threshold;

  // The real score for a plotted point is x*y/5 (likelihood x severity/magnitude,
  // scaled to 0-5 — see calc.js assessmentImpactScore/assessmentFinancialScore),
  // not a simple "both axes past the threshold" square — so the material region
  // is bounded by the hyperbola y = 5*threshold/x, not by straight lines at x=REF
  // and y=REF. A point can sit inside the old square (e.g. x=3.2, y=3.2, score
  // 2.05) and still not be Material; this curve is what the per-dot ring
  // (isMaterial, computed from the real formula) actually follows.
  // Actual-impact / potential-human-rights-impact IROs skip likelihood entirely
  // (severity alone, unscaled) so their true boundary is the flat y = threshold
  // line, not this curve — their ring is still correct even where the shaded
  // region here isn't a perfect match for them.
  const Tc = Math.min(5, Math.max(1, REF));
  const materialRegionPath = (() => {
    const steps = 28;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const x = Tc + (5 - Tc) * (i / steps);
      const y = Math.min(5, (5 * Tc) / x);
      pts.push([sx(x), sy(y)]);
    }
    const top = `M ${sx(5)},${sy(5)} L ${sx(Tc)},${sy(5)}`;
    const curve = pts.map(([px, py]) => `L ${px.toFixed(2)},${py.toFixed(2)}`).join(' ');
    return `${top} ${curve} Z`;
  })();

  const FONT = 11, CHAR_W = 5.8, LINE_H = 14;
  const placedBoxes = [];
  function boxesOverlap(a, b) { return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1; }
  const positioned = points.map((p) => {
    const cx = sx(p.x), cy0 = sy(p.y);
    const rawLabel = p.label.length > 24 ? p.label.slice(0, 22) + '…' : p.label;
    const labelW = rawLabel.length * CHAR_W + 6;
    const fitsRight = cx + 10 + labelW <= W - 4;
    const anchorLeft = !fitsRight;
    const textX = anchorLeft ? cx - 9 : cx + 9;
    let cy = cy0, step = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const box = anchorLeft
        ? { x1: textX - labelW, x2: textX + 2, y1: cy - LINE_H / 2, y2: cy + LINE_H / 2 }
        : { x1: textX - 2, x2: textX + labelW, y1: cy - LINE_H / 2, y2: cy + LINE_H / 2 };
      if (!placedBoxes.some((b) => boxesOverlap(b, box))) { placedBoxes.push(box); break; }
      step += 1;
      const dir = step % 2 === 0 ? 1 : -1;
      cy = Math.max(M - 20, Math.min(H - BOTTOM - 8, cy0 + dir * Math.ceil(step / 2) * (LINE_H + 1)));
      if (step > 30) { placedBoxes.push(box); break; }
    }
    return { ...p, cx, cy, textX, anchorLeft, label: rawLabel };
  });

  // Background heat cells, drawn as SVG rects (5x5) so the whole chart is one
  // exportable element — cool blue-grey (low) fading to hot amber (top-right,
  // high on both axes), with a distinct highlighted zone beyond the reference
  // line so "more material" reads as an actual region, not just a gradient.
  const cellW = plotW / 5, cellH = plotH / 5;
  const cells = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const heat = (row + col) / 8;
      const r = Math.round(76 + heat * (215 - 76));
      const g = Math.round(111 + heat * (154 - 111));
      const b = Math.round(255 + heat * (76 - 255));
      cells.push(
        <rect key={`${row}-${col}`} x={M + col * cellW} y={10 + row * cellH} width={cellW} height={cellH} fill={`rgba(${r},${g},${b},${0.18 + heat * 0.4})`} />
      );
    }
  }

  return (
    <div className="bg-surface rounded-2xl p-5">
      <p className="text-[15px] font-bold mb-0.5">{title}</p>
      <p className="text-[11.5px] text-text-secondary mb-3">Top-right = high on both axes = most material. Shaded region is score ≥ {threshold.toFixed(1)} (likelihood × value ÷ 5) — a ringed dot is Material.</p>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ aspectRatio: `${W} / ${H}`, height: 'auto', display: 'block' }}>
        <rect x={M} y={10} width={plotW} height={plotH} fill="#100E15" />
        {cells}
        <path d={materialRegionPath} fill="rgba(215,154,76,0.16)" stroke="#D79A4C" strokeOpacity="0.6" strokeWidth="1.5" strokeDasharray="4 3" />
        <text x={M + plotW - 4} y={22} textAnchor="end" fontSize="10" fontWeight="700" fill="#D79A4C">HIGHER MATERIALITY</text>
        {[1, 2, 3, 4, 5].map((v) => (
          <text key={`x${v}`} x={sx(v)} y={H - BOTTOM + 16} textAnchor="middle" fontSize="10" fontWeight="600" fill="#8B8B98">{v}</text>
        ))}
        {[1, 2, 3, 4, 5].map((v) => (
          <text key={`y${v}`} x={M - 8} y={sy(v) + 3.5} textAnchor="end" fontSize="10" fontWeight="600" fill="#8B8B98">{v}</text>
        ))}
        <text x={M + plotW / 2} y={H - 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#F5F6FA">{xLabel} →</text>
        <text x={13} y={H / 2 - BOTTOM / 2 + 5} textAnchor="middle" fontSize="12" fontWeight="700" fill="#F5F6FA" transform={`rotate(-90 13 ${H / 2 - BOTTOM / 2 + 5})`}>↑ {yLabel}</text>

        {positioned.map((p) => {
          const color = pillarColor(p.topic);
          const isShapeA = p.iroType === shapeA;
          const ring = p.isMaterial ? '#D79A4C' : '#100E15';
          const ringWidth = p.isMaterial ? 2.5 : 1.2;
          return (
            <g key={p.id}>
              {Math.abs(p.cy - sy(p.y)) > 1 && <line x1={p.cx} y1={sy(p.y)} x2={p.cx} y2={p.cy} stroke={color} strokeOpacity="0.5" strokeWidth="1" />}
              {isShapeA ? (
                <circle cx={p.cx} cy={p.cy} r="7" fill={color} stroke={ring} strokeWidth={ringWidth} />
              ) : (
                <polygon points={`${p.cx},${p.cy - 8} ${p.cx - 8},${p.cy + 6} ${p.cx + 8},${p.cy + 6}`} fill={color} stroke={ring} strokeWidth={ringWidth} />
              )}
              <text x={p.textX} y={p.cy + 4} textAnchor={p.anchorLeft ? 'end' : 'start'} fontSize={FONT} fontWeight="700" fill="#F5F6FA" style={{ paintOrder: 'stroke', stroke: '#07070B', strokeWidth: 3 }}>
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border-apus flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="rounded-full block shrink-0" style={{ width: 10, height: 10, background: '#8B8B98' }} />
          <span className="text-[11px] font-medium text-text-secondary">{shapeALabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="block shrink-0" style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '9px solid #8B8B98' }} />
          <span className="text-[11px] font-medium text-text-secondary">{shapeBLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full block shrink-0" style={{ width: 10, height: 10, background: '#8B8B98', border: '2px solid #D79A4C' }} />
          <span className="text-[11px] font-medium text-text-secondary">Material (ringed)</span>
        </div>
      </div>
      {points.length === 0 && <p className="text-[11px] text-text-secondary mt-2">No rated IROs on this axis yet.</p>}
      <p className="text-[11px] text-text-secondary mt-1">{note}</p>
    </div>
  );
}


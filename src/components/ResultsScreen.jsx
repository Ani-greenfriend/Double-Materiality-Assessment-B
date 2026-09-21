import { useMemo, useRef, useState } from 'react';
import { aggregateIro, aggregateTopic, hasImpactAxis, assessmentSeverity } from '../lib/calc';
import { ESRS_TOPICS, TYPE_LABEL, PILLAR_COLOR } from '../lib/topics';
import { ResultsIcon } from './icons';
import DmaMascot from './DmaMascot';

function pillarOf(topicId) {
  return ESRS_TOPICS.find((t) => t.id === topicId)?.cat;
}
function pillarColor(topicId) {
  return PILLAR_COLOR[pillarOf(topicId)]?.text ?? '#8B8B98';
}

// Topic Matrix quadrant fills, keyed to CLAUDE.md's existing brand palette —
// not new colors, just the accent (#4C6FFF), the delete/negative red
// (#E0645A) doing double duty as "financial" pink, and the purple already
// reserved for assessments-run stats (#9B7FE0) reused for "material on both."
const MATERIAL_QUADRANT_COLOR = {
  none: 'rgba(139,139,152,0.08)',
  impact: 'rgba(76,111,255,0.14)',
  financial: 'rgba(224,100,90,0.14)',
  both: 'rgba(155,127,224,0.16)',
};

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
// SUMMARY" ESRS-topic cards, keeping only the bar chart, the two heatmaps
// and the topic matrix; (b) a `thresholds` prop threaded into every
// aggregateIro/aggregateTopic call so isMaterial reflects the cycle's real
// threshold instead of the prototype's hardcoded default; (c) scoredIros
// and SidePanel read `agg.effectiveValue` (v2.0's calc.js already prefers
// the calibrated value there) instead of a separate `calibrations` prop —
// there's no such separate map in the v2.0 shape, calibration is embedded
// per-iro and calc.js already resolves it; (d) financialPoints reads
// `a.likelihood`, not `a.financialLikelihood` — the latter was retired as
// a criterion key in v2.0 (a risk/opportunity's likelihood IS `likelihood`,
// same key as an impact IRO's); (e) PDF export dropped per CLAUDE.md's Arms
// section ("Results keeps the prototype's PNG and CSV downloads; the
// report builder is the PDF export") — CSV and PNG only; (f) the E/S/G and
// material/not-material filters moved from local state to props —
// CalibrateResultsTab.jsx now owns them so the same filter selection
// applies to the Calibrate tab too, per the builder's direct request for
// filters shared across the workspace, not just this screen.
export default function ResultsScreen({ iros, thresholds, activeCats, showMaterial, showNotMaterial }) {
  const [impactTh, setImpactTh] = useState(thresholds?.impact ?? 3.0);
  const [financialTh, setFinancialTh] = useState(thresholds?.financial ?? 3.0);
  const [hoverTopic, setHoverTopic] = useState(null);
  const [pinned, setPinned] = useState(null);
  const [downloadSections, setDownloadSections] = useState({ bar: true, heatmaps: true, matrix: true });
  const [downloadFormat, setDownloadFormat] = useState('csv'); // 'csv' | 'png'
  const [downloading, setDownloading] = useState(false);
  const impactSvgRef = useRef(null);
  const financialSvgRef = useRef(null);
  const matrixSvgRef = useRef(null);

  const scoredIros = useMemo(() => iros
    .map((iro) => {
      const agg = aggregateIro(iro, thresholds);
      return { iro, agg, score: agg.effectiveValue };
    })
    .filter((x) => x.score !== null)
    .sort((a, b) => b.score - a.score), [iros, thresholds]);

  const topicIds = [...new Set(iros.map((i) => i.topic))];
  const allTopics = topicIds.map((id) => ({ id, ta: aggregateTopic(id, iros, thresholds), meta: ESRS_TOPICS.find((t) => t.id === id) }));
  // A topic only earns a dot once at least one of its IROs has actually been
  // rated — otherwise it's sitting at the (1,1) baseline purely because
  // nothing was assessed yet, which would misleadingly look like "rated low."
  const ratedTopics = allTopics.filter((t) => t.ta && t.ta.iros.some((i) => i.assessments.length > 0));
  const unratedCount = allTopics.length - ratedTopics.length;
  const topics = ratedTopics
    .filter((t) => activeCats.includes(t.meta?.cat))
    .filter((t) => (t.ta.isMaterial && showMaterial) || (!t.ta.isMaterial && showNotMaterial));

  const maxScore = Math.max(5, ...scoredIros.map((x) => x.score));
  const active = pinned ?? hoverTopic;

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
      return { id: iro.id, label: iro.name, x: avg(likelihoods), y: avg(severities), iroType: iro.iroType, topic: iro.topic };
    })
    .filter(Boolean);

  const financialPoints = iros
    .filter((iro) => !hasImpactAxis(iro.iroType) && iro.assessments.length)
    .map((iro) => {
      const magnitudes = iro.assessments.map((a) => a.magnitude).filter((v) => v !== null && v !== undefined);
      const likelihoods = iro.assessments.map((a) => a.likelihood).filter((v) => v !== null && v !== undefined);
      if (!magnitudes.length || !likelihoods.length) return null;
      const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
      return { id: iro.id, label: iro.name, x: avg(likelihoods), y: avg(magnitudes), iroType: iro.iroType, topic: iro.topic };
    })
    .filter(Boolean);

  async function handleDownload() {
    if (downloadFormat === 'csv') {
      if (downloadSections.bar) {
        downloadCsv('bar-chart-iro-scores.csv', [
          ['IRO', 'ESRS Topic', 'IRO Type', 'Score', 'Material'],
          ...scoredIros.map(({ iro, score, agg }) => [iro.name, iro.topic, TYPE_LABEL[iro.iroType], score.toFixed(2), agg.isMaterial ? 'Yes' : 'No']),
        ]);
      }
      if (downloadSections.heatmaps) {
        downloadCsv('heatmap-impact-financial.csv', [
          ['Axis', 'IRO', 'ESRS Topic', 'IRO Type', 'X (Likelihood)', 'Y (Severity or Magnitude)'],
          ...impactPoints.map((p) => ['Impact', p.label, p.topic, TYPE_LABEL[p.iroType], p.x.toFixed(2), p.y.toFixed(2)]),
          ...financialPoints.map((p) => ['Financial', p.label, p.topic, TYPE_LABEL[p.iroType], p.x.toFixed(2), p.y.toFixed(2)]),
        ]);
      }
      if (downloadSections.matrix) {
        downloadCsv('topic-matrix.csv', [
          ['ESRS Topic', 'Impact score', 'Financial score', 'Material', 'IROs in this topic'],
          ...topics.map((t) => [t.meta?.name ?? t.id, t.ta.impactScore.toFixed(2), t.ta.financialScore.toFixed(2), t.ta.isMaterial ? 'Yes' : 'No', t.ta.iros.map((i) => i.name).join(' | ')]),
        ]);
      }
      return;
    }

    // PNG only covers the two heatmaps and the topic matrix — those are the
    // actual charts (SVG). The bar chart is a plain list of bars, not a
    // chart with axes to export as an image; CSV still covers it above.
    const charts = [];
    if (downloadSections.heatmaps) {
      charts.push({ svgEl: impactSvgRef.current, filename: 'impact-heatmap.png' });
      charts.push({ svgEl: financialSvgRef.current, filename: 'financial-heatmap.png' });
    }
    if (downloadSections.matrix) {
      charts.push({ svgEl: matrixSvgRef.current, filename: 'topic-matrix.png' });
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
          Each topic below is plotted at its average Impact score (x-axis) and average Financial score (y-axis). A topic only appears once at least one of its IROs has actually been rated.
        </p>
        <p>
          The dashed lines mark your two thresholds (adjustable below the chart, default 3.0). A topic in the <b className="text-text-primary">top-right quadrant clears both</b> — material from both directions.
        </p>
      </DmaMascot>

      <h2 className="text-[26px] font-bold text-white mb-4 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg, #B79BF0, #9B7FE0)', boxShadow: '0 6px 14px -4px rgba(0,0,0,0.4)' }}>
          <ResultsIcon size={19} />
        </span>
        Results
      </h2>

      {/* PRIMARY — BAR CHART */}
      <p className="text-[13px] font-bold text-text-secondary tracking-wide mb-2">PRIMARY — IROs BY SCORE</p>
      <div className="bg-surface rounded-2xl p-4 mb-6">
        {scoredIros.map(({ iro, score }) => {
          const color = pillarColor(iro.topic);
          return (
            <div key={iro.id} className="flex items-center gap-3 mb-2.5 last:mb-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-[13px] font-semibold w-48 truncate">{iro.name}</span>
              <div className="flex-1 bg-surface-2 rounded h-5 relative overflow-hidden">
                <div className="h-full rounded" style={{ width: `${(score / maxScore) * 100}%`, background: color }} />
              </div>
              <span className="text-[13px] font-bold w-10 text-right">{score.toFixed(1)}</span>
            </div>
          );
        })}
      </div>

      {/* SECONDARY — HEATMAPS */}
      <p className="text-[13px] font-bold text-text-secondary tracking-wide mb-2">SECONDARY — IMPACT &amp; FINANCIAL HEATMAPS</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Heatmap
          title="Impact (Severity × Likelihood)" note="Asymmetric — high severity stays flagged even at low likelihood"
          points={impactPoints} xLabel="Likelihood" yLabel="Severity"
          shapeA="neg_impact" shapeALabel="Negative impact" shapeB="pos_impact" shapeBLabel="Positive impact"
          svgRef={impactSvgRef}
        />
        <Heatmap
          title="Financial (Magnitude × Likelihood)" note="Symmetric — no precautionary override on this axis"
          points={financialPoints} xLabel="Likelihood" yLabel="Magnitude"
          shapeA="risk" shapeALabel="Risk" shapeB="opportunity" shapeBLabel="Opportunity"
          svgRef={financialSvgRef}
        />
      </div>

      {/* TERTIARY — TOPIC MATRIX */}
      <p className="text-[13px] font-bold text-text-secondary tracking-wide mb-1">TERTIARY — TOPIC MATRIX</p>
      <p className="text-[12px] text-text-secondary mb-2">
        Each dot is one ESRS topic, colour-coded by pillar. <b className="text-text-primary">Hover or click a dot</b> to see exactly which IROs sit behind it, in the panel on the right.
        {unratedCount > 0 && <span> {unratedCount} topic{unratedCount === 1 ? '' : 's'} not shown yet — no ratings recorded {unratedCount === 1 ? 'for it' : 'for them'} yet.</span>}
      </p>
      <div className="flex gap-3 mb-3 flex-wrap items-center">
        <span className="text-[12px] font-semibold">Impact threshold</span>
        <input type="number" step="0.1" min="1" max="5" value={impactTh} onChange={(e) => setImpactTh(parseFloat(e.target.value) || 3)} className="w-14 bg-surface-2 rounded px-2 py-1 text-[12px] font-semibold" />
        <span className="text-[12px] font-semibold">Financial threshold</span>
        <input type="number" step="0.1" min="1" max="5" value={financialTh} onChange={(e) => setFinancialTh(parseFloat(e.target.value) || 3)} className="w-14 bg-surface-2 rounded px-2 py-1 text-[12px] font-semibold" />
      </div>

      <div className="grid grid-cols-[1fr_260px] gap-3 mb-6">
        <div className="bg-surface rounded-2xl p-4">
          <Matrix
            topics={topics} impactTh={impactTh} financialTh={financialTh}
            onHover={setHoverTopic} onPin={(id) => setPinned((p) => (p === id ? null : id))}
            svgRef={matrixSvgRef}
          />
        </div>
        <div className="bg-surface rounded-2xl p-4">
          {active ? (
            <SidePanel topic={topics.find((t) => t.id === active)} thresholds={thresholds} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <span className="text-[24px] mb-2">👆</span>
              <p className="text-[12.5px] font-semibold text-text-secondary">Hover or tap a dot<br />to see its IROs</p>
            </div>
          )}
        </div>
      </div>

      {/* DOWNLOAD */}
      <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(160deg, rgba(76,111,255,0.1), var(--color-surface))', border: '1px solid rgba(76,111,255,0.25)' }}>
        <p className="text-[14px] font-bold mb-1">⭳ Download the data behind these charts</p>
        <p className="text-[12px] text-text-secondary mb-3">Same detail as the hover panels — which IRO belongs to which dot, with its scores and material status. Pick what you need.</p>
        <div className="flex items-center gap-4 flex-wrap mb-3">
          <label className="text-[12.5px] font-medium flex items-center gap-1.5">
            <input type="checkbox" checked={downloadSections.bar} onChange={() => setDownloadSections((s) => ({ ...s, bar: !s.bar }))} disabled={downloadFormat !== 'csv'} /> Bar chart (IROs by score)
          </label>
          <label className="text-[12.5px] font-medium flex items-center gap-1.5">
            <input type="checkbox" checked={downloadSections.heatmaps} onChange={() => setDownloadSections((s) => ({ ...s, heatmaps: !s.heatmaps }))} /> Impact &amp; Financial heatmaps
          </label>
          <label className="text-[12.5px] font-medium flex items-center gap-1.5">
            <input type="checkbox" checked={downloadSections.matrix} onChange={() => setDownloadSections((s) => ({ ...s, matrix: !s.matrix }))} /> Topic matrix
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
          disabled={downloading || (downloadFormat === 'csv' ? (!downloadSections.bar && !downloadSections.heatmaps && !downloadSections.matrix) : (!downloadSections.heatmaps && !downloadSections.matrix))}
          className="text-[13px] font-bold rounded-xl px-5 py-2.5 disabled:opacity-40"
          style={{ background: '#4C6FFF', color: '#F5F6FA' }}
        >
          {downloading ? 'Preparing…' : `Download selected (${downloadFormat.toUpperCase()})`}
        </button>
      </div>
    </div>
  );
}

function Heatmap({ title, note, points = [], xLabel, yLabel, shapeA, shapeALabel, shapeB, shapeBLabel, svgRef }) {
  // One unified SVG (background heat + threshold + axis + points) instead of
  // a CSS grid with an overlay — bigger, sharper, and exportable as a single
  // image since it's all one element now.
  const W = 400, H = 300, M = 40, BOTTOM = 34;
  const plotW = W - M - 14, plotH = H - M - BOTTOM;
  const sx = (v) => M + ((v - 1) / 4) * plotW;
  const sy = (v) => (H - BOTTOM) - ((v - 1) / 4) * plotH;
  const REF = 3; // a fixed reference line at 3/5 — "elevated" on either axis
  const rx = sx(REF), ry = sy(REF);

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
      <p className="text-[11.5px] text-text-secondary mb-3">Top-right = high on both axes = most material. Reference line at 3.</p>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ aspectRatio: `${W} / ${H}`, height: 'auto', display: 'block' }}>
        <rect x={M} y={10} width={plotW} height={plotH} fill="#100E15" />
        {cells}
        <rect x={rx} y={10} width={M + plotW - rx} height={ry - 10} fill="rgba(215,154,76,0.16)" stroke="#D79A4C" strokeOpacity="0.5" strokeDasharray="4 3" />
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
          return (
            <g key={p.id}>
              {Math.abs(p.cy - sy(p.y)) > 1 && <line x1={p.cx} y1={sy(p.y)} x2={p.cx} y2={p.cy} stroke={color} strokeOpacity="0.5" strokeWidth="1" />}
              {isShapeA ? (
                <circle cx={p.cx} cy={p.cy} r="7" fill={color} stroke="#100E15" strokeWidth="1.2" />
              ) : (
                <polygon points={`${p.cx},${p.cy - 8} ${p.cx - 8},${p.cy + 6} ${p.cx + 8},${p.cy + 6}`} fill={color} stroke="#100E15" strokeWidth="1" />
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
      </div>
      {points.length === 0 && <p className="text-[11px] text-text-secondary mt-2">No rated IROs on this axis yet.</p>}
      <p className="text-[11px] text-text-secondary mt-1">{note}</p>
    </div>
  );
}

function Matrix({ topics, impactTh, financialTh, onHover, onPin, svgRef }) {
  const W = 460, H = 300, M = 34;
  const plotW = W - M - 12, plotH = H - M - 24;
  const sx = (v) => M + ((v - 1) / 4) * plotW;
  const sy = (v) => (H - 34) - ((v - 1) / 4) * plotH;
  const ix = sx(impactTh), fy = sy(financialTh);

  // Real bounding-box collision avoidance — estimates each label's actual
  // pixel width from its text length, flips the label to the left of the dot
  // when there isn't room to the right before the plot edge, and nudges it
  // up/down in small steps until its box doesn't overlap any label already
  // placed. Point-distance alone (the old approach) let long labels overlap
  // even when their dots were far enough apart.
  const FONT = 9.5, CHAR_W = 5.4, LINE_H = 12;
  const placedBoxes = [];
  function boxesOverlap(a, b) {
    return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
  }
  const positioned = topics.map(({ id, ta, meta }) => {
    const cx = sx(ta.impactScore ?? 1), cy0 = sy(ta.financialScore ?? 1);
    const r = ta.isMaterial ? 8 : 5.5;
    const rawLabel = (meta?.name ?? id).replace(/^[A-Z]\d\s·\s/, '');
    const label = rawLabel.length > 26 ? rawLabel.slice(0, 24) + '…' : rawLabel;
    const labelW = label.length * CHAR_W + 6;
    const fitsRight = cx + r + 4 + labelW <= W - 4;
    const anchorLeft = !fitsRight;
    const textX = anchorLeft ? cx - r - 4 : cx + r + 4;

    let cy = cy0;
    let step = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const box = anchorLeft
        ? { x1: textX - labelW, x2: textX + 2, y1: cy - LINE_H / 2, y2: cy + LINE_H / 2 }
        : { x1: textX - 2, x2: textX + labelW, y1: cy - LINE_H / 2, y2: cy + LINE_H / 2 };
      if (!placedBoxes.some((p) => boxesOverlap(p, box))) {
        placedBoxes.push(box);
        break;
      }
      step += 1;
      // Alternate up/down, growing each attempt, and clamp inside the plot.
      const dir = step % 2 === 0 ? 1 : -1;
      cy = Math.max(16, Math.min(H - 40, cy0 + dir * Math.ceil(step / 2) * (LINE_H + 1)));
      if (step > 40) { placedBoxes.push(box); break; }
    }
    return { id, ta, meta, cx, cy, r, label, textX, anchorLeft };
  });

  return (
    <div>
      <div className="flex items-center gap-4 flex-wrap mb-2">
        {[
          ['Not material', MATERIAL_QUADRANT_COLOR.none],
          ['Material — Impact only', MATERIAL_QUADRANT_COLOR.impact],
          ['Material — Financial only', MATERIAL_QUADRANT_COLOR.financial],
          ['Material — Both', MATERIAL_QUADRANT_COLOR.both],
        ].map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="rounded-sm block shrink-0" style={{ width: 11, height: 11, background: color }} />
            <span className="text-[10.5px] font-medium text-text-secondary">{label}</span>
          </div>
        ))}
      </div>
      <div className="relative">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ aspectRatio: `${W} / ${H}`, height: 'auto', display: 'block' }}>
        <rect x={M} y={10} width={ix - M} height={fy - 10} fill={MATERIAL_QUADRANT_COLOR.financial} />
        <rect x={ix} y={10} width={M + plotW - ix} height={fy - 10} fill={MATERIAL_QUADRANT_COLOR.both} />
        <rect x={M} y={fy} width={ix - M} height={H - 34 - fy} fill={MATERIAL_QUADRANT_COLOR.none} />
        <rect x={ix} y={fy} width={M + plotW - ix} height={H - 34 - fy} fill={MATERIAL_QUADRANT_COLOR.impact} />
        <line x1={ix} y1={10} x2={ix} y2={H - 34} stroke="#2A2830" strokeDasharray="3 2" />
        <line x1={M} y1={fy} x2={M + plotW} y2={fy} stroke="#2A2830" strokeDasharray="3 2" />
        {[0, 1, 2, 3, 4, 5].map((v) => (
          <text key={`x${v}`} x={sx(Math.max(1, v))} y={H - 22} textAnchor="middle" fontSize="7.5" fill="#5B5B66">{v}</text>
        ))}
        {[0, 1, 2, 3, 4, 5].map((v) => (
          <text key={`y${v}`} x={M - 6} y={sy(Math.max(1, v)) + 3} textAnchor="end" fontSize="7.5" fill="#5B5B66">{v}</text>
        ))}
        <text x={M + plotW / 2} y={H - 6} textAnchor="middle" fontSize="10" fontWeight="700" fill="#ACACB8">Impact materiality →</text>
        <text x={12} y={H / 2 - 17} textAnchor="middle" fontSize="10" fontWeight="700" fill="#ACACB8" transform={`rotate(-90 12 ${H / 2 - 17})`}>Financial materiality →</text>

        {positioned.map(({ id, ta, meta, cx, cy, r, label, textX, anchorLeft }) => {
          const color = PILLAR_COLOR[meta?.cat]?.text ?? '#8B8B98';
          return (
            <g key={id} style={{ cursor: 'pointer' }} onMouseEnter={() => onHover(id)} onMouseLeave={() => onHover(null)} onClick={() => onPin(id)}>
              {cy !== sy(ta.financialScore ?? 1) && (
                <line x1={cx} y1={sy(ta.financialScore ?? 1)} x2={cx} y2={cy} stroke={color} strokeOpacity="0.4" strokeWidth="1" />
              )}
              <circle cx={cx} cy={cy} r={r} fill={color} stroke={ta.isMaterial ? '#D79A4C' : 'none'} strokeWidth={ta.isMaterial ? 2.5 : 0} />
              <text x={textX} y={cy + 3} textAnchor={anchorLeft ? 'end' : 'start'} fontSize={FONT} fontWeight="600" fill="#F5F6FA" style={{ pointerEvents: 'none' }}>
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      {topics.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-[12px] font-medium text-text-secondary text-center max-w-[220px] bg-app-black bg-opacity-80 rounded-lg px-3 py-2">
            No topics to plot yet — either nothing has been rated, or your E/S/G and material/not-material filters are hiding everything.
          </p>
        </div>
      )}
      </div>

      <div className="flex items-center gap-4 flex-wrap mt-2 pt-2 border-t border-border-apus">
        {['E', 'S', 'G'].map((c) => (
          <div key={c} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: PILLAR_COLOR[c].text }} />
            <span className="text-[10.5px] font-medium text-text-secondary">{c === 'E' ? 'Environmental' : c === 'S' ? 'Social' : 'Governance'}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#8B8B98', border: '2px solid #D79A4C' }} />
          <span className="text-[10.5px] font-medium text-text-secondary">Material (ringed &amp; larger)</span>
        </div>
      </div>
    </div>
  );
}

function SidePanel({ topic, thresholds }) {
  if (!topic) return null;
  return (
    <div>
      <p className="font-bold text-[14px] mb-2.5">{topic.meta?.name ?? topic.id}</p>
      {topic.ta.iros.map((iro) => {
        const agg = aggregateIro(iro, thresholds);
        const score = agg.effectiveValue;
        return (
          <div key={iro.id} className="border-t border-border-apus pt-2.5 mt-2.5 first:border-t-0 first:mt-0 first:pt-0">
            <p className="text-[13px] font-semibold">{iro.name}</p>
            <p className="text-[11.5px] font-medium text-text-secondary mt-0.5">
              {TYPE_LABEL[iro.iroType]} · {score !== null ? score.toFixed(1) : '–'} ·{' '}
              <span style={{ color: agg.isMaterial ? '#D79A4C' : undefined, fontWeight: agg.isMaterial ? 700 : 500 }}>{agg.isMaterial ? 'Material' : 'Not material'}</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}

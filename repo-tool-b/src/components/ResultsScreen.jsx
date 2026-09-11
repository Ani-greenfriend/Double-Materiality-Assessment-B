import { useMemo, useState } from 'react';
import { aggregateIro, aggregateTopic, hasImpactAxis } from '../lib/calc';
import { ESRS_TOPICS, TYPE_LABEL } from '../lib/topics';

const CAT_COLOR = { E: '#4C6FFF', S: '#4C6FFF', G: '#4C6FFF' }; // single accent per brand rule; shape/ring carries the rest

export default function ResultsScreen({ iros, calibrations }) {
  const [impactTh, setImpactTh] = useState(3.0);
  const [financialTh, setFinancialTh] = useState(3.0);
  const [activeCats, setActiveCats] = useState(['E', 'S', 'G']);
  const [showMaterial, setShowMaterial] = useState(true);
  const [showNotMaterial, setShowNotMaterial] = useState(true);
  const [hoverTopic, setHoverTopic] = useState(null);
  const [pinned, setPinned] = useState(null);

  const scoredIros = useMemo(() => iros
    .map((iro) => {
      const cal = calibrations[iro.id];
      const agg = aggregateIro(iro);
      const calc = hasImpactAxis(iro.iroType) ? agg.impactScore : agg.financialScore;
      const score = cal?.calibratedValue ?? calc;
      return { iro, agg, score };
    })
    .filter((x) => x.score !== null)
    .sort((a, b) => b.score - a.score), [iros, calibrations]);

  const topicIds = [...new Set(iros.map((i) => i.topic))];
  const topics = topicIds
    .map((id) => ({ id, ta: aggregateTopic(id, iros), meta: ESRS_TOPICS.find((t) => t.id === id) }))
    .filter((t) => t.ta && t.ta.impactScore !== null && t.ta.financialScore !== null)
    .filter((t) => activeCats.includes(t.meta?.cat))
    .filter((t) => (t.ta.isMaterial && showMaterial) || (!t.ta.isMaterial && showNotMaterial));

  const maxScore = Math.max(5, ...scoredIros.map((x) => x.score));
  const active = pinned ?? hoverTopic;

  if (!iros.length) {
    return <div className="bg-surface rounded-2xl p-10 text-center text-text-secondary text-[13px]">Upload IROs on the Assessment screen first.</div>;
  }

  return (
    <div>
      <h2 className="text-[24px] font-bold text-white mb-4">Results</h2>

      <p className="text-[11px] font-semibold text-text-secondary tracking-wide mb-2">PRIMARY — IROs BY SCORE</p>
      <div className="bg-surface rounded-2xl p-4 mb-5">
        {scoredIros.map(({ iro, score }) => (
          <div key={iro.id} className="flex items-center gap-3 mb-2 last:mb-0">
            <div className="flex-1 bg-surface-2 rounded h-4 relative overflow-hidden">
              <div className="bg-emerald h-full rounded" style={{ width: `${(score / maxScore) * 100}%` }} />
            </div>
            <span className="text-[11px] w-40 truncate">{iro.name}</span>
            <span className="text-[11px] font-semibold w-10 text-right">{score.toFixed(1)}</span>
          </div>
        ))}
      </div>

      <p className="text-[11px] font-semibold text-text-secondary tracking-wide mb-2">SECONDARY — IMPACT &amp; FINANCIAL HEATMAPS</p>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Heatmap title="Impact (Severity × Likelihood)" note="Asymmetric — high severity stays flagged even at low likelihood" asymmetric />
        <Heatmap title="Financial (Magnitude × Likelihood)" note="Symmetric — no precautionary override on this axis" asymmetric={false} />
      </div>

      <p className="text-[11px] font-semibold text-text-secondary tracking-wide mb-2">TERTIARY — TOPIC MATRIX</p>
      <div className="flex gap-3 mb-3 flex-wrap items-center">
        {['E', 'S', 'G'].map((c) => (
          <label key={c} className="text-[11px] flex items-center gap-1.5">
            <input type="checkbox" checked={activeCats.includes(c)} onChange={() => setActiveCats((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])} />
            {c}
          </label>
        ))}
        <label className="text-[11px] flex items-center gap-1.5">
          <input type="checkbox" checked={showMaterial} onChange={() => setShowMaterial((v) => !v)} /> Material
        </label>
        <label className="text-[11px] flex items-center gap-1.5">
          <input type="checkbox" checked={showNotMaterial} onChange={() => setShowNotMaterial((v) => !v)} /> Not material
        </label>
        <span className="text-[11px] text-text-secondary ml-auto">Impact threshold</span>
        <input type="number" step="0.1" min="1" max="5" value={impactTh} onChange={(e) => setImpactTh(parseFloat(e.target.value) || 3)} className="w-14 bg-surface-2 rounded px-2 py-1 text-[11px]" />
        <span className="text-[11px] text-text-secondary">Financial threshold</span>
        <input type="number" step="0.1" min="1" max="5" value={financialTh} onChange={(e) => setFinancialTh(parseFloat(e.target.value) || 3)} className="w-14 bg-surface-2 rounded px-2 py-1 text-[11px]" />
      </div>

      <div className="grid grid-cols-[1fr_220px] gap-3">
        <div className="bg-surface rounded-2xl p-4">
          <Matrix
            topics={topics} impactTh={impactTh} financialTh={financialTh}
            onHover={setHoverTopic} onPin={(id) => setPinned((p) => (p === id ? null : id))}
          />
        </div>
        <div className="bg-surface rounded-2xl p-4">
          {active ? (
            <SidePanel topic={topics.find((t) => t.id === active)} />
          ) : (
            <p className="text-[11.5px] text-text-secondary">Hover or tap a topic to see its IROs.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Heatmap({ title, note, asymmetric }) {
  const cells = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const intensity = asymmetric ? Math.max((row + 1) / 5, (col + 1) / 5) : ((row + 1) * (col + 1)) / 25;
      cells.push(<div key={`${row}-${col}`} className="h-4" style={{ background: `rgba(76,111,255,${0.1 + intensity * 0.6})` }} />);
    }
  }
  return (
    <div className="bg-surface rounded-2xl p-3.5">
      <p className="text-[11px] font-semibold mb-2">{title}</p>
      <div className="grid grid-cols-5 gap-0.5">{cells}</div>
      <p className="text-[9.5px] text-text-secondary mt-1.5">{note}</p>
    </div>
  );
}

function Matrix({ topics, impactTh, financialTh, onHover, onPin }) {
  const W = 400, H = 260, M = 34;
  const plotW = W - M - 12, plotH = H - M - 10;
  const sx = (v) => M + ((v - 1) / 4) * plotW;
  const sy = (v) => (H - 20) - ((v - 1) / 4) * plotH;
  const ix = sx(impactTh), fy = sy(financialTh);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ aspectRatio: `${W} / ${H}`, height: 'auto', display: 'block' }}>
      <rect x={M} y={10} width={ix - M} height={fy - 10} fill="#100E15" />
      <rect x={ix} y={10} width={M + plotW - ix} height={fy - 10} fill="rgba(76,111,255,0.06)" />
      <rect x={M} y={fy} width={ix - M} height={H - 20 - fy} fill="rgba(76,111,255,0.06)" />
      <rect x={ix} y={fy} width={M + plotW - ix} height={H - 20 - fy} fill="rgba(76,111,255,0.1)" />
      <line x1={ix} y1={10} x2={ix} y2={H - 20} stroke="#2A2830" strokeDasharray="3 2" />
      <line x1={M} y1={fy} x2={M + plotW} y2={fy} stroke="#2A2830" strokeDasharray="3 2" />
      <text x={M + plotW / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="#8B8B98">Impact materiality →</text>
      <text x={10} y={H / 2} textAnchor="middle" fontSize="9" fill="#8B8B98" transform={`rotate(-90 10 ${H / 2})`}>Financial materiality →</text>

      {topics.map(({ id, ta }) => {
        const cx = sx(ta.impactScore ?? 1), cy = sy(ta.financialScore ?? 1);
        return (
          <circle
            key={id} cx={cx} cy={cy} r={8}
            fill="#4C6FFF" fillOpacity={ta.isMaterial ? 1 : 0.4}
            stroke={ta.isMaterial ? '#D79A4C' : 'none'} strokeWidth={ta.isMaterial ? 3 : 0}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => onHover(id)} onMouseLeave={() => onHover(null)}
            onClick={() => onPin(id)}
          />
        );
      })}
    </svg>
  );
}

function SidePanel({ topic }) {
  if (!topic) return null;
  return (
    <div>
      <p className="font-semibold text-[13px] mb-2.5">{topic.meta?.name ?? topic.id}</p>
      {topic.ta.iros.map((iro) => {
        const agg = aggregateIro(iro);
        const score = hasImpactAxis(iro.iroType) ? agg.impactScore : agg.financialScore;
        return (
          <div key={iro.id} className="border-t border-border-apus pt-2 mt-2 first:border-t-0 first:mt-0 first:pt-0">
            <p className="text-[12.5px] font-semibold">{iro.name}</p>
            <p className="text-[11px] text-text-secondary mt-0.5">
              {TYPE_LABEL[iro.iroType]} · {score !== null ? score.toFixed(1) : '–'} ·{' '}
              <span style={{ color: agg.isMaterial ? '#D79A4C' : undefined }}>{agg.isMaterial ? 'Material' : 'Not material'}</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}

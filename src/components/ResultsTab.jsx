import { aggregateIro, aggregateTopic } from '../lib/calc';
import { ESRS_TOPICS, PILLAR_COLOR, TYPE_LABEL, MATERIAL_BADGE, pillarFor } from '../lib/topics';
import DmaMascot from './DmaMascot';
import { ResultsIcon } from './icons';

function fmt(v) {
  return v === null || v === undefined ? '–' : v.toFixed(1);
}

export default function ResultsTab({ iros, thresholds }) {
  if (!iros.length) {
    return <div className="bg-surface rounded-2xl p-10 text-center text-text-secondary text-[13px]">This assessment has no IROs yet.</div>;
  }

  const topicIds = [...new Set(iros.map((i) => i.topic))];
  const topics = topicIds
    .map((id) => ({ meta: ESRS_TOPICS.find((t) => t.id === id) ?? { id, cat: 'E', name: id }, agg: aggregateTopic(id, iros, thresholds) }))
    .filter((t) => t.agg);

  const sortedIros = [...iros].sort((a, b) => {
    const scoreA = aggregateIro(a, thresholds).effectiveValue;
    const scoreB = aggregateIro(b, thresholds).effectiveValue;
    return (scoreB ?? -1) - (scoreA ?? -1);
  });

  return (
    <div>
      <DmaMascot title="How is this calculated?">
        <p className="mb-2">
          Impact score = severity × (likelihood ÷ 5), averaged across every assessor who rated that IRO. Financial
          score = magnitude × (financial likelihood ÷ 5). A topic is material if any one of its IROs individually
          clears its threshold (default 3.0 on both axes).
        </p>
      </DmaMascot>

      <h2 className="text-[24px] font-bold flex items-center gap-3 mb-1">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #6C8CFF, #4C6FFF)' }}>
          <ResultsIcon size={19} />
        </span>
        Results
      </h2>
      <p className="text-[12px] text-text-secondary mb-5">Topic Summary, every rated IRO, and the notes captured behind each one.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {topics.map(({ meta, agg }) => {
          const ratedCount = agg.iros.filter((i) => i.assessments.length > 0).length;
          const pillar = PILLAR_COLOR[meta.cat];
          return (
            <div key={meta.id} className="bg-surface border border-border-apus rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9.5px] font-semibold rounded px-1.5 py-0.5" style={{ color: pillar.text, background: pillar.bg }}>{meta.id}</span>
                {agg.isMaterial && <span className="text-[9.5px] font-semibold rounded-full px-2 py-0.5" style={{ color: MATERIAL_BADGE.text, background: MATERIAL_BADGE.bg }}>MATERIAL</span>}
              </div>
              <p className="text-[13px] font-semibold mb-2">{meta.name}</p>
              <p className="text-[11px] text-text-secondary mb-2">{ratedCount} of {agg.iros.length} IROs rated</p>
              <div className="flex gap-4 text-[12px]">
                <span>Impact <b>{fmt(agg.impactScore)}</b></span>
                <span>Financial <b>{fmt(agg.financialScore)}</b></span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        {sortedIros.map((iro) => {
          const agg = aggregateIro(iro, thresholds);
          const score = agg.effectiveValue;
          const pillar = PILLAR_COLOR[pillarFor(iro.topic)];
          return (
            <div key={iro.id} className="bg-surface border border-border-apus rounded-xl p-4">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-[9.5px] font-semibold rounded px-1.5 py-0.5" style={{ color: pillar.text, background: pillar.bg }}>{iro.topic}</span>
                  <span className="text-[12.5px] font-semibold">{iro.name}</span>
                  <span className="text-[9.5px] text-text-secondary">{TYPE_LABEL[iro.iroType]}</span>
                  {agg.isMaterial && <span className="text-[9.5px] font-semibold rounded-full px-2 py-0.5" style={{ color: MATERIAL_BADGE.text, background: MATERIAL_BADGE.bg }}>MATERIAL</span>}
                  {agg.discrepancy && <span className="text-[9.5px] rounded-full px-2 py-0.5 border border-text-secondary text-text-secondary">Needs review</span>}
                  {iro.calibration?.calibrated_value !== null && iro.calibration?.calibrated_value !== undefined && (
                    <span className="text-[9.5px] font-semibold rounded-full px-2 py-0.5" style={{ background: 'rgba(76,111,255,0.14)', color: '#4C6FFF' }}>Calibrated</span>
                  )}
                </div>
                <span className="text-[13px] font-bold" style={{ color: pillar.text }}>{fmt(score)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-app-black overflow-hidden mb-2">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, ((score ?? 0) / 5) * 100)}%`, background: pillar.text }} />
              </div>
              <p className="text-[11px] text-text-secondary">
                {agg.n} assessor{agg.n === 1 ? '' : 's'} rated this IRO{agg.n === 0 ? ' — not yet rated' : ` (${agg.sourceBasis})`}
              </p>

              {iro.sessionNotes && (
                <div className="rounded-lg px-3 py-2.5 mt-2.5" style={{ background: 'rgba(76,111,255,0.08)', border: '1px solid rgba(76,111,255,0.2)' }}>
                  <p className="text-[10.5px] font-semibold mb-1" style={{ color: '#4C6FFF' }}>SESSION NOTES</p>
                  <p className="text-[12px] text-text-secondary">{iro.sessionNotes}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

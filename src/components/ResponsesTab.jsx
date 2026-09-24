import { useEffect, useState } from 'react';
import { aggregateIro, hasImpactAxis } from '../lib/calc';
import { ESRS_TOPICS, TYPE_LABEL, PILLAR_COLOR, MATERIAL_BADGE, pillarFor } from '../lib/topics';
import { ResponsesIcon } from './icons';
import DmaMascot from './DmaMascot';
import { fetchResponsesData, fetchIroComments, fetchInvitationName, purgeUnfinishedDrafts } from '../lib/data';

const SURVEY_STATUS_COLOR = { Draft: '#8B8B98', Scheduled: '#8B8B98', Active: '#4C6FFF', Closed: '#8B8B98', Completed: '#5ED996' };
const SESSION_STATUS_LABEL = { planned: 'Planned', paused: 'Paused', finished: 'Finished' };
const SESSION_STATUS_COLOR = { planned: '#8B8B98', paused: '#D79A4C', finished: '#5ED996' };

function surveyStatusLabel(a) {
  if (!a.startDate) return 'Active';
  const today = new Date().toISOString().split('T')[0];
  if (today < a.startDate) return 'Scheduled';
  if (a.endDate && today > a.endDate) return 'Closed';
  return 'Active';
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

function Bar({ value, threshold, color }) {
  if (value === null) return <p className="text-[11px] text-text-secondary">–</p>;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 bg-surface-2 rounded h-3.5 relative overflow-hidden">
        <div className="absolute top-0 bottom-0 w-px bg-border-apus" style={{ left: `${(threshold / 5) * 100}%` }} />
        <div className="h-full rounded" style={{ width: `${(value / 5) * 100}%`, background: color }} />
      </div>
      <span className="text-[11px] font-semibold w-8 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

function ProgressBar({ value, total, color = '#4C6FFF' }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="bg-surface-2 rounded h-2 overflow-hidden">
      <div className="h-full rounded" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function SourcePanel({ title, statusLabel, statusColor, rateLabel, rateValue, rateTotal, stats, extra, onLink, linkLabel, showDeleteDrafts, onDeleteDrafts, canDeleteDrafts }) {
  return (
    <div className="bg-surface rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-[14px]">{title}</p>
        <span className="text-[9.5px] font-semibold rounded-full px-2 py-0.5 uppercase tracking-wide" style={{ color: statusColor, background: `${statusColor}22` }}>{statusLabel}</span>
      </div>
      <p className="text-[11px] text-text-secondary mb-1">{rateLabel}</p>
      <ProgressBar value={rateValue} total={rateTotal} />
      <p className="text-[10.5px] text-text-secondary mt-1 mb-3">{rateValue} of {rateTotal}</p>
      {extra}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-surface-2 rounded-lg p-2 text-center">
            <p className="text-[15px] font-bold">{value}</p>
            <p className="text-[9.5px] text-text-secondary">{label}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        {onLink && <button onClick={onLink} className="text-[11.5px] font-semibold text-badge-blue">{linkLabel} →</button>}
        {showDeleteDrafts && (
          <button
            onClick={onDeleteDrafts}
            disabled={!canDeleteDrafts}
            title={canDeleteDrafts ? undefined : 'Available once this assessment is Closed'}
            className="text-[11px] text-text-secondary hover:text-badge-amber disabled:opacity-40 ml-auto"
          >
            Delete unfinished drafts
          </button>
        )}
      </div>
    </div>
  );
}

function DetailPanel({ iro, thresholds, onOpenCalibrate }) {
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [filter, setFilter] = useState('all'); // all | expert_survey | expert_live_session
  const [revealed, setRevealed] = useState({});

  useEffect(() => {
    let cancelled = false;
    setLoadingComments(true);
    fetchIroComments(iro.id).then((rows) => { if (!cancelled) { setComments(rows); setLoadingComments(false); } }).catch(() => setLoadingComments(false));
    return () => { cancelled = true; };
  }, [iro.id]);

  const agg = aggregateIro(iro, thresholds);
  const score = agg.effectiveValue;
  const flagLabel = agg.isMaterial ? 'Material' : agg.discrepancy ? `Sources differ` : score === null ? 'Needs survey input' : 'Below threshold';
  const flagExplain = agg.sourceGap
    ? `The survey and live session averages differ by ${Math.abs((agg.surveyAvg ?? 0) - (agg.sessionAvg ?? 0)).toFixed(1)} — worth a closer look before relying on the combined score.`
    : agg.discrepancy
    ? 'Individual assessors diverged by 1.5 or more on an axis.'
    : agg.isMaterial
    ? 'This IRO clears its threshold using the calibrated value where one exists, otherwise the calculated one.'
    : score === null
    ? 'No expert survey responses have come in yet for this topic.'
    : 'Below the materiality threshold on its axis.';

  const filtered = comments.filter((c) => filter === 'all' || c.source === filter);

  async function reveal(c) {
    if (!c.invitation_id || revealed[c.invitation_id]) return;
    try {
      const name = await fetchInvitationName(c.invitation_id);
      setRevealed((prev) => ({ ...prev, [c.invitation_id]: name }));
    } catch { /* leave unrevealed on error */ }
  }

  function downloadComments() {
    downloadCsv(`${iro.name}-comments.csv`, [
      ['Source', 'Stakeholder group', 'Expertise', 'Criterion', 'Value', 'Comment', 'Date'],
      ...filtered.map((c) => [TYPE_LABEL[c.source] ?? c.source, c.stakeholder_group ?? '', (c.expertise_topics || []).join('/'), c.criterion_key ?? 'Topic', c.value ?? '', c.comment, c.commented_at]),
    ]);
  }

  return (
    <div className="bg-surface rounded-2xl p-4">
      <p className="font-bold text-[14px] mb-1">{iro.name}</p>
      <p className="text-[11px] text-text-secondary mb-3">{iro.topic} · {TYPE_LABEL[iro.iroType]}</p>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-surface-2 rounded-lg p-2 text-center">
          <p className="text-[13px] font-bold">{agg.surveyAvg !== null ? agg.surveyAvg.toFixed(1) : '–'}</p>
          <p className="text-[9px] text-text-secondary">SURVEY</p>
        </div>
        <div className="bg-surface-2 rounded-lg p-2 text-center">
          <p className="text-[13px] font-bold">{agg.sessionAvg !== null ? agg.sessionAvg.toFixed(1) : '–'}</p>
          <p className="text-[9px] text-text-secondary">SESSION</p>
        </div>
        <div className="bg-surface-2 rounded-lg p-2 text-center">
          <p className="text-[13px] font-bold" style={{ color: '#4C6FFF' }}>{score !== null ? score.toFixed(1) : '–'}</p>
          <p className="text-[9px] text-text-secondary">COMBINED</p>
        </div>
      </div>

      <div className="rounded-lg px-3 py-2.5 mb-3" style={{ background: agg.isMaterial ? 'rgba(215,154,76,0.1)' : 'rgba(139,139,152,0.08)' }}>
        <p className="text-[11.5px] font-semibold mb-0.5" style={{ color: agg.isMaterial ? '#D79A4C' : '#8B8B98' }}>{flagLabel}</p>
        <p className="text-[10.5px] text-text-secondary">{flagExplain}</p>
      </div>

      <button onClick={() => onOpenCalibrate(iro)} className="text-[11.5px] font-semibold text-badge-blue mb-3">Open in Calibrate →</button>

      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-text-secondary">COMMENTS AND JUSTIFICATIONS</p>
        <button onClick={downloadComments} className="text-[10.5px] text-text-secondary hover:text-text-primary">⭳ CSV</button>
      </div>
      <div className="flex gap-1.5 mb-2">
        {[['all', 'All'], ['expert_survey', 'Survey'], ['expert_live_session', 'Session']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)} className="text-[10.5px] font-semibold rounded-full px-2.5 py-1" style={{ background: filter === val ? '#4C6FFF' : 'transparent', color: filter === val ? '#F5F6FA' : '#8B8B98', border: '1px solid ' + (filter === val ? 'transparent' : '#2A2830') }}>
            {label}
          </button>
        ))}
      </div>

      {loadingComments ? (
        <p className="text-[11px] text-text-secondary">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-[11px] text-text-secondary">No comments or justifications yet.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
          {filtered.map((c, i) => (
            <div key={i} className="bg-surface-2 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[9.5px] font-semibold rounded px-1.5 py-0.5" style={{ background: c.source === 'expert_survey' ? 'rgba(94,217,150,0.14)' : 'rgba(76,111,255,0.14)', color: c.source === 'expert_survey' ? '#5ED996' : '#4C6FFF' }}>{TYPE_LABEL[c.source] ?? c.source}</span>
                {c.stakeholder_group && <span className="text-[10.5px] text-text-secondary">{c.stakeholder_group}</span>}
                {c.criterion_key && <span className="text-[10.5px] text-text-secondary">· {c.criterion_key} = {c.value}</span>}
                <span className="text-[9.5px] text-text-secondary ml-auto">{c.commented_at ? new Date(c.commented_at).toLocaleDateString() : ''}</span>
              </div>
              <p className="text-[11.5px] text-text-secondary mb-1">{c.comment}</p>
              {c.invitation_id && (
                revealed[c.invitation_id] ? (
                  <p className="text-[10.5px]" style={{ color: '#4C6FFF' }}>{revealed[c.invitation_id]}</p>
                ) : (
                  <button onClick={() => reveal(c)} className="text-[10.5px] text-text-secondary hover:text-badge-blue">Reveal name</button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Section 8, "Responses (new screen)" — one place to see what's come in,
// from whom and what it says, so the consultant doesn't have to open
// Supabase. Reads assessment_progress/group_engagement/iro_comments (new
// read-only views) plus fetchCycleIros' already-existing per-source score
// breakdown (calc.js's aggregateIro: surveyAvg/sessionAvg/sourceBasis/
// sourceGap already existed, built for Calibrate's detail panel — reused
// here rather than duplicated).
export default function ResponsesTab({ cycles, onOpenInvitations, onResumeSession, onOpenCalibrate, onChanged }) {
  const financialYears = [...new Set(cycles.map((c) => c.financialYear))].sort((a, b) => b - a);
  const [financialYear, setFinancialYear] = useState(financialYears[0] ?? null);
  const [data, setData] = useState({ assessments: [], progress: [], groupEngagement: [], iros: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all'); // all | expert_survey | expert_live_session
  const [topicFilter, setTopicFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [perspectiveFilter, setPerspectiveFilter] = useState('all'); // all | impact | financial
  const [openIroId, setOpenIroId] = useState(null);

  useEffect(() => {
    if (cycles.length && !cycles.some((c) => c.financialYear === financialYear)) {
      setFinancialYear(financialYears[0] ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycles]);

  const cycle = cycles.find((c) => c.financialYear === financialYear) ?? null;
  const thresholds = { impact: cycle?.impactThreshold ?? 3.0, financial: cycle?.financialThreshold ?? 3.0 };

  function reload() {
    if (!cycle) { setData({ assessments: [], progress: [], groupEngagement: [], iros: [] }); setLoading(false); return; }
    setLoading(true);
    fetchResponsesData(cycle.id).then((d) => { setData(d); setLoading(false); }).catch((err) => { setError(err.message); setLoading(false); });
  }

  useEffect(reload, [cycle?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const surveyAssessment = data.assessments.find((a) => a.type === 'expert_survey') ?? null;
  const liveAssessment = data.assessments.find((a) => a.type === 'expert_live_session') ?? null;
  const surveyProgress = data.progress.filter((p) => p.assessment_id === surveyAssessment?.id);
  const liveProgress = data.progress.find((p) => p.assessment_id === liveAssessment?.id) ?? null;

  const surveyInvited = surveyProgress.reduce((s, p) => s + p.invited_count, 0);
  const surveyOpened = surveyProgress.reduce((s, p) => s + p.opened_count, 0);
  const surveyDrafts = surveyProgress.reduce((s, p) => s + p.saved_draft_count, 0);
  const surveySubmitted = surveyProgress.reduce((s, p) => s + p.submitted_count, 0);
  const surveyStatus = surveyAssessment ? surveyStatusLabel(surveyAssessment) : null;
  const surveyCanDeleteDrafts = surveyStatus === 'Closed' && surveyDrafts > 0;

  const liveStatusLabel = liveProgress?.live_session_status ? SESSION_STATUS_LABEL[liveProgress.live_session_status] : null;

  const topicIds = [...new Set(data.iros.map((i) => i.topic))];
  const groupNames = [...new Set(data.groupEngagement.map((g) => g.group_name))];

  const filteredIros = data.iros.filter((iro) => {
    if (topicFilter !== 'all' && iro.topic !== topicFilter) return false;
    if (perspectiveFilter === 'impact' && !hasImpactAxis(iro.iroType)) return false;
    if (perspectiveFilter === 'financial' && hasImpactAxis(iro.iroType)) return false;
    if (sourceFilter !== 'all') {
      const agg = aggregateIro(iro, thresholds);
      if (sourceFilter === 'expert_survey' && agg.surveyAvg === null) return false;
      if (sourceFilter === 'expert_live_session' && agg.sessionAvg === null) return false;
    }
    if (groupFilter !== 'all') {
      const groupRows = data.groupEngagement.filter((g) => g.group_name === groupFilter);
      if (!groupRows.length) return false;
    }
    return true;
  });

  const iroByTopic = topicIds
    .map((id) => ({ id, meta: ESRS_TOPICS.find((t) => t.id === id), rows: filteredIros.filter((i) => i.topic === id) }))
    .filter((t) => t.rows.length > 0);

  const openIro = data.iros.find((i) => i.id === openIroId) ?? null;

  async function handleDeleteDrafts() {
    if (!surveyAssessment) return;
    if (!window.confirm('Delete every unfinished draft for this survey? Submitted responses are never affected. This cannot be undone.')) return;
    try {
      await purgeUnfinishedDrafts(surveyAssessment.id);
      reload();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  }

  function downloadIroTable() {
    downloadCsv('responses-iro-table.csv', [
      ['ESRS Topic', 'IRO', 'Type', 'Survey score', 'Session score', 'Combined score', 'Basis', 'Ratings', 'Flag'],
      ...filteredIros.map((iro) => {
        const agg = aggregateIro(iro, thresholds);
        const flag = agg.isMaterial ? 'Material' : agg.sourceGap ? `Sources differ by ${Math.abs((agg.surveyAvg ?? 0) - (agg.sessionAvg ?? 0)).toFixed(1)}` : agg.effectiveValue === null ? 'Needs survey input' : 'Below threshold';
        return [iro.topic, iro.name, TYPE_LABEL[iro.iroType], agg.surveyAvg?.toFixed(1) ?? '', agg.sessionAvg?.toFixed(1) ?? '', agg.effectiveValue?.toFixed(1) ?? '', agg.sourceBasis, agg.n, flag];
      }),
    ]);
  }

  return (
    <div>
      <h2 className="text-[24px] font-bold text-white flex items-center gap-3 mb-1">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg, #7C9BFF, #4C6FFF)' }}>
          <ResponsesIcon size={19} />
        </span>
        Responses
      </h2>
      <p className="text-[12px] text-text-secondary mb-5">What's come in, from whom and what it says — no need to open Supabase.</p>

      {error && <p className="text-[12px] text-badge-amber mb-4">{error}</p>}

      <div className="flex gap-3 mb-5 flex-wrap items-center">
        {financialYears.length > 1 && (
          <select value={financialYear ?? ''} onChange={(e) => setFinancialYear(Number(e.target.value))} className="bg-surface border border-border-apus rounded-lg px-3 py-1.5 text-[12px] outline-none">
            {financialYears.map((y) => <option key={y} value={y}>FY{y}</option>)}
          </select>
        )}
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="bg-surface border border-border-apus rounded-lg px-3 py-1.5 text-[12px] outline-none">
          <option value="all">All sources</option>
          <option value="expert_survey">Expert survey</option>
          <option value="expert_live_session">Expert live session</option>
        </select>
        <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} className="bg-surface border border-border-apus rounded-lg px-3 py-1.5 text-[12px] outline-none">
          <option value="all">All ESRS topics</option>
          {topicIds.map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="bg-surface border border-border-apus rounded-lg px-3 py-1.5 text-[12px] outline-none">
          <option value="all">All stakeholder groups</option>
          {groupNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={perspectiveFilter} onChange={(e) => setPerspectiveFilter(e.target.value)} className="bg-surface border border-border-apus rounded-lg px-3 py-1.5 text-[12px] outline-none">
          <option value="all">Both perspectives</option>
          <option value="impact">Impact</option>
          <option value="financial">Financial</option>
        </select>
        <button onClick={() => { setSourceFilter('all'); setTopicFilter('all'); setGroupFilter('all'); setPerspectiveFilter('all'); }} className="text-[11.5px] text-text-secondary hover:text-text-primary">Reset filters</button>
      </div>

      {loading ? (
        <p className="text-[13px] text-text-secondary">Loading…</p>
      ) : !cycle ? (
        <div className="bg-surface rounded-2xl p-10 text-center text-text-secondary text-[13px]">No assessments yet.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <SourcePanel
              title="Expert survey"
              statusLabel={surveyStatus ?? 'No assessment'}
              statusColor={SURVEY_STATUS_COLOR[surveyStatus] ?? '#8B8B98'}
              rateLabel="Engagement rate (submitted, incl. drafts, of invited)"
              rateValue={surveySubmitted + surveyDrafts}
              rateTotal={surveyInvited}
              stats={[['Invited', surveyInvited], ['Opened', surveyOpened], ['Saved draft', surveyDrafts], ['Submitted', surveySubmitted]]}
              onLink={surveyAssessment ? () => onOpenInvitations(surveyAssessment) : null}
              linkLabel="Invitations"
              showDeleteDrafts={!!surveyAssessment}
              canDeleteDrafts={surveyCanDeleteDrafts}
              onDeleteDrafts={handleDeleteDrafts}
            />
            <SourcePanel
              title="Expert live session"
              statusLabel={liveStatusLabel ?? 'No assessment'}
              statusColor={SESSION_STATUS_COLOR[liveProgress?.live_session_status] ?? '#8B8B98'}
              rateLabel="Attendance rate (attended of expected)"
              rateValue={liveProgress?.attended_count ?? 0}
              rateTotal={liveProgress?.expected_count ?? 0}
              stats={[
                ['Expected', liveProgress?.expected_count ?? 0],
                ['Attended', liveProgress?.attended_count ?? 0],
                ['Topics rated', liveProgress?.topics_rated_count ?? 0],
                ['Sessions', liveAssessment ? 1 : 0],
              ]}
              extra={liveProgress && (
                <p className="text-[10.5px] text-text-secondary mb-3">Session progress: {liveProgress.topics_rated_count} of {liveProgress.total_topics} topics rated</p>
              )}
              onLink={liveAssessment ? () => onResumeSession(liveAssessment) : null}
              linkLabel="Resume session"
            />
          </div>

          {data.groupEngagement.length > 0 && (
            <div className="bg-surface rounded-2xl p-5 mb-6">
              <p className="font-semibold text-[14px] mb-3">Engagement by stakeholder group</p>
              <div className="flex flex-col gap-2.5">
                {data.groupEngagement.map((g) => (
                  <div key={g.stakeholder_group_id} className="flex items-center gap-3">
                    <span className="text-[12px] w-40 truncate flex items-center gap-1.5">
                      {g.group_name}
                      {g.group_type === 'silent' && <span className="text-[9px] font-semibold rounded-full px-1.5 py-0.5" style={{ background: 'rgba(94,217,150,0.14)', color: '#5ED996' }}>Silent stakeholder</span>}
                    </span>
                    <div className="flex-1"><ProgressBar value={g.submitted_count} total={g.invited_count} /></div>
                    <span className="text-[11px] text-text-secondary w-28 text-right">
                      {g.invited_count === 0 ? '–' : g.submitted_count === 0 ? 'No response yet' : g.submitted_count === g.invited_count ? 'Complete' : `${g.submitted_count} of ${g.invited_count}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-[14px]">IRO ratings</p>
            <button onClick={downloadIroTable} className="text-[11.5px] font-semibold border border-border-apus rounded-lg px-3 py-1.5">⭳ CSV</button>
          </div>

          <div className="grid grid-cols-[1fr_320px] gap-4">
            <div className="flex flex-col gap-4">
              {iroByTopic.length === 0 ? (
                <div className="bg-surface rounded-2xl p-10 text-center text-text-secondary text-[13px]">No IROs match the current filters.</div>
              ) : iroByTopic.map(({ id, meta, rows }) => {
                const pillar = PILLAR_COLOR[pillarFor(id)];
                return (
                  <div key={id} className="bg-surface rounded-2xl overflow-hidden">
                    <div className="px-4 py-2.5" style={{ background: pillar.bg }}>
                      <p className="text-[12px] font-semibold" style={{ color: pillar.text }}>{id} · {meta?.name ?? id}</p>
                    </div>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[10px] text-text-secondary tracking-wide">
                          <th className="font-medium px-4 pt-3 pb-2">IRO</th>
                          <th className="font-medium pt-3 pb-2 w-28">SURVEY</th>
                          <th className="font-medium pt-3 pb-2 w-28">SESSION</th>
                          <th className="font-medium pt-3 pb-2 w-28">COMBINED</th>
                          <th className="font-medium pt-3 pb-2 pr-4 w-36">FLAG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((iro) => {
                          const agg = aggregateIro(iro, thresholds);
                          const threshold = hasImpactAxis(iro.iroType) ? thresholds.impact : thresholds.financial;
                          const flag = agg.isMaterial ? 'Material' : agg.sourceGap ? `Sources differ by ${Math.abs((agg.surveyAvg ?? 0) - (agg.sessionAvg ?? 0)).toFixed(1)}` : agg.effectiveValue === null ? 'Needs survey input' : 'Below threshold';
                          const color = pillar.text;
                          return (
                            <tr key={iro.id} onClick={() => setOpenIroId(iro.id)} className={`border-t border-border-apus cursor-pointer hover:bg-surface-2 ${openIroId === iro.id ? 'bg-surface-2' : ''}`}>
                              <td className="px-4 py-2.5 text-[12px] font-medium">{iro.name}<br /><span className="text-[10px] text-text-secondary">{TYPE_LABEL[iro.iroType]}</span></td>
                              <td className="py-2.5 pr-2"><Bar value={agg.surveyAvg} threshold={threshold} color={color} /></td>
                              <td className="py-2.5 pr-2"><Bar value={agg.sessionAvg} threshold={threshold} color={color} /></td>
                              <td className="py-2.5 pr-2"><Bar value={agg.effectiveValue} threshold={threshold} color={color} /></td>
                              <td className="py-2.5 pr-4">
                                <span className="text-[9.5px] font-semibold rounded-full px-2 py-0.5" style={{ color: agg.isMaterial ? MATERIAL_BADGE.text : '#8B8B98', background: agg.isMaterial ? MATERIAL_BADGE.bg : 'rgba(139,139,152,0.1)' }}>{flag}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>

            <div>
              {openIro ? (
                <DetailPanel iro={openIro} thresholds={thresholds} onOpenCalibrate={onOpenCalibrate} />
              ) : (
                <div className="bg-surface rounded-2xl p-8 text-center text-text-secondary text-[12px]">Click an IRO to see its comments and justifications.</div>
              )}
            </div>
          </div>
        </>
      )}

      <DmaMascot title="No expertise-coverage view">
        <p>Which expertise is needed depends on which topics were chosen for this round, so a coverage gap here would be misleading — that view isn't built.</p>
      </DmaMascot>
    </div>
  );
}

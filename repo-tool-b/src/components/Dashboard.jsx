import { useState } from 'react';
import { aggregateIro, aggregateTopic } from '../lib/calc';

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function ProfileHeader({ assessments, onGoToAssessment }) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  const closingSoon = assessments.filter((a) => {
    if (!a.endDate || a.status) return false;
    const days = (new Date(a.endDate) - new Date()) / 86400000;
    return days >= 0 && days <= 3;
  });

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <p className="text-[24px] font-bold text-white">
          {editing ? (
            <input
              autoFocus value={name} onChange={(e) => setName(e.target.value)}
              onBlur={() => setEditing(false)} onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
              placeholder="Your name"
              className="bg-surface-2 rounded px-2 py-0.5 text-[15px] outline-none"
            />
          ) : (
            <>Hello{name ? `, ${name}` : ''} 👋</>
          )}
        </p>
        <p className="text-[12px] text-text-secondary mt-0.5">Let's see what we have for you today.</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onGoToAssessment}
          className="text-[12px] font-semibold rounded-lg px-4 py-2"
          style={{ background: '#4C6FFF', color: '#F5F6FA' }}
        >
          {assessments.length === 0 ? 'Start here →' : 'Continue to assessments →'}
        </button>

        <div className="relative">
          <button onClick={() => setBellOpen((o) => !o)} className="w-9 h-9 rounded-full bg-surface flex items-center justify-center relative text-text-secondary hover:text-text-primary">
            <BellIcon />
            {closingSoon.length > 0 && <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full" style={{ background: '#D79A4C' }} />}
          </button>
          {bellOpen && (
            <div className="absolute right-0 top-11 z-20 w-64 bg-surface border border-border-apus rounded-xl p-3 shadow-lg">
              <p className="text-[11px] font-semibold text-text-secondary mb-2">NOTIFICATIONS</p>
              {closingSoon.length === 0 ? (
                <p className="text-[12px] text-text-secondary">Nothing needs your attention right now.</p>
              ) : (
                closingSoon.map((a) => (
                  <p key={a.id} className="text-[12px] mb-1.5 last:mb-0">"{a.name}" closes within 3 days</p>
                ))
              )}
            </div>
          )}
        </div>

        <button onClick={() => setEditing(true)} className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold" style={{ background: '#4C6FFF22', color: '#4C6FFF' }} title="Set up your profile">
          {name ? name.slice(0, 2).toUpperCase() : '?'}
        </button>
      </div>
    </div>
  );
}

function StatIcon({ color, path }) {
  return (
    <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}22` }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d={path} />
      </svg>
    </span>
  );
}

const ICONS = {
  progress: 'M12 20V10M18 20V4M6 20v-4',
  topics: 'M4 6h16M4 12h16M4 18h10',
  material: 'M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z',
  assessments: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
};

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: `linear-gradient(160deg, ${color}14, var(--color-surface))` }}>
      <div className="flex items-center gap-2.5 mb-3">
        <StatIcon color={color} path={icon} />
        <p className="text-[11px] text-text-secondary">{label}</p>
      </div>
      <p className="text-[26px] font-bold">{value}</p>
      {sub && <p className="text-[11px] text-text-secondary mt-1">{sub}</p>}
    </div>
  );
}

function Gauge({ percent }) {
  const r = 54, c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#1A1820" strokeWidth="12" />
      <circle
        cx="70" cy="70" r={r} fill="none" stroke="#4C6FFF" strokeWidth="12" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 70 70)"
      />
      <text x="70" y="75" textAnchor="middle" fontSize="22" fontWeight="800" fill="#F5F6FA">{percent}%</text>
    </svg>
  );
}

function timeAgo(ts) {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function Dashboard({ iros, assessments, calibrations, onGoToAssessment }) {
  const topicIds = [...new Set(iros.map((i) => i.topic))];
  const topics = topicIds.map((id) => aggregateTopic(id, iros)).filter(Boolean);
  const materialCount = topics.filter((t) => t.isMaterial).length;

  const ratedIros = iros.filter((i) => aggregateIro(i).n > 0);
  const ratingProgress = iros.length ? Math.round((ratedIros.length / iros.length) * 100) : 0;

  // Real activity feed — built from actual assessment completions and calibration saves, not fabricated.
  const activity = [
    ...assessments.map((a) => ({
      ts: a.updatedAt ?? a.createdAt ?? 0,
      color: '#4C6FFF',
      text: `${a.name.includes('adjusted') ? 'Adjusted' : 'Completed'}: ${a.type}`,
    })),
    ...Object.entries(calibrations)
      .filter(([, c]) => c.calibratedAt)
      .map(([iroId, c]) => ({
        ts: c.calibratedAt,
        color: '#D79A4C',
        text: `Calibrated: ${iros.find((i) => i.id === iroId)?.name ?? 'a topic'}`,
      })),
  ].sort((a, b) => b.ts - a.ts).slice(0, 6);

  return (
    <div>
      <ProfileHeader assessments={assessments} onGoToAssessment={onGoToAssessment} />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Rating progress" value={`${ratingProgress}%`} sub={`${ratedIros.length}/${iros.length} IROs rated`} color="#4C6FFF" icon={ICONS.progress} />
        <StatCard label="Topics tracked" value={topics.length} color="#4C6FFF" icon={ICONS.topics} />
        <StatCard label="Material topics" value={materialCount} sub={topics.length ? `of ${topics.length} tracked` : undefined} color="#D79A4C" icon={ICONS.material} />
        <StatCard label="Assessments run" value={assessments.length} color="#9B7FE0" icon={ICONS.assessments} />
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
        <div className="bg-surface rounded-2xl p-5">
          <p className="text-[12px] font-semibold mb-4">Topics by materiality</p>
          {topics.length === 0 ? (
            <p className="text-[12px] text-text-secondary">Upload and rate IROs to see this breakdown.</p>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-text-secondary w-20">Material</span>
                <div className="flex-1 bg-surface-2 rounded h-3 overflow-hidden">
                  <div className="h-full" style={{ width: `${(materialCount / topics.length) * 100}%`, background: '#D79A4C' }} />
                </div>
                <span className="text-[11px] w-8 text-right">{materialCount}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-text-secondary w-20">Not material</span>
                <div className="flex-1 bg-surface-2 rounded h-3 overflow-hidden">
                  <div className="bg-emerald h-full" style={{ width: `${((topics.length - materialCount) / topics.length) * 100}%` }} />
                </div>
                <span className="text-[11px] w-8 text-right">{topics.length - materialCount}</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-surface rounded-2xl p-5 flex flex-col items-center justify-center">
          <Gauge percent={ratingProgress} />
          <p className="text-[11px] text-text-secondary mt-2">Rating progress</p>
        </div>

        <div className="bg-surface rounded-2xl p-5">
          <p className="text-[12px] font-semibold mb-4">Recent activity</p>
          {activity.length === 0 ? (
            <p className="text-[12px] text-text-secondary">No activity yet — complete an assessment to see it here.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {activity.map((a, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
                  <span className="text-[11.5px] flex-1 truncate">{a.text}</span>
                  <span className="text-[10px] text-text-secondary shrink-0">{timeAgo(a.ts)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { SettingsIcon } from './icons';

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function initials(name, email) {
  const source = (name || email || '?').trim();
  if (!source) return '?';
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

// Persistent identity + notifications, fixed to the top of every screen
// except Assessments (whose own wizard step navigation already occupies
// that space, per product-spec.md Section 8's "Guidance on every screen").
// Real me/avatar data — not the reference prototype's disconnected
// local-state "Set up your profile" stub this replaces on Dashboard.
export default function GlobalHeader({ me, assessments, onOpenProfile, onOpenAdminRoles }) {
  const [bellOpen, setBellOpen] = useState(false);
  const ref = useRef(null);
  const canManageTeam = me.isOwner || me.isAdmin;

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setBellOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const closingSoon = assessments.filter((a) => {
    if (!a.endDate) return false;
    const days = (new Date(a.endDate) - new Date()) / 86400000;
    return days >= 0 && days <= 3;
  });

  return (
    <div
      className="sticky top-0 z-30 flex items-center justify-end gap-3 py-3 mb-5"
      style={{ background: 'rgba(7,7,11,0.92)', backdropFilter: 'blur(6px)', borderBottom: '1px solid #2A2830' }}
    >
      {canManageTeam && (
        <button onClick={onOpenAdminRoles} title="Settings" className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-text-secondary hover:text-text-primary">
          <SettingsIcon size={17} />
        </button>
      )}

      <div className="relative" ref={ref}>
        <button onClick={() => setBellOpen((o) => !o)} title="Notifications" className="w-9 h-9 rounded-full bg-surface flex items-center justify-center relative text-text-secondary hover:text-text-primary">
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

      <button onClick={onOpenProfile} title="Edit profile" className="shrink-0">
        {me.avatarUrl ? (
          <img src={me.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold" style={{ background: '#4C6FFF22', color: '#4C6FFF' }}>
            {initials(me.name, me.email)}
          </div>
        )}
      </button>
    </div>
  );
}

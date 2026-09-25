import { useEffect, useRef, useState } from 'react';
import { signOut } from '../lib/data';
import { ProfileIcon, AdminIcon, ChevronDownIcon } from './icons';

function initials(name, email) {
  const source = (name || email || '?').trim();
  if (!source) return '?';
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

// Replaces the sidebar's plain "email + sign out" block. Settings lives here,
// behind the avatar — never a left-rail nav item (Group 4, per instruction).
// Profile is every role's; Admin & Roles only shows for Tool Owner/Admin.
export default function SettingsMenu({ me, collapsed, tab, onOpenProfile, onOpenAdminRoles }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const canManageTeam = me.isOwner || me.isAdmin;

  return (
    <div className="px-2 pb-4 mb-2 border-b border-border-apus relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors ${tab === 'profile' || tab === 'admin-roles' ? 'bg-surface-2' : 'hover:bg-surface-2'}`}
      >
        {me.avatarUrl ? (
          <img src={me.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0" style={{ background: '#4C6FFF', color: '#07070B' }}>
            {initials(me.name, me.email)}
          </div>
        )}
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[12px] font-medium truncate">{me.name || me.email}</p>
              <p className="text-[10.5px] text-text-secondary truncate">{me.email}</p>
            </div>
            <ChevronDownIcon />
          </>
        )}
      </button>

      {open && (
        <div
          className="absolute left-2 bottom-full mb-1 w-56 bg-surface-2 border border-border-apus rounded-xl py-1.5 z-20 shadow-lg"
          style={{ left: collapsed ? 60 : 8 }}
        >
          <button
            onClick={() => { setOpen(false); onOpenProfile(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] hover:bg-surface text-left"
          >
            <ProfileIcon size={16} /> Profile
          </button>
          {canManageTeam && (
            <button
              onClick={() => { setOpen(false); onOpenAdminRoles(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] hover:bg-surface text-left"
            >
              <AdminIcon size={16} /> Admin &amp; Roles
            </button>
          )}
          <div className="my-1.5 border-t border-border-apus" />
          <button
            onClick={signOut}
            className="w-full text-left px-3 py-2 text-[12.5px] text-text-secondary hover:bg-surface"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

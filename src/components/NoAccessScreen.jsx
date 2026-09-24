import { signOut } from '../lib/data';

// CLAUDE.md Hard Rule: "A login with no matching team_members row sees
// 'No access yet — ask your Admin' and reaches nothing. This is the
// default-deny; build it explicitly, don't rely on RLS alone." A
// deactivated row (active = false) gets the same treatment — every policy
// already refuses that person at the database layer (tm_active_row() only
// returns active rows), this is just the matching screen-level message.
export default function NoAccessScreen({ email, deactivated }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface border border-border-apus rounded-2xl p-8 text-center">
        <p className="font-jost text-[20px] mb-1">apus</p>
        <p className="text-[11px] text-text-secondary mb-6">by greenfriend. — Consultant Console</p>
        <p className="text-[14px] font-semibold mb-2">
          {deactivated ? 'Access deactivated' : 'No access yet'}
        </p>
        <p className="text-[12.5px] text-text-secondary mb-1">
          Signed in as <b className="text-text-primary">{email}</b>
        </p>
        <p className="text-[12.5px] text-text-secondary mb-6">
          {deactivated
            ? 'Your account has been deactivated. Ask your Admin if this is unexpected.'
            : 'This login has no team member record yet — ask your Admin to add you in Settings → Admin & Roles.'}
        </p>
        <button
          onClick={signOut}
          className="text-[12px] font-semibold rounded-lg px-4 py-2 border border-border-apus"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

// access-matrix.md Section 6, rule 7: "Dashboard's and Report's underlying
// tables — refused, not just hidden from nav." Reused for Stakeholders and
// Topics too, since Sign-off only has no table access to stakeholder_groups/
// stakeholder_members/topic_library either (the Group 2 resolution) — a
// stated refusal, not a silently empty or broken screen.
export default function LockedScreen({ title }) {
  return (
    <div className="bg-surface rounded-2xl p-10 text-center">
      <p className="text-[14px] font-semibold mb-2">{title} is not available to Sign-off only</p>
      <p className="text-[12.5px] text-text-secondary max-w-md mx-auto">
        This access level is read-only where it has access at all, with exactly the sign-off actions its permissions grant. {title} isn't one of those screens — the database refuses it outright, not just this screen's navigation.
      </p>
    </div>
  );
}

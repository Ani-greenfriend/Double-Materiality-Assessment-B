# PROGRESS.md — new Remaining Work items (access stage)

> **Paste these onto the bottom of the Remaining work section of the REAL, current
> PROGRESS.md in the Tool B repo — do not replace the file with this.** I don't have
> a genuinely current copy (the only one uploaded is a stale Session-1 snapshot from
> 20 Sep that predates the whole PR #5 restore — Dashboard, Stakeholders, Topics,
> wizard, Calibrate & Results, Report builder — which Claude Code has since reported
> as built). Overwriting the real file with anything built from that stale snapshot
> would tell Claude Code those finished screens don't exist. Also add the two lines
> under "Known issues" below, and the one line under "Build decisions" if it applies.

### Access stage (CLAUDE.md regenerated, docs/access-matrix.md + docs/user-stories.md added — spec version governed bumped)
- [ ] Read docs/access-matrix.md and docs/user-stories.md in full before touching auth or any RLS policy
- [ ] Schema delta: create `team_members` (id, auth_user_id, email, name, phone_number, avatar_url, role_title, access_level enum 'full'/'signoff', is_admin, is_owner, can_signoff_topics, can_signoff_results, active, created_at, updated_at); seed one row for Anika Lerch (anikalerch@greenfriend.org), is_owner=true, is_admin=true, access_level='full'
- [ ] Add created_by/updated_by/updated_at to clients, topic_library, iros, stakeholder_groups, stakeholder_members (currently missing on all five)
- [ ] Add iro_list_signed_off, iro_list_signed_off_by, iro_list_signed_off_at to assessments (advisory gate — never blocks anything)
- [ ] Add results_signed_off (bool) to cycles; repurpose the existing signed_off_at/approver_name/approver_role/minutes_reference columns as the results-signoff detail fields rather than duplicating them (locking gate — blocks calibrations.calibrated_value/band_value updates while true, until an explicit, logged Revoke)
- [ ] Create the private `avatars` Storage bucket (separate from the existing public-read `logos` bucket); policy: own avatar for upload/delete, any avatar readable
- [ ] Build the auth-identity-to-team_members trigger: match a new Supabase Auth login's email to a team_members row and set auth_user_id; no match → "No access yet — ask your Admin" screen, reaching nothing
- [ ] Build every RLS policy, trigger, and function in docs/access-matrix.md Section 6 (13 numbered rules) — one pass, together with the schema delta above
- [ ] Build Settings → Admin & Roles (Tool Owner/Admin only; not rendered for Full access or Sign-off only): search, "+ New team member" (adds a row for an already-invited email), the legend, the team table with access-level dropdown and, for Sign-off-only rows, two independent checkboxes (Sign off Topics / Sign off Results); Admin toggle column, editable by Tool Owner only, locked with a tooltip for Admin
- [ ] Build Settings → Profile (every role): avatar upload, Edit/Save, name, role (display), email (not editable), phone, member since, access level with a one-line plain-language description of what it grants
- [ ] Put Settings behind the avatar dropdown in the header (Profile · Admin & Roles if Owner/Admin · Sign out) — not a left-rail nav item
- [ ] Restrict Sign-off only's read access to exactly: Topics, Assessments (read-only), Responses (read-only), Calibrate & Results — Dashboard and Report refused at the table level, not just hidden from nav
- [ ] Wire cycles.results_signed_off as a real lock on calibrations.calibrated_value/band_value (block the update; Revoke re-opens it, logged) and assessments.iro_list_signed_off as advisory only (never blocks) — these two gates behave differently on purpose, do not make them symmetric
- [ ] Half A of the refusal test: every `no` cell in docs/access-matrix.md Section 6, attempted through the API as Anika's session and as a logged-out/unrecognised identity — paste the results into this file
- [ ] Half B of the refusal test, Anika only: sign in, confirm full read/write everywhere, confirm she alone can toggle is_admin, confirm a submitted response is frozen, confirm the results-sign-off lock and revoke work
- [ ] Note explicitly: Sign-off only's Half B screen test is deferred — no named holder yet for can_signoff_topics or can_signoff_results

### Known issues — add these two lines
- The only PROGRESS.md available to the Project Governor for this pass was a stale 20 Sep, Session-1 snapshot. The real current state (as reported by Claude Code earlier in the build) already includes Dashboard, Stakeholders, Topics, the assessment wizard, Review Hub, live session, Calibrate & Results (with per-IRO sign-off restored per the builder's correction), and the PDF report builder. Reconcile this file's Current state / Last session / session number against git history at the next session start rather than trusting either the stale snapshot or this note blindly.
- Sign-off only has no named holder (name + email) yet for either can_signoff_topics or can_signoff_results — flagged, not blocking; add a name via Admin & Roles once one exists, then run that role's Half B screen test.

### Build decisions — add if it wasn't already recorded elsewhere
- Sign-off gates are asymmetric by deliberate design: Topics list sign-off is advisory (a record, never a lock); Results sign-off is a real lock on calibration values until explicitly revoked. This mirrors the earlier removal of the global cycle-stage lock in favour of finer, per-action locks.

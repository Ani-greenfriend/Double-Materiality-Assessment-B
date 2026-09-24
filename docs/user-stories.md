# User Stories — Apus DMA (Consultant Console + Expert Survey, shared database)

**Written against:** product-spec.md (Tool B) v2.0 amended 9 · product-spec.md (Tool A) v2.0 (amended) · supabase-setup.md as of 2026-09-20 — flagged as possibly stale, see access-matrix.md header
**Date:** 23 September 2026
**Author:** Anika (greenfriend)
**Status:** Confirmed
**Population pattern:** P1-variant, stack (see access-matrix.md Section 1.1)
**Companion file:** access-matrix.md (every story below cites exactly one cell of it)

> Read by the Project Governor (Iteration Mode) and by Claude Code when it builds the
> login and the access rules together. Each acceptance line is a screen test: the named
> person does the thing and sees the result. Stories whose cell is `no` are refusal tests
> and are as important as the others.

---

## The people

| Role | Named first holder | Layer | Opens |
|---|---|---|---|
| Tool Owner | Anika Lerch, anikalerch@greenfriend.org | business + app admin, superset | Dashboard, Stakeholders, Topics, Assessments, Responses, Calibrate & Results, Report, Settings → Admin & Roles, Settings → Profile |
| Admin | *(none yet — Anika covers this today)* | business + app admin | same as Tool Owner, minus toggling `is_admin` |
| Full access | *(none yet — Anika covers this today)* | business | everything above except Settings → Admin & Roles |
| Sign-off only | *(no named holder yet)* | business, restricted | Topics, Assessments, Responses, Calibrate & Results — all read-only except the one sign-off action their permission grants; Dashboard and Report refused |
| platform owner | Anika Lerch (greenfriend.org domain) | outside the app | Supabase and Netlify dashboards |

Stack: Apus DMA — Expert Survey (Tool A, public, no login) and Apus DMA — Consultant
Console (Tool B, the roles above).

**Sign-off only has no named holder today.** The stories below for this role describe
what the database and policies enforce; their acceptance lines are marked **pending** —
Claude Code verifies the refusal mechanically (Half A, through the API), but nobody
clicks through the screen as this role (Half B) until a real person and email exist. This
is tracked explicitly, not skipped.

---

## Stories by role and screen

### Tool Owner / Admin / Full access — Dashboard, Stakeholders, Topics, Assessments, Responses, Calibrate & Results, Report

- **As Owner/Admin/Full access, I read and edit every client, cycle, assessment, topic,
  stakeholder, invitation, submission and calibration, so that I can run the whole DMA.**
  `[every workflow table · read/update · Owner/Admin/Full]`
  Acceptance: Anika opens any screen and sees and edits all data; nothing is scoped to "her
  own."
- **As Owner/Admin/Full access, I cannot edit a submitted response, so that a submitted
  expert's answers can never be altered after the fact.** `[submissions · update · Owner/
  Admin/Full]` (= no, once `status = 'submitted'`)
  Acceptance: Anika opens a submitted response; every field is read-only. She can still
  anonymise the linked invitation's name/email on a GDPR request.
- **As Owner/Admin/Full access, I delete an old, unfinished draft once its assessment is
  Closed or Completed, so that stale drafts don't clutter Responses.** `[submissions ·
  delete · Owner/Admin/Full]`
  Acceptance: Anika deletes a draft submission on a Closed assessment; it's gone. The same
  action on a submitted response, or on a still-Active assessment's draft, is refused.
- **As Owner/Admin/Full access, I sign off the final results for a cycle, so that
  calibration is locked and the report can say Final.** `[cycles · change state →
  results_signed_off · Owner/Admin/Full]`
  Acceptance: Anika signs off; every IRO's `calibrated_value`/`band_value` for that cycle
  becomes uneditable; the Report shows Final instead of Provisional.
- **As Owner/Admin/Full access, I cannot adjust a calibrated value once results are signed
  off, so that a locked round stays locked.** `[calibrations · update · Owner/Admin/Full]`
  (= no, while `cycles.results_signed_off = true`)
  Acceptance: Anika attempts Adjust on a signed-off round; refused with an explanation and
  a Revoke link.
- **As Owner/Admin/Full access, I revoke a results sign-off, so that I can fix a mistake
  found after signing off.** `[cycles · change state → revoke results_signed_off · Owner/
  Admin/Full]`
  Acceptance: Anika revokes; Adjust/Reset work again; the revoke is logged (who, when).
- **As Owner/Admin/Full access, I sign off this year's topic list, so that the selection is
  on record, without locking anything.** `[assessments · change state →
  iro_list_signed_off · Owner/Admin/Full]`
  Acceptance: Anika signs off the topic list; the assessment remains fully editable
  afterward (advisory, not a lock) — editing the topic selection later auto-clears the
  flag.

### Sign-off only (`can_signoff_topics`) — Topics, Assessments

- **As a Sign-off-only reviewer with the Topics permission, I read this round's topic
  selection and sign it off, so that the selection is approved without me touching
  anything else.** `[assessments · read + change state → iro_list_signed_off · Sign-off
  only]`
  Acceptance (**pending — no named holder**): once named, that person opens Topics, sees
  the selection read-only, signs it off; Calibrate & Results, Dashboard and Report are not
  in their nav and refuse a direct URL.
- **As a Sign-off-only reviewer without the Results permission, I cannot sign off
  results.** `[cycles · change state → results_signed_off · Sign-off only, no permission]`
  (= no)
  Acceptance (**pending**): once named, attempting the results sign-off action (if visible
  at all) is refused by the database regardless of any screen state.

### Sign-off only (`can_signoff_results`) — Calibrate & Results, Assessments (read)

- **As a Sign-off-only reviewer with the Results permission, I read the calibrated values
  and sign off the final results, so that the round can close.** `[cycles + calibrations ·
  read + change state → results_signed_off · Sign-off only]`
  Acceptance (**pending — no named holder**): once named, that person opens Calibrate &
  Results, sees every value read-only, signs off; the same lock then applies to everyone,
  including Owner/Admin/Full.
- **As a Sign-off-only reviewer, I cannot open the Dashboard or the Report, so that my
  access stays exactly as narrow as my permissions.** `[Dashboard's and Report's tables ·
  read · Sign-off only]` (= no)
  Acceptance (**pending**): once named, the Dashboard and Report routes refuse outright —
  not an empty screen, a stated refusal.

### Tool Owner — Settings → Admin & Roles

- **As Tool Owner, I add a team member once their Supabase Auth login exists, set their
  access level, so that a new person can log in with the right rights.**
  `[team_members · create · Tool Owner]`
  Acceptance: Anika adds a row for an already-invited email, sets `access_level`; when
  that person logs in, the trigger links their identity to the row and they see exactly
  what their level grants.
- **As Tool Owner, I set a Sign-off-only member's two permissions independently, so that
  Legal can sign off Topics while Finance signs off Results, or one person can do both.**
  `[team_members · update (can_signoff_topics, can_signoff_results) · Tool Owner]`
  Acceptance: Anika ticks `can_signoff_topics` for one row and `can_signoff_results` for
  another; each person's Half B screen test (once named) confirms they see only what their
  own ticks grant.
- **As Tool Owner, I grant or revoke Admin, so that team management rights change with
  trust, not just data access.** `[team_members · update (is_admin) · Tool Owner]`
  Acceptance: Anika toggles `is_admin` on a row; only she can do this.
- **As Tool Owner, I deactivate a team member, so that a leaver is refused at once.**
  `[team_members · update (active) · Tool Owner]`
  Acceptance: Anika sets `active = false`; every policy refuses that person immediately,
  even with an open session.

### Admin — Settings → Admin & Roles

- **As Admin, I add a team member and set their access level and sign-off permissions,
  same as Tool Owner, so that day-to-day team management doesn't bottleneck on one
  person.** `[team_members · create + update (access_level, can_signoff_*) · Admin]`
  Acceptance: once a second Admin exists, they do exactly what Anika can here.
- **As Admin, I cannot grant or revoke another member's Admin flag, so that only the Tool
  Owner controls who else manages the team.** `[team_members · update (is_admin) · Admin]`
  (= no)
  Acceptance: the control is visibly locked in the UI with a tooltip, and a direct API
  attempt is refused by the database regardless.

### Full access — everything except Settings → Admin & Roles

- **As Full access, I do everything Admin does in the assessment workflow, so that team
  management is the only thing that distinguishes the roles.** `[every workflow table ·
  read/update · Full access]`
  Acceptance: once a second Full-access person exists, their screens and data access are
  identical to Admin's outside Settings.
- **As Full access, I cannot open Settings → Admin & Roles at all, so that team management
  stays with Owner and Admin.** `[team_members · read (all rows) · Full access]` (= no)
  Acceptance: the nav item doesn't render; a direct URL refuses.

### Any logged-in team member — Profile

- **As any team member, I edit my own name, phone number and photo, so that my profile
  and the header avatar stay current.** `[team_members · update (name, phone_number,
  avatar_url), own row · any role]`
  Acceptance: Anika edits her own row; the change appears in Profile and in the header
  avatar app-wide immediately. She cannot edit another row's name/phone/photo this way.
- **As any team member, I see my access level and what it grants, in plain language, so
  that I understand my own permissions without asking.** `[team_members · read, own row ·
  any role]`
  Acceptance: Profile shows "Full access" or "Sign-off only," and for Sign-off only, which
  of the two permissions they specifically hold.
- **As any team member, I cannot self-assign a different access level or sign-off
  permission, so that access changes only go through Owner or Admin.**
  `[team_members · update (access_level, can_signoff_*), own row · any role]` (= no)
  Acceptance: these fields don't appear as editable on Profile; a direct API attempt to
  change them on one's own row is refused.

### A login with no team_members row

- **As a newly-invited person whose Supabase login exists but has no team_members row
  yet, I see "No access yet — ask your Admin" and reach nothing, so that a gap between
  inviting someone in Supabase and giving them a role never becomes an accidental full
  grant.** `[every table · read · unrecognised identity]` (= no)
  Acceptance: log in with such an identity; every screen refuses; only the "no access"
  message and a sign-out option show.

---

## Stories that are refusals (collected)

The screen test list once the login and the rules are on. One line per `no` in the matrix.

| # | Who | Tries | Result | Cell |
|---|---|---|---|---|
| 1 | Anika (Owner/Admin/Full) | edit a submitted response | refused, read-only | submissions · update · Owner/Admin/Full |
| 2 | Anika | delete a submitted response | no delete path exists | submissions · delete · Owner/Admin/Full |
| 3 | Anika | adjust a calibrated value on a signed-off round | refused with a Revoke link | calibrations · update · Owner/Admin/Full |
| 4 | Sign-off only, no results permission | sign off results | refused by the function itself | cycles · change state → results_signed_off · Sign-off only, no permission — **pending, no named holder** |
| 5 | Sign-off only | open Dashboard or Report | refused outright | Dashboard/Report tables · read · Sign-off only — **pending** |
| 6 | Admin | toggle another member's `is_admin` | locked control; API refuses too | team_members · update (is_admin) · Admin |
| 7 | Full access | open Settings → Admin & Roles | nav absent; URL refuses | team_members · read · Full access — **pending, no second Full-access person yet** |
| 8 | anyone | change their own `access_level` or `can_signoff_*` | refused | team_members · update, own row · any role |
| 9 | anyone | change `is_owner` | no update path exists for any role | team_members · update (is_owner) · anyone |
| 10 | a login with no team_members row | read anything | "No access yet" only | every table · read · unrecognised identity |
| 11 | a logged-out visitor to the Console | reach anything | login screen only | every table · read · anon (Tool B) |

---

## Later list (not this version)

- Sign-off only's Half B screen test — deferred until a real name and email exist for at
  least one of `can_signoff_topics` / `can_signoff_results`.
- A second Admin or Full-access person's Half B screen test — deferred until Anika adds
  one; Half A (the policies themselves) is verified regardless.
- Deactivation pattern for `stakeholder_members` (currently no delete or deactivate path
  is modelled; flagged, not built this pass).
- Ownership transfer for Tool Owner (`is_owner`) — explicitly out of scope, per the v2.1
  addendum.

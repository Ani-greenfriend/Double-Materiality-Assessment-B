# PROGRESS — Apus DMA Consultant Console

> Claude Code: read this file at the start of every session, before touching
> anything. Update it at every save point. Replace content — do not append.
> History lives in git.

**Session:** 2
**Last updated:** 2026-09-25 — session 2, part 39 (found a second, broader path to the same "ratings upsert failed: row-level security policy" error from part 34 — re-entering an already-finished live session's Questionnaire at all, via the pre-existing "Resume session" or the new "Go to live session" button, both of which happily reopened it with no status check; the very next autosave then hit the frozen-submission RLS wall. enterLiveSession now checks progress.status === 'submitted' first and redirects to that assessment's results with a clear message instead).
**Live URL:** none yet — PR #4 (data layer + first v2.0 shell) superseded for UI purposes by PR #5 (prototype restore, in progress); Netlify preview pending

## Current state
**Direction change 2026-09-21:** the builder found the app's UI had drifted from reference-prototype/ into a simplified, rewritten shell (sessions 1–2, PR #4). CLAUDE.md now carries a Hard Rule — prototype screens are copied verbatim, never restyled/simplified/rewritten, changing only data wiring, the Expert survey/Expert live session wording, and explicit v2.0 spec changes. A full restore is underway on a **new branch** (`claude/restore-prototype-ui`, PR #5, draft until complete), built from `claude/wonderful-darwin-ztquwp`'s tip so the v2.0 data layer, calc.js, login, invitations, participants and draft deletion are all kept. Reported with a before/after checklist and a per-screen diff against reference-prototype/ after each step, stopping for the builder's OK after each one.

**Step 3's scope changed mid-step (spec v2.0 amended 5/6, plus stricter builder instructions given directly in chat, ahead of a not-yet-pushed "amended 7"):**
- Silent stakeholders (amended 5) are ordinary list entries, not a separate panel — done in step 2's correction.
- Cycles are no longer shown in the interface at all (amended 6) — no Cycles screen, cycle selector or New cycle wizard; the `cycles` table stays in the database, created automatically with a financial year's first assessment.
- The assessment flow must be the prototype's full flow, copied verbatim — Assessment overview, Mode select, Perspective select, General info, Review & customise, Recipients, Created, Review Hub, Intro flow and Questionnaire — with only six sanctioned differences (Section 8, "New assessment"): wording; Recipients keeps the prototype's layout; a justification-mode setting in Review & customise; financial year + ESRS version in General info; Created's link card shows a list of personal links; justification/Save and pause/who-answered in the live-session grid.
- **Dropped by the builder mid-step:** "Enter expert responses" (`QuantAssessmentGrid`) — every expert response comes through Tool A's survey, no exceptions; Tool B is consultant/owner setup only. No `entered_by` column needed; the earlier open question about it is moot.

**Steps 1–5 are done and pushed (PR #5).** After step 3 the builder gave a
round of direct fixes (part 11, below) rather than an "OK, start step 4" —
worked through all five, including a full rebuild of the Results tab
(bar chart, impact/financial heatmaps, topic matrix — the prototype's
`ResultsScreen.jsx`, verbatim except one requested cut). Step 4
(`CalibrationTab.jsx` parity, shared filters) and the builder's
preview-review fixes (Groups A/B, parts 16-17) followed, then **Step 5 —
the PDF report builder** (part 18): a 4-step wizard (`ReportTab.jsx`) and
a new `reportPdf.js` module (jsPDF + jspdf-autotable) generating all 6
spec'd sections with print-themed chart images. Not yet human-verified in
a real browser — see Known issues.

Report format: PDF (via a browser PDF library), not Word — CLAUDE.md and product-spec.md both updated (v2.0 amended 4).

## Earlier state (superseded by the restore above, kept for history)
Cycles now supports the full assessment-creation path: New assessment
wizard (mode, perspective, survey setup, review & customise with a real
topic-library snapshot), Invitations (add/remove/copy-link/mark-sent/
anonymise, consent + data statement), and Participants (add/remove
attendees with expertise + optional silent-stakeholder representation,
facilitator, consent + data statement, attendance edit log) are all wired
up from a cycle's assessment list. A few spec pieces are knowingly
simplified this round — see Part 4 below and Known issues. Dashboard,
Stakeholders (read-only), Calibrate & Results (still the session-1 shape)
are unchanged from Part 3. Not yet built: Topics admin, Review Hub, Live
session run flow (Intro/Questionnaire — Participants only sets up who's
attending, it doesn't run the session), the full redesigned Calibrate &
Results workspace, Report builder. Still not click-tested live by Claude
Code (sandbox can't reach Supabase) — the builder is testing directly on
the Netlify branch deploy as each push lands.

## Last session
**Part 39 (2026-09-25) — Same RLS error, second real path: re-entering an already-finished live session.**

Builder screenshot: the same `ratings upsert failed: new row violates
row-level security policy (USING expression) for table "ratings"` error
from part 34 — but this time on an early topic screen ("A few quick
questions per topic"), not the finish screen, so the part-34 double-click
guard wasn't the cause here.

**Root cause**: `enterLiveSession` (used by both the pre-existing "Resume
session" link on Responses and this session's new "Go to live session"
button) fetches `fetchLiveSessionProgress`, which already returns
`status: submission.status` — but nothing ever read it. Opening an
already-**finished** live session (submission already `submitted`, frozen
per CLAUDE.md Business Rules — "a submitted response is frozen for every
role") went straight into the live, editable Questionnaire exactly as if
it were still in progress. The Questionnaire autosaves on mount
(`onProgress`'s `useEffect` fires on the very first render, not just on
each topic change), so the first autosave attempt immediately hit the RLS
policy that correctly refuses to touch a submitted response's ratings —
surfacing as the same raw error, just from a different trigger than
part 34's double-click.

**Fix**: `enterLiveSession` now checks `progress.status === 'submitted'`
right after fetching it, before ever opening the Questionnaire. On a
finished session it sets a plain-language message ("already finished —
its ratings are locked and can't be re-entered") and calls `onViewResults`
to take the builder straight to that assessment's Calibrate & Results
instead of leaving them stuck on a broken-looking screen.

`npm run build`/`npx oxlint src` clean (same three pre-existing warnings).
No schema/RLS change — the policy was already correct and nothing was
corrupted (a refused write never persists); this closes the second real
way to trigger it, on top of part 34's double-click guard.

**Part 38 (2026-09-25) — Direct "go to it" launch buttons on Assessment overview and Review Hub.**

Builder: "there needs to be an option to go directly to the expert live
session or to the external expert survey in the assessment overview, also
in the review (eye symbol) you need to have a button to go to the live
session vs external assessment survey." Two existing mechanisms already
did half of this — `enterLiveSession` (jumps straight into the running
live session, already wired to Responses' "Resume session" deep link) and
`openRecipientsDirect` (jumps to Recipients/Participants, already on the
overview row as the people icon, part 11 of an earlier session) — but
neither was exposed as a one-click launch from the overview row or from
Review Hub, and there was nothing at all for "go straight to the actual
external survey."

**New `openExternalSurvey(assessment)`** (`AssessmentsTab.jsx`): Tool A has
no generic, non-personal survey URL — every link (`buildPersonalLink`) is
one specific invitee's own. Opens the first invitation's real personal
link in a new tab (`window.open(..., '_blank', 'noopener,noreferrer')`) —
literally the external Tool A page, not an in-app stand-in. Mirrors
`enterLiveSession`'s own shape: no invitations yet → redirect to
Recipients with an explanatory error, same as the no-participants case;
Sign-off only → refused with a message, same as the live-session case.

**New `goDirect(assessment)`**: picks `enterLiveSession` or
`openExternalSurvey` by `assessment.type`. Wired into both places the
builder named:
- `AssessmentOverview.jsx` — a new launch icon in the row actions
  (between the eye and the people icon), titled "Go to live session" or
  "Go to survey" depending on type, `!readOnly`-gated like Edit/
  Recipients/Delete (Sign-off only can view but not run either).
- `AssessmentReviewHub.jsx` (opened by the eye icon) — a new button next
  to Exit/Close, same type-aware label, same `!readOnly` gate. This one
  component backs both the overview's eye icon and the "Created" screen's
  own "Preview" button, so both get it for free.

`npm run build`/`npx oxlint src` clean (same three pre-existing warnings).
No schema/RLS change — pure frontend, reusing data.js functions that
already existed (`fetchInvitations`, `buildPersonalLink`).

**Part 37 (2026-09-25) — Admin & Roles legend: dropped "Tool Owner", added a contact note instead.**

Builder, from a screenshot of the same Legend card: "remove tool owner as
this is the owner of the entire tool and is not selected by the tool.
just mentioned to reach out for any support with the accesses." The
legend's own Tool Owner text already said "set only from the Supabase
dashboard" — it was never actually assignable through this screen, so
listing it alongside three roles someone *does* pick from the table
misrepresented it as a fourth option.

Removed the `Tool Owner` entry from `ROLE_LEGEND` (now three: Admin, Full
access, Sign-off only) and reworded Admin's own description, which used
to define itself relative to Tool Owner ("everything Tool Owner can do
except…") — now stands alone ("can change access levels and sign-off
permissions, but not another member's Admin status"). In its place, a
note under the legend grid: "Need something none of these cover... Reach
out to the Tool Owner, {name} ({email})" — pulled live from `members`
(`members.find(m => m.isOwner)`), not hardcoded, so it stays correct if
ownership ever changes. The table's own "Owner" badge on Anika's row is
untouched — that's a factual status display, not a selectable option, so
it wasn't part of what the builder flagged.

`npm run build`/`npx oxlint src` clean (same three pre-existing warnings).
No schema/RLS change — pure frontend copy/layout.

**Part 36 (2026-09-25) — Admin & Roles: Sign-off only can no longer also be Admin.**

Builder, from a screenshot of Admin & Roles' team table: "am i wrong or is
it weird that somebody with sign off only rights can still have an admin
function, when it's sign off only please remove option for admin." Not
wrong — this was a real gap. The four roles (CLAUDE.md, access-matrix.md
§8) are Tool Owner / Admin / Full access — "identical data access, differ
only in team-management rights" — and Sign-off only — "read-only
everywhere it can see at all." There's no fifth "Sign-off only, but also
Admin" role: Admin's whole definition presumes full data access, which
directly contradicts Sign-off only's restricted, read-only access. Nothing
in the schema enforced this — `is_admin` only gates the Admin & Roles
screen itself (`canManageTeam = me.isOwner || me.isAdmin`) and is
independent of `access_level` at the RLS layer (data-access grants check
`access_level = 'full'` or `is_owner`, never `is_admin`), so a row could
sit with `access_level = 'signoff'` and `is_admin = true` at the same
time: restricted to read-only + two sign-off actions everywhere else in
the app, yet still able to open Admin & Roles and change anyone's access
level, sign-off permissions, or role title.

`AdminRolesTab.jsx`: the Admin column now shows a plain "—" for any row
with `accessLevel === 'signoff'` instead of a live checkbox (matching how
the Sign off column already shows "—" for full-access rows) — Admin is
simply not offered there. Also, switching a current Admin's Access Level
to Sign-off only now clears `is_admin` in the same action
(`handleFieldChange` calls `updateTeamMemberAdmin(id, false)` when
`patch.accessLevel === 'signoff' && member.isAdmin`), so a stale
contradictory flag can't survive underneath the now-hidden checkbox.

Checked the live DB directly (`select … from team_members where
access_level = 'signoff' and is_admin = true`) before writing anything —
zero rows, so there was nothing to clean up; this closes the gap going
forward rather than fixing bad data.

`npm run build`/`npx oxlint src` clean (same three pre-existing warnings).
No schema/RLS change — this was a frontend gap, not a database one; the
DB already correctly ignores `is_admin` for data-access decisions, it just
let the UI offer a role combination that shouldn't exist.

**Part 35 (2026-09-25) — GlobalHeader: Settings gear + hover tooltips.**

Builder, with a screenshot of the sidebar's `SettingsMenu` avatar chip:
"please this part on the top right with a settings symbol next to the
notification symbol and profile edit on the image. when hover over
explain what it does: settings; edit profile, notification." Read as: add
a Settings (gear) control to `GlobalHeader.jsx` (part 32's top-right
profile+notification bar) alongside the existing bell and avatar, and add
hover tooltips explaining each of the three.

Added a new `SettingsIcon` (a literal gear, distinct from `AdminIcon`'s
shield already used inside `SettingsMenu`'s dropdown) to `icons.jsx`. In
`GlobalHeader.jsx`: a gear button, visible only to `me.isOwner ||
me.isAdmin` (same `canManageTeam` gate `SettingsMenu.jsx` already uses,
since its destination — Admin & Roles — is owner/admin-only; showing it to
someone it would 403 made no sense), opens Admin & Roles via a new
`onOpenAdminRoles` prop wired the same way `onOpenProfile` already was.
Added `title` attributes for native hover tooltips on all three controls:
"Settings" (gear, new), "Notifications" (bell, had none before), "Edit
profile" (avatar — was "Your profile", reworded to name the action).

`npm run build`/`npx oxlint src` clean (same three pre-existing warnings).
No schema/RLS change — pure frontend.

**Part 34 (2026-09-25) — Fixed the live-session "ratings upsert failed: row-level security policy" bug on Finish.**

Builder screenshot: the live session's "All 3 topics rated" success screen,
with an orange error banner on top reading `ratings upsert failed: new row
violates row-level security policy (USING expression) for table "ratings"`.

**Root cause, confirmed against the live RLS policies** (`pg_policies` for
`ratings`): the UPDATE policy `full access update draft ratings` requires
`submissions.status = 'draft'` in its `USING` clause. A plain `UPDATE`
hitting a non-matching row is silently filtered by RLS (0 rows, no error —
the pattern this session already hit for `submissions`/`iros` deletes).
But `saveLiveSessionProgress`'s write is `.upsert(..., { onConflict:
'submission_id,iro_id,criterion_key' })` — an `INSERT ... ON CONFLICT DO
UPDATE` — and Postgres does **not** silently skip RLS failures on that
path; it raises the error, which is exactly the message shown.

That only happens if the ratings upsert runs against a submission that's
already `submitted` — but `finishLiveSession` (data.js) always upserts
ratings *before* setting `submissions.status = 'submitted'`, so a single
well-behaved call should never hit this. The real bug: `Questionnaire.jsx`'s
"To Results →" button (the summary screen's only action) had no `disabled`
guard and wasn't wired to `AssessmentsTab.jsx`'s `busy` state at all — a
second click before the first request completed fired `onFinish` twice.
The first call submits normally (ratings upsert while still draft, then
flips status to submitted); the second call's ratings upsert now runs
against an already-submitted, frozen submission and hits the RLS wall —
which is doing exactly what CLAUDE.md requires ("a submitted response is
frozen for every role"), just surfacing as a confusing error on a screen
that already looked finished.

**Fix**: added local `finishing` state in `Questionnaire.jsx` — the button
disables itself and shows "Submitting…" for the duration of the (now
awaited) `onFinish` call, re-enabling only if it throws. Added a matching
`if (busy) return;` guard at the top of `AssessmentsTab.jsx`'s
`handleQuestionnaireFinish` as a second layer, independent of the button
state. No RLS/schema change — the policy was already correct; the app
just needed to stop calling it twice.

`npm run build`/`npx oxlint src` clean (same three pre-existing warnings).

**Part 33 (2026-09-24) — Results: cut the Topic Matrix, keep bar chart + heatmaps; mark Material vs Not material on the bar chart.**

Builder: "leave out the combined matrix and keep focus on balkendiagramm
and financial and impact matrix" — cut the third chart (Topic Matrix, one
dot per ESRS topic) from the live Results screen, keeping the bar chart
("Balkendiagramm") and the two Impact/Financial heatmaps. Mid-edit, a
second instruction landed with a screenshot of the bar chart: "mark
material vs not material" — every bar was the same pillar (E/S/G) color
regardless of whether its score actually cleared the threshold, so a
below-threshold IRO (e.g. 2.7 against a 3.0 threshold) looked identical to
a clearly material one.

**Topic Matrix removal**: deleted the `Matrix`/`SidePanel` component
functions, the `MATERIAL_QUADRANT_COLOR` constant, and all the
topic-level aggregation this screen only computed to feed them
(`aggregateTopic`, `allTopics`/`ratedTopics`/`unratedCount`/`topics`,
`hoverTopic`/`pinned`/`active`, `matrixSvgRef`) — none of it was used by
the bar chart or heatmaps. The `activeCats`/`showMaterial`/
`showNotMaterial` filter props from `CalibrateResultsTab.jsx`'s shared
`FilterBar` (parts 18/19) are now unused here — left in place since
`CalibrateResultsTab.jsx` still passes them and `CalibrationTab.jsx` still
needs them, just dropped from `ResultsScreen`'s own destructuring.

**Threshold editing had to move, not disappear**: CLAUDE.md's Business
Rules require the two materiality thresholds stay "editable at any time...
via Apply with a reason logged to `threshold_changes`" — that Apply+reason
UI lived inside the matrix section, so cutting the chart would have
silently cut the only place to edit thresholds too. Pulled it out into its
own "MATERIALITY THRESHOLDS" block, unchanged otherwise (same
`updateCycleThresholds` call, same dirty-state/Apply/Cancel flow). Also
rewrote the DmaMascot explainer and the Download panel's copy, both of
which referenced the now-gone matrix ("each topic below is plotted...",
"same detail as the hover panels").

**Bar chart material marking**: `scoredIros` already carried `agg.isMaterial`
per row (used for the CSV export) but the UI never showed it — every bar
used the same pillar color whether material or not. Now a not-material
bar's fill dims to grey (`#3A3842`) instead of its pillar color, and a new
label column spells out "MATERIAL" (orange, `#D79A4C` — the same color
CLAUDE.md reserves for Material/risk everywhere else) or "NOT MATERIAL"
(muted grey) per row, plus a one-line legend under the chart.

`npm run build`/`npx oxlint src` clean (same three pre-existing warnings,
one moved line number). No schema/RLS change — pure frontend. The PDF
report's own topic-matrix chart (`reportPdf.js`, spec'd Section 4) was
left untouched — this request was specifically about the live Results
screen, not the formal report deliverable.

**Part 32 (2026-09-24) — Built the persistent profile+notification header; it never existed outside Dashboard.**

Builder reported "I cannot see the profile setup on top of Admin & Roles
that was planned — the top with profile image and notification should
always be shown as fixed top in any screen except the Assessments," with a
screenshot of the Dashboard on a narrow viewport where the sidebar's
`SettingsMenu` dropdown (Profile/Admin & Roles/Sign out, built in Group 4)
dominates the screen and the Dashboard's own greeting is barely visible.

Grepped for the header the builder was expecting: `Dashboard.jsx` had a
`ProfileHeader` with a notification bell and an avatar button — but it (a)
only ever rendered on the Dashboard screen, never anywhere else, (b) was
never "fixed" (sticky) — it scrolled away with the rest of the page, and
(c) its avatar button was a leftover reference-prototype stub: local
`useState('')` name entry, `title="Set up your profile"`, completely
disconnected from the real `team_members` name/`avatar_url` the actual
Profile screen (`ProfileTab.jsx`, Group 4) manages. Confirmed this exact
structure is byte-identical in `reference-prototype/`'s own `Dashboard.jsx`
— inherited, not a regression, but also predates the real Profile/Admin &
Roles system this session's Group 3/4 work added, which is why it was
never hooked up to real data.

**Built `GlobalHeader.jsx`**: real avatar (`me.avatarUrl` or initials,
same convention as `SettingsMenu.jsx`) + notification bell (closing-soon
assessments, same 3-day-window logic as the old stub, now computed across
every financial year's assessments via `cycles.flatMap`, not just the one
Dashboard happens to be scoped to). `position: sticky; top: 0` inside the
`max-w-6xl` content column, rendered in `App.jsx` on every tab **except**
`'assessments'` — product-spec.md Section 8 already reserves that
screen's top area for the wizard's own step navigation ("shown on every
wizard screen including the last"), so a second fixed bar there would
fight it. Clicking the avatar opens the real Profile screen
(`setTab('profile')`), not a fake inline name editor.

Removed the now-redundant bell/avatar from Dashboard's `ProfileHeader` —
kept only its "Hello 👋 / Let's see what we have for you today" greeting,
since the global header covers the rest on every screen including
Dashboard.

`npm run build`/`npx oxlint src` clean (same three pre-existing warnings).
No schema/RLS change — pure frontend, one new component.

**Part 31 (2026-09-24) — Results/PDF chart colors brought to the actual brand triad; Dashboard CTA label now matches its own heading.**

Builder asked (with a reference screenshot of another Apus tool's card/
chart styling): use the real brand colors — emerald, blue, orange — on the
Results page's charts, "like in the example," and pointed out the reference
example's dots have no white ring around them. Also asked for the Dashboard
hero CTA to change based on status, and to make the Topic Matrix's four
quadrants self-explanatory ("what the four squares mean").

**Topic Matrix quadrant fills weren't actually brand colors.** Task #14's
original quadrant recolor (an earlier session) used the accent blue
correctly but reused the delete/negative red (`#E0645A`) for "financial
only" and the live-session purple (`#9B7FE0`) for "material both ways" —
both borrowed from colors CLAUDE.md reserves for something else, not the
brand's actual emerald/blue/orange triad. `ResultsScreen.jsx`'s
`MATERIAL_QUADRANT_COLOR` now uses blue (impact only), emerald (financial
only), and orange (material both ways — the same orange CLAUDE.md already
uses for "Material/risk" everywhere else in this file, so the
highest-priority quadrant now reads as the same color as "Material" does
everywhere else). Also added small on-chart labels in each quadrant's
corner (FINANCIAL ONLY / MATERIAL — BOTH / NOT MATERIAL / IMPACT ONLY) so
the four squares' meaning doesn't require cross-referencing the legend
below the chart.

**The literal white circles were in the PDF report, not the live app.**
Grepped for every `stroke` on a `<circle>` in the codebase: the live
`ResultsScreen.jsx` charts already used a dark stroke (`#100E15`, same as
the plot background) or no stroke at all — never white. `reportPdf.js`'s
two print-chart builders (`buildHeatmapSvg`, `buildMatrixSvg`) did draw
`stroke="#FFFFFF"` on every dot, which shows up as a visible halo wherever
a dot sits over a colored quadrant/heat-cell fill on the white PDF page —
exactly the effect the builder was pointing at. Removed the stroke from
the heatmap dots entirely and brought the matrix dots in line with the
live app's own convention (ring only on material topics, in the print
orange `#C77F1A`; no stroke otherwise). `PRINT_PILLAR_COLOR` itself
(`#1F9A63`/`#C77F1A`/`#3A5BD9`) was already the brand triad — untouched.

**Dashboard CTA**: `StartButton`'s heading/subtitle already changed based
on `hasAssessments` (pre-existing), but the button pill itself was
hardcoded "Get started" regardless of state — confirmed byte-identical to
reference-prototype/'s own `Dashboard.jsx` at the same lines, so this was
inherited prototype behavior, not a build regression. Changed the pill to
read "Continue" when `hasAssessments` is true, matching the heading it
sits next to. Scope kept to the label only — `onGoToAssessment` still
routes to Stakeholders either way, and no additional CTA states beyond the
existing binary were requested.

`npm run build` clean both times. No schema/RLS change — pure frontend
(colors + one label).

**Part 30 (2026-09-24) — Responses screen "doesn't work" bug: defaulted to an empty test year.**

Builder reported Responses not showing the live session they'd just
filled in and finished (the one from part 28/29's fix — confirmed working
end to end: `assessment_progress` for it shows `live_session_status:
'finished'`, `attended_count: 5`, `topics_rated_count: 3` of 3, all
correct). The underlying data pipeline was never the problem.

**Root cause**: this Supabase project has accumulated several cycles from
earlier test sessions, three of them completely empty — FY2027 and FY2024
(0 assessments each) and a leftover **FY1** (a stray value from before the
financial-year field was constrained to a 2022–2027 dropdown, also 0
assessments). `ResponsesTab.jsx`'s year selector built its list from
*every* cycle unconditionally (`cycles.map(c => c.financialYear)`, sorted
descending) and defaulted to `[0]` — the numerically highest year, **FY2027**,
which has nothing in it. The live session actually finished under FY2025
(shared with "Finance test expert"), two years below the default. Opening
Responses landed on a genuinely empty year and looked exactly like a
broken screen, even though switching the year dropdown to 2025 would have
shown everything correctly the whole time.

Dashboard already avoids this exact trap — its own financial-year selector
(`App.jsx`'s `financialYearsWithAssessments`) filters to `c.assessments.length
> 0` before picking a default. `ResponsesTab.jsx` never had the same
filter. Fixed by applying the identical filter there, so the year selector
(and its default) only ever considers years with real content — an empty
cycle-year can no longer become the default, or appear as an option at
all, in either screen now.

**Not a data bug, not a regression from parts 28/29** — confirmed by
reading `assessment_progress` directly for the live session's own
`assessment_id` before changing anything: every number was already
correct. This was purely a "which year is showing" UX bug, real enough to
look completely broken to someone testing it live.

`npm run build`/`npx oxlint src` clean (same three pre-existing
warnings). No schema/RLS change — pure frontend.

**Flagged, not cleaned up**: the three empty test cycles (FY2027, FY2024,
FY1) are stray fixtures from earlier sessions' testing, not currently
reachable or visible anywhere in the UI (cycles are database-only per
CLAUDE.md, no delete-cycle path exists), so there's nothing in-app to
clean them up with. Harmless now that Responses/Dashboard both filter
past them, but worth a manual Supabase-dashboard cleanup at some point if
the builder wants a tidier project — not blocking anything.

**Part 29 (2026-09-24) — Two more PR #6 preview bugs, both found live by the builder.**

**1. Recipients couldn't finish with everyone excluded.**
`RecipientsScreen.jsx` (shared by both modes — the same file covers the
expert-survey path the builder asked to check) disabled its own Continue
button at `included.length === 0`. The drag mechanics themselves were
already correct (an empty Included list rendered its own "Everyone has
been excluded" state fine); Continue being disabled is what actually
blocked the workflow, and it directly contradicted the already-built Kick
off guard ("Add who participates first" at `participantCount === 0`, part
16) — that guard never got a chance to run, since Continue refused to get
past Recipients in the first place. No schema change needed:
`createInvitationsFromRecipients`/`addParticipantsFromRecipients` both
already handle an empty `people` array cleanly. Removed the disabled gate
and the amber "add at least one person" warning; replaced with a neutral,
mode-specific note when nobody's included.

**2. Assessment delete silently refused two real assessments.**
`deleteAssessment` only checked for a Supabase `error`, but an
RLS-blocked delete matches 0 rows and returns no error at all — the same
"fails silently" pattern this session already fixed once elsewhere. Root
cause: the `assessments` DELETE RLS policy blocked on **any**
`submissions` row for that assessment, draft or submitted. Per the
builder's decision this part, only a **submitted** response should ever
block deletion — a draft (plus its ratings, justifications, and any
paused live-session data) should be deleted along with the assessment,
not treated as a reason to refuse it.

Identified the two stuck assessments by querying `submissions` grouped by
`assessment_id` and status:
- **"Acme Corp"** (`slug: acme-2026`) — 2 **submitted** responses.
  Correctly refused, before and after this fix — this is the demo the
  builder said not to touch. Confirmed via a rolled-back impersonated
  delete attempt only; never actually persisted.
- **"b"** (`slug: b-a8b2273b`) — 1 **draft** live-session response (the
  exact stuck submission from part 28's ratings bug). Incorrectly refused
  before this fix, under the old "any submission blocks" rule.

Fixed: migration `v3_fix_assessment_delete_only_blocks_on_submitted`
replaces the DELETE policy's `USING` clause to check `status =
'submitted'` specifically. No new cascade code was needed —
`submissions.assessment_id`, `ratings.assessment_id`/`.submission_id`,
`topic_justifications.submission_id`, `live_sessions.assessment_id`,
`live_session_participants.live_session_id` and `attendance_edit_log`
(both its FKs) are **all already `ON DELETE CASCADE`** (checked directly
via `information_schema` before assuming anything) — one `DELETE FROM
assessments` now correctly removes every dependent row on its own.

**Verified live, not just by reading the policy**: deleted "b" for real
(impersonated as Anika, this one genuinely committed — confirmed
afterward that `submissions`/`iros`/`live_sessions` for that assessment
id all reached 0 rows) while confirming `acme-2026` stayed present and
untouched throughout, including a separate rolled-back attempt to delete
it that correctly matched 0 rows.

`deleteAssessment` (data.js) now does `.select('id')` after the delete
and checks the actual returned rows rather than trusting a missing
`error` to mean success — a 0-row result throws exactly the message the
builder specified: "This assessment has submitted responses and can't be
deleted, to keep the audit trail." The confirm dialog's wording updated
to match (states the cascade and the real refusal condition, not the old
"no responses at all"). docs/access-matrix.md's `assessments` delete row
corrected with a dated "resolved by builder 2026-09-24" note, per
instruction — CLAUDE.md's own "a cycle/assessment with no responses"
phrasing is now imprecise in the same way but wasn't touched, since only
access-matrix.md was asked for; flagged here for whoever next revises
CLAUDE.md.

Also fixed in passing: a leftover bug in this file's own history — part
26 or 27's editing had accidentally dropped the opening line of a bullet
under docs/supabase-setup.md's "## Notes" section (the "Network egress...
is blocked" sentence started mid-sentence with no subject). Restored
while already touching that file.

`npm run build`/`npx oxlint src` clean (same three pre-existing
warnings). `get_advisors` (security) re-run clean.

**Part 28 (2026-09-24) — Real bug, found live on the deploy preview: live-session ratings never actually saved.**

The builder hit this on PR #6's Netlify preview while finishing a real
Expert live session (5 mixed-perspective topics): a "ratings upsert
failed: ON CONFLICT DO UPDATE command cannot affect row a second time"
error banner, with the questionnaire's own "All 5 topics rated" summary
screen still showing underneath it (that screen is a pre-save preview,
not a claim of success — the click that actually saves, "To Results →",
is what failed). Screenshot confirmed the error was real, not a one-off.

**Root cause, traced to `Questionnaire.jsx`'s `initialValuesFor(iro)`**:
it unconditionally returned all six possible criterion keys (`scale`,
`scope`, `irreversibility`, `likelihood`, `magnitude`,
`financialLikelihood`) for every IRO, regardless of that IRO's actual
type — even though only two to four of those are ever meant to apply
(`CRITERIA_FOR[iro.iroType]` already encodes the real subset, and is what
the criteria *inputs* correctly render). `next()`/`prev()`/`exitSession()`
all merge the full `values` object into `ratings[iro.id]` unfiltered, so
every IRO's local rating state ended up carrying both `likelihood` and
`financialLikelihood` — and `ratings.criterion_key` has no separate
`financialLikelihood` value (a known, documented simplification —
`componentKeyToDbKey()` in data.js maps both to the single db column
`likelihood`). One `ratings` upsert batch with two rows both targeting
the same `(submission_id, iro_id, criterion_key)` conflict key is exactly
what Postgres refuses with that error — and since the write is a single
statement, it fails atomically: **the entire batch is rejected, not just
the offending IRO's rows.** Given autosave (`onProgress`) fires on every
topic navigation and resubmits the *whole* `ratings` object each time,
this broke as soon as a session's second topic was touched — meaning, in
practice, **no live-session ratings have ever actually reached the
database this session**, only silently failing until the final "To
Results" click surfaced the error where it could be seen.

**Fixed at the root** in `Questionnaire.jsx`: `initialValuesFor` now
returns only the keys `CRITERIA_FOR[iro.iroType]` actually lists for that
IRO, via `Object.fromEntries`, instead of a fixed six-key object — an
impact-type IRO's local state can never again pick up a stray
`financialLikelihood`, and vice versa.

**Second, independent guard added in `data.js`**'s
`ratingRowsFromComponentState`: rows are now built into a `Map` keyed by
the actual DB column (`` `${iroId}:${dbKey}` ``) instead of a plain array,
so even if some other future path ever produces both component keys for
one IRO, the upsert batch itself can't carry a duplicate target — last
value wins, and for a financial-type IRO that's `financialLikelihood`
(processed after `likelihood` in `CRITERION_KEYS`' fixed order), i.e. the
intended value survives the dedup. This isn't redundant with the
Questionnaire.jsx fix: it also protects **any browser tab that already
has a tainted `ratings` object in memory from before this fix ships** —
the builder's own in-progress session, stuck on the summary screen at
the time of the report, should now save successfully on a simple retry
of "To Results →" once this deploys, with no data re-entry needed. Traced
this by hand (no way to click-test a live upsert from this sandbox): the
fix closes the root cause for every fresh session going forward, and the
dedup independently repairs any state that was already poisoned by the
bug before the fix landed.

`npm run build`/`npx oxlint src` clean (same three pre-existing
warnings). No schema/RLS change. Not click-tested in a live browser
(sandbox limitation) — the builder's retry on the deploy preview is the
real confirmation this time, same as for every other live-session flow
this session.

**Part 27 (2026-09-24) — PR #6 opened (Groups 2-5 to main), main's post-merge docs reconciled, and Sign-off only's UI presentation built.**

**PR status.** Commits since PR #5 merged (Groups 2-5, `c647f8a`..`a2377f4`) were never on `main` — this branch kept going past the PR #5 merge without a follow-up PR. Checked, confirmed, and opened
[PR #6](https://github.com/Ani-greenfriend/Double-Materiality-Assessment-B/pull/6)
(`claude/restore-prototype-ui` → `main`). Before opening it, merged `main`
into this branch first — `main` had gained its own commits right after the
PR #5 merge (a regenerated CLAUDE.md/access-matrix.md/product-spec.md and a
PROGRESS.md checklist addition, uploaded directly by the builder — the
Project Governor's own access-stage checklist, matching almost verbatim
what this branch had already been building against via the deleted
`PROGRESS-access-stage-additions.md`). Git's own merge was clean (no
textual conflicts), but two things needed a human read to catch, since
they weren't textual conflicts:
- CLAUDE.md's Tech Stack line still described the retired
  `VITE_TOOL_A_URL` hardcoded-fallback pattern after merging, directly
  contradicting the Environment Variables section two lines below
  (`VITE_SURVEY_BASE_URL`, required, no fallback — this branch's own part
  22 change). Fixed to match the actual code.
- docs/supabase-setup.md's part-21 note flagging a live conflict between
  the (then-current) access-matrix.md/CLAUDE.md wording ("repurpose" the
  retired `cycles` columns) and what was actually built (new columns) was
  now stale — main's upload had already corrected both docs to say "new
  columns." Marked resolved.
- PROGRESS.md's merge brought in the original, now fully-completed
  access-stage checklist as a second, unchecked copy sitting inside an
  unrelated section — condensed to a one-line pointer at the dedicated,
  far more detailed access-stage checklist this file already maintains,
  rather than leaving two checklists disagreeing about the same finished
  work. Dropped two now-moot notes too (a stale-snapshot warning from
  session start, a duplicate "no named Sign-off-only holder" note already
  covered in detail elsewhere in this file).

Build/lint clean after the merge and the reconciliation commit; pushed,
then opened PR #6 and subscribed to its activity to watch for the deploy
preview.

**Sign-off only's UI presentation, the gap flagged in parts 24 and 26.**
Per direct instruction: hide nav items this role can't use, show a clear
locked message on Dashboard and Report (and, since neither has any table
access for this role either, Stakeholders and Topics get the same
treatment), and render read-only where the matrix says read-only.
Nothing in the database changed — this is presentation only, on top of
Group 2's already-verified RLS.

- **`App.jsx`**: computes `isSignOffOnly` from `me.accessLevel`; the
  sidebar nav (`visibleTabs`) drops Dashboard/Stakeholders/Topics/Report
  for this role entirely — Assessments, Responses and Calibrate & Results
  remain, plus the always-present avatar dropdown (Settings is unaffected,
  every role reaches Profile). An effect bounces away from any of the
  four locked tabs the moment `me` resolves to Sign-off only — covers
  both the default landing tab (Dashboard) and any stale `tab` state
  left over from a role change. Each of the four locked screens renders
  a new `LockedScreen.jsx` instead of the real component if `tab`
  somehow still points at one (a stray deep-link, browser back/forward,
  etc.) — nav hiding alone isn't relied on, matching the "refused, not
  just hidden" wording in access-matrix.md rule 7.
- **`AssessmentOverview.jsx`/`AssessmentsTab.jsx`**: a `readOnly` prop
  hides "+ New Assessment," and the per-row Recipients/Participants,
  Edit and Delete actions — only Preview (View) and View results remain.
  `handleEdit`/`handleDelete`/`openRecipientsDirect`/`enterLiveSession`
  (Kick off) all bail out early when `readOnly`, not just the buttons
  that trigger them, since a couple of these are also reachable via
  Responses' deep-links.
- **`AssessmentReviewHub.jsx`** (ported prototype component, changed
  under the v2.1-access-stage sanctioned-exception clause, not a random
  restyle): a `readOnly` prop hides every "Edit" toggle (Introduction,
  Rating Criteria, per-topic name/description) and the stakeholder-chip
  remove buttons; Exit always discards (never prompts to save, since
  nothing can go dirty) and is relabelled "Close." This is the only
  entry point left into the wizard-adjacent screens for Sign-off only
  (via Preview), and it now can't write anything.
- **`ResponsesTab.jsx`**: this screen was already read-plus-CSV-only
  except for one write action — "Delete unfinished drafts," now hidden
  (and its handler guarded) for Sign-off only. The "Invitations"/"Resume
  session" links (which jump into the now-gated Assessments write flows)
  are hidden too, rather than relying solely on the receiving end's
  guard.
- **`CalibrationTab.jsx`**: the entire per-IRO write surface — Adjust/Edit
  calibration, Reset to calculated, Sign off this result, Revoke, and the
  Owner/Moderator inputs — hidden for Sign-off only; Owner/Moderator
  render as plain text instead. Calculated/calibrated values, notes and
  change history stay visible (read).
- **`ResultsScreen.jsx`**: reused the file's own existing "no cycle"
  read-only threshold display (`!cycle ? <static text> : <editable
  inputs>`) by widening its condition to `!cycle || readOnly` — the
  Impact/Financial threshold Apply flow disappears entirely for Sign-off
  only, showing the same plain "Impact threshold X · Financial threshold
  Y" text every other reader sees when there's no cycle context.
  `handleApplyThresholds` itself also bails early when `readOnly`.
- **`CalibrateResultsTab.jsx`**: threads `readOnly` through to both
  `ResultsScreen` and `CalibrationTab` — no changes of its own beyond
  that (the shared filter bar and workspace header were already
  read-only for everyone).

**Deliberately not built, and why — a real gap surfaced while doing this,
not silently worked around**: neither `assessments.iro_list_signed_off`
nor `cycles.results_signed_off` has any UI anywhere in this codebase, for
*any* role — grepped `src/` for both column names and their two
`SECURITY DEFINER` functions (`sign_off_assessment_topics`,
`sign_off_cycle_results`, both built and verified in Group 2/part 23) and
found zero references. The existing "✓ Sign off this result" button in
Calibrate & Results is a completely different mechanism
(`calibrations.reviewed_with_owner`, per-IRO, Owner/Admin/Full only) that
predates the access stage. Building the two new sign-off actions
themselves — a way for a Sign-off-only holder to actually call
`sign_off_assessment_topics`/`sign_off_cycle_results` — is new
functionality, not "presentation," and wasn't asked for by this task; it's
also the same unbuilt "Topics selection sign-off screen" gap already
flagged in part 24 (since the assessment's own topic-selection view for
Sign-off only doesn't exist as a screen at all yet — `TopicsTab.jsx` is
the master `topic_library` admin list, which this role has no access to).
Flagging this explicitly rather than inventing a button with nowhere real
for it to live: **the two sign-off actions need their own build pass**,
likely alongside whatever screen ends up showing "this round's topic
selection" to a Sign-off-only Topics reviewer.

`npm run build`/`npx oxlint src` clean (same three pre-existing
warnings). No schema/RLS change — pure frontend, on top of Group 2's
already-live database enforcement. Not click-tested in a live browser
(sandbox limitation, as with every UI change this session) — logic was
traced by hand for each of the three remaining roles' paths (Owner/Admin/
Full unaffected, since `readOnly`/`isSignOffOnly` are only ever true for
`accessLevel === 'signoff'`) rather than assumed.

**Part 26 (2026-09-24) — Access stage, Group 5 of 5: the Half A refusal test. Access stage complete.**

Ran every rule in docs/access-matrix.md Section 6 (all 13, numbered) and
every row in docs/user-stories.md's "Stories that are refusals" table
(all 11) live against the real database — genuine RLS impersonation
inside rolled-back transactions, as Anika, as unrecognised/anon
identities, and (new this part) as temporary but real Sign-off-only,
plain Full-access and Admin identities, built by inserting throwaway
`auth.users` + `team_members` rows inside the same rolled-back
transaction (this project has no other real Auth identity to test
against). Nothing below was left to "pending, no named holder" — every
rule that needed a Sign-off-only, Admin or plain-Full-access caller now
has a real, if temporary, one to test with. No schema, RLS or frontend
change this part — this is verification only.

**Section 6, all 13 rules — result:**

| # | Rule | Result |
|---|---|---|
| 1 | Owner/Admin/Full read/write every workflow table | **Pass.** Anika reads/edits everything (established throughout parts 21-25). |
| 2 | Sign-off only reads assessments/iros/submissions/ratings/topic_justifications/live_sessions/live_session_participants/attendance_edit_log/calibrations; excluded from topic_library/invitations | **Pass.** A temporary Sign-off-only identity (both permissions) saw real rows in all 9 granted tables (assessments 6, iros 40, submissions 2, ratings 46, live_sessions 4, live_session_participants 9, attendance_edit_log 9, calibrations 6, topic_justifications 0 — table empty, not policy-blocked) and exactly 0 rows from `topic_library`/`invitations`. |
| 3 | Sign-off only signs off assessment topics only with `can_signoff_topics` | **Pass.** Identity with the permission: `sign_off_assessment_topics()` succeeds. Identity without it: blocked — "Not authorized to sign off the topic list." |
| 4 | Sign-off only signs off cycle results only with `can_signoff_results`; `cycles` itself only readable with that same permission | **Pass.** Identity with the permission: `sign_off_cycle_results()` succeeds, and `cycles` returns real rows (4). Identity without it: the function is blocked ("Not authorized to sign off results") and `cycles` returns exactly 0 rows. |
| 5 | `calibrations.calibrated_value`/`.band_value` locked while `cycles.results_signed_off = true`, for Owner/Admin/Full too | **Pass** (verified part 23; re-confirmed by rule 6's setup this part). |
| 6 | Only Owner/Admin/Full can revoke `results_signed_off`; Sign-off only cannot, even with `can_signoff_results` | **Pass.** A Sign-off-only identity with `can_signoff_results = true` attempted a direct `UPDATE cycles SET results_signed_off = false` — no exception (RLS silently matches 0 rows on UPDATE rather than raising), but a follow-up read confirmed the flag was still `true` — nothing changed. `sign_off_cycle_results()` itself only ever sets the flag to `true` (read its exact body to confirm) — there is no revoke path for this role anywhere, matching the rule exactly. |
| 7 | Dashboard's/Report's underlying tables refused to Sign-off only | **Pass at the data layer**: `threshold_changes` and `calibration_history` (both Report-only, full-access-only per Group 2) and `topic_library` (Dashboard-only) all return exactly 0 rows to a Sign-off-only caller. **Not yet pass at the presentation layer** — flagged in part 24: the UI doesn't hide the Dashboard/Report nav items or show a stated "locked" message for this role yet; a Sign-off-only user reaching those screens today would see an empty/broken screen, not a refusal message. Still an open item for the builder's call (Group 6, fold into a later pass, or wait for a named holder). |
| 8 | Only Tool Owner (not Admin) can grant/revoke `is_admin` | **Pass, live** — supersedes the old "confirmed by code review, no second Admin to test" note. A real temporary Admin identity (is_admin=true, is_owner=false) successfully created a team member and set another row's access level, but was blocked granting `is_admin` to that row ("Only the Tool Owner can grant or revoke Admin") and blocked deactivating themselves. |
| 9 | `is_owner` has no UPDATE path for any role, including the Owner herself | **Pass.** Anika (the real Owner) attempting to change her own `is_owner` — blocked ("is_owner cannot be changed through the app"). |
| 10 | anon (Tool B) has no access of its own | **Pass** for every Tool-B-exclusive table: `team_members`/`topic_library`/`calibrations`/`stakeholder_members` all return exactly 0 rows to `anon`, and an `anon` INSERT into `team_members` is blocked by RLS. Confirmed the only tables where `anon` *does* have a read policy (`assessments`, `cycles`, `stakeholder_groups`) are Tool A's own pre-existing public-survey surface, not anything Group 2 added — consistent with the rule's own wording ("the shared anon surface is entirely Tool A's"). |
| 11 | A login with no `team_members` row sees only "No access yet" | **Pass at the data layer** (established part 21/23: an unrecognised `auth.uid()` gets `is_full_access()`/`is_signoff_only()` both false, zero rows everywhere). **Pass at the UI layer too, code-reviewed**: `App.jsx`'s gate (built part 24) renders `NoAccessScreen.jsx` for `me === null`, before any other screen mounts — not click-tested in a live browser (sandbox limitation, as with every UI screen this session), but the logic is a direct, simple property check with no path around it. |
| 12 | `submissions` DELETE — draft + Closed/Completed only | **Pass, live.** A draft submission on a synthetic closed assessment (`end_date` forced into the past): delete succeeds, row gone. A submitted response on the same assessment: delete attempt affects 0 rows, row still present. |
| 13 | `avatars` bucket — own avatar only for upload/delete, any avatar readable | **Policy definition confirmed, not live-tested.** All four storage policies (`avatars own insert/update/delete`, `avatars read any`) are scoped to `{authenticated}` only, with the path check `(storage.foldername(name))[1] = auth.uid()::text` matching `uploadAvatar`'s own `${authUserId}/avatar.${ext}` path exactly. A live cross-account delete test was attempted but Supabase's storage schema refuses **any** direct SQL `DELETE` on `storage.objects` regardless of caller ("Direct deletion from storage tables is not allowed. Use the Storage API instead.") — a tooling wall, not a policy finding; real verification of this one rule needs the actual Storage API (a live browser or an authenticated REST call), which this sandbox doesn't have. |

**user-stories.md's 11-row refusal table — cross-checked against the
above, nothing new to test beyond what's already covered:** rows 1-3
map to rules already verified (submissions update/delete, calibrations
lock); row 4 maps to rule 3's "no permission" case; row 5 maps to rule 7
(data-layer pass, UI-layer flagged); row 6 maps to rule 8 (now live,
not code-review-only); row 7 (Full access refused from Admin & Roles) —
the component-level guard in `AdminRolesTab.jsx` (`if (!me.isOwner &&
!me.isAdmin) return <refusal>`) is a direct property check, code-reviewed
rather than click-tested; the underlying data policies were separately
confirmed in part 24 (a plain Full-access caller's writes are blocked
even though the read policy alone doesn't stop them, which is exactly
why the component-level check matters); row 8 (self access_level change)
— tested this part specifically: a temporary plain Full-access identity
attempting to change their **own** `access_level` was blocked ("Only
Tool Owner or Admin can change access level..." — the trigger's
Owner/Admin gate has no "except your own row" carve-out for this
column group, so self-narrowing is blocked the same way granting to
someone else is); row 9 maps to rule 9; row 10 maps to rule 11; row 11
(logged-out visitor sees only the login screen) is a plain, unconditional
`if (!session) return <Login />` in `App.jsx`, ahead of every other check
— confirmed by reading the code path, not something the access stage
changed.

**Net result: the access stage's own gate is fully proven at the
database layer, for every rule, with no remaining "pending — no named
holder" items** — every role that had no real person to test as now has
a genuine (temporary, rolled-back) identity that was actually
impersonated. The one remaining gap is UI presentation, not policy: rule
7 / user-story 5 (Dashboard/Report's stated refusal for Sign-off only)
and rule 13's live Storage-API test are both explicitly flagged above
rather than silently marked done.

**This closes the five-group access stage** (Group 1: schema delta,
Group 2: RLS policies, Group 3: Admin & Roles, Group 4: Profile, Group
5: the refusal test). Half B (a named Sign-off-only person's own screen
test) remains explicitly deferred, as it has been throughout — no named
holder exists yet.

**Part 25 (2026-09-24) — Access stage, Group 4 of 5: Settings → Profile.**

No schema or RLS change — this reuses Group 3's already-built,
already-verified `fetchOwnTeamMember`/`updateOwnProfile`/`uploadAvatar`
and Group 1's private `avatars` bucket. Re-confirmed the bucket's four
storage policies (`avatars own insert/update/delete`, `avatars read
any`) are all scoped to `{authenticated}` only, with the path check
matching `uploadAvatar`'s `${authUserId}/avatar.${ext}` path exactly —
no live file upload exercised (sandbox has no browser), but the policy
shape leaves nothing to guess at.

**Built: `ProfileTab.jsx`.** Avatar upload/change; Edit/Save for name and
phone number (own row only, per part 24's fix — every other role can do
the same on their own row, no gating needed since Profile is already
behind the avatar dropdown and every role owns editing their own
name/phone/photo); email shown but never editable; role title shown but
not editable here (only Owner/Admin set it, via Admin & Roles — the
matrix's own-row exception list excludes `role_title`); member since;
and a read-only access-level line in plain language — for Full access,
whether the caller is also Tool Owner or Admin and what that adds; for
Sign-off only, exactly which of the two sign-off permissions they hold,
or that neither is granted yet. Wired into `SettingsMenu.jsx`'s already-
existing "Profile" entry, replacing part 24's placeholder — the Settings
avatar dropdown is now feature-complete for both Profile and Admin &
Roles.

`npm run build`/`npx oxlint src` clean (same three pre-existing
warnings). This closes Group 4 — **only Group 5 (the refusal test)
remains** of the five-group access stage. The flagged, undecided item
from part 24 (role-gated nav/read-only rendering for Sign-off only
across the other seven screens) is still open — see part 24 and
docs/supabase-setup.md's Group 3 section; needs the builder's call on
whether it's Group 5's job, a new Group 6, or waits for a named
Sign-off-only holder.

**Part 24 (2026-09-24) — Access stage, Group 3 of 5: Settings → Admin & Roles, plus the shared login gate and avatar-dropdown shell it needs to be reachable at all.**

**Real gap found before building anything, fixed first.** Re-reading
access-matrix.md's `team_members` per-table section while building the
Admin & Roles screen surfaced an unambiguous mismatch with what Group 2
(part 23) actually shipped: the matrix says `name`/`phone_number`/
`avatar_url` are editable **on the caller's own row only — for every
role, including Tool Owner/Admin**. Group 2's `update team_members` RLS
policy (`is_full_access() OR auth_user_id = auth.uid()`) lets any
full-access caller attempt an UPDATE on *any* row, and the protection
trigger only guarded the admin-facing columns (`is_owner`/`is_admin`/
`active`/`access_level`/`can_signoff_*`/`role_title`) — leaving
`name`/`phone_number`/`avatar_url`, plus `email` (not listed as editable
by anyone, anywhere, in the matrix), writable on someone else's row by
any Owner/Admin/Full-access caller. Not a contradiction needing a
decision — the matrix is explicit and nothing else in the spec docs
disagrees — so fixed outright: `v3_access_team_members_own_row_fields_and_email_lock`
(same trigger function, `create or replace`, no new trigger and no RLS
change) adds two guards ahead of the existing ones: `email` can never
change through the app for anyone (it has to keep matching the identity
the auth-link trigger matches against); `name`/`phone_number`/`avatar_url`
can only change on the caller's own row, regardless of role.

**Verified live**, same rolled-back-transaction impersonation pattern as
part 23 — full detail and every test's exact result in
docs/supabase-setup.md's new Group 3 section. Summary: Anika editing her
own name/phone — works; the same on someone else's row — blocked;
Anika changing her own email — blocked. Built two temporary `auth.users`
rows inside the rolled-back transaction (this project has no other real
Auth identity yet) to genuinely impersonate a plain Full-access caller
and an Admin caller, not just Anika (Owner) — confirmed: full-access
(non-admin) can't create a team member, can't self-grant `is_admin`,
can't grant `is_admin` to anyone else; a Sign-off-only caller's read
returns only their own row; an Admin (not Owner) *can* create a team
member and set another row's access level/sign-off permissions (matching
"Admin: yes"), but still can't grant `is_admin` or deactivate themselves.
Every one of these matches the matrix's per-role, per-column table
exactly. `get_advisors` (security) re-run clean.

**Built:**
- **The login gate** (CLAUDE.md Hard Rule, not previously built —
  `App.jsx` had zero awareness of `team_members` until now, any
  authenticated session saw the full app regardless of role). Fetches the
  caller's own row once the session resolves; no row or `active: false`
  renders a new `NoAccessScreen.jsx` ("No access yet — ask your Admin" /
  "Access deactivated") instead of the app shell, sign-out only. This is
  what makes every table-level boundary Group 2 already enforces actually
  visible in the UI, not just true at the API.
- **`SettingsMenu.jsx`** — replaces the sidebar's plain email+sign-out
  block with an avatar dropdown: Profile (every role, wired but not built
  yet — placeholder text, that's Group 4) · Admin & Roles (Tool
  Owner/Admin only) · Sign out. Settings is not a left-rail nav item, per
  instruction — pulled forward from Group 4 because Group 3's own screen
  needs somewhere to be reached from; Group 4 finishes the dropdown's
  other half.
- **`AdminRolesTab.jsx`** — search, a role/permission legend, "+ New team
  member" (email/name/role title/access level, sign-off checkboxes only
  for Sign-off only — the email must already have a Supabase Auth login,
  per CLAUDE.md's Option A), and a per-row editable table: access level,
  the two sign-off permissions, role title, an Admin toggle (locked +
  tooltip for an Admin viewer, for the Owner's own row, and for anyone's
  own row), an Active toggle (locked on one's own row, deactivate only,
  no delete path). Also refuses at the component level for a
  non-Owner/Admin caller who somehow reaches the route — real defense in
  depth here, since the underlying `read team_members` RLS does let any
  full-access caller read all rows; the screen-level refusal is what
  actually keeps plain Full-access out.
- `src/lib/data.js`: `fetchOwnTeamMember`, `listTeamMembers`,
  `updateOwnProfile`, `uploadAvatar`, `createTeamMember`,
  `updateTeamMemberAccess`, `updateTeamMemberAdmin`,
  `updateTeamMemberActive`. `avatar_url` stores the storage **path**
  (the bucket is private, unlike `logos`) — reads resolve it to a fresh
  signed URL, batched via `createSignedUrls`, 7-day expiry.

**Flagged, not built — a decision needed, not a guess:** access-matrix.md
and user-stories.md describe Sign-off only's screens as Topics (read +
conditional sign-off — really the assessment's own `iros`/Review &
Customise output, not the `topic_library` admin list per the Group 2
resolution)/Assessments/Responses/Calibrate & Results, all read-only,
with Dashboard and Report "locked, not just hidden from nav." None of
that role-gated nav visibility or read-only rendering across the other
seven screens was built this part — it isn't one of the five groups as
scoped (Group 3 = Admin & Roles only), it would touch nearly every
existing component, and Sign-off only's Half B screen test is already on
record as deferred with no named holder yet. The database already
refuses the data underneath (Group 2's RLS returns zero rows to a
Sign-off-only caller from `topic_library`/the Dashboard's/Report's
source tables) — only the UI's *presentation* of that refusal is
outstanding. See docs/supabase-setup.md's Group 3 section for the full
writeup; needs the builder's call on whether this is Group 5's job, a
new Group 6, or waits for a named Sign-off-only holder regardless.

`npm run build`/`npx oxlint src` clean (same three pre-existing
warnings). Migration this part:
`v3_access_team_members_own_row_fields_and_email_lock`.

**Part 23 (2026-09-24) — Access stage, Group 2 of 5: RLS policies, built, verified live, pushed.**

Builder gave three direct decisions resolving the contradictions flagged in
part 22, then confirmed "resume access-stage Group 2, followed by Groups 3
to 5... Save point after each group."

**Contradictions resolved (builder decision, 2026-09-24), docs/access-matrix.md
Section 6 rule 2 corrected to match the per-table sections:**
1. `topic_library` — Sign-off only has **no** access (removed from rule 2's
   list).
2. `invitations` — Sign-off only has **no** access (removed from rule 2's
   list).
3. `cycles` — Sign-off only reads `cycles` only via `can_signoff_results`
   specifically; `can_signoff_topics` alone grants no `cycles` access (was
   never in rule 2's list, stays governed solely by its own per-table
   condition). A note in access-matrix.md flags that if a future Topics
   sign-off screen needs a cycle-level field (e.g. financial year/ESRS
   version for display), that's a gap to report, not a reason to widen this
   grant.
   Also added `iros`/`topic_justifications`/`live_session_participants`/
   `attendance_edit_log` to rule 2's list — the per-table sections already
   granted these to Sign-off only but the original rule 2 summary omitted
   them; genuinely matching "the per-table sections" required adding these,
   not just removing the two named items. Documented with a dated
   "resolved by builder 2026-09-24" note in access-matrix.md rather than a
   silent rewrite.

**Two gaps fixed, as instructed:**
- `submissions` UPDATE — was `qual: true` (no lock at all), directly
  contradicting a CLAUDE.md Hard Rule. Now `is_full_access() AND status =
  'draft'` — frozen for every role once submitted, no exceptions, with the
  one sanctioned exception (anonymising name/email/title on a GDPR
  request) routed through a dedicated `SECURITY DEFINER` function instead
  of a general UPDATE grant.
- `iros` DELETE — added the "only while the assessment has no responses"
  guard access-matrix.md specifies (was unconditionally open). Tested
  exactly as instructed: an IRO whose assessment **has** submissions →
  delete blocked; an IRO whose assessment has **none** → delete succeeds —
  both directions verified live (see below), confirming Review & customise
  topic removal still works on an assessment with no responses.

**Built, in order, all applied live via `mcp__Supabase__apply_migration`:**
- `v3_access_role_helper_functions` — the RLS self-recursion fix for
  `team_members`: a `SECURITY DEFINER`, `STABLE` `tm_active_row()` fetches
  only the caller's own row (`auth_user_id = auth.uid()`), bypassing RLS
  internally so it can't recurse into the policies it feeds; seven thin
  `SECURITY INVOKER` wrappers built on top —
  `is_full_access()`/`is_signoff_only()`/`can_signoff_topics()`/
  `can_signoff_results()`/`is_owner_user()`/`is_admin_user()`/
  `current_team_member_id()` — used directly inside every other table's
  policies from here on.
- `v3_access_rls_clients_practice_stakeholders_topics` — `clients`,
  `practice_settings`, `topic_library`, `stakeholder_groups`,
  `stakeholder_members`: full-access-only (read + write), no Sign-off-only
  grant on any of the five, per the resolved `topic_library` decision
  above.
- `v3_access_rls_assessments_iros` — `assessments`/`iros`: read for both
  roles, write full-access-only; `iros` DELETE gains the no-responses
  guard.
- `v3_access_rls_cycles` — read gated specifically on `can_signoff_results`
  for Sign-off only (not general signoff access), full-access-only write.
  Dropped the two dead, pre-restore stage-gated policies still live from
  before part 17 (`authenticated update cycles` on `stage <> 'signed_off'`
  and its compensating revoke-sign-off policy) — the UI stopped using
  `cycles.stage` back in part 17; these were unreferenced dead weight, not
  a currently-relied-on path.
- `v3_access_rls_calibrations` — read for both roles; the value lock is a
  second layer, since RLS's `USING`/`WITH CHECK` can't see which columns an
  UPDATE actually touches: a new `BEFORE UPDATE` trigger
  (`enforce_results_signoff_lock()`) raises only if `calibrated_value`/
  `band_value` changed while the joined cycle's `results_signed_off` is
  true — `owner`/`moderator`/`notes`/`reviewed_with_owner` stay editable
  regardless, matching the spec's "a real lock on the two value fields
  only."
- `v3_access_rls_threshold_changes` — `calibration_history`/
  `threshold_changes`: full-access-only, matching access-matrix.md;
  `calibration_history` deliberately excluded from Sign-off only's read
  list (per-table section doesn't grant it).
- `v3_access_rls_invitations` — read gated on `opened_at`, full-access-only;
  the GDPR anonymise path moved off a general UPDATE grant onto a new
  `SECURITY DEFINER` function, `anonymise_invitation(p_invitation_id)`
  (checks `is_full_access()` internally, sets
  `name='Anonymised'`/`email='anonymised@invalid'`/`anonymised_at=now()`).
- `v3_access_rls_submissions` — the frozen-once-submitted fix above;
  title-only anonymisation via a new `anonymise_submission_title
  (p_submission_id)` function (same pattern, sets `title = null`).
- `v3_access_rls_live_sessions` — `live_sessions`/`live_session_participants`/
  `attendance_edit_log`: read for both roles, write full-access-only.
  `ratings`/`topic_justifications` got the Sign-off-only read grant added
  to their existing draft-check policies (not rebuilt from scratch — those
  policies' existing logic for what a draft is stays as-is).
- `v3_access_rls_team_members` — the table's first-ever policies (fully
  closed since Group 1): own-row-or-full-access read; column-level
  protections via a second `BEFORE UPDATE` trigger
  (`enforce_team_members_protections()`, since this is the same
  "some columns locked, others aren't" limitation as calibrations) — raises
  if `is_owner` changes at all (no app path, ever — Supabase dashboard
  only, per CLAUDE.md); if `is_admin` or `active` changes on one's own row
  (self-change blocked regardless of role); if `is_admin` changes by anyone
  but `is_owner_user()`; if `access_level`/`can_signoff_topics`/
  `can_signoff_results`/`role_title`/`active` changes by anyone but
  `is_owner_user()` or `is_admin_user()`. Two new `SECURITY DEFINER`
  functions for the two sanctioned Sign-off-only self-service writes:
  `sign_off_assessment_topics(p_assessment_id)` and
  `sign_off_cycle_results(p_cycle_id)` — each checks the caller's specific
  `can_signoff_*` flag (or full access) internally via `tm_active_row()`
  and raises otherwise, rather than opening a general UPDATE grant on
  `assessments`/`cycles`.
- `v3_access_fix_search_path` — Supabase's advisor flagged all 9 new
  functions as `function_search_path_mutable` (WARN — no `SET search_path`
  pinned, a search-path-injection risk pattern even where not concretely
  exploitable here). Pinned `SET search_path = public` on all 9;
  `get_advisors` re-run clean afterward.

**Verified live, not just read back from the migration SQL** — this
sandbox has no browser, so every fix was proven with genuine RLS
impersonation inside rolled-back transactions (`set_config
('request.jwt.claims', ...); set local role authenticated; <test>;
rollback;` — actually evaluates RLS as that user, unlike this session's
normal Supabase MCP access which runs as a superuser that bypasses RLS
entirely):
- Anika (Owner/Admin/Full): `is_full_access()` = true; reads all rows of
  `topic_library` (10), `team_members` (1), `clients` (2).
- An unrecognised identity (random UUID, no `team_members` row):
  `is_full_access()`/`is_signoff_only()` both false; zero rows back from
  `topic_library`/`team_members`/`calibrations`.
- Submissions frozen-once-submitted: attempted UPDATE on a real
  `status='submitted'` row as Anika → 0 rows affected.
- Calibrations value-lock: temporarily set a real cycle's
  `results_signed_off = true` inside the transaction; attempting to change
  that cycle's calibration's `calibrated_value` raised the exact trigger
  exception; updating `notes` on the same row in the same locked state
  succeeded (1 row) — proving the lock is column-scoped, not row-wide.
- `iros` DELETE guard, both directions, exactly as instructed: an IRO
  whose assessment has submissions → delete blocked (row still present
  after); an IRO whose assessment has none → delete succeeded (row gone
  after).

**Checked against the v2.1 deferral instruction**: none of the remaining
Groups 3-5 depend on `Copy personal link`, `Mark as sent`, invitation
statuses, the "not opened after 5 days" flag, or anything reading
`invitations.link_code` — Group 3 (Admin & Roles) and Group 4 (Profile)
are both entirely about `team_members`, unrelated to invitations; Group 5
(refusal test) only exercises policies already built, including the
`invitations` read/anonymise policies above, not the per-invitation UI
features named in the deferral. Nothing new added under "Deferred to
v2.1" — the only deferred item stays the v2.1 shared-link feature itself
(noted in part 22, still waiting on the regenerated CLAUDE.md).

`npm run build`/`npx oxlint src` clean (same three pre-existing warnings)
— no frontend files touched this part, schema/RLS-only, run as a sanity
check regardless since `docs/access-matrix.md` cites `src/`-facing
behaviour. Migrations, in order: `v3_access_role_helper_functions`,
`v3_access_rls_clients_practice_stakeholders_topics`,
`v3_access_rls_assessments_iros`, `v3_access_rls_cycles`,
`v3_access_rls_calibrations`, `v3_access_rls_threshold_changes`,
`v3_access_rls_invitations`, `v3_access_rls_submissions`,
`v3_access_rls_live_sessions`, `v3_access_rls_team_members`,
`v3_access_fix_search_path`.

**Not yet built**: Group 3 (Settings → Admin & Roles), Group 4 (Settings →
Profile + the avatar-dropdown header menu), Group 5 (the refusal test
write-up — Half A's mechanical groundwork is substantially covered by the
live verification above, but the full enumerated pass against every `no`
cell in access-matrix.md Section 6's 13 rules hasn't been assembled as its
own pass yet; Half B stays deferred, no named Sign-off-only holder).

**Part 22 (2026-09-24) — Builder scope-narrowing note: link codes, no shared survey link, required env var; access stage Group 2 paused.**

Builder interrupted mid-Group-2 with an explicit "do not widen this
session's scope" and four narrow items, addressed in order:

**1. Link-code generation, checked, no fix needed.** `generateLinkCode()`
(`src/lib/data.js`) is `crypto.randomUUID().replace(/-/g, '')` — 32 hex
characters, drawn from the Web Crypto API's CSPRNG (the same underlying
entropy source `crypto.getRandomValues` uses; `randomUUID()` is a
higher-level wrapper over it, not a separate weaker generator). Already
exceeds the 24-character minimum and is nowhere near `Math.random()` —
confirmed via a repo-wide grep that no other generator or `Math.random`
call exists anywhere near `link_code`. Both `createInvitation` and the
bulk `createInvitationsFromRecipients` path route through this one
function. Nothing changed here.

**2. Shared survey link without a personal code — found one, removed
it.** `SurveySetupStep.jsx`'s General info step (inherited verbatim from
reference-prototype/, predating the personal-link invitation model) had a
"SURVEY LINK" card: an editable `apus.app/survey/<slug>` field with a
Copy button — exactly the code-less shared link product-spec.md Section 8
says must not appear ("so the prototype's survey-link field in General
info is not used"). Removed the whole card and its `copyLink`/`copied`
state. The `slug` itself is still real, needed data (personal links are
built as `.../survey/<slug>/<link_code>`) — kept as a silently
auto-derived value (`slugify(meta.name)`), never shown or user-editable.
Confirmed via a repo-wide grep for `/survey/` that this was the only
place any bare, code-less link was ever constructed or displayed —
Recipients only ever shows **Copy personal link** per invitation, as
before.

**3. Personal-link base address moved to a required env var.** Was
`VITE_TOOL_A_URL` with a hardcoded fallback
(`https://questionnaire-dma.netlify.app`) — built in an earlier part of
this session as an improvement over a fully hardcoded address, but the
builder's direct instruction this round is stricter: take it from an env
var, full stop, no fallback. Renamed to `VITE_SURVEY_BASE_URL`;
`buildPersonalLink()` now throws a clear error if it's unset rather than
silently defaulting. Resolves product-spec.md Section 15's open question
("How does this tool know Tool A's site address...") outright rather than
leaving it open. CLAUDE.md's Environment Variables section updated to
list all three required vars. **Action needed from the builder, not just
Claude Code**: this Netlify env var must be set (or the old
`VITE_TOOL_A_URL` renamed) before the next deploy, or Recipients/Created
will throw when building a personal link — flagged in Known issues, not
just buried here.

**4. v2.1 (shared link + email) noted, not built.** Added to Notes for
next session verbatim per instruction — waiting for the regenerated
CLAUDE.md before any of it is built.

**Access stage Group 2 paused here, not abandoned** — see Notes for next
session for exactly what's done (the RLS helper functions, applied and
inert) versus not (every actual policy rewrite), and the three
access-matrix.md internal contradictions found while re-reading it for
Group 2, flagged rather than guessed at.

`npm run build`/`npx oxlint src` clean (same three pre-existing
warnings). No schema/RLS change this part — items 1/2/3 are frontend-only
(bar the already-applied, still-inert Group 2 helper functions from
before the interrupt).

**Part 21 (2026-09-24) — Access stage, Group 1 of 5: schema delta.**

Builder instructed the access stage to start, per docs/access-matrix.md
and docs/user-stories.md (added to main by the Project Governor,
2026-09-23; merged into this branch's PR #5 the same session — see PR
merge note below) — the authoritative source for every role, table and
policy from here on, not CLAUDE.md's summary of them. Both read in full
before any schema work, as instructed.

**Housekeeping first**: merged `origin/main` into `claude/restore-prototype-ui`
— a clean merge, zero conflicts (confirmed both locally and via GitHub's
own `mergeable_state: clean`; an earlier builder report of conflicts on a
long file list turned out to be the PR's "Files changed" tab misread as a
conflict list — nothing on that list actually conflicted). Picked up the
regenerated CLAUDE.md, docs/access-matrix.md, docs/user-stories.md. Found
and read the git history of a since-deleted `PROGRESS-access-stage-additions.md`
(main commit `1ff5d8d`, deleted in `b946eaf`) — a note-to-self the Project
Governor left because it only had a stale, session-1 PROGRESS.md to work
from; its checklist is the same one the builder pasted directly into
chat, confirming both point at the same real state.

**Group 1 — schema delta, all six items built and verified live:**
1. `team_members` table (id, auth_user_id nullable, email unique,
   name/phone_number/avatar_url/role_title, access_level `full`/`signoff`,
   is_admin, is_owner, can_signoff_topics, can_signoff_results, active,
   created_at, updated_at) — RLS enabled, **zero policies yet** (default
   deny for every role including `authenticated` until Group 2; not a gap,
   the intended state between these two groups). Seeded Anika Lerch
   (anikalerch@greenfriend.org), is_owner/is_admin/access_level='full'.
2. `created_by`/`updated_by` (FK → team_members) + `updated_at` added to
   `clients`, `topic_library`, `iros`, `stakeholder_groups`,
   `stakeholder_members` — confirmed missing on all five beforehand via
   `information_schema.columns`, confirmed present on all five after.
3. `assessments.iro_list_signed_off`/`_by`/`_at` — advisory only, as
   specified; never wired to block anything.
4. `cycles.results_signed_off`/`_by`/`_at` — **new columns, deliberately
   not a repurposing** of the existing `signed_off_at`/`approver_name`/
   `approver_role`/`minutes_reference`/`signed_off_recorded_by`. Both
   docs/access-matrix.md Section 5 and CLAUDE.md's own schema-delta
   summary say "repurpose" — the builder's own instruction starting this
   stage explicitly overrode that ("do not repurpose... those are already
   retired and documented as staying unused"), which matches this file's
   own history (parts 8/17) better than the stale spec line does. Flagged
   in docs/supabase-setup.md as a live conflict between the spec docs and
   what's actually built, for whoever next revises access-matrix.md — not
   silently resolved, not guessed at.
5. `avatars` Storage bucket — private (unlike the public-read `logos`
   bucket), RLS: any `authenticated` user can read any avatar (needed for
   the header everywhere), upload/update/delete restricted to the
   uploader's own path. Implemented the path scope as `<auth.uid()>/...`
   rather than `<team_members.id>/...` as access-matrix.md Section 5
   literally says — behaviourally identical (one auth identity maps to
   exactly one team_members row) and avoids a subquery on every storage
   request; flagged as an implementation-detail deviation in
   docs/supabase-setup.md, not a behaviour change.
6. `link_team_member_on_auth_signup()` trigger, `AFTER INSERT ON
   auth.users`, `SECURITY DEFINER` — matches a new login's email to a
   still-unlinked `team_members` row. No match means no access; the "No
   access yet" screen itself is Group 3+ work, not built this pass.
   **Caught before it caused a real lockout**: the trigger only fires on
   `INSERT`, but Anika's `auth.users` row already existed from 2026-09-18
   testing, well before this migration — a returning magic-link sign-in
   reuses that row, it never re-inserts, so the trigger would never have
   linked her. Backfilled her `auth_user_id` manually once (confirmed
   linked); every login from here on is a genuine new `INSERT` the
   trigger catches on its own.

**Security check run immediately after** (same discipline as the
Responses-views finding in part 17): Supabase's advisor flagged the new
trigger function as callable directly via `/rest/v1/rpc/...` by `anon`
and `authenticated` — Supabase's default grant on every new `public`
function. A `returns trigger` function actually can't be invoked this way
(Postgres refuses it outside a real trigger — `NEW` is undefined), so
this was never exploitable, but the stray grant was revoked anyway for
cleanliness (`v3_access_revoke_stray_grant`).

**Also fixed in passing**: docs/supabase-setup.md's "Delete unfinished
drafts" section still described the *original* cycle-stage-gated policies
from session 2 part 2 — superseded back in part 17 (Group B.8) by
assessment-status-gated ones, but the doc was never updated to say so at
the time. Corrected now, while already touching this file for the access
stage.

`npm run build`/`npx oxlint src` not re-run this part — no frontend files
touched, schema-only. Migrations: `v3_access_team_members`,
`v3_access_audit_columns`, `v3_access_iro_list_signoff`,
`v3_access_results_signoff`, `v3_access_avatars_bucket`,
`v3_access_auth_link_trigger`, `v3_access_revoke_stray_grant`,
`v3_access_backfill_anika_link`. Everything
verified live via Supabase MCP (`information_schema`, `pg_policies`,
`pg_trigger`, `storage.buckets`, `get_advisors`) — not just read from the
migration SQL after the fact.

**Not yet built — waiting for the builder's OK per the stop-after-Group-1
instruction**: Group 2 (RLS policies — the 13 numbered rules in
docs/access-matrix.md Section 6), Group 3 (Settings → Admin & Roles),
Group 4 (Settings → Profile), Group 5 (the refusal test). `team_members`
has no working policies yet, so nothing reads or writes it from the app
until Group 2 lands — this is expected, not a bug to chase.

**Part 20 (2026-09-23) — Three PR #5 testing bugs, found by the builder on a fresh test session.**

**1. Kicking off an Expert live session failed:** `submissions` insert error
`null value in column "stakeholder_group"`. Root cause:
`ensureLiveSessionSubmission` (data.js) only ever wrote
`assessment_id`/`source`/`live_session_id`/`status` — `stakeholder_group`
and `perspective` are both `NOT NULL` on `submissions` (confirmed live via
`information_schema.columns` and the table's check constraints), and
neither had ever been supplied. Reproduced against every one of the 4 live
sessions already in the test data (zero `expert_live_session` submission
rows existed anywhere — every kickoff had been failing, not just some).
Fixed:
- New `resolveLiveSessionStakeholderGroup(liveSessionId)` — a live
  session's one submission covers the whole group, which can span several
  stakeholder groups, so there's no single natural value; it resolves the
  distinct group names from the active participants (their own group via
  `stakeholder_member_id` → `stakeholder_members.group_id`, or the group
  they represent via `represents_group_id` for a silent stakeholder),
  joins them, and falls back to "Live session participants" only if none
  resolve. Verified against the real test data — every existing session
  resolves real group names, never the fallback.
- `perspective` only accepts `impact`/`financial` (checked constraint) —
  no `full`, so a mixed-perspective live session (`assessment.perspective_filter
  = 'full'`) is tagged `impact`; disclosed limitation, not a schema change
  (`submissions`' schema is Tool A's, never touched from here per
  CLAUDE.md). The ratings themselves still score correctly per IRO
  regardless of this label — it only affects this one summary field.
- `fetchLiveSessionProgress`/`ensureLiveSessionSubmission` now take
  `perspectiveFilter`; threaded from `AssessmentsTab.jsx`'s
  `enterLiveSession` (`assessment.perspectiveFilter`).

**2. Review Hub's Introduction and Rating Criteria tabs rendered empty**
right after creating a new assessment (worked fine when opened from the
Assessment overview list). Root cause: `handleCreate`'s post-creation
`setActiveAssessment(...)` (AssessmentsTab.jsx) only carried
`id`/`slug`/`name`/`type`/`justificationMode`/`mandatory` — dropping
`welcomeText`/`taskText` (and `perspectiveFilter`/`description`/
`startDate`/`endDate`) even though the assessment was created *with* real
text seconds earlier. `ExpertAssessmentCreated`'s "Preview" button feeds
that same stale in-memory object straight to Review Hub without a
refetch, so the tabs had nothing to show. Fixed by including all six
fields (already available as local state/`surveyMeta` at that point, no
extra round trip) in the post-creation `setActiveAssessment`.

**3. Clicking "Assessments" in the left nav didn't return to the
overview** if you were already on that tab (mid-wizard, in Review Hub, or
running a live session) — `setTab('assessments')` is a no-op when `tab`
is already `'assessments'`, so `AssessmentsTab` never remounts and its
internal `flowStep` stays wherever it was. Same class of bug the
Stakeholders nav item already had a fix for (`openGroupId` lifted to
`App.jsx` so the nav click can reset it). Fixed the same way: a new
`assessmentsResetSignal` counter in `App.jsx`, bumped on every click of
the Assessments nav item; `AssessmentsTab` takes it as a `resetSignal`
prop and a small effect resets `flowStep` to `'overview'` and clears
`activeAssessment`/`liveSession`/`sessionProgress`/the wizard draft
(`resetDraft()`) whenever it changes — abandoning any in-progress wizard,
which is the correct behaviour for a top-level nav click, not a "resume
where I left off" feature.

**Verification:** `npm run build` and `npx oxlint src` clean (same three
pre-existing warnings). For bug 1 specifically — the one that touches the
database — checked live via Supabase MCP rather than trusting the code
read alone: confirmed `submissions.stakeholder_group`/`perspective`'s
exact `NOT NULL`/check-constraint definitions, confirmed `authenticated`
already has an unrestricted INSERT policy on `submissions` (no RLS
change needed), and ran the new group-resolution join against every real
live session in the test data to confirm it always finds real group
names. Bugs 2 and 3 are pure frontend state-flow fixes, verified by
reading the exact data path end to end (traced `activeAssessment`'s
value through every step from creation to Review Hub) rather than
inspecting the DB, since nothing about them is server-side; still not
click-tested in a live browser (sandbox limitation, as with everything
else this session) — the builder's next test session on the fresh deploy
preview is the real confirmation.

**Part 19 (2026-09-22) — Report PDF redesign: professional layout, ESRS materiality determination.**

The builder tried the generated PDF on the deploy preview and called it
"horrible" — a fair read of the first cut: no visual hierarchy beyond a
plain accent heading, a real line-wrap bug (paragraphs that wrapped to
more than one line used a fixed y-advance regardless of actual line
count, so long text could overlap the content below it), and Section 4
("Topics and results") was a flat IRO table and three charts with no
explicit per-topic material/not-material call-out — the thing a DMA
report actually exists to deliver. Rewrote `reportPdf.js`'s layout
end to end rather than patching it:

- **New layout primitives**, replacing ad hoc `doc.text`/`doc.setFont`
  calls scattered through each section: `paragraph()` (wraps via
  `splitTextToSize` and advances the cursor by the *actual* rendered
  line count — fixes the overlap bug at the root, not per call site),
  `subheading()`, `pill()` (rounded badge — Provisional/Final on the
  cover), `numberedStep()` (a filled accent circle + wrapped text — the
  process steps in Section 2), `statCard()` (bordered label/value/sub
  box — the cover's three headline stats and the two threshold cards),
  `sectionHeading()` (a "SECTION 0N" kicker + a short accent rule, not
  just colored text), `pillarHeading()` (a colored tick mark + pillar
  name + ESRS range, e.g. "Environmental · ESRS E1–E5"), and a slim
  `addRunningHeader()` on every page but the cover (report title left,
  client name right, a rule) alongside the existing footer.
- **Cover** rebuilt: a thin accent bar at the very top, logos, a real
  title block, three stat cards (ESRS topics in scope, material topics,
  report status), and a short prose paragraph stating the outcome in
  numbers before the reader reaches Section 4 — not just a label list.
- **Section 4 ("Topics and results") now leads with a "Materiality
  determination by ESRS topic"** table, grouped by pillar (Environmental
  ESRS E1–E5, Social S1–S4, Governance G1) in canonical ESRS order, one
  row per topic: impact score, financial score, and a determination of
  **Material** / **Not material** / **Not yet assessed** (a topic with
  no submitted ratings is called out separately from one that was
  assessed and found not material — not silently dropped). This reuses
  `calc.js`'s existing `aggregateTopic`, not a new scoring path. The
  bar chart, heatmaps and topic matrix (kept, with the bar chart gaining
  a 0–5 axis grid) and the full IRO table now sit after this as
  supporting detail, under "Visual analysis" and "Full IRO listing"
  subheadings.
- Every other section (methodology, engagement, calibration, appendix)
  restyled with the same heading/subheading/paragraph primitives for a
  single consistent look, and free-text notes now render in italic
  muted text so they read as annotations rather than body copy.

**Verification, given this sandbox still has no browser to open a real
PDF:** `npm run build` and `npx oxlint src` clean (same three
pre-existing warnings only). Beyond that — this round specifically —
ran a Node smoke test exercising every new jsPDF primitive this rewrite
introduces and hadn't been used before (`roundedRect` fill and
stroke-only, `circle` fill, hex colors passed to `setFillColor`/
`setDrawColor`, `splitTextToSize` + array-based `doc.text`,
`getTextWidth`, `autoTable`'s `didParseCell` cell-styling hook, and
`italic` as a `setFont` style) — all confirmed working before relying on
them throughout the rewrite. Visual correctness (exact spacing, whether
it now reads as genuinely "professional and compact" per spec) still
needs a human look at a generated PDF — the one thing this sandbox
cannot do itself.

**Part 18 (2026-09-22) — Step 5: the PDF report builder.**

New dependencies: `jspdf` and `jspdf-autotable` (v5 functional API —
`autoTable(doc, {...})`, not the old `doc.autoTable()` method; verified
directly with a Node smoke test since this sandbox can't click-test a
real browser PDF flow). No schema/RLS change — `practice_settings` and
the `logos` bucket's `practice/logo.<ext>` path were already provisioned
in session 2 part 2 and just needed their first real reader/writer.

**`src/lib/data.js`** — added `fetchPracticeSettings()`,
`uploadConsultantLogo(file)` (uploads to the existing `logos` bucket,
upserts the one-row `practice_settings` table), and `fetchReportData(cycleId)`
— assembles everything the report needs in one call: assessments, IROs
(via the existing `fetchCycleIros`), `assessment_progress`,
`group_engagement`, `threshold_changes`, `live_sessions`,
`live_session_participants`, submitted `submissions`, and raw
`combined_ratings` rows for the appendix. `fetchCycleIros` doesn't carry
`calibration_history` (only the single-assessment `fetchDashboard` does),
so `fetchReportData` fetches it separately, keyed by each IRO's
calibration id, and attaches it as `iro.calibrationHistory`.

**`src/lib/reportPdf.js`** (new) — the PDF assembly module.
- Three light/print-theme chart builders, each raw SVG built as a
  template string with explicit pixel dimensions (not read from a
  mounted DOM element, since the console's own charts are dark-themed
  and mounted — these are independent, purpose-built for print): a bar
  chart of every IRO's effective score, an impact heatmap
  (severity × likelihood) and a financial heatmap (magnitude ×
  likelihood), and the topic matrix (material ring + labels). Rasterized
  to a PNG data URL via Blob → Image → canvas, with an explicit white
  background fill first (canvas PNG is otherwise transparent).
- `buildReportPdf({cycle, iros, groupEngagement, thresholdChanges,
  liveSessions, liveParticipants, submissions, ratings,
  consultantLogoUrl}, {sections, options})` assembles the six sections in
  order: cover (logos, client, FY, ESRS version, Provisional/Final stamp),
  methodology (process steps, scoring rules, thresholds + baselines +
  `threshold_changes` table), engagement (`group_engagement` table with a
  "Silent stakeholder" label, basis-for-representation table,
  expertise-by-respondent table, live-session dates/attendees table gated
  by the personal-data option), results (bar chart + two heatmaps, the
  topic matrix, a full IRO table), calibration (`calibration_history`
  table, per-IRO sign-off table, optional approval-details block), and
  appendix (ratings + justifications filtered by full/flagged/excluded,
  experts' overall comments). Every page gets a footer: financial
  year/ESRS version/date bottom-left, PROVISIONAL-or-FINAL + page number
  bottom-right — `PROVISIONAL`/`FINAL` computed the same way Calibrate &
  Results does (every IRO's `reviewed_with_owner` set), never
  `cycles.stage`.
- Page breaks: each of the 6 sections calls a `startSection()` helper
  that adds a page *before* the section starts (except the first) — not
  an unconditional `addPage()` at the end of each section, which would
  leave a trailing blank page after whichever section happened to be
  ticked last. Caught and fixed during my own review before this was
  ever run, no leftover fragile cleanup code.

**`src/components/ReportTab.jsx`** — the four-step wizard: financial-year
selector; Step 1 two preset cards (Audit pack = all 6 sections, Client
report = cover/engagement/results/calibration only); Step 2 per-section
toggles plus a consultant-logo upload (a plain file input, not the
reused `LogoUpload.jsx` — that component's label text is specific to the
questionnaire-logo context and would be wrong here); Step 3 personal-data
toggle (off by default), justifications scope (full/flagged/excluded),
IRO scope (all/material-only/one ESRS topic), optional approval details,
a free-text note per enabled section; Step 4 preview (`doc.output('bloburl')`
in an iframe) and download (`doc.save(...)`).

**Verification limits, disclosed:** this sandbox cannot open a real
browser to click through the wizard or open a generated PDF. What *was*
verified: `npm run build` and `npx oxlint src` clean (same three
pre-existing prototype warnings only); `jspdf-autotable` v5's functional
API and `doc.output('bloburl')` both confirmed working via isolated Node
smoke tests; a full manual line-by-line review of `reportPdf.js` for
scoping/API-usage bugs and the page-break logic specifically. Actual
*visual* correctness of the generated PDF (spacing, chart legibility,
whether "professional, compact" per spec's design intent is met) has not
been human-verified — worth a real check on the deploy preview before
this is called production-ready.

**Disclosed simplifications:** approval details, personal-data and
justification-scope are implemented as straightforward toggles, not a
more elaborate system; jsPDF pulls in `html2canvas` as a transitive
dependency (visible in the build output as a separate chunk) though
nothing in this codebase calls it directly.

**Part 17 (2026-09-21) — Group B: Calibrate & Results simplified, per-IRO sign-off, the new Responses screen.**

**Group B.7 — Calibrate & Results.**
- **Removed entirely** from `CalibrateResultsTab.jsx`'s `WorkspaceHeader`:
  the stage badge (Collecting/Calibrating/Signed off), Start calibration,
  the global Sign off form (approver name/role/minutes reference), Revoke,
  Require both sources, and Delete unfinished drafts (moved to Responses,
  see B.8). The header is now purely informational: client, financial
  year, ESRS version, thresholds, and a Provisional/Final badge computed
  from `iros.every(iro => iro.calibration?.reviewed_with_owner)` — never
  `cycles.stage`, which stays an unused column per spec.
- **`CalibrationTab.jsx`**: deleted the round-level `CalibrationSignOff`
  component added last round (now superseded — the spec restored real
  per-IRO sign-off instead, "as in the prototype"). Removed the `locked`
  prop everywhere ("Calibration is always available" — no more stage-gated
  read-only state); same for `ResultsScreen.jsx`'s threshold inputs
  ("editable at any time... via Apply with a reason"). Added a "N of M
  IROs signed off" count line.
- **Per-IRO sign-off now genuinely records who.** The existing
  `reviewed_with_owner`/`_at` fields recorded *that* and *when* someone
  signed off, but never *who* — the spec's "Sign off and Revoke record the
  logged-in user and time" wasn't actually true yet. Added
  `calibrations.reviewed_with_owner_by` (new nullable FK → auth.users,
  migration `v2_add_reviewed_with_owner_by`) — **not** the retired
  `signed_off_by`/`signed_off_at` columns CLAUDE.md forbids; this is a
  distinctly-named column doing the same job the spec asks for.
  `setReviewedWithOwner` now takes `changedBy` and writes it;
  `saveCalibrationAdjustment`/`resetCalibrationToCalculated` now also
  clear all three `reviewed_with_owner*` fields, matching "editing a
  signed-off IRO clears its sign-off."
- **`submissions`/`ratings`/`topic_justifications` DELETE RLS replaced**
  (migration `v2_delete_drafts_by_assessment_status`) — the old policies
  gated on `cycles.stage IN ('calibrating','signed_off')`; the new ones
  gate on the *assessment* being Closed (`expert_survey` past its
  `end_date`) or Completed (`expert_live_session` with
  `live_sessions.status = 'finished'`), matching spec exactly and never
  touching the retired stage column. `purgeUnfinishedDrafts` (data.js) now
  takes an `assessmentId`, not a `cycleId`.

**Group B.8 — the Responses screen, built for real.**
New nav item (`Dashboard, Stakeholders, Topics, Assessments, Responses,
Calibrate & Results, Report`), new `ResponsesTab.jsx`, new `ResponsesIcon`.
Financial year selector + filters (source/ESRS topic/stakeholder
group/perspective) with Reset; two source panels (Expert survey: status,
engagement-rate bar, Invited/Opened/Saved draft/Submitted, link to
Invitations, Delete unfinished drafts; Expert live session: status,
attendance-rate bar, session progress, Expected/Attended/Topics
rated/Sessions, link to resume); Engagement by stakeholder group (bar +
count per group, silent marker, "No response yet"/"Complete"); an IRO
ratings table grouped by ESRS topic with survey/session/combined score
bars (threshold marked), a material/flag badge, and CSV download; a detail
side panel per IRO (three scores, the flag with a plain-language
explanation, comments and justifications filterable by All/Survey/Session
with a "Reveal name" control and CSV, "Open in Calibrate"). No expertise-
coverage view, per spec.

Reused rather than duplicated: `calc.js`'s `aggregateIro` already computed
`surveyAvg`/`sessionAvg`/`sourceBasis`/`sourceGap` (built earlier for
Calibrate's own detail panel) — the IRO table's three score columns and
its flags are the same numbers, not a second scoring path. Added
`fetchResponsesData(cycleId)`, `fetchIroComments(iroId)`,
`fetchInvitationName(id)` to data.js.

**New database objects, per spec Section 5**: three new read-only views —
`assessment_progress`, `group_engagement`, `iro_comments` (migration
`v2_responses_screen_views`). **Found and fixed a real security issue
while building them**: Supabase's default public-schema privileges grant
`anon` SELECT on any newly created view, and a plain (non-`security_invoker`)
view owned by `postgres` evaluates RLS using the *owner's* privileges — a
superuser that bypasses RLS entirely — so without a fix, `anon` could have
read every row through these views regardless of the underlying tables'
RLS (which explicitly deny anon on `submissions`/`ratings`/
`topic_justifications`). Fixed immediately with a follow-up migration
(`v2_responses_views_revoke_anon_and_security_invoker`): revoked anon's
SELECT and set `security_invoker = true` on all three. While checking
this, confirmed the pre-existing `combined_ratings` view already had
`security_invoker = true` set (so it was never actually exploitable
despite also carrying a stray anon SELECT grant) — flagged to the builder
as a minor, non-urgent cleanup, not a live hole.

**Disclosed simplifications, not silently dropped:**
- `iro_comments` covers per-criterion and per-topic justifications only — a
  submission's `overall_comment` isn't tied to one IRO and isn't surfaced
  in the Responses IRO detail panel this round.
- The IRO ratings table's download is CSV only, not PNG — it's a plain
  HTML table, not an SVG chart like Results/Matrix, and rasterizing an
  arbitrary DOM table would need a new dependency (html2canvas or
  similar); CSV covers the same data.
- "Attended" (live session) = active/non-removed participants; "Expected"
  = everyone ever added, removed or not. There's no per-sitting attendance
  concept (CLAUDE.md lists it out of scope), so this is the closest
  buildable proxy from data that already exists.
- "Open in Calibrate" switches to the Calibrate tab but doesn't scroll to
  or auto-open the specific IRO's row yet.

`npm run build` and a full `npx oxlint src` clean throughout — same three
pre-existing prototype warnings on record, nothing new.

**Part 16 (2026-09-21) — spec v2.0 amended 9 merged; Group A of the builder's preview-review fixes.**
Builder uploaded an amended CLAUDE.md/product-spec.md to main (v2.0 amended
9) and asked to merge it, then work through 8 numbered fixes from testing
the deploy preview, in two groups, committing after each. Merged
`origin/main` first: only CLAUDE.md and docs/product-spec.md conflicted
(resolved by taking main's version, per instruction); PROGRESS.md and
docs/supabase-setup.md had no conflicts, kept as-is. Also removed a stray
duplicate `product-spec-v1.2-prototype-reference.md` that landed at repo
root on main (identical to the existing `docs/` copy) — CLAUDE.md's own
Project Structure says root holds only CLAUDE.md and PROGRESS.md.

Amended 9's biggest changes: Cycles-derived stage banner/global sign-off/
"require both sources" are gone from Calibrate & Results (sign-off is
per-IRO again, "as in the prototype"); thresholds are editable *any time*
in the Results tab, not just a "Calibrating" stage (the stage concept
itself is retired from the interface — `cycles.stage` stays an unused
column); a new **Responses** screen; and a much more detailed "New
assessment" differences list. Before touching code, asked the builder two
scoping questions raised by reading the merged spec carefully rather than
guessing: (1) the spec's Calibrate detail panel text describes a clickable
EBITDA-band selector, which conflicts with last round's explicit "make it
explanation-only" instruction — builder confirmed **keep explanation-only**,
treating the spec's wording as a broad restore-the-prototype pass, not a
deliberate re-reversal; (2) the new Responses screen is large enough to be
its own step — builder chose **build it now**, in Group B.

**Group A — five items, one commit-worthy checkpoint:**
1. **Kick off guard.** `ExpertAssessmentCreated.jsx` now takes
   `participantCount`/`hasStakeholderGroups` — when a live session has zero
   participants, the Kick off button is replaced with "Add who participates
   first" plus a "Back to Recipients" button, and (only when the whole
   stakeholder map has no groups at all) a "Go to Stakeholders" button.
   `AssessmentsTab.jsx` tracks `activeParticipantCount`, set right after
   Recipients writes participants. `enterLiveSession`'s existing no-
   participants redirect (for re-entering an existing session later) kept,
   wording aligned to "Add who participates first."
2. **Recipients ("Who participates") rebuilt around the live master map.**
   The real bug behind "the two existing groups and their people are
   missing": the old `stakeholders` prop was a one-time snapshot copied
   into wizard state at the Perspective step, taken before
   `stakeholderMap` had necessarily finished its async load — a race, not
   a design gap. Fixed by having `RecipientsScreen.jsx` read
   `stakeholderMap` directly every render, filtered by `perspectiveFilter`
   (passed straight from the wizard, no snapshot), so it can never be
   stale. The prototype's layout is kept exactly (grouped-by-stakeholder-
   group headers, drag to Included/Excluded, CSV download, "+ Add more
   stakeholders" banner) — new is an "Add someone" panel: pick a group
   (perspective-limited, silent groups included, shown with their marker),
   then either pick an existing member from a dropdown or add a new one
   with the Stakeholders module's own add-contact form (name, role,
   company, email, E/S/G tags, expertise, consent checkbox + data
   statement) — a new person is written straight into `stakeholderMap`
   (via `setStakeholderMap`, same persistence path Stakeholders itself
   uses) and appears in Stakeholders too, immediately.
3. **`stakeholder_member_id`.** New nullable FK column on `invitations`
   and `live_session_participants` (migration
   `v2_add_stakeholder_member_id`, `on delete set null`), confirmed via
   `pg_policies` that `authenticated` already had the needed
   INSERT/UPDATE before adding — no RLS change needed. Threaded through
   `createInvitation`/`createInvitationsFromRecipients`/`addParticipant`/
   `addParticipantsFromRecipients` and the two fetch functions.
4. **Live session Review & customise decluttered.** Removed the
   `ParticipantListCard` (a free-text, non-map-backed "expected
   participants" list) from `SetupReviewStep.jsx` entirely for Expert live
   session — participants are chosen only on Recipients now, one page
   before Kick off, per spec. The survey mode's `StakeholderCard` (self-
   identify group *options* for Tool A's About you screen — a different
   feature from named recipients) is untouched, since the spec only calls
   out the live-session section for removal. Cleaned up the now-dead
   `participantsChoice` state chain in `AssessmentsTab.jsx`.
5. **Step navigation on every wizard screen, including the last.**
   `WizardBreadcrumb.jsx`'s step list now includes a final `expert-created`
   step, labelled "Kick off" or "Created" depending on mode; shown (and
   the earlier steps clickable) all the way through the Created/Kick off
   screen, not just up to Recipients. Recipients' Continue button already
   disabled with nothing included — added the missing "why" text under it,
   matching the guard built for Kick off.
6. **Financial year dropdown.** `SurveySetupStep.jsx`'s year field is now
   a `<select>` of 2022–2027 instead of a free `<input type="number">`;
   the existing `esrsVersionForYear()` pre-select rule (`>= 2027 →
   esrs_2026`, else `esrs_2023_amended`) already matched the amended
   spec's 2022–2027 wording exactly, so it needed no change.

**Known, disclosed limitations from this group** (not blocking, not asked
for explicitly): clicking an earlier breadcrumb step after arriving at
Recipients via the overview's direct shortcut (not the full wizard) can
show a step with stale `surveyMeta`, since that shortcut only sets
`assessmentMode`/`perspectiveFilter`, not the rest of wizard state; "Go to
Stakeholders" is a real tab switch (`App.jsx`'s `onGoToStakeholders`), and
since `AssessmentsTab` unmounts when the tab changes, there's no auto-
return banner — the builder gets back to Recipients via the already-built
Assessment overview shortcut (the people-icon button) instead.

`npm run build` and a full `npx oxlint src` clean throughout — same three
pre-existing prototype warnings on record, nothing new.

**Part 15 (2026-09-21) — real threshold Apply flow; unrated topics shown in the bar chart.**
Builder asked for two things: (1) make sure the thresholds shown in the
Calibrate & Results header ("overview") always match the Matrix's, and
propagate a Matrix change to the header; (2) show every topic in the
Results bar chart, even ones not yet rated.

Investigated (1) before touching code and found the Matrix's threshold
number inputs (`ResultsScreen.jsx`) had never actually been wired to
anything — a disconnected local preview, not the real, persisted cycle
threshold `aggregateIro`/`aggregateTopic` actually use for materiality.
CLAUDE.md's Business Rules already specify the correct behaviour in full:
"Two thresholds per cycle... editable only in stage Calibrating, in the
Results tab, via Apply with a reason logged to threshold_changes; read-only
otherwise" — a real feature that had simply never been built, not a design
question. Built it for real rather than just cosmetically syncing two
numbers (which would have let the header show one value while materiality
used another):
- **New `updateCycleThresholds`** (data.js) — updates
  `cycles.impact_threshold`/`financial_threshold` and inserts one
  append-only `threshold_changes` row per axis that actually changed
  (`axis`, `old_value`, `new_value`, `reason`, `changed_by`) — confirmed the
  table's exact columns and that `authenticated` already has UPDATE on
  `cycles` and INSERT on `threshold_changes` (`pg_policies`) before writing
  it, no migration needed.
- **`ResultsScreen.jsx`** now takes `cycle`/`userId`/`locked`/`onChanged`
  props (adaptation (g), added to the file's header comment). Outside the
  Calibrating stage (or with no `cycle`), the thresholds render as
  read-only text, always identical to the header's numbers by construction
  — no divergence is possible. In Calibrating, the number inputs stay
  editable; when the draft differs from the persisted value, a reason
  field and "Apply to this round" button appear, with a note that
  materiality (including the header) still uses the old value until
  applied. Applying calls `updateCycleThresholds` then `onChanged()`,
  which refetches the cycle — a `useEffect` re-syncs the draft inputs to
  the fresh persisted value, so header and matrix read the same number
  again immediately.
- **`CalibrateResultsTab.jsx`** passes `cycle`/`userId`/`locked`/`onChanged`
  through to `ResultsScreen` (it already had all four for `WorkspaceHeader`
  and `CalibrationTab`).

For (2): `scoredIros` (adaptation (h)) no longer filters out IROs with
`score === null` (never assessed) — every IRO now appears in the "PRIMARY —
IROs BY SCORE" bar chart, sorted to the bottom, rendering a 0-width bar and
a "–" instead of a number. Fixed the two other places that assumed a
non-null score (`maxScore`'s computation, the bar-chart CSV export) so
neither crashes on the now-possible `null`.

`npm run build` and a full `npx oxlint src` clean — same three
pre-existing prototype warnings as every part this session.

**Part 14 (2026-09-21) — Step 4 finished: E/S/G and material filters shared between Results and Calibrate.**
Builder picked option (a) from part 13's three choices: lift the filter
state out of `ResultsScreen.jsx` and share it with `CalibrationTab.jsx`.
Done:
- `ResultsScreen.jsx`: `activeCats`/`showMaterial`/`showNotMaterial` are no
  longer local `useState` — they're props now (adaptation (f), added to
  the file's header comment alongside (a)-(e)). Removed the E/S/G and
  Material/Not material checkboxes from its own JSX (the Impact/Financial
  threshold number inputs, which are unrelated and out of scope, stay
  exactly where they were).
- `CalibrateResultsTab.jsx`: owns the shared state now, plus a new
  `FilterBar` component rendered once, above the Results/Calibrate
  sub-tab switch — so it's visible and in effect regardless of which
  sub-tab is open, and switching tabs never resets it (it's the parent's
  state, not either child's). Passes `activeCats`/`showMaterial`/
  `showNotMaterial` into both `ResultsScreen` and `CalibrationTab`.
- `CalibrationTab.jsx`: had zero topic/material filtering before this —
  now filters its row list the same way the Matrix chart always has
  (`activeCats.includes(pillarFor(iro.topic))` and
  `agg.isMaterial ? showMaterial : showNotMaterial`), with a "No topics
  match the current filters" empty state distinct from the existing
  "This assessment has no IROs yet" one (the latter still checks the
  *unfiltered* `iros.length`, so it never fires just because a filter
  hides everything).

`npm run build` and a full `npx oxlint src` clean — same three
pre-existing prototype warnings as every part this session, nothing new.
This closes step 4 — both pieces PROGRESS.md was tracking (the
`CalibrationScreen.jsx` port, part 13, and these shared filters) are done.

**Part 13 (2026-09-21) — Step 4 start: per-topic sign-off wording, and what's still open.**
Builder said "move ahead" into Step 4 (port `CalibrationScreen.jsx` from the
prototype + persistent filters, per part 11's handoff notes). Read the
prototype's actual `CalibrationScreen.jsx` before touching anything, which
surfaced a real conflict worth stopping for: the prototype has a **per-topic**
"✓ Sign off this result" button (storing `signedOffBy`/`signedOffAt` per
IRO) — almost certainly what the builder's earlier "we had that in the past"
meant, not the round-level sign-off added in part 12. But that's exactly
the feature CLAUDE.md retires (`calibrations.signed_off_by`/`signed_off_at`,
replaced by `reviewed_with_owner` — "a tick + date, not an approval").
Asked the builder directly rather than guessing; they chose: keep
`reviewed_with_owner` exactly as-is (no schema change, no new invalidate-
on-edit behaviour) but relabel it to read as a sign-off. Done in
`CalibrationTab.jsx`: the badge, the confirmation panel and its "Unmark"
button, and the call-to-action button now read "✓ Signed off" / "✓ Sign off
this result" / "Revoke" (matching the prototype's own wording) instead of
"Reviewed with owner" / "Unmark". No behaviour change — same
`setReviewedWithOwner`/`reviewed_with_owner`/`reviewed_with_owner_at`
underneath, still doesn't invalidate when the calibrated value is later
edited (the prototype's version does auto-revoke on edit; deliberately not
added — out of scope for a wording-only change, flag if the builder wants
that behaviour too).

Comparing the prototype's `CalibrationScreen.jsx` line-by-line against our
`CalibrationTab.jsx` also showed the "port from the prototype" part of
step 4 is mostly already done — this file was already built to the same
accordion/owner/moderator/history/adjust/reset structure in an earlier
session, just wired to real Supabase calls instead of the prototype's local
`useState`. The one prototype feature still missing is its assessment-filter
dropdown — but `App.jsx` already has an equivalent (the assessment picker
above the Calibrate & Results tab, which persists correctly across the
Results/Calibrate switch since it lives outside `CalibrateResultsTab`'s own
state) — so that appears to be a non-issue, not an open gap.

**Still open, deliberately not started this round:** the "persistent
filters (ESRS topic, material only) across tabs" part of step 4. Results'
Matrix already has E/S/G and material/not-material filters, but they're
`useState` local to the verbatim-ported `ResultsScreen.jsx`, not shared
with Calibration (which has no topic/material filter at all today).
Sharing them means lifting that state out of a verbatim-ported prototype
file into the `CalibrateResultsTab` wrapper — a real structural change to
a file that's supposed to stay byte-identical to reference-prototype/
except at the data-wiring boundary. Flagged for the builder rather than
guessed at; see Notes for next session.

**Part 12 (2026-09-21) — Results matrix colours, Calibration's EBITDA selector, a Calibrate sign-off section.**
Builder sent an image of the live deploy preview's topic matrix as a colour
reference, plus three more direct asks. All four done:

1. **Topic Matrix quadrants recoloured, with a real legend.** The matrix's
   background used a faint, two-tone "MATERIAL ZONE" highlight (`ResultsScreen.jsx`'s
   `Matrix` component) — not four distinct, legible colours. Replaced with a
   `MATERIAL_QUADRANT_COLOR` map (Not material / Material — Impact only /
   Material — Financial only / Material — Both) drawn entirely from
   CLAUDE.md's existing brand palette (no new colours introduced): the accent
   `#4C6FFF` for Impact-only, the app's existing delete/negative red
   `#E0645A` for Financial-only, the purple already reserved for
   assessments-run stats `#9B7FE0` for Both, and `#8B8B98` (text-secondary)
   for Not material. Added a colour-swatch legend row above the chart
   (mirroring the reference image's layout) — the E/S/G dot legend and the
   always-visible per-topic labels next to each point were already correct
   and untouched (confirmed by re-reading the ported `Matrix`/`Heatmap` code
   before changing anything: topic labels were already rendered next to
   every point with real collision avoidance, not hover-only, and E/S/G was
   already dot-colour-coded with its own legend — only the quadrant fill
   colours and the missing material-state legend were the actual gap).
2. **Calibration's EBITDA band selector is now explanation-only.**
   `CalibrationTab.jsx`'s per-IRO "MAGNITUDE BAND" control was five
   clickable buttons that let the consultant pick a specific EBITDA-%
   band and write it to `calibrations.band_value` — this let the UI set a
   value redundant with (and potentially contradicting) the magnitude
   already rated 1–5 during the survey/session. Replaced with a read-only
   reference panel listing what each of the five levels means as a share
   of EBITDA, with a line explaining that magnitude comes from the rating,
   not this screen. Removed the now-unused `setBandValue` handler; the
   `band_value` column itself is untouched (not read anywhere else in the
   UI right now, so effectively unused going forward — flagged below
   rather than dropped from the schema, since that's a bigger call than
   this round covers).
3. **Calibration → Results reactivity — verified, not changed.** Checked
   the actual data flow before assuming a fix was needed: `CalibrationTab`'s
   `onChanged` already bubbles to `App.jsx`'s `reload()`
   (`fetchDashboard(assessmentId)`), which re-fetches `iros` — the same
   `iros` array `ResultsScreen` reads via `agg.effectiveValue`. A saved
   calibration already reaches Results on the next render with no code
   change required.
4. **A sign-off section inside the Calibration tab itself.** Added
   `CalibrationSignOff` (new, local to `CalibrationTab.jsx`) at the bottom
   of the row list, shown whenever `cycle.stage !== 'collecting'`: the same
   approver name/role/minutes-reference form and "Require both sources"
   block as the Calibrate & Results header's `WorkspaceHeader`, using the
   same non-retired `signOffCycle`/`revokeCycleSignOff` functions and
   cycle-level fields — **not** a revival of
   `calibrations.signed_off_by`/`signed_off_at`, which stay retired per
   CLAUDE.md and are never referenced. Once signed off, shows a compact
   "✓ Signed off by NAME, ROLE · Minutes: REF" card with Revoke, matching
   the header's own summary. `CalibrateResultsTab.jsx` now passes `cycle`
   and `userId` through to `CalibrationTab` (both already available there
   for `WorkspaceHeader`, so no new prop threading up the tree was needed).

`npm run build` and a full `npx oxlint src` clean — only the three
pre-existing prototype warnings already on record (`ResultsScreen.jsx`'s
unused `shapeB`, `SetupReviewStep.jsx`'s unused `surveyName`,
`StakeholderModule.jsx`'s unused `PerspectiveTag`), nothing new.

**Part 11 (2026-09-21) — post-step-3 builder feedback: five direct fixes.**
The builder sent five concrete asks in one message after seeing PR #5's
deploy preview, ahead of any step-4 go-ahead. All five done, each its own
change, verified with `npm run build`/`npx oxlint` (both clean throughout,
no new warnings beyond the pre-existing prototype ones already on record)
before pushing:

1. **Silent stakeholders sorted to the top.** `StakeholderModule.jsx`'s
   group list (both the Impact and Financial columns, and the generic
   pool) now sorts `type === 'silent'` entries first, stable order
   otherwise — a small sort comparator added at the render boundary, no
   change to the drag/reorder logic itself. Category (c), direct request.
2. **Topics deletable, not just editable, in Review & customise.** Added a
   delete (trash-icon) button next to Edit on each topic row in
   `SetupReviewStep.jsx`'s `TopicsCard` (`onDeleteTopic` prop,
   `handleDelete(iro)` with a confirm dialog warning that any ratings
   already recorded against it are deleted too) — works identically for
   both Expert survey and Expert live session modes, since both go through
   the same Review & customise screen. Wired in `AssessmentsTab.jsx`:
   `handleDeleteTopic(iroId)` calls the new `deleteAssessmentIro(iroId)`
   (data.js) when adjusting an already-created assessment (relies on the
   existing `ratings`/`calibrations`/`topic_justifications` CASCADE FKs on
   `iros`, verified live before relying on it), or just filters local
   in-memory state when still mid-creation (nothing in the DB yet). Lets
   the consultant scope a questionnaire down to a handful of topics for a
   specific expert, per the builder's stated reason.
3. **Quick access to Recipients/Participants from the overview table.**
   `AssessmentOverview.jsx` gained a fifth action icon (people icon)
   between Preview and Edit, titled "Recipients" or "Participants"
   depending on the assessment's type — `onRecipients` prop, not in the
   original prototype table (documented with a comment in the file).
   `AssessmentsTab.jsx`'s new `openRecipientsDirect(assessment)` jumps
   straight to the Recipients screen without going through Mode/
   Perspective/General info/Review, deriving the stakeholder choices fresh
   from the master map filtered by the assessment's own
   `perspective_filter`, and remembers where "Back" should return to
   (`recipientsBackTarget`, since Recipients is normally a mid-wizard step
   with a fixed prior step). Building this surfaced a real gap the
   prototype's single-pass wizard never had to handle — revisiting
   Recipients could invite the same person twice — so added dedup-by-email
   (`createInvitationsFromRecipients`) and dedup-by-name among active
   participants (`addParticipantsFromRecipients`) in data.js.
4. **Warn before kicking off a live session with no participants.**
   `enterLiveSession` (`AssessmentsTab.jsx`) now fetches the participant
   list first; if none are active, it routes into
   `openRecipientsDirect(assessment)` (reusing item 3's shortcut) and shows
   "No one has signed up for this session yet — add participants before
   kicking it off." instead of opening an empty Intro flow. (Caught and
   fixed an ordering bug while building this: `openRecipientsDirect` itself
   clears the error banner first, so the warning has to be set *after*
   calling it, not before, or it'd be silently wiped.)
5. **Results tab rebuilt from the prototype.** New
   `src/components/ResultsScreen.jsx`, a verbatim port of
   reference-prototype/'s `ResultsScreen.jsx` (581 vs. 620 lines — the
   delta is the removed section below, plus the removed PDF code), wired
   into `CalibrateResultsTab.jsx` in place of the old session-1
   `ResultsTab.jsx` (now deleted). Keeps, byte-for-byte: the bar chart of
   every IRO by score, the impact and financial SVG heatmaps, the topic
   scatter matrix with E/S/G and material filters and its hover/pin side
   panel, and the CSV/PNG download panel. Five adaptations, documented in
   a header comment on the file:
   - (a) **the builder's direct request** — dropped the "TOPIC SUMMARY"
     card grid (IROs rolled up by ESRS standard, e.g. "E1", shown as a
     grid of squares above the bar chart) entirely; the bar chart, both
     heatmaps and the topic matrix are unchanged.
   - (b) a `thresholds` prop threaded into every `aggregateIro`/
     `aggregateTopic` call, so materiality reflects the round's real
     threshold instead of the prototype's hardcoded 3.0 default.
   - (c) `scoredIros` and the side panel read `agg.effectiveValue` instead
     of a separate `calibrations` prop — v2.0's `calc.js` already resolves
     the calibrated value per IRO, so there's no separate map to pass.
   - (d) `financialPoints` reads `a.likelihood`, not the prototype's
     `a.financialLikelihood` — that key was retired in the v2.0 schema (a
     risk/opportunity's likelihood axis is the same `likelihood` key an
     impact IRO uses); the DB never produces a `financialLikelihood` field.
   - (e) PDF export removed (the `jspdf` import, `exportChartsAsPdf`, the
     'pdf' format button) — CLAUDE.md's Arms section already says Results
     keeps only the PNG/CSV downloads and the report builder owns PDF;
     confirmed `jspdf` isn't even a dependency in this repo (only in the
     prototype's own `package.json`).

**Part 10 (2026-09-21) — Step 3: the full assessment flow, Cycles removed from the interface.**
The builder's instruction for this step arrived in two messages: an initial
one describing the change, then a stricter follow-up ("Step 3, stricter
than before") giving the definitive six-item allowed-difference list and
folding in Review Hub/Intro/Questionnaire (previously step 4's scope).
Worked through it as eight sub-parts, each its own commit/push so the
deploy preview never broke:

1. **Removed Cycles from the interface.** Deleted `CyclesTab.jsx` and
   `NewCycleWizard.jsx`; dropped the Cycles nav item; replaced the
   Dashboard's cycle selector with a financial-year selector (shown only
   when more than one financial year has assessments). The `cycles` table
   stays in the database — `getOrCreateCycleForFinancialYear`/
   `findCycleForFinancialYear` (data.js) auto-create a cycle for a
   financial year's first assessment, against a single default client
   (CLAUDE.md's "acceptable with one client and one user"), and attach
   later assessments of the same year to it. `createCycle` removed (no
   caller left).
2. **Restored calc.js's anchor label constants** (SCALE_LABELS,
   SCOPE_LABELS, IRREMEDIABILITY_LABELS, IMPACT_LIKELIHOOD_LABELS,
   FINANCIAL_LIKELIHOOD_LABELS, RISK_MAGNITUDE_LABELS,
   OPPORTUNITY_MAGNITUDE_LABELS) — dropped from the earlier v2.0 rework,
   needed verbatim by Questionnaire.jsx/AssessmentReviewHub.jsx for rating-
   scale display text. Pure strings, no scoring-function changes.
3. **Ported 14 prototype screens byte-for-byte** (confirmed with `diff`,
   zero output on every file before any sanctioned edit): AssessmentOverview,
   AssessmentModeSelect, PerspectiveSelect, SurveySetupStep, SetupReviewStep,
   RecipientsScreen, ExpertAssessmentCreated, WizardBreadcrumb, LogoUpload,
   DatePicker, AssessmentReviewHub, IntroFlow, Questionnaire,
   QuantAssessmentGrid. `QuantAssessmentGrid` was removed again a few
   commits later — see below.
4. **Builder dropped "Enter expert responses"/QuantAssessmentGrid** mid-step
   after a clarifying exchange: Tool B is consultant/owner setup only,
   every expert response comes through Tool A. Removed the file; no
   `entered_by` column needed (the long-open question from earlier sessions
   is now moot).
5. **Built the assessment-flow data layer** (data.js): `updateAssessment`
   (draft autosave/patch — none existed before), `updateIroOverrides`
   (Review Hub's per-assessment topic overrides, written onto the
   assessment's own `iros` snapshot, never the master library),
   `createInvitationsFromRecipients`/`addParticipantsFromRecipients`
   (Recipients' included list → real invitations/participants rows — people
   without an email on file are skipped and surfaced, since
   `invitations.email` is NOT NULL but the master map treats it as
   optional), and the live-session ratings engine
   (`fetchLiveSessionProgress` for resume, `saveLiveSessionProgress`/"Save
   and pause session", `finishLiveSession`/"Finish session"). Verified the
   `ratings`/`topic_justifications` unique constraints live before relying
   on `upsert`'s `onConflict`. The prototype's `financialLikelihood`
   criterion key (a risk/opportunity's likelihood axis, retired in the
   v2.0 schema in favour of a single `likelihood` key) is translated only
   at this data boundary — Questionnaire.jsx keeps using its own internal
   name unchanged.
6. **Fixed every remaining "quantitative"/"qualitative" instance** across
   the newly-ported screens (a repo-wide grep had only ever been run on
   Step 1/2's screens before) — `AssessmentModeSelect`'s mode keys are now
   `'expert_survey'`/`'expert_live_session'` directly (matching the DB's
   own `type` enum, so no translation layer is needed anywhere downstream),
   with every screen that branches on `mode` updated to match, plus visible
   copy fixes in `AssessmentOverview`. Confirmed clean with a repo-wide
   grep, including a pre-existing "cycle"-word leak in `CalibrationTab.jsx`
   caught by the same pass.
7. **Built `AssessmentsTab.jsx`**, replacing the stub: Assessment overview
   table, then the wizard state machine (Mode → Perspective → General info
   → Review & customise → Recipients → Created), Review Hub, and Intro →
   Questionnaire for a live session, with resume support. "Edit setup"
   re-fetches the assessment's own already-created `iros` (never
   re-snapshots — never resets responses or status, per CLAUDE.md).
   Deleted the now-fully-superseded `NewAssessmentWizard.jsx`,
   `InvitationsPanel.jsx`, `ParticipantsPanel.jsx`. The General info logo
   (LogoUpload.jsx hands back a base64 data URL, not a File) is re-encoded
   and uploaded through the same Storage path the client record's own logo
   already uses, per the builder's answer to a direct question ("logo only,
   no new company-name field").
8. **Moved the removed Cycles screen's stage controls into the Calibrate &
   Results header**: Start calibration, Sign off (approver name/role/
   minutes reference, blocked by "require both sources" the same way as
   before), Revoke sign-off, a require-both-sources toggle (new —
   `setRequireBothSources` in data.js, no UI existed for it previously),
   and Delete unfinished drafts. Header shows client/financial year/ESRS
   version/stage/Provisional-or-Final, matching the spec's shared-header
   description, without ever saying "cycle."
9. **Verification pass**: diffed every ported screen against
   reference-prototype/ one more time to catalogue exactly what changed.
   Caught two real gaps this surfaced: (a) item 3 of the six sanctioned
   differences ("a justification setting in Review & customise") had never
   actually been built — added a per-criterion/per-topic picker to
   `SetupReviewStep.jsx`, wired through to Questionnaire; (b) a freshly-
   created assessment's `mandatory`/`justificationMode` weren't being
   carried into the in-memory `activeAssessment` used if the consultant
   kicks off a live session in the same sitting right after Create — fixed.

Known simplifications, disclosed rather than dropped silently (see also
part 6's commit message): re-visiting Recipients on an "Edit setup" pass
can re-invite someone already invited (no dedup check yet); live-session
participants added from Recipients get no E1–G1 expertise yet (edit them
afterward — `editParticipant` already supports it); Review Hub's
"Stakeholder Group" chip-removal isn't persisted (no clear schema slot for
it distinct from real invitations, and it's explicitly a preview-only tab
per spec); `npm run build` and `npx oxlint` clean throughout (two
pre-existing prototype warnings only — `PerspectiveTag` in
`StakeholderModule.jsx`, `surveyName` in `SetupReviewStep.jsx`, both
confirmed present in reference-prototype/'s own files). Not click-tested
live — magic-link auth needs a real inbox this sandbox can't reach, same
caveat as every earlier part.

**Part 9 (2026-09-21) — Step 2 correction: silent stakeholders are ordinary entries.**
Builder corrected the previous part's approach (spec v2.0 amended 5 — main
doesn't have this revision pushed yet, but the builder's chat instruction
was explicit and complete enough to build from directly): remove the
separate `SilentStakeholdersPanel.jsx` entirely. Silent stakeholders are now
ordinary rows in `StakeholderModule.jsx`'s own list — the three presets sit
in the generic pool like any other suggestion (they already existed in the
DB with `type = 'silent'`, `perspectives = []`, from earlier session work,
so no re-seeding needed once the load query stopped filtering them out),
draggable into Impact only (never Financial). Data layer simplified back to
one plain, unscoped full-collection sync over the whole `stakeholder_groups`/
`stakeholder_members` tables (`loadStakeholderMapForModule`/
`saveStakeholderMapForModule` now carry `type` through instead of forcing
it null and filtering it out — the "protect a scoped subset" complexity
from Part 7 is gone along with the reason for it). Component changes, all
category (c): a `type` field on the group model; a small "Silent
stakeholder" badge on the row with the exact hover explanation text the
builder gave ("Cannot speak for itself. ESRS allows a proxy — for example
an ecologist, a nature NGO or a scientific study. Consider whether this
party is affected by the company's activities and, if so, add a
representative here." — via the native `title` attribute, mirroring
`DragHandle`'s own existing hover-tooltip pattern in this same file); "+
Both" hidden and the Financial-section drop/reassign path blocked for
`type === 'silent'` groups, so they can only ever carry the impact
perspective; a "This is a silent stakeholder…" checkbox on the "+ Add
group" form that also hides the Financial toggle while checked. Everything
else in the file — stat cards, two-step explainer, drag/reorder, generic
pool, contact form and table, bottom banner — untouched. `npm run build`
and `npx oxlint` clean (same pre-existing `PerspectiveTag` unused-warning
as before, confirmed present in the prototype's own file too).

**Part 8 (2026-09-21) — Step 2 verification against the v1.2 prototype reference doc.**
Builder asked for confirmation, against docs/product-spec-v1.2-prototype-reference.md
Section 8, that every prototype-era feature (not just v2.0 additions) is
still present and unchanged in the ported `StakeholderModule.jsx`/
`TopicsModule.jsx`. Verified every named item with `diff` against
reference-prototype/ and targeted greps — all present, all untouched
(the diffs show only additive changes, nothing removed or restyled): the
three Stakeholders stat cards, two-step explainer, "+Both", generic pool,
"N people"/"+ Add stakeholders" pills, "← Back to all groups", "Expert in"
E/S/G + free-text, the contact table columns, the bottom banner; and
Topics' mascot guidance, bulk upload panel + template download, E/S/G
filter pills, the two sections, dependent sub-topic dropdown, reference
codes, expand-to-edit-or-delete, sign-off badge, bottom banner. One real
issue found and fixed: `TopicsModule.jsx`'s delete-topic confirmation said
deleting a topic "will be removed from any assessment that references
it" — wrong under v2.0, where `snapshotTopicsIntoIros` (data.js) copies a
topic's fields into `iros` at assessment creation, so an assessment's IROs
are independent of the library entry afterward. Corrected the confirm()
text to say assessments keep their own copy and aren't affected. Verified
`npm run build` clean after the fix.

**Part 7 (2026-09-21) — prototype-UI restore, Step 2: Stakeholders full admin and Topics with CSV upload.**
Copied `StakeholderModule.jsx` and `TopicsModule.jsx` (plus `lib/topics.js`
and `lib/csv.js`) byte-for-byte from reference-prototype/ (confirmed with
`diff`); added `papaparse` as a real dependency (`lib/csv.js` needs it,
wasn't in package.json). Sanctioned additions only, all category (c) unless
noted:
- **Stakeholders:** added the GDPR consent checkbox + Section 7 data
  statement to `GroupDetail`'s add-contact form only (the "add stakeholder"
  button is disabled until checked) — the one form Section 8 names. New
  `SilentStakeholdersPanel.jsx` (not a prototype screen — the prototype has
  no concept of "silent" stakeholders at all) renders alongside the ported
  module: the three presets plus custom groups, guidance text, add/remove
  member with the same consent pattern, add/remove a custom group. Both are
  wired through a new `StakeholdersTab.jsx` wrapper that owns Supabase state
  behind the exact same `useState`-shaped `stakeholderMap`/`setStakeholderMap`
  contract the component already expects (mirrors PR #3's
  `setStakeholderMap(updater)` pattern exactly, confirmed by reading its
  `src/App.jsx`/`src/lib/data.js` directly). `openGroupId` is lifted into
  App.jsx so the sidebar's "Stakeholders" click always resets to group
  overview, matching the prototype's own behaviour.
- **Topics:** added an ESRS version toggle (2023 amended / 2026) above the
  ported module — new topics/CSV rows are tagged with whichever version is
  selected, and `PerspectiveSection`'s filter gained an `esrsVersion` term
  alongside its existing E/S/G one; a custom-subtopic text input appears
  next to the dropdown only under ESRS 2026 (the list is non-binding there).
  Added Time horizon (risk/opportunity only), Potential human rights impact
  (negative impact only) and an optional Client select to `TopicForm`/
  `TopicRow` — all three are named per-entry fields in spec Section 8 that
  the prototype's form doesn't have. Sign-off now uses the logged-in user's
  email instead of the prototype's free-text "YOUR NAME (real sign-in comes
  later)" input — spec Section 8: "records the logged-in user and time".
  Fixed one wording instance ("Set up an assessment (quantitative or
  qualitative)" → "Set up an assessment") — the "no quantitative/qualitative
  anywhere" rule applies to every prototype string, not just the mode-select
  screen from Step 1's scope. `reference_code` is globally unique in the DB,
  so the save function is a plain, unscoped full-collection sync across
  every ESRS version (topic_library has no protected subset, unlike
  Stakeholders) rather than scoped-by-version — avoids a same-prefix
  collision between two versions' first topics.
- **data.js:** `loadStakeholderMapForModule`/`saveStakeholderMapForModule`
  (scoped to `type is null or != 'silent'`, both on load and on the sync's
  delete step — silent groups are a deliberately separate scope this sync
  can never reach; member deletes are by explicit id within the map's own
  group ids, never a blanket table-wide "not in", so a silent group's
  members can't be caught either), `loadSilentStakeholderGroups`/
  `addSilentStakeholderGroup`/`removeSilentStakeholderGroup`/
  `addSilentStakeholderMember`/`removeSilentStakeholderMember` (simple CRUD,
  not a sync — this list is short and never reordered), and
  `loadTopicLibraryForModule`/`saveTopicLibraryForModule` (unscoped full
  sync, the whole table). No RLS changes needed — `stakeholder_groups`,
  `stakeholder_members` and `topic_library` already carry fully-permissive
  `authenticated` policies (verified live via `pg_policies` in an earlier
  part this session). No migration — every DB column used already existed
  (`type`, `esrs_version`, `time_horizon`, `potential_human_rights_impact`,
  `client_id` were all added in the shared v2.0 migration, before this
  session started).
`npm run build` clean; `npx oxlint` on every changed file clean (one
pre-existing `PerspectiveTag` unused-function warning in
`StakeholderModule.jsx`, confirmed present in reference-prototype/'s own
copy too — not introduced by this change). Not click-tested live — magic-link
auth needs a real inbox, which this sandbox can't complete; same limitation
noted in every earlier part.

**Part 6 (2026-09-21) — prototype-UI restore, Step 1: Dashboard and shell.**
Pulled the builder's latest CLAUDE.md/product-spec.md (v2.0 amended 4,
matching what main already had — 3 doc-only commits) and the new
docs/product-spec-v1.2-prototype-reference.md (moved from repo root into
docs/). Created `claude/restore-prototype-ui` from `claude/wonderful-darwin-ztquwp`'s
tip, opened PR #5 (draft). Copied `reference-prototype/src/components/Dashboard.jsx`
byte-for-byte into `src/components/Dashboard.jsx` (confirmed with `diff`) —
original six cards (Stakeholder selection, Topic selection, Assessment of
impact/financial topics, Calibration, Downloadable result), editable-name
header, notification bell, all untouched. Added the two missing icons it
needs (`ImpactIcon`, `FinancialIcon`, also copied verbatim — the rest were
already verbatim from earlier sessions). Rebuilt the shell in App.jsx: the
sidebar's collapsible-rail mechanics were already close to the prototype's
own App.jsx aside; changed the nav item set to the spec's 7 items
(Dashboard, Cycles, Stakeholders, Topics, **Assessments** — new, was
missing — Calibrate & Results, Report) and moved signed-in email + Sign out
to the top of the rail per Section 8. All data wiring for Dashboard.jsx
happens in App.jsx, not the component: added `fetchCycleIros(cycleId)` to
data.js (same shape as `fetchDashboard` but across every assessment in a
cycle, plus a `calibrations` map keyed by iro id) and reused
`fetchTopicLibraryForSnapshot`/`fetchStakeholderMaster`. Found and fixed
two real shape mismatches before they could break at runtime: (1) v2.0's
`aggregateIro`/`aggregateTopic` require a `thresholds` argument, but
Dashboard.jsx (like other prototype screens) calls `aggregateIro(i)` with
one — defaulted `thresholds` to `{impact: 3, financial: 3}` in calc.js
rather than touch the prototype component; (2) Dashboard.jsx's
`timeAgo()`/"closing soon" logic expects `Date.now()`-style epoch-ms
numbers and a falsy `status` for "still running" — the DB gives ISO
timestamp strings and an always-truthy status column, so App.jsx now
shapes both (numeric `createdAt`, and a synthesized `status` derived from
the cycle's stage) when building the prop, without touching the component.
Added an `AssessmentsTab.jsx` stub (step 3's job) so the new nav item has
somewhere to go. Deleted the now-superseded `DashboardTab.jsx` (session 2's
rewritten dashboard) and the `fetchTopicLibraryCount` helper it alone used.
Verified the query shape against live demo data (`execute_sql`) before
trusting it. `npm run build` and `npm run lint` clean throughout.

## Earlier sessions (superseded direction, kept for history)
**Part 1** — re-verified docs/supabase-setup.md against the live database,
reworked calc.js and data.js for the v2.0 schema (financialLikelihood
retired, effective/calibrated value materiality, cycle-level thresholds,
`combined_ratings` replacing `assessor_ratings`, `reviewed_with_owner`
replacing the retired calibration sign-off columns). Opened PR #4. Netlify
MCP isn't available in this cloud session (no connector) — builder is
connecting Netlify to GitHub manually instead; given env vars for that.

**Part 2** — builder gave an explicit build order (logo bucket → New cycle
+ Cycles overview → New assessment/Invitations/Participants → Topics/
Stakeholders admin → Live session + full Calibrate & Results → Report
builder/Review Hub → Dashboard last) and asked to push straight to the PR
branch for the branch deploy they've enabled. Did the first item:
- **Logo storage bucket** (`logos`, public-read, migration
  `v2_logos_storage_bucket`) — client logo must be public-read for Tool A;
  consultant logo shares the bucket per CLAUDE.md's Storage line. Only the
  client-logo upload path is wired up in the UI this session (New cycle's
  client step); no practice-settings screen for the consultant's own logo
  yet — out of this session's ordered scope.
- **RLS fix, `cycles` Revoke sign-off** (migration
  `v2_allow_cycle_revoke_signoff`): the existing UPDATE policy
  (`stage <> 'signed_off'`) made the spec's Revoke sign-off action
  impossible — once signed off, no update to that row passed RLS at all.
  Added a narrow second OR'd policy allowing exactly the
  `signed_off → calibrating` transition. Documented in
  docs/supabase-setup.md.
- **Found but did NOT fix (superseded — see Part 3 below):** Section 8's
  "Delete unfinished drafts" purge action has no supporting RLS — Section 6
  lists `submissions` DELETE as "No" for every role with no draft carve-out.
  Flagged as a spec contradiction rather than guessed at; the builder
  decided in Part 3 and it's now built.
- **New cycle wizard** (`src/components/NewCycleWizard.jsx`, since reduced
  to 4 steps — see Part 3): financial year → ESRS version pre-select/
  override → client choose-or-create with logo upload → cycle name +
  baseline thresholds. Writes via new `data.js` functions (`fetchClients`,
  `createClient`, `uploadClientLogo`, `createCycle`).
- **Cycles and assessments overview** (`src/components/CyclesTab.jsx`,
  now the app's first/default tab): lists cycles (client, FY, ESRS version,
  stage badge, thresholds vs. baseline, silent-stakeholders note), expands
  to each cycle's assessments (invitation status counts for surveys, live
  session status for live sessions, draft/submitted counts), Start
  calibration, Sign off cycle (approver name/role/minutes reference inline
  form, blocked if `require_both_sources` and a source has no submitted
  data — checked client-side against `submittedSources`), Revoke sign-off,
  Delete cycle/Delete assessment (rely on the existing RLS state-gating,
  surface any rejection as an inline error rather than pre-checking
  client-side). "New assessment" is a disabled placeholder button (that's
  the next ordered item, not this one). Added `fetchCycles` (cycles + their
  assessments + invitation/live-session/submission summaries in 4 queries)
  and the cycle-lifecycle functions (`createCycle`, `startCalibration`,
  `signOffCycle`, `revokeCycleSignOff`, `deleteCycle`, `deleteAssessment`)
  to data.js. Verified every new query's RLS policy exists live
  (`pg_policies`) before wiring it up, and the join shape against the demo
  cycle/assessment row, rather than assuming the docs were complete.
  `npm run build` and `npm run lint` clean throughout.

**Part 3** — builder gave three corrections after seeing the deploy:
1. **Nav shell.** The top tab bar didn't match reference-prototype/'s
   layout. Compared App.jsx against the prototype and found a real conflict
   with spec Section 8 (prototype's 6 flat tabs are pre-cycle v1.2; v2.0
   merges Calibration+Results and adds Cycles/Report) — flagged it and got
   builder confirmation to follow Section 8's item set before touching any
   code, per their explicit "tell me before changing" instruction. Ported
   the prototype's sidebar mechanics (collapsible rail, ApusLogo, icon+label
   nav) with the v2.0 item set: Dashboard, Cycles, Stakeholders, Topics,
   Calibrate & Results, Report. Built a real Dashboard
   (`src/components/DashboardTab.jsx`, ported from the prototype's
   Dashboard.jsx — same hero banner/process-row/overview structure, content
   swapped for v2.0's six steps with live progress data) and a
   `CalibrateResultsTab.jsx` wrapper merging the existing Results/
   Calibration screens under one nav item with an internal switcher (not
   the full redesigned workspace yet — still later work). Topics and
   Report are stub screens. Also added `ErrorBoundary.jsx` (wraps the whole
   app in main.jsx) and replaced the auth-loading blank screen with a
   visible "Loading…" state, since the builder reported the live preview
   freezing — this makes failures visible rather than diagnosing the
   specific freeze blind (sandbox can't reach Supabase to reproduce it).
2. **Silent stakeholders.** Removed the New cycle wizard's step 5 entirely
   (state, UI, the `createCycle` params) — no replacement note, per
   instruction. Left `cycles.silent_stakeholders_considered`/`_note`
   columns as-is (unused now from this UI, but not dropped). Added the
   spec's exact guidance text to the Silent stakeholders group in
   StakeholdersTab.jsx.
3. **Delete unfinished drafts, built for real.** Builder resolved the
   Section 6/8 conflict flagged in Part 2: build it, drafts only. Added
   three RLS policies (migration
   `v2_delete_drafts_in_calibrating_or_signed_off`) on `submissions`,
   `ratings` and `topic_justifications`, each requiring `status = 'draft'`
   and the owning cycle's stage to be Calibrating or Signed off — submitted
   rows are never touched by any of them. Added `purgeUnfinishedDrafts` to
   data.js (deletes draft submissions; ratings/topic_justifications cascade
   via existing FKs) and wired the button in CyclesTab.jsx, shown only when
   `cycle.hasAnyDraft`. Documented in docs/supabase-setup.md, including why
   this is safe re: the submissions/ratings/topic_justifications
   shared-with-Tool-A boundary (authenticated-only policies, no anon or
   schema change).

`npm run build` and `npm run lint` clean after every step. Then moved on to
item 2 inside the new shell:

**Part 4** — New assessment, Invitations, Participants, all reached from a
cycle's assessment list in CyclesTab.jsx (click "+ New assessment", or
click an existing assessment row to open its Invitations/Participants
inline):
- **New assessment wizard** (`NewAssessmentWizard.jsx`): Mode select →
  Perspective select → Survey setup (name, description, dates, welcome/task
  text) → Review & customise. Review & customise fetches real candidate
  topics via the new `fetchTopicLibraryForSnapshot` (filtered by the
  cycle's ESRS version + client + chosen perspective — verified against
  live topic_library data, 10 shared master topics exist at
  `esrs_2023_amended`, so this is genuinely testable against the existing
  demo cycle), lets the consultant check/uncheck which to include, sets
  justification mode and mandatory, and shows the master stakeholder
  groups read-only (see simplification below). On create: `createAssessment`
  inserts the row, `snapshotTopicsIntoIros` bulk-inserts the checked topics
  as that assessment's `iros`.
- **Invitations** (`InvitationsPanel.jsx`): add (name/email/stakeholder
  group, all required — matches the NOT NULL columns, verified live before
  writing the insert), consent checkbox + Section 7's exact data statement,
  copy personal link, mark as sent, remove (before opened — RLS-gated,
  same pattern as cycle/assessment deletes), anonymise (sets name/email to
  a placeholder rather than null — `invitations.name`/`email` are NOT NULL,
  checked live first), per-group invited/submitted counts.
- **Participants** (`ParticipantsPanel.jsx`): `ensureLiveSession` creates
  the `live_sessions` row on first open (a live-session-type assessment
  doesn't get one at creation, only when someone opens Participants).
  Add/remove attendees (name + expertise E1–G1 multi-select + optional
  "represents" a silent stakeholder group), facilitator name, consent +
  data statement, every add/remove logged to `attendance_edit_log`.
- **Simplifications, disclosed rather than silently dropped:**
  - No separate "Created / Congratulations" screen — creating an
    assessment jumps straight into its Invitations/Participants panel.
    That screen's own content (Preview card → Review Hub, "Kick off" →
    Intro flow) depends on Review Hub and the live session run flow,
    neither built yet, so it would have been a dead end regardless.
  - The wizard doesn't auto-save a draft assessment row from the moment
    mode+perspective are chosen (Section 8's stated behavior) — the row is
    created only once, when Review & customise is finished. Abandoning the
    wizard mid-way currently loses the in-progress selections; it doesn't
    leave an orphan draft row either way, which is a smaller version of
    the same gap.
  - No topic reordering in Review & customise (spec lists "reorder" as a
    user action) — only include/exclude.
  - Participants supports add/remove but not editing an existing
    attendee's name/expertise in place (spec lists "edit" as a user
    action) — remove and re-add covers the same ground today.
  - **Resolved same session:** Tool A's site address — builder confirmed
    it's https://questionnaire-dma.netlify.app. Since it's a public URL,
    not a secret, hardcoded it as the default in `buildPersonalLink()`
    (src/lib/data.js) rather than requiring a Netlify env var like the two
    Supabase ones; `VITE_TOOL_A_URL` still works as an optional override if
    the domain ever changes. Added to CLAUDE.md's Environment Variables
    section.

`npm run build` and `npm run lint` clean throughout. Found and fixed one
real bug before committing: `fetchCycles` wasn't selecting/mapping
`assessments.slug`, which Invitations needs for the personal link — added
it. Verified every new table's RLS policies (`iros`, `topic_library`,
`live_session_participants`, `attendance_edit_log`, `stakeholder_groups`
inserts) and the `assessments`/`invitations` NOT NULL columns live before
writing the corresponding insert/update calls, rather than assuming the
docs were complete or guessing at constraints.

**Part 5** — builder gave Tool A's real address:
https://questionnaire-dma.netlify.app. Since it's a public URL, not a
secret like the two Supabase vars, hardcoded it as the default in a new
`buildPersonalLink()` (src/lib/data.js), overridable via the optional
`VITE_TOOL_A_URL` env var rather than requiring it — moved the link-
building logic there from InvitationsPanel.jsx, which now always produces
a real, working personal link. Added the address and the reasoning to
CLAUDE.md's Environment Variables section (a small, low-risk doc update
within this session's normal Save Point duties, not a governance change —
left the actual spec-derived rules alone). `npm run build` and
`npm run lint` clean.

## Remaining work
**Restore checklist (current plan — supersedes the item ordering below):**
- [x] Step 1 — Dashboard and shell
- [x] Step 2 — Stakeholders full admin and Topics with CSV upload (+ correction: silent stakeholders as ordinary entries)
- [x] Step 3 — Full assessment flow verbatim (Assessment overview, Mode/Perspective/General info/Review/Recipients/Created, Review Hub, Intro/Questionnaire), Cycles removed from the interface, stage controls moved into Calibrate & Results
- [x] Results tab rebuilt from the prototype (bar chart, impact/financial heatmaps, topic matrix, CSV/PNG export) — done in part 11 as a direct builder fix, ahead of step 4 proper
- [x] Step 4 — `CalibrationTab.jsx` confirmed at parity with the prototype's `CalibrationScreen.jsx` structure (part 13), its per-topic sign-off wording matched (part 13), and E/S/G + material/not-material filters shared between Results and Calibrate via `CalibrateResultsTab.jsx`'s new `FilterBar` (part 14) — assessment-source filtering already existed via the picker above the tab in App.jsx
- [x] Spec v2.0 amended 9 — Calibrate & Results has no stage banner/global sign-off (per-IRO sign-off restored, genuinely records who via `reviewed_with_owner_by`), thresholds editable any time, and the new Responses screen is built (part 17, Group B) — known gaps: overall comments not shown per-IRO, IRO table has no PNG export, "Open in Calibrate" doesn't deep-link to the row
- [x] Step 5 — PDF report builder: 4-step wizard, jsPDF + jspdf-autotable, all 6 sections, print-themed SVG charts (part 18) — not visually verified in a real browser (sandbox limit, disclosed)
- [x] ~~Additive `entered_by` column on `submissions`~~ — moot: "Enter expert responses"/QuantAssessmentGrid dropped by the builder in step 3; every expert response comes through Tool A

**Access stage (docs/access-matrix.md + docs/user-stories.md, five groups):**
- [x] Group 1 — schema delta: `team_members` + seed, audit columns on 5 tables, `assessments.iro_list_signed_off*`, `cycles.results_signed_off*` (new columns, not a repurposing — see part 21), `avatars` bucket + policies, the auth-link trigger — done, part 21
- [x] Group 2 — RLS policies: every rule in docs/access-matrix.md Section 6 (13 numbered), the `results_signed_off` lock on `calibrations`, the `team_members` policies themselves — done and verified live, part 23. Sign-off only's table-level refusals on Dashboard/Report are a frontend routing concern (Group 3/4 territory — the tables those screens read, e.g. `assessment_progress`/`group_engagement`, aren't in Sign-off only's per-table grants, so the refusal is already mechanically true; the screen-level "refuse outright, not an empty screen" UX still needs building)
- [x] Group 3 — Settings → Admin & Roles (Tool Owner/Admin only) — done and verified live, part 24; the login gate and avatar-dropdown shell were pulled forward from Group 4 since Group 3's screen needs them to be reachable
- [x] Group 4 — Settings → Profile (every role) — done, part 25; the avatar dropdown (part 24) is now feature-complete for both entries
- [x] Group 5 — the refusal test, Half A: all 13 rules in Section 6 and all 11 rows of user-stories.md's refusal table run live and pass — done, part 26. Half B (the named-person screen test) stays explicitly deferred for Sign-off only, no holder named yet.
- [x] Sign-off only's UI presentation — nav hiding, locked screens for Dashboard/Stakeholders/Topics/Report, read-only rendering across Assessments/Responses/Calibrate & Results — done, part 27. **Access stage fully complete.** One new gap surfaced while building this, not yet built: neither `iro_list_signed_off` nor `results_signed_off` has any sign-off UI anywhere, for any role — the two `SECURITY DEFINER` functions from Group 2 have no caller. Needs its own build pass, likely alongside a real "this round's topic selection" screen for Sign-off only (see part 27, and part 24's flag about `topic_library` vs. the assessment's own `iros`).

The checklist below is the pre-restore plan (sessions 1–2, PR #4) — mostly
superseded by the steps above now that the UI itself is being rebuilt from
the prototype. Kept for reference since the underlying data-layer/RLS work
it describes is still current (nothing in the restore has touched the
schema — every new field the flow needed already existed).

- [x] Confirm Tool A has been built and docs/supabase-setup.md exists
- [x] First Session Setup: create docs/, move reference files, commit
- [ ] Confirm Supabase Pro plan upgrade is done (manual billing step) —
      unconfirmed, still shown as Free in docs/supabase-setup.md
      *(superseded 2026-09-20 — builder decided to stay on Free; accepted risk, see Known issues)*
- [x] Add this tool's 8 tables and RLS policies — all were already live from
      an earlier, undocumented session (not this repo's git history); this
      session verified them against docs/schema-draft.md, fixed a real
      security hole (see Build decisions), and updated docs/supabase-setup.md
- [x] Resolve the ratings/assessor_ratings shape question, including
      keeping it live — a `pg_cron` job (`sync-ratings-to-assessor-ratings`,
      every 10 min) syncs new `ratings` rows into `assessor_ratings`
      automatically, entirely inside Postgres. Never touches `ratings`'
      schema/RLS, needs no service-role key. Tested with a throwaway row
      this session — see docs/supabase-setup.md's "Tool B additions".
      *(superseded by v2.0 — `assessor_ratings` and the sync job were retired in the shared migration; the `combined_ratings` view replaces them)*
- [ ] Build Dashboard (the process-step-cards home screen) — not built;
      the app currently opens straight into Results after login
- [ ] Build Stakeholders — the *master-map admin* (add/edit contacts,
      GDPR consent) is not built; this session built a *read* view only
      (StakeholdersTab.jsx) showing the existing master map and who
      participated in the selected assessment
- [ ] Build Topics admin (manual add, CSV upload, sign-off)
- [ ] Build Assessment Overview
- [ ] Build New Assessment wizard (all steps)
- [ ] Build Review Hub
- [ ] Build Intro Flow + Questionnaire (qualitative live-session flow)
- [ ] Build QuantAssessmentGrid *(not in spec v2.0 — dropped; the Expert survey replaces it)*
- [x] Build Calibration (v1) — CalibrationTab.jsx: accordion, adjust/reset/
      sign-off/revoke, owner/moderator fields, magnitude band, full history
      log, all persisted to Supabase. Not built: maker-checker enforcement
      beyond the visual warning (owner/moderator can still both be blank or
      equal — nothing blocks saving)
      *(built against the v1.1 schema — must be reworked for v2.0, see the v2.0 items below)*
- [x] Build Results (v1) — ResultsTab.jsx: Topic Summary cards, every IRO as
      a scored row with MATERIAL/discrepancy badges, session notes inline.
      Not built: the heatmaps, Topic Matrix scatter, and CSV/PNG/PDF export
      panel from the full spec — deliberately descoped, see Build decisions
      *(built against the v1.1 schema — reads retired tables; replaced by the Calibrate & Results workspace, see the v2.0 items below)*
- [ ] Wire Export arm: CSV/PNG/PDF download, browser-only *(superseded by v2.0 — the Word report builder replaces it)*
- [ ] Add the GDPR consent checkbox and confirmed data statement (no
      contact-add forms exist yet to put it on)
- [ ] Local test pass — could only verify the logged-out Login screen in
      this sandbox (see Known issues); the authenticated dashboard needs a
      real click-through after deploying or from a machine that can reach
      Supabase
- [ ] Acceptance criteria pass — deferred; this session's scope is a subset
      of the full spec by design
- [ ] Deploy to Netlify — not done this session; `netlify.toml` fixed (was
      pointing at a non-existent `repo-tool-b/` subdirectory) but the site
      isn't connected/deployed yet
      *(Netlify MCP is now active — deploy via MCP)*

### v2.0 revision items (spec v2.0, 2026-09-20)
- [x] (v2.0 revision) Confirm Tool A's PR with the security fix (migration 10 in docs/supabase-setup.md) is merged, then re-read docs/supabase-setup.md in case it changed again — confirmed live via Supabase MCP (list_tables/get_advisors), matches docs exactly
- [x] (v2.0 revision) Connect to the existing Supabase project and read docs/supabase-setup.md (v2.0 schema) before any database work
- [x] (v2.0 revision) Rework the data layer and calc.js: read from `combined_ratings`, port `reference-prototype/src/lib/calc.js`, apply the Section 9 v2 rules; remove every reference to retired tables and columns — done (see Last session); ResultsTab/CalibrationTab/StakeholdersTab updated to match and build/lint clean
- [x] (v2.0 revision) Create the logo storage bucket (client logo public-read) and document it in docs/supabase-setup.md — `logos` bucket, migration `v2_logos_storage_bucket`; only the client-logo upload path is wired into the UI so far (New cycle's client step)
- [ ] (v2.0 revision) Build Dashboard — the six process-step cards with real progress *(builder's explicit order: last)*
- [ ] (v2.0 revision) Build Stakeholders — master map with Impact / Financial / Silent types, contacts, consent checkbox and data statement; handle groups with no type *(builder's explicit order: after Invitations/Participants)*
- [ ] (v2.0 revision) Build Topics — library filtered by ESRS version, time horizon, human rights flag, CSV upload, sign-off *(builder's explicit order: after Invitations/Participants)*
- [x] (v2.0 revision) Build Cycles and assessments overview — stages, counts, completeness, sign-off, revoke, and purge drafts (RLS added Part 3) all done (CyclesTab.jsx, now reached via the sidebar's Cycles item)
- [x] (v2.0 revision) Build New cycle — financial year first, ESRS version pre-selected, client and logo, thresholds baseline — NewCycleWizard.jsx, 4 steps (silent stakeholders step removed per builder direction, Part 3)
- [x] (v2.0 revision) Build New assessment — mode select, perspective select, setup, review and customise (justification mode, mandatory) — NewAssessmentWizard.jsx; no topic reordering, no auto-save-from-step-1 draft row (see Part 4 simplifications)
- [x] (v2.0 revision) Build Invitations — list with personal links, mark as sent, consent checkbox — InvitationsPanel.jsx; personal link is a real, full URL (Tool A's address confirmed and hardcoded — see Known issues); **group mismatch flag not built** (needs Tool A submission data cross-referenced against the invited group — deferred, no spec-critical blocker, just not done yet)
- [x] (v2.0 revision) Build Participants — live session attendee list, soft removal, attendance edit log, consent checkbox — ParticipantsPanel.jsx; add/remove only, no in-place edit (see Part 4 simplifications)
- [ ] (v2.0 revision) Build the Created / Congratulations screen — skipped; New assessment routes straight into Invitations/Participants instead since Review Hub and the live session run flow (this screen's own links) aren't built yet either
- [ ] (v2.0 revision) Build Review Hub — render Tool A's screens exactly, including About you and Save and continue later
- [ ] (v2.0 revision) Build Live session Intro flow and Questionnaire — justifications, Save and pause, Finish session
- [x] (v2.0 revision) Build the Calibrate & Results workspace — Calibrate, Results and Matrix tabs (merged into one workspace with a Results/Calibrate switcher, per the restore plan below), stage banner, two thresholds with Apply and reason — done across parts 7, 13-15
- [x] (v2.0 revision) Build the Report builder — PDF (spec v2.0 amended 4 changed this from Word), six sections, two presets, logo slots, personal data off by default — part 18
- [ ] (v2.0 revision) Add the GDPR consent checkbox and data statement to the invitation, participant and stakeholder contact forms
- [ ] (v2.0 revision) Local test pass — full signed-in click-through in a browser that can reach Supabase
- [ ] (v2.0 revision) Acceptance criteria pass — all 25 criteria in spec v2.0 Section 13
- [ ] (v2.0 revision) Builder, before inviting any real expert: short GDPR check (legal basis, anonymise-on-request approach)
- [ ] (v2.0 revision) Deploy to Netlify — **blocked from Claude Code's side in this cloud session: no Netlify MCP connector is available here** (checked via ToolSearch and ListConnectors — only Claude_Code_Remote/Claude_Docs/Supabase/github are connected), contradicting CLAUDE.md's "Netlify MCP is active" line. Builder is connecting the Netlify dashboard to GitHub manually instead (New site → Import from GitHub → this repo; `npm run build` / `dist` already set in netlify.toml; env vars VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to be set in Netlify's UI). If a Netlify connector becomes available to Claude Code in a future session, CLAUDE.md's MCP-deploy path can be used again — otherwise treat Netlify as builder-managed from here on
- [x] Access stage (schema delta, RLS, Admin & Roles, Profile, Half A refusal test) — this is the Project Governor's original access-stage checklist, merged in from `main` after already being completed; superseded by the dedicated "Access stage" checklist under this file's own Remaining work section (parts 21-26), which tracks the same items in more detail and is the current source of truth. One line item from this original list is *not* yet true and is tracked honestly there rather than here: role-gated nav/read-only rendering for Sign-off only across Dashboard/Report/etc. Half B stays deferred, no named holder.

## Build decisions
- Access stage sign-off gates are asymmetric by deliberate design (part 21):
  `assessments.iro_list_signed_off` is advisory — a record, never a lock;
  `cycles.results_signed_off` is a real lock on `calibrations.calibrated_value`/
  `.band_value` until explicitly revoked. Mirrors the earlier removal of
  the global cycle-stage lock in favour of finer, per-action locks. New
  columns on `cycles` for the results gate, not a repurposing of the
  already-retired `signed_off_at`/`approver_name`/etc. — see part 21 and
  docs/supabase-setup.md for the full reasoning.
- Scoped this session down from the full Tier-3 build to a read/write
  dashboard slice (Results + Calibration + Stakeholders, behind minimal
  magic-link auth) per the builder's explicit direction, deferring the
  wizard, Topics admin, and Questionnaire flow.
- Fixed, not just flagged, three `TEMP anon` write-policy security holes on
  `stakeholder_groups`/`stakeholder_members`/`topic_library` — these are
  this tool's own tables, so in scope to fix directly (unlike `ratings`,
  which is Tool A's and off-limits). See docs/supabase-setup.md.
- `ratings` → `assessor_ratings`: never read `ratings` directly (protected,
  and it has no SELECT policy for any role anyway). Built a live sync as a
  `pg_cron` job rather than a Supabase Edge Function or Netlify Function
  with the service role key — same result (new submissions reach the
  dashboard automatically), but it never needs a new credential anywhere
  and never touches `ratings`' schema/RLS/triggers. Chose this over the
  originally-sketched service-role approach once it became clear pg_cron
  could do the same job with less exposure.
- Fixed `netlify.toml`'s `base = "repo-tool-b"`, which didn't match
  CLAUDE.md's actual Project Structure (root-level `/src`, matching Tool A's
  layout) and pointed at a directory that was never created.
- Simplified Results relative to the reference prototype: no heatmaps, no
  Topic Matrix scatter plot, no CSV/PNG/PDF export. This is a deliberate
  scope cut for a fast first dashboard, not a "port faithfully" violation —
  those pieces are unbuilt, not redesigned.
## Known issues
- **`VITE_SURVEY_BASE_URL` must be set in Netlify before the next deploy
  or personal-link building breaks.** Part 22 renamed this from
  `VITE_TOOL_A_URL` and removed its hardcoded fallback (per direct
  instruction — it must come from an env var, not a default). If Netlify
  only has the old variable name set, `buildPersonalLink()` now throws
  instead of silently falling back. See Notes for next session for the
  full detail.
- **The app itself does not yet know about `team_members`.** Nothing in
  `src/` reads or writes it — Group 2 (part 23) replaced every table's
  blanket `authenticated ...` policy with real role-scoped ones, so access
  is now genuinely enforced at the database layer for anyone Group 3 adds
  as Sign-off only, but the UI itself has no login-aware nav, no "No
  access yet" screen, and no Settings yet. Anika, as the only current
  `team_members` row (`access_level='full'`), sees no behaviour change.
  This is expected mid-stage, not a regression — Groups 3-4 build the
  screens that make the new policies visible/usable.
- **Sign-off only has no named holder yet** for either `can_signoff_topics`
  or `can_signoff_results`. Its mechanism goes live in the database and
  policies in Group 2 regardless, per the confirmed approach in
  docs/access-matrix.md; its screen test (Half B of the refusal test) is
  deferred and tracked as open in docs/user-stories.md until a real person
  and email exist — add a name via Admin & Roles (Group 3) once one does,
  then run that role's Half B.
- **Live authenticated view untested.** This sandbox can build and lint
  cleanly, and render the logged-out Login screen in a headless browser, but
  cannot complete a magic-link round trip or reach Supabase from a browser
  context here (same egress restriction Tool A's session 3 hit). Needs a
  real click-through — sign in, switch assessments, adjust/sign off a
  calibration, confirm it persists — once deployed or from an unrestricted
  machine.
- Supabase Auth's public-signup toggle (invite-only enforcement) was not
  checked/changed this session — confirm it's disabled in the dashboard.
  **Update 2026-09-20:** builder confirmed self-signup is off (invite-only).
- Deletion-request contact/process for GDPR not yet confirmed with the builder
  **Update 2026-09-20:** resolved — contact is anikalerch@greenfriend.org; the legal-basis check remains a pre-launch task for the builder.
- Whether the Results screen's adjustable threshold is a second stored value or
  a display-only re-slice of the fixed 3.0 threshold — not yet resolved
  **Update 2026-09-20:** resolved by spec v2.0 — two thresholds per cycle (impact and financial), edited only in the Calibrating stage with a logged reason.
- Whether collaborators (e.g. Becca) need different permissions from the builder,
  or one shared A2 level is sufficient for v1 — shipping as one shared level
  **Update 2026-09-20:** confirmed — one shared level; the Approver role and per-client permissions are Phase 2.
- Maker-checker (Owner ≠ Moderator) is visually flagged in Calibration but not
  enforced — saving isn't blocked
- Spec revised to v2.0 on 2026-09-20 — CLAUDE.md regenerated by Project Governor
- **Resolved 2026-09-20 (session 2):** the session-1 code was built against the retired v1.1 schema (`assessor_ratings`, calibration sign-off columns, etc.) and didn't work. Reworked in session 2 — see Last session. Still not click-tested live (see below).
- The per-IRO "sign off this result" flow from session 1 is gone — `calibrations.signed_off_by`/`signed_off_at` were retired in the v2.0 migration. Replaced with `reviewed_with_owner` (a tick + date, not an approval).
  **Resolved 2026-09-20 (session 2 part 2):** the real per-cycle sign-off flow (approver name/role/minutes reference, recorded_by) is now built on the Cycles and assessments overview (CyclesTab.jsx), including Revoke sign-off (needed an RLS fix — see below) and the `require_both_sources` block.
- **Open — needs a builder decision:** "Delete unfinished drafts" (Section 8, Cycles and assessments overview) has no supporting RLS — `submissions` has no DELETE policy for any role, and Section 6's matrix lists it as "No" flatly (no draft carve-out), while Section 7 gives an explicit immutability rationale ("deleting responses would change the scores and break the audit trail"). This looks like a genuine spec contradiction rather than an oversight, so it wasn't built — shown as a disabled button with an explanation in CyclesTab.jsx instead. Either confirm a `status = 'draft'` DELETE policy should be added, or drop the feature from spec. See docs/supabase-setup.md's "Known gap" note for the full reasoning.
- **Fixed 2026-09-20 (session 2 part 2):** the `cycles` UPDATE RLS policy (`stage <> 'signed_off'`) made Revoke sign-off impossible — once signed off, no update to that row passed RLS, including the revoke itself. Added a narrow second policy (`v2_allow_cycle_revoke_signoff`) permitting exactly the `signed_off → calibrating` transition. Documented in docs/supabase-setup.md.
- Tool A's public-side security was reworked on 2026-09-20 (migration 10: anon has no table access to invitations, submissions, ratings, topic_justifications; six SECURITY DEFINER functions keyed by link code) — do not touch the anon side; re-read docs/supabase-setup.md at session start in case Tool A changes it again
- `ratings.criterion_key` has no `financialLikelihood` value: for risks and opportunities the `likelihood` row is the financial likelihood
- `stakeholder_groups` has 34 rows; the 31 original ones have `type` null — the Stakeholders screen must handle and let the builder classify them
- 3 pre-existing test rows in `stakeholder_members` ("k", "test", "s") should be removed before real use; the two demo invitations ("Demo Expert" — already submitted — and "Demo Expert 2") on `acme-2026` are placeholder data
- Supabase advisor shows a "leaked password protection disabled" Auth warning — not relevant to magic-link login unless passwords are enabled
- Supabase project stays on the Free plan (accepted risk): a paused project breaks experts' personal and resume links — open a survey link or the console weekly during a survey window
- **Resolved (Part 5):** Tool A's site address — builder confirmed https://questionnaire-dma.netlify.app. Hardcoded as the default in `buildPersonalLink()` (src/lib/data.js), overridable via the optional `VITE_TOOL_A_URL` env var. Added to CLAUDE.md's Environment Variables section.
- Invitations' "flag where the group an expert chose in Tool A differs from the group invited" (Section 8) is not built — would need `submissions.stakeholder_group` cross-referenced per invitation, deferred this session
- Participants supports add/remove only, not in-place edit of an existing attendee (Section 8 lists "edit" too)
- New assessment's draft auto-save (row created and kept in sync from the moment mode+perspective are picked, so abandoning the wizard never loses progress — Section 8) is not implemented; the assessment row is created once, at the end of the wizard
- Before inviting any real expert, the builder gets a short GDPR check (business reason: audit traceability; anonymise-on-request approach). Does not block the build
- Open non-blocking spec questions (spec Section 15): ESRS 2026 act text check, sample export to the assurance provider, Word report accent colour, the skipped-criteria averaging rule
- **Updated 2026-09-22 (part 19):** the PDF report builder (`ReportTab.jsx`/
  `reportPdf.js`) still has not been human-verified — this sandbox has no
  browser to click through the wizard or open a generated PDF. Build/lint
  are clean; `jspdf-autotable`'s functional API, `doc.output('bloburl')`,
  and (added this round, after the builder reported the first version
  looked unpolished) every new drawing primitive the redesign introduced
  (`roundedRect`, `circle`, hex `setFillColor`/`setDrawColor`,
  `splitTextToSize`, `getTextWidth`, `autoTable`'s `didParseCell`, italic
  `setFont`) were all confirmed working via Node smoke tests. Actual
  visual output (exact spacing, chart legibility, whether it now reads as
  "professional and compact") still needs a real look on the deploy
  preview.
- **New 2026-09-21 (part 12):** `calibrations.band_value` (docs/product-spec.md's "Calibrated score and EBITDA band (1–5) for financial IROs") is no longer written from anywhere in the UI — the consultant-facing selector was replaced with explanation-only text per direct builder instruction, since it duplicated the magnitude already captured by the rating itself. The column stays in the schema (no migration this round); worth a decision on whether to drop it from docs/product-spec.md's field table too, or keep it for a future per-IRO override.
## Notes for next session
**Questionnaire.jsx — hide "Likelihood" for actual/potential-human-rights
impacts (builder instruction, 2026-09-24, explicitly deferred — "just for
the future not now").** Found while the builder was testing a real live
session on the PR #6 preview: `CRITERIA_FOR` shows a Likelihood slider for
every neg_impact/pos_impact IRO regardless of `iro.actual`/
`potentialHumanRightsImpact`, but `assessmentImpactScore` (calc.js)
silently discards whatever's entered there for those two cases — per spec,
"Impact score, actual impact: severity (likelihood treated as 5)" and
"...human rights impact: severity alone — likelihood is not applied." The
slider isn't wrong to exist per se, but it's genuinely misleading — it
looks like a real input that matters and doesn't. Builder confirmed the
fix direction (remove the field entirely for those two cases, don't fake
a locked-at-5 value — a locked 5 would look like a real rating nobody
actually gave) but said not to build it this session. When picked up:
gate the `likelihood`/`financialLikelihood` entry out of `CRITERIA_FOR`'s
per-topic criteria list (both `neg_impact` and `pos_impact`) whenever
`iro.actual || iro.potentialHumanRightsImpact`; no data.js/calc.js change
needed, since the scoring side already does the right thing — this is
UI-only, matching what's actually used.

**v2.1 — coming next, not yet built (builder instruction, 2026-09-24):**
One shared survey link per Expert survey. A participant enters their email
on it and receives their personal link by email. Personal links,
invitations and their statuses stay exactly as they are — this only adds
a second way to reach a personal link, it doesn't replace anything.
**Wait for the regenerated CLAUDE.md before building any of it** — not
scoped yet (needs an email-sending mechanism decided, which is currently
Out of scope in CLAUDE.md: "In-app email invitations... Option A
(Supabase-dashboard invite...) is what ships" — that line will need to
change or gain an exception for this).

**Where things stand overall**: the five-group access stage (parts
21-26), Sign-off only's UI presentation (part 27), and three real bugs
found live on the PR #6 deploy preview — live-session ratings never
persisting (part 28), Recipients' Continue gate and assessment delete
failing silently (part 29), and Responses defaulting to an empty test
year (part 30) — are all done, live-verified, and pushed. PR #6
(`claude/restore-prototype-ui` → `main`) is open, green, and being
actively click-tested by the builder on its deploy preview; still
subscribed and watching for further findings.

**One thing still genuinely open**: `avatars` bucket's live
cross-account delete test (access-matrix.md Section 6 rule 13) couldn't
be completed from this sandbox — Supabase's storage schema refuses any
direct SQL `DELETE` on `storage.objects` regardless of caller, so only
the policy *definition* was confirmed (correctly shaped). Worth a quick
real-browser check once convenient, not urgent. Sign-off only's Half B
screen test stays explicitly deferred — no named holder exists yet.

Checked per the v2.1 deferral instruction throughout every part this
session: nothing built depends on `Copy personal link`, `Mark as sent`,
invitation statuses, the "not opened after 5 days" flag, or
`invitations.link_code` — nothing to list under "Deferred to v2.1."

Hard Rule to hold the line on: copy each prototype component verbatim,
changing only data wiring, Expert survey/Expert live session wording, and
explicit v2.0/v2.1 spec changes. If a prototype behaviour and the spec
conflict, or a spec document conflicts with the real, current schema —
ask or flag, don't guess.

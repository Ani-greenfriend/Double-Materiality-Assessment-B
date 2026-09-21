# PROGRESS — Apus DMA Consultant Console

> Claude Code: read this file at the start of every session, before touching
> anything. Update it at every save point. Replace content — do not append.
> History lives in git.

**Session:** 2
**Last updated:** 2026-09-21 — session 2, part 8 (prototype-UI restore, step 2 verification)
**Live URL:** none yet — PR #4 (data layer + first v2.0 shell) superseded for UI purposes by PR #5 (prototype restore, in progress); Netlify preview pending

## Current state
**Direction change 2026-09-21:** the builder found the app's UI had drifted from reference-prototype/ into a simplified, rewritten shell (sessions 1–2, PR #4). CLAUDE.md now carries a Hard Rule — prototype screens are copied verbatim, never restyled/simplified/rewritten, changing only data wiring, the Expert survey/Expert live session wording, and explicit v2.0 spec changes. A full restore is underway on a **new branch** (`claude/restore-prototype-ui`, PR #5, draft until complete), built from `claude/wonderful-darwin-ztquwp`'s tip so the v2.0 data layer, calc.js, login, cycles, invitations, participants and draft deletion are all kept. The restore proceeds in 6 builder-approved steps, each pushed to the same PR (stable deploy preview URL) and reported with a before/after checklist, stopping for the builder's OK after each one. **Steps 1–2 (Dashboard/shell; Stakeholders + Topics) are done and pushed; awaiting OK before step 3.**

Report format also changed mid-project: PDF (via a browser PDF library), not Word — CLAUDE.md and product-spec.md both updated (v2.0 amended 4). `entered_by` (nullable, additive) on `submissions` is proposed for step 3's "Enter expert responses" screen — not yet applied, needs the builder's approval first per CLAUDE.md's Open Questions.

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
- [x] Step 2 — Stakeholders full admin and Topics with CSV upload
- [ ] Step 3 — Assessment wizard (all steps incl. Created) + Assessment overview scoped to cycle; restyle Invitations/Participants
- [ ] Step 4 — Review Hub + live session Intro/Questionnaire (justifications, Save and pause)
- [ ] Step 5 — Calibrate & Results: prototype's Calibration/Results/heatmaps/Topic Matrix as tabs
- [ ] Step 6 — PDF report builder
- [ ] Additive `entered_by` column on `submissions` — proposed, needs builder approval before applying (step 3)

The checklist below is the pre-restore plan (sessions 1–2, PR #4) — mostly
superseded by the steps above now that the UI itself is being rebuilt from
the prototype. Kept for reference since the underlying data-layer/RLS work
it describes is still current (nothing in the restore touches the schema
except the proposed `entered_by` column).

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
- [ ] (v2.0 revision) Build the Calibrate & Results workspace — Calibrate, Results and Matrix tabs, stage banner, two thresholds with Apply and reason
- [ ] (v2.0 revision) Build the Report builder — Word (.docx), six sections, two presets, logo slots, personal data off by default
- [ ] (v2.0 revision) Add the GDPR consent checkbox and data statement to the invitation, participant and stakeholder contact forms
- [ ] (v2.0 revision) Local test pass — full signed-in click-through in a browser that can reach Supabase
- [ ] (v2.0 revision) Acceptance criteria pass — all 25 criteria in spec v2.0 Section 13
- [ ] (v2.0 revision) Builder, before inviting any real expert: short GDPR check (legal basis, anonymise-on-request approach)
- [ ] (v2.0 revision) Deploy to Netlify — **blocked from Claude Code's side in this cloud session: no Netlify MCP connector is available here** (checked via ToolSearch and ListConnectors — only Claude_Code_Remote/Claude_Docs/Supabase/github are connected), contradicting CLAUDE.md's "Netlify MCP is active" line. Builder is connecting the Netlify dashboard to GitHub manually instead (New site → Import from GitHub → this repo; `npm run build` / `dist` already set in netlify.toml; env vars VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to be set in Netlify's UI). If a Netlify connector becomes available to Claude Code in a future session, CLAUDE.md's MCP-deploy path can be used again — otherwise treat Netlify as builder-managed from here on

## Build decisions
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

## Notes for next session
**Current plan (prototype-UI restore, PR #5, branch `claude/restore-prototype-ui`):**
stopped after Step 2 (Stakeholders full admin + Topics with CSV upload) for
the builder's OK, per their explicit instruction to stop after every step.
Do not start Step 3 until that OK arrives.

Step 3, when approved: the assessment wizard (all steps including Created)
and the Assessment overview scoped to the selected cycle, then restyle
Invitations and Participants to match the prototype's verbatim visual style
(they're currently the session-1-era rewritten panels, not ported from
reference-prototype/ — check `AssessmentModeSelect.jsx`,
`PerspectiveSelect.jsx`, `SurveySetupStep.jsx`, `SetupReviewStep.jsx`,
`RecipientsScreen.jsx`, `ExpertAssessmentCreated.jsx`, `AssessmentOverview.jsx`
in reference-prototype/ and in PR #3's `claude/elegant-hypatia-vx86i7`
branch, which already wired an earlier version of most of these against the
v1.1 schema — same source worth reading first, same as Step 2 did for
`StakeholderModule`/`TopicsModule`). Also where "Enter expert responses"
(kept `QuantAssessmentGrid`, wired to an invitation) is expected to be
built: the additive `entered_by` column on `submissions` still needs the
builder's explicit approval before applying — ask before writing that
migration, not after. Use
docs/product-spec-v1.2-prototype-reference.md Section 8 for detailed screen
behaviour where product-spec.md is silent, same as Step 2.

Hard Rule to hold the line on throughout every remaining step: copy each
prototype component verbatim (check with `diff` against
reference-prototype/, as Step 1 did for Dashboard.jsx/icons/DmaMascot);
change only (a) data wiring — done in the shell/App.jsx or small adapter
functions in data.js, never inside the copied component; (b) Expert
survey/Expert live session wording; (c) explicit v2.0 spec changes. If
a prototype behaviour and the v2.0 spec conflict, or it's unclear which
bucket a needed change falls into, ask the builder — don't guess.

Two things flagged in earlier sessions are genuinely resolved and need no
further action: "Delete unfinished drafts" has RLS support (built in the
pre-restore work); Tool A's site address is hardcoded with an env var
override. The Netlify MCP gap is now moot — the builder pushes/tests via
their own Netlify dashboard against PR #5's deploy preview.

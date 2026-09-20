# PROGRESS — Apus DMA Consultant Console

> Claude Code: read this file at the start of every session, before touching
> anything. Update it at every save point. Replace content — do not append.
> History lives in git.

**Session:** 2
**Last updated:** 2026-09-20 — session 2, part 2
**Live URL:** none yet — see PR #4, Netlify branch deploy pending (builder connecting it manually)

## Current state
Results/Calibration/Stakeholders (session 1, reworked for v2.0 earlier this
session) plus a new **Cycles** tab (Cycles and assessments overview + New
cycle wizard) are live in the app and build/lint clean. Cycles is now the
default/first tab — it's the real entry point until Dashboard exists. Not
yet built: Topics admin, New assessment wizard, Invitations, Participants,
Review Hub, Live session flow, the full Calibrate & Results workspace
(current Results/Calibration are still the simplified session-1 versions),
Report builder, Dashboard. Still not click-tested in a live browser — PR #4
is open and the builder is setting up a Netlify branch deploy to test this
and the session-1 tabs before more screens get built.

## Last session
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
- **Found but did NOT fix:** Section 8's "Delete unfinished drafts" purge
  action has no supporting RLS — Section 6 lists `submissions` DELETE as
  "No" for every role with no draft carve-out, and there's a real
  immutability rationale in Section 7 ("deleting responses would change
  the scores and break the audit trail"). This reads as a genuine spec
  contradiction, not an obvious oversight like the revoke bug above, so I
  left it unbuilt rather than guessing — the Cycles overview shows the
  action disabled with an explanation. Documented in docs/supabase-setup.md
  as a decision the builder needs to make.
- **New cycle wizard** (`src/components/NewCycleWizard.jsx`): the 5 spec'd
  steps (financial year → ESRS version pre-select/override → client
  choose-or-create with logo upload → cycle name + baseline thresholds →
  silent stakeholders prompt). Writes via new `data.js` functions
  (`fetchClients`, `createClient`, `uploadClientLogo`, `createCycle`).
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

## Remaining work
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
- [x] (v2.0 revision) Build Cycles and assessments overview — stages, counts, completeness, sign-off and revoke done (CyclesTab.jsx, now the app's default tab); **purge drafts not done** — no supporting RLS exists and Section 6 vs. Section 8 conflict, see Known issues; shown disabled with an explanation instead of guessing
- [x] (v2.0 revision) Build New cycle — financial year first, ESRS version pre-selected, client and logo, thresholds baseline, silent stakeholders prompt — NewCycleWizard.jsx, all 5 steps
- [ ] (v2.0 revision) Build New assessment — mode select, perspective select, setup, review and customise (justification mode, mandatory)
- [ ] (v2.0 revision) Build Invitations — list with personal links, mark as sent, group mismatch flag, consent checkbox
- [ ] (v2.0 revision) Build Participants — live session attendee list, soft removal, attendance edit log, consent checkbox
- [ ] (v2.0 revision) Build the Created / Congratulations screen
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
- Personal link format seen on Tool A's deploy preview: `/survey/[assessment slug]/[link_code]`. Decide with the builder how Tool B learns Tool A's site address (no environment variable is defined for it yet)
- No storage bucket for logos is documented yet; `live_sessions`, `live_session_participants` and `attendance_edit_log` fields are defined only in spec Section 5
- Before inviting any real expert, the builder gets a short GDPR check (business reason: audit traceability; anonymise-on-request approach). Does not block the build
- Open non-blocking spec questions (spec Section 15): ESRS 2026 act text check, sample export to the assurance provider, Word report accent colour, the skipped-criteria averaging rule

## Notes for next session
Builder's explicit build order (overrides the plain top-to-bottom v2.0
revision checklist order above — follow this instead): (1) logo storage
bucket, New cycle, Cycles and assessments overview — **done this session**;
(2) New assessment, Invitations and Participants — **next**; (3) Topics and
Stakeholders admin; (4) Live session flow and the full Calibrate & Results
workspace; (5) Report builder, Review Hub, then Dashboard last.

Start item (2) with New assessment (mode select, perspective select, setup,
review & customise — Section 8) since Invitations/Participants both need an
assessment to attach to; CyclesTab.jsx already has a disabled "+ New
assessment" placeholder button per cycle, ready to wire up. New assessment
snapshots `topic_library` into `iros` at creation (filtered by perspective,
ESRS version and client) — re-read Section 8's New assessment subsection
and Section 9's "Assessments snapshot topic_library into iros" business
rule before starting. Invitations needs the GDPR consent checkbox + data
statement (Section 7 exact text is quoted in CLAUDE.md's Hard Rules) — this
is the first form in the app that adds a named person, so get that pattern
right here since Participants and Stakeholder contacts will reuse it.

All work should keep pushing straight to this PR branch
(claude/wonderful-darwin-ztquwp) — builder has branch deploys enabled on
Netlify and is testing there rather than waiting for a merge. PR #4
(https://github.com/Ani-greenfriend/Double-Materiality-Assessment-B/pull/4)
covers everything through this session. Two things flagged this session
still need a builder decision, not more building: "Delete unfinished
drafts" has no RLS support and conflicts with Section 6 (see Known issues);
Netlify MCP isn't available in this cloud session so deploys are
builder-managed via the dashboard.

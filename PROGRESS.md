# PROGRESS — Apus DMA Consultant Console

> Claude Code: read this file at the start of every session, before touching
> anything. Update it at every save point. Replace content — do not append.
> History lives in git.

**Session:** 2
**Last updated:** 2026-09-20 — session 2
**Live URL:** none yet

## Current state
The existing Results/Calibration/Stakeholders slice (behind magic-link auth)
is now reworked against the live v2.0 schema and builds/lints clean. It is
no longer broken, but it is still only that same three-tab slice from
session 1 — none of the new v2.0 screens (Dashboard, Topics admin, Cycles
overview, New cycle/assessment wizard, Invitations, Participants, Review
Hub, Live session flow, the full Calibrate & Results workspace, Report
builder) exist yet. Still not click-tested in a live browser (sandbox can't
reach Supabase — see Known issues).

## Last session
Re-verified docs/supabase-setup.md against the live database via Supabase
MCP (list_tables/get_advisors) — schema matches exactly, migration 10's
security fix is live, no new advisories. Reworked src/lib/calc.js for the
v2.0 formula changes (Section 9): dropped `financialLikelihood` (a risk/
opportunity's `likelihood` row is the financial likelihood), potential-
human-rights-impact IROs now score on severity alone, thresholds moved from
per-IRO to a `thresholds` param (they live on the cycle), added an
`effectiveValue` helper (calibrated value if set, else calculated) used for
materiality and topic roll-up, added per-source (survey/session) averages
and the "source gap" ≥1.5 discrepancy check, bumped
`CALC_METHODOLOGY_VERSION` to `severity-avg-with-override-v2`. Reworked
src/lib/data.js to read `iros` (dropped retired `impact_threshold`/
`financial_threshold`/`subtopic_raw` columns, added `time_horizon`/
`potential_human_rights_impact`), `combined_ratings` (grouped by
submission+iro into one "assessor" row, replacing `assessor_ratings`
entirely), and `assessments` joined to `cycles`→`clients` for thresholds/
stage/client name. Calibration writes now set `cycle_id`; the old
`signOffCalibration`/`revokeCalibrationSignOff` functions (used retired
`calibrations.signed_off_by`/`signed_off_at` columns) were replaced with
`setReviewedWithOwner` (the real v2.0 field, a tick + date, not a sign-off —
sign-off is cycle-level, not built yet). Updated App.jsx, ResultsTab,
CalibrationTab and StakeholdersTab to match: assessment selector shows
client + type + cycle stage/Provisional-Final; Calibration is read-only
outside stage Calibrating (cycle-level, checked via the joined cycle);
Stakeholders groups by `type` (Impact/Financial/Silent/Unclassified).
`npm run build` and `npm run lint` both clean (only pre-existing warnings
in reference-prototype/, none in src/). Sanity-checked the shape against
live demo data via `execute_sql` (combined_ratings rows, assessments row)
before writing the grouping logic — matches.

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
- [ ] (v2.0 revision) Create the logo storage bucket (client logo public-read) and document it in docs/supabase-setup.md
- [ ] (v2.0 revision) Build Dashboard — the six process-step cards with real progress
- [ ] (v2.0 revision) Build Stakeholders — master map with Impact / Financial / Silent types, contacts, consent checkbox and data statement; handle groups with no type
- [ ] (v2.0 revision) Build Topics — library filtered by ESRS version, time horizon, human rights flag, CSV upload, sign-off
- [ ] (v2.0 revision) Build Cycles and assessments overview — stages, counts, completeness, sign-off and revoke, purge drafts
- [ ] (v2.0 revision) Build New cycle — financial year first, ESRS version pre-selected, client and logo, thresholds baseline, silent stakeholders prompt
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
- The per-IRO "sign off this result" flow from session 1 is gone — `calibrations.signed_off_by`/`signed_off_at` were retired in the v2.0 migration. Replaced with `reviewed_with_owner` (a tick + date, not an approval). A real per-cycle sign-off flow (approver name/role/date/minutes reference) belongs on the not-yet-built Cycles and assessments overview screen.
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
Builder set the v2.0 rework's build order explicitly (overrides the plain
top-to-bottom v2.0 revision checklist order above — follow this instead):
(1) logo storage bucket, then New cycle and the Cycles and assessments
overview; (2) New assessment, Invitations and Participants; (3) Topics and
Stakeholders admin; (4) Live session flow and the full Calibrate & Results
workspace; (5) Report builder, Review Hub, then Dashboard last. PR #4
(https://github.com/Ani-greenfriend/Double-Materiality-Assessment-B/pull/4)
is open with the data-layer rework, targeting the builder's manually
connected Netlify site (see Known issues — no Netlify MCP connector in this
cloud session). Before building each new screen, re-read the matching
subsection of docs/product-spec.md Section 8. No live click-through test
has been done yet this build (sandbox network restriction, unchanged from
session 1) — the Netlify deploy preview once connected is the way to get
one; don't trust the UI beyond build/lint passing until then.

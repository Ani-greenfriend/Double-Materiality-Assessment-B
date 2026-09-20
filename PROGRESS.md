# PROGRESS — Apus DMA Consultant Console

> Claude Code: read this file at the start of every session, before touching
> anything. Update it at every save point. Replace content — do not append.
> History lives in git.

**Session:** 1
**Last updated:** 2026-09-20 — by Project Governor, spec revised to v2.0 (session state below preserved; no v2.0 code built yet)
**Live URL:** none yet

## Current state
First build session in progress. Scoped down from the full Tier-3 build per
the builder's direction: build a read-only(-ish) results dashboard first
(Results + Calibration + Stakeholders, behind minimal magic-link auth),
deferring the New Assessment wizard, Topics admin, Questionnaire flow, and
export panel to later sessions.

## Last session
None — this is the first build session. "Notes for next session" was empty,
nothing to carry forward.

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
- [ ] (v2.0 revision) Confirm Tool A's PR with the security fix (migration 10 in docs/supabase-setup.md) is merged, then re-read docs/supabase-setup.md in case it changed again
- [ ] (v2.0 revision) Connect to the existing Supabase project and read docs/supabase-setup.md (v2.0 schema) before any database work
- [ ] (v2.0 revision) Rework the data layer and calc.js: read from `combined_ratings`, port `reference-prototype/src/lib/calc.js`, apply the Section 9 v2 rules; remove every reference to retired tables and columns
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
- [ ] (v2.0 revision) Deploy to Netlify via MCP and set environment variables

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
- **The session-1 code was built against the v1.1 schema and will not work.** ResultsTab, CalibrationTab and StakeholdersTab read tables and columns retired in the v2.0 migration (`assessor_ratings`, `participants`, respondent counters, calibration sign-off columns). Rework them against docs/supabase-setup.md; do not deploy the session-1 build as it stands
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
PRIORITY (v2.0 revision): spec v2.0 supersedes the plan below. Read docs/supabase-setup.md
(v2.0 schema; re-check it is current), rework the data layer and calc.js against it,
then build the v2.0 screens in the order listed under Remaining work.
Earlier note (session-1 plan, now mostly superseded): get a real click-through test of the authenticated dashboard
(deploy to Netlify, or test from a machine that can reach Supabase). The
`assessor_ratings` sync is done (pg_cron, every 10 min) — no longer blocking.
After the click-through: Dashboard home screen, then Topics/Stakeholders
admin (needed before a real New Assessment wizard makes sense).

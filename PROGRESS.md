# PROGRESS — Apus DMA Consultant Console

> Claude Code: read this file at the start of every session, before touching
> anything. Update it at every save point. Replace content — do not append.
> History lives in git.

**Session:** 1
**Last updated:** 2026-09-17 — by Claude Code
**Live URL:** none yet

## Current state
First Session Setup complete. docs/ now holds product-spec.md, schema-draft.md,
and a mirrored copy of Tool A's supabase-setup.md. Nothing built yet beyond
that — reference-prototype/ (a fully working React/Vite prototype — authoritative
for UI/UX, see CLAUDE.md Brand section) is the porting source for the next
session.

Note: an earlier session had built a full frontend-only pass (v1.0 spec, DB
deferred) nested incorrectly inside a `repo-tool-b/` subdirectory instead of at
repo root. The builder deleted that directory directly on `main` before this
session started; this session synced that deletion in via a fast-forward merge.
That code is gone from the tree (still recoverable from git history at commit
`4c4f22c` if ever needed) — this session restarts the build cleanly per the
current v1.2 spec and CLAUDE.md, which now includes full Supabase/Auth from the
start rather than deferring the database.

## Last session
Session 1: verified Tool A (`DMA-Questionnaire-A`) is built and its
`docs/supabase-setup.md` exists — gate satisfied. Confirmed via Supabase MCP:
project `evwmxduudcujtibirmga` is ACTIVE_HEALTHY, region `eu-west-1`, but the
org (`Ani-greenfriend's Org`) is still on the **Free** plan, not Pro — the
required manual billing upgrade has not been done. `public` schema currently
only has Tool A's tables (`assessments`: 1 row, `iros`: 5 rows, `ratings`: 15
rows, `session_comments`: 0 rows) — none of this tool's 8 tables exist yet, so
there's no conflict with the deleted repo-tool-b false start. Ran First Session
Setup: created docs/ (already existed from a prior partial run), moved
schema-draft.md into it, removed the duplicate root-level product-spec.md
(docs/product-spec.md already matched it, v1.2), and copied Tool A's
supabase-setup.md into docs/ as a mirrored reference. Synced this branch with
`main`'s repo-tool-b deletion via fast-forward merge.

## Remaining work
- [ ] **Ask the builder to upgrade the shared Supabase org to Pro** (manual
      dashboard step) — currently Free, at risk of auto-pause
- [ ] Add this tool's 8 tables and RLS policies per docs/schema-draft.md, resolve
      the ratings/assessor_ratings shape question, then write/update
      docs/supabase-setup.md
- [ ] Build Dashboard — hero CTA, six process-step cards with real progress
- [ ] Build Stakeholders — master map, mandatory Name/Role, email validation,
      multi-select E/S/G, next-step banner
- [ ] Build Topics — manual add with dependent ESRS sub-topic dropdown, bulk CSV
      upload, sign-off, edit/delete
- [ ] Build Assessment Overview
- [ ] Build New Assessment wizard — Mode Select, Perspective Select, Survey
      Setup, Review & Customize, Recipients, Created/Congratulations (including
      the re-edit-of-completed-assessment behavior)
- [ ] Build Review Hub (both modes)
- [ ] Build Intro Flow + Questionnaire (qualitative) — including per-topic
      session notes
- [ ] Build QuantAssessmentGrid
- [ ] Build Calibration — history log, sign-off, maker-checker
- [ ] Build Results — topic summary rollup, bar chart, heatmaps, topic matrix,
      CSV/PNG/PDF export panel
- [ ] Wire Export arm: CSV/PNG/PDF download, browser-only
- [ ] Add the GDPR consent checkbox and confirmed data statement to both the
      Expected Participants and Stakeholder add-contact forms
- [ ] Local test pass — full walkthrough of every view before deploying
- [ ] Acceptance criteria pass — verify every criterion in product-spec.md
      Section 13 before deploy
- [ ] Deploy to Netlify — builder adds environment variables in the Netlify
      dashboard unless Netlify MCP is confirmed active

## Build decisions
None yet.

## Known issues
- Deletion-request contact/process for GDPR not yet confirmed with the builder
- Whether the Results screen's adjustable threshold is a second stored value or
  a display-only re-slice of the fixed 3.0 threshold — not yet resolved
- Whether collaborators (e.g. Becca) need different permissions from the builder,
  or one shared A2 level is sufficient for v1 — shipping as one shared level
- Whether Topics/Calibration sign-off should tie to real auth.users instead of a
  free-text name field, now that Tier 3 auth exists — shipping as free text for v1

## Notes for next session
Supabase org is still on the Free plan — flag to the builder again if not
upgraded by the next session. Once acknowledged, start with the 8-table schema
+ RLS migration (docs/schema-draft.md), then scaffold the Vite/React/Tailwind
app at repo root from reference-prototype/ (package.json, vite/tailwind/postcss
config, index.html) and begin porting screens starting with Dashboard.

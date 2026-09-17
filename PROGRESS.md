# PROGRESS — Apus DMA Consultant Console

> Claude Code: read this file at the start of every session, before touching
> anything. Update it at every save point. Replace content — do not append.
> History lives in git.

**Session:** 1
**Last updated:** 2026-09-17 — by Claude Code
**Live URL:** none yet

## Current state
First Session Setup complete. Database schema is live: all 8 of this tool's
tables + RLS exist in the shared Supabase project, `assessments`/`iros` have
this tool's columns added, and a `stakeholder_options` view reconciles a
naming mismatch with Tool A (see docs/supabase-setup.md). No frontend app
exists at repo root yet — reference-prototype/ (a fully working React/Vite
prototype — authoritative for UI/UX, see CLAUDE.md Brand section) is the
porting source for the next session, starting with the app scaffold and
Dashboard.

Builder has explicitly chosen to stay on the Supabase **Free** plan for now
(session 1) — not blocking, but the auto-pause risk stands.

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
`docs/supabase-setup.md` exists — gate satisfied. Ran First Session Setup:
created docs/ (already existed from a prior partial run), moved
schema-draft.md into it, removed the duplicate root-level product-spec.md
(docs/product-spec.md already matched it, v1.2), and copied Tool A's
supabase-setup.md into docs/ as a mirrored reference. Synced this branch with
`main`'s repo-tool-b deletion via fast-forward merge.

Confirmed via Supabase MCP the org (`Ani-greenfriend's Org`) is on the Free
plan; builder explicitly chose to proceed on Free rather than upgrade to Pro
now. Applied this tool's schema migration: created `topic_library`,
`assessor_ratings`, `calibrations`, `calibration_history`, `participants`,
`stakeholder_groups`, `stakeholder_members` (all with RLS — see
docs/supabase-setup.md for the full policy list), added `topic_library_id` +
`session_notes` to Tool A's existing `iros` table and set its threshold
column defaults to 3.0, and added `respondents_done`, `respondents_total`,
`created_by`, `updated_at` to `assessments`. Resolved the `ratings` ↔
`assessor_ratings` shape question from schema-draft.md as a read-time
application-layer reconciliation (not a schema change) — documented in
docs/supabase-setup.md. Also discovered and fixed a real cross-tool bug: Tool
A's participant app queries a `stakeholder_options` table that was never
created (a naming mismatch predating this tool's actual schema), silently
falling back to hardcoded defaults; added a `security_invoker` view of that
exact name/shape over `stakeholder_groups` so Tool A's existing code starts
working with no changes on its side. `get_advisors` security lints are clean.

## Remaining work
- [ ] Scaffold the Vite/React/Tailwind app at repo root from
      reference-prototype/ (package.json, vite/tailwind/postcss config,
      index.html, public/), wire the Supabase client + magic-link auth
- [ ] Ask the builder to configure Auth in the Supabase Dashboard
      (magic link, self-signup disabled) — not settable via MCP
- [ ] Build src/lib/data.js — real Supabase reads/writes replacing every
      in-memory array, including the ratings/assessor_ratings reconciliation
      documented in docs/supabase-setup.md
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
- Staying on the Supabase Free plan for now — builder's explicit, informed
  choice (session 1), not a default. Auto-pause risk during quiet stretches
  is an accepted tradeoff; revisit before go-live.
- `ratings` ↔ `assessor_ratings` shape mismatch (schema-draft.md's open
  question): resolved as an application-layer read-time pivot, not a schema
  change — full reasoning in docs/supabase-setup.md.
- Added a `stakeholder_options` SQL view (not a table) to make Tool A's
  already-written `fetchStakeholderOptions()` start working against the real
  master stakeholder map, instead of duplicating data into a second table
  matching Tool A's originally-guessed name. Cross-joins every assessment
  with every stakeholder group — correct, since the map is shared across
  engagements by design, not per-assessment.
- No authenticated delete policy on `iros` (only read/insert/update) — matches
  docs/schema-draft.md literally; IROs are removed via cascade when their
  parent assessment is deleted, not directly.

## Known issues
- Auth (magic link, invite-only self-signup disabled) is not yet configured in
  the Supabase Dashboard — cannot actually log in to Tool B until the builder
  does this manually; not settable via MCP tools
- Deletion-request contact/process for GDPR not yet confirmed with the builder
- Whether the Results screen's adjustable threshold is a second stored value or
  a display-only re-slice of the fixed 3.0 threshold — not yet resolved
- Whether collaborators (e.g. Becca) need different permissions from the builder,
  or one shared A2 level is sufficient for v1 — shipping as one shared level
- Whether Topics/Calibration sign-off should tie to real auth.users instead of a
  free-text name field, now that Tier 3 auth exists — shipping as free text for v1

## Notes for next session
Schema is done. Start with the app scaffold at repo root (package.json,
vite/tailwind/postcss config, index.html, public/ — copy from
reference-prototype/ per CLAUDE.md Project Structure, not nested in a
subdirectory this time), wire src/lib/supabaseClient.js + magic-link auth
(after the builder confirms Auth is configured in the dashboard), then port
screens starting with Dashboard. Ask the builder about Auth dashboard config
before assuming login works.

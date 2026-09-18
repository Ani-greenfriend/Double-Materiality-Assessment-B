# PROGRESS — Apus DMA Consultant Console

> Claude Code: read this file at the start of every session, before touching
> anything. Update it at every save point. Replace content — do not append.
> History lives in git.

**Session:** 1
**Last updated:** 2026-09-18 — by Claude Code, first build session
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
- [ ] Confirm Tool A has been built and docs/supabase-setup.md exists in the
      shared `greenfriend-dma` project — this tool cannot start schema work
      until it does (see CLAUDE.md First Session Setup step 1)
- [ ] First Session Setup: create docs/, move reference files, commit
- [ ] Confirm Supabase Pro plan upgrade is done (manual billing step)
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
None.

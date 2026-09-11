# PROGRESS — Apus DMA — Consultant Console

> Claude Code: read this file at the start of every session, before touching
> anything. Update it at every save point. Replace content — do not append.
> History lives in git.

**Session:** 2
**Last updated:** 2026-09-11 — by Claude Code
**Live URL:** none yet — not deployed to Netlify

## Current state
The full consultant console is built and running as a real Vite/React/Tailwind app
at the repo root (previously only `reference-prototype/` existed). Per the
builder's explicit instruction, **the database is out of scope for this pass** —
the app uses in-memory React state exactly like the reference prototype, with no
Supabase client, no auth, and no environment variables. `npm run build` succeeds.

The app now opens pre-seeded with a sample engagement ("Acme Manufacturing") —
4 IROs across all four `iroType` values, two assessors on two of them (one
triggering the severity override, one triggering a discrepancy flag), one
calibrated result, and two assessment records (one quantitative, one completed
qualitative) — instead of the empty first-run state, per the builder's request
to see the tool actually working rather than a blank shell. See `DEMO_IROS` /
`DEMO_CALIBRATIONS` / `DEMO_ASSESSMENTS` at the top of `src/App.jsx`.

The full workflow was verified in a real browser this session: Dashboard →
Assessment Overview → New Assessment (both Quantitative and Qualitative paths) →
Mode → Perspective → Survey Setup (dates/link/slug validation for quantitative) →
CSV Upload → Review & Customize → Created/Congratulations → Intro Flow → live
Questionnaire (qualitative slider) → Calibration (real computed scores, topic
accordion) → Results (bar chart, heatmaps, adjustable matrix) → Dashboard stats
updating with real data (rating progress, topics tracked, material topics,
assessments run, recent activity feed).

## Last session
Session 2: added the seeded sample engagement described above directly into
`src/App.jsx` (as `DEMO_IROS`/`DEMO_CALIBRATIONS`/`DEMO_ASSESSMENTS`, wired
through `useState(() => DEMO_X)`), after first proving it out in a throwaway
copy of the app used to publish a demo Artifact. Verified `npm run build` and a
real browser render of the seeded Dashboard match the Artifact exactly.

Session 1: scaffolded the real app from `reference-prototype/` (package.json,
vite/tailwind/postcss config, index.html, public/favicon.svg + _redirects).
Copied every component and lib file verbatim (`App.jsx`, all of
`src/components/`, `src/lib/calc.js` / `csv.js` / `topics.js`) — they are
already faithful to product-spec.md Section 8/9 and mostly presentational, so no
rewrite was needed for a frontend-only pass. Dropped `PreviewWindowApp.jsx` (the
prototype's separate-tab preview bootstrap) since App.jsx's real Preview flow
renders inline in the same window, matching the spec. Verified `npm install` +
`npm run build`, then drove the full workflow in a headless browser to confirm
no runtime errors and correct calculations.

## Remaining work
- [ ] **Database + Auth pass (deferred by builder request — do not start until asked):**
      build `assessor_ratings`, `calibrations`, `participants`,
      `stakeholder_options` tables + RLS in the shared Supabase project
      (`evwmxduudcujtibirmga` — see Tool A's `docs/supabase-setup.md`), add
      magic-link invite-only Auth, and write a `src/lib/data.js` that replaces
      every `useState` array in `App.jsx` with real Supabase reads/writes.
- [ ] As part of that pass: reconcile Tool A's per-criterion `ratings` rows with
      this tool's per-assessor `assessor_ratings` shape at read time (aggregate
      `ratings` by `session_id` per IRO into the same `{scale, scope, ...}` shape
      `calc.js` expects) — see product-spec.md Section 15.
- [ ] Company logo currently stored as a data URL in memory — move to Supabase
      Storage once the database pass starts.
- [ ] GDPR consent checkbox on the Expected Participants form — flagged missing
      in product-spec.md Section 15, needs Anika's confirmation of contact/process.
- [ ] Deploy to Netlify once ready (no env vars needed yet since there's no backend).
- [ ] Mobile-responsive pass — out of scope for v1 per spec Section 12.

## Build decisions
- Kept `reference-prototype/` in the repo as the UI/UX reference, per the spec's
  explicit instruction that it's authoritative for layout/copy/interaction —
  the real `src/` is a straight copy of it for this pass, not a re-derivation.
- `main.jsx` renders `<App />` directly — dropped the prototype's hash-param
  branch to `PreviewWindowApp` (a separate-tab, `localStorage`-relayed preview)
  since it's superseded by App.jsx's inline Preview (see reference-prototype's
  own README.md, which flags `PreviewWindowApp.jsx` as superseded).
- No `.env` / `.env.example` yet — nothing in this build reads an environment
  variable. Add both when the Supabase pass starts (mirroring Tool A's).
- Package name changed from the prototype's `apus-mvp` to
  `apus-dma-consultant-console`; page `<title>` updated to match.
- Seeded demo data lives inline in `App.jsx` behind three `DEMO_*` constants,
  not a separate file or flag, so it's trivially deletable in one diff once the
  database pass starts feeding `iros`/`calibrations`/`assessments` for real —
  see the comment directly above `DEMO_IROS`.

## Known issues
- None found this session — full workflow verified end-to-end with no console
  errors (aside from the Google Fonts stylesheet failing to load in this
  session's sandboxed browser test, which is a sandbox network restriction, not
  an app bug — will load normally once deployed).
- Nothing persists across a page reload yet (expected — see Database status in
  CLAUDE.md). Don't report this as a bug in a future session; it's the known,
  deliberate state until the database pass happens.

## Notes for next session
Wait for the builder to explicitly ask for the database/auth pass before
starting it (see CLAUDE.md's Database status section) — do not infer it from a
generic "continue" or "keep going" instruction.

# Supabase Setup — Apus DMA — Participant Questionnaire

> Mirrored into this repo (Tool B) from Tool A's `docs/supabase-setup.md` at
> Tool B session 1, per CLAUDE.md First Session Setup. Tool A's copy is the
> live source of truth for the shared project; this tool's own tables/RLS get
> appended here as Tool B's schema work lands.

**Last updated:** 2026-09-17 — Session 3

## Project
- Name: `greenfriend Double Materiality Assessment` (existing project — reused per
  the builder's instruction; does **not** match the spec's originally proposed
  `greenfriend-dma` name, kept as-is rather than renaming/recreating)
- Project ID: `evwmxduudcujtibirmga`
- Project URL: `https://evwmxduudcujtibirmga.supabase.co`
- Region: `eu-west-1`
- Plan: Free at time of writing — **builder must upgrade to Pro** before real
  client use (CLAUDE.md requirement, to avoid auto-pause during a quiet stretch
  of a multi-week questionnaire window)

## Tables

### assessments
Owned/written by the Consultant Console (Tool B). This tool only reads it.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | default `gen_random_uuid()` |
| name | text | used as the "company name" in the Welcome screen title |
| description | text | nullable |
| mode | text | `quantitative` \| `qualitative` |
| perspective_filter | text | `full` \| `impact` \| `financial` |
| status | text | default `'draft'` |
| start_date | date | nullable |
| end_date | date | nullable |
| slug | text | unique — this is the public link identifier (`/survey/:slug`) |
| logo_url | text | nullable |
| welcome_text | text | nullable |
| task_text | text | nullable — **not currently read** by the ported `ParticipantExperience.jsx` (see PROGRESS.md Build decisions) |
| mandatory | bool | default `false` |
| created_at | timestamptz | default `now()` |

### iros
Owned/written by the Consultant Console (Tool B). This tool only reads it.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | default `gen_random_uuid()` |
| assessment_id | uuid, FK → assessments.id | `on delete cascade` |
| esrs_topic_id | text | e.g. `E1`, `S2`, `G1` |
| subtopic_raw | text | nullable |
| name | text | |
| description | text | nullable |
| iro_type | text | `neg_impact` \| `pos_impact` \| `risk` \| `opportunity` |
| actual | bool | default `false` — actual vs. potential |
| impact_threshold | numeric | nullable — unused by this tool (Tool B's scoring input) |
| financial_threshold | numeric | nullable — unused by this tool |
| order | integer | default `0` — display order on the participant side |
| created_at | timestamptz | default `now()` |

### ratings
Owned/written by this tool (Participant Questionnaire). Tool B reads it.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | default `gen_random_uuid()` |
| assessment_id | uuid, FK → assessments.id | `on delete cascade` |
| iro_id | uuid, FK → iros.id | `on delete cascade` |
| criterion_key | text | `scale` \| `scope` \| `irreversibility` \| `likelihood` \| `magnitude` \| `financialLikelihood` |
| value | integer, nullable | 0–5, `null` means skipped |
| stakeholder_group | text | free text label chosen on the Stakeholder Group screen |
| session_id | uuid | generated client-side once per participant visit |
| submitted_at | timestamptz | default `now()` |

Indexes: `iros(assessment_id)`, `ratings(assessment_id)`, `ratings(iro_id)`,
`assessments(slug)`, `session_comments(assessment_id)`.

### session_comments
Owned/written by this tool (Participant Questionnaire). Added session 3 (v1.1
revision) — the Submit screen's optional "Any other comments?" field writes
here. Not currently read by anything in this tool or Tool B (per CLAUDE.md,
out of scope for now).

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | default `gen_random_uuid()` |
| assessment_id | uuid, FK → assessments.id | `on delete cascade` |
| session_id | uuid | same client-generated session id used on `ratings` rows |
| comment | text | not null — the app only inserts a row when the field was filled in |
| submitted_at | timestamptz | default `now()` |

## RLS Policies

| Table | Policy | Effect |
|---|---|---|
| assessments | `anon select assessments` | `anon` role can `select` — the app always filters by exact `slug`, so this is a point-lookup in practice, not a public listing |
| iros | `anon select iros` | `anon` role can `select` — the app always filters by exact `assessment_id` obtained from the assessments lookup |
| ratings | `anon insert ratings` | `anon` role can `insert` only — no select/update/delete from the anon role |
| session_comments | `anon insert session_comments` | `anon` role can `insert` only — no select/update/delete from the anon role |

No insert/update/delete policy exists on `assessments` or `iros` for `anon` — those
tables are read-only from this tool's side, matching CLAUDE.md.

## Protected tables (not created by this tool)
`assessor_ratings`, `calibrations`, `participants`, `stakeholder_options` belong
to the Consultant Console (Tool B) and do not exist yet. This tool's data layer
(`src/lib/data.js`) attempts a best-effort read of `stakeholder_options` for the
Stakeholder Group screen and falls back to the spec's default option lists when
the table doesn't exist or returns no rows — see PROGRESS.md.

## Environment variables
- `VITE_SUPABASE_URL` = `https://evwmxduudcujtibirmga.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = the **publishable key** (`sb_publishable_...`),
  not the legacy anon JWT. Both work with `@supabase/supabase-js`, but use
  the publishable key — see the incident note below. Get it from Project
  Settings → API Keys → Publishable key. Set both as Netlify environment
  variables at deploy time; never commit real values (`.env` is gitignored,
  `.env.example` has empty placeholders).

## Notes for future sessions
- **Incident (session 3):** the deployed app showed `Survey misconfigured` /
  `TypeError: Failed to execute 'set' on 'Headers': String contains non
  ISO-8859-1 code point` on every load. Root cause: the legacy anon JWT
  pasted into Netlify's `VITE_SUPABASE_ANON_KEY` had picked up a stray
  non-Latin1 character somewhere in the copy/paste chain, and
  `supabase-js` puts this value straight into an HTTP header (`apikey`),
  which the browser's `Headers.set()` rejects outright for any character
  outside ISO-8859-1. Fixed by switching to the shorter, plain-ASCII
  **publishable key** instead of the legacy JWT — same effect, much less
  copy/paste risk. `src/lib/supabaseClient.js` and `src/lib/data.js` also
  gained better error surfacing (per-variable presence/length diagnostics,
  and real Postgrest error messages instead of a flat "not found") while
  chasing this down — those are worth keeping even though the root cause
  turned out to be Netlify-side.
- Netlify's env-var dashboard does **not** apply a changed value to an
  already-built deploy — even "Retry deploy" on an existing deploy entry
  reused the old value. Only **"Clear cache and deploy site"** on a fresh
  deploy action actually re-reads current env vars. Worth remembering for
  any future "I changed the env var but nothing happened" report.
- This session's sandbox could not reach `*.supabase.co` directly (organization
  egress policy blocks it for direct HTTPS/browser traffic) — schema changes went
  through fine via the Supabase MCP tool, but a live browser test of the deployed
  frontend against this project could not be done from within this session. Test
  on Netlify (or the builder's own machine) once deployed.
- A demo assessment (`slug = 'acme-2026'`, 5 IROs covering all four `iro_type`
  values) was inserted for testing — safe to delete once Tool B exists and real
  assessments are created there.
- When Tool B is built and creates `stakeholder_options`, no change should be
  needed here — `fetchStakeholderOptions` in `src/lib/data.js` already queries it
  and only needs the table to start existing.

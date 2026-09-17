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

---

## Tool B (Consultant Console) additions — session 1

### assessments — columns added
| Column | Type | Notes |
|---|---|---|
| respondents_done | integer | default `0` |
| respondents_total | integer | default `0` |
| created_by | uuid, FK → auth.users | nullable |
| updated_at | timestamptz | default `now()` |

Added policies: `authenticated read/insert/update/delete assessments` (full CRUD
for the logged-in consultant; `anon select assessments` from Tool A is
unchanged).

### iros — columns added (table itself was created by Tool A, owned/written by this tool)
| Column | Type | Notes |
|---|---|---|
| topic_library_id | uuid, FK → topic_library | `on delete set null` — kept nullable so an IRO survives its source library entry being deleted |
| session_notes | text | nullable — free text captured during a qualitative live session |

Also set `impact_threshold` / `financial_threshold` defaults to `3.0` (previously
no default). Added `authenticated read/insert/update iros` policies (no
authenticated delete policy — matches docs/schema-draft.md, which doesn't call
for direct IRO deletion; IROs are removed via `on delete cascade` when their
parent assessment is deleted). `anon select iros` from Tool A is unchanged.

### topic_library — new table
The master IRO library. `id, iro_type, esrs_topic_id, esrs_subtopic, short_title,
description, actual, value_chain, reference_code (unique), signed_off_by,
signed_off_at, created_at`. RLS: `authenticated` full read/write/delete. No
`anon` access.

### assessor_ratings — new table
One row per (IRO × assessor). `id, iro_id (FK, cascade), assessor_label, scale,
scope, irreversibility, likelihood, magnitude, financial_likelihood (all 0–5),
recorded_at`. RLS: `authenticated` read/insert/update, no delete. No `anon`
access. No unique constraint on `(iro_id, assessor_label)` — the app is
responsible for find-or-update logic when an assessor re-submits.

### calibrations — new table
One row per IRO's current calibration state. `id, iro_id (FK, cascade), owner,
moderator, calibrated_value, notes, band_value (1–5), calibrated_at,
signed_off_by, signed_off_at`. RLS: `authenticated` read/insert/update, no
delete. No `anon` access.

### calibration_history — new table
Append-only audit log. `id, calibration_id (FK, cascade), from_value, to_value,
notes, changed_by, changed_at`. RLS: `authenticated` read/insert **only** — no
update or delete policy exists at all, so this is append-only at the database
level, not just by app convention.

### participants — new table
Expected participant list for a qualitative live session. `id, assessment_id
(FK, cascade), name, title, expert_topic`. RLS: `authenticated` full
read/write/delete. No `anon` access.

### stakeholder_groups — new table
The master stakeholder map, independent of any one assessment. `id, name,
perspectives (text[], values from `impact`/`financial`), "order"`. RLS:
`authenticated` full read/write/delete; `anon` select (`qual: true`, same
open-select pattern Tool A already uses for `assessments`/`iros` — scoped in
practice by the app, not by RLS).

### stakeholder_members — new table
Named contacts within a stakeholder group. `id, group_id (FK, cascade), name
(required), role (required), company, email (optional — format-checked in the
frontend only, not at the DB level), pillars (text[], values from `E`/`S`/`G`),
expertise, created_at`. RLS: same as `stakeholder_groups`.

### stakeholder_options — new view (reconciles a Tool A ↔ Tool B naming mismatch)
Tool A's `fetchStakeholderOptions()` (`src/lib/data.js`) queries a table called
`stakeholder_options` with columns `(assessment_id, perspective, label)` — named
before this tool's actual schema was designed, and it never existed, so Tool A
was silently falling back to its hardcoded default option lists. This tool's
real schema (`stakeholder_groups`/`stakeholder_members`) is a master map shared
across all assessments, not a per-assessment table, so rather than add a second
data source, `stakeholder_options` is a **read-only view**:

```sql
create view public.stakeholder_options as
select a.id as assessment_id, unnest(g.perspectives) as perspective, g.name as label
from public.assessments a
cross join public.stakeholder_groups g;
```

Cross-joining is correct here, not a bug — the map is deliberately shared, so
every assessment resolves the same perspective-filtered group names. Created
with `security_invoker = true` (Supabase's linter flags views as `SECURITY
DEFINER` by default, which would bypass RLS on the underlying tables — fixed
immediately after creation; `get_advisors` security lints are clean). Granted
`select` to both `anon` and `authenticated`. No schema or RLS change was made
to any table Tool A owns — this is purely additive.

### Ratings reconciliation (schema-draft.md's open design question — resolved)
Tool A's `ratings` is long-format: one row per `(iro_id, session_id,
criterion_key)`, criteria split across separate rows, supports partial/skip.
This tool's `assessor_ratings` is wide-format: one row per `(iro_id,
assessor_label)` with all six criteria as columns — the shape
`reference-prototype/src/lib/calc.js`'s `aggregateIro()` expects
(`iro.assessments` = array of `{scale, scope, irreversibility, likelihood,
magnitude, financialLikelihood}` objects).

Resolved as a **read-time reconciliation in the application layer, not a schema
change**: when building `iro.assessments` for `calc.js`, this tool's data layer
must (1) read this tool's own `assessor_ratings` rows for the IRO directly (already
wide-shape), and (2) separately read Tool A's `ratings` rows for the same
`iro_id`, group them by `session_id`, and pivot each group's
`criterion_key`/`value` pairs into one wide-shape object per `session_id`
(treating each participant session as one "assessor"; `stakeholder_group` on
the `ratings` row can serve as that pseudo-assessor's label). Concatenate both
arrays before passing to `calc.js`. This keeps `ratings` completely untouched
(read-only, per CLAUDE.md's hard rule) and needs no join or view across the two
shapes — implement this in `src/lib/data.js` when the Calibration/Results data
layer is built (not yet done as of session 1).

## Protected tables (not created by this tool)
`assessor_ratings`, `calibrations`, `participants` now exist (see above) —
this note is stale as of Tool B session 1 and kept only for history.

## Environment variables
- `VITE_SUPABASE_URL` = `https://evwmxduudcujtibirmga.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = the **publishable key** (`sb_publishable_...`),
  not the legacy anon JWT. Both work with `@supabase/supabase-js`, but use
  the publishable key — see the incident note below. Get it from Project
  Settings → API Keys → Publishable key. Set both as Netlify environment
  variables at deploy time; never commit real values (`.env` is gitignored,
  `.env.example` has empty placeholders).

## Notes for future sessions (Tool B)
- **Org is on the Free plan** (confirmed via Supabase MCP, session 1) — CLAUDE.md
  calls for Pro before real use, to avoid auto-pause during a quiet stretch.
  Builder made an explicit, informed choice to stay on Free for now (session 1).
  Revisit before go-live.
- **Auth (magic link, invite-only) is not yet configured** — this is a Supabase
  Dashboard setting (Authentication → Providers/Settings: disable self-signup,
  enable email/magic-link), not something this session's MCP tools can set.
  Flag to the builder before shipping login; until then there is no way to
  actually sign in to Tool B.
- Tool B reuses the exact same `VITE_SUPABASE_URL` / publishable
  `VITE_SUPABASE_ANON_KEY` as Tool A (same project) — set as Tool B's own
  Netlify environment variables at its own deploy time, not shared/copied from
  Tool A's Netlify site.

## Notes for future sessions (Tool A)
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

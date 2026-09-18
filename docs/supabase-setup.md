# Supabase Setup — Apus DMA — Participant Questionnaire

**Last updated:** 2026-09-18 — Session 4 (verified against the live project;
corrected the `iros` columns and Protected tables list to match reality, and
flagged a security exposure on Tool B's tables — see Notes below)

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
| respondents_done | integer | default `0` — added by Tool B session 1; incremented by this tool via the `increment_respondents` RPC on each submission, see below |
| respondents_total | integer | default `0` — added by Tool B session 1; set by Tool B at assessment creation, not read/written by this tool |
| created_by | uuid, FK → auth.users | added by Tool B session 1 |
| updated_at | timestamptz | added by Tool B session 1 |

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
| impact_threshold | numeric | nullable, default `3.0` — unused by this tool (Tool B's scoring input) |
| financial_threshold | numeric | nullable, default `3.0` — unused by this tool |
| order | integer | default `0` — display order on the participant side |
| created_at | timestamptz | default `now()` |
| topic_library_id | uuid, FK → topic_library.id | nullable — added by Tool B; unused by this tool |
| session_notes | text | nullable — added by Tool B; unused by this tool |

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

### Respondent counting (added this session)
Product need: the consultant wants to know how many people actually
completed each survey. Rather than grant `anon` a general `UPDATE` on
`assessments` (which would let a participant's browser rewrite any column on
the row), Tool B added a narrow `SECURITY DEFINER` SQL function:

```sql
create or replace function public.increment_respondents(p_assessment_id uuid)
returns void
language sql security definer set search_path = public
as $$
  update public.assessments set respondents_done = respondents_done + 1
  where id = p_assessment_id;
$$;
grant execute on function public.increment_respondents(uuid) to anon;
```

This tool calls it (`incrementRespondents()` in `src/lib/data.js`) right after
a successful submit. It can only ever do this one increment — no other column
is reachable through it. `get_advisors` flags two expected WARN-level lints
("anon/authenticated can execute a SECURITY DEFINER function") — that's the
intended design, not an oversight.

**One-submission-per-browser** is a plain `localStorage` flag
(`apus_submitted_<assessmentId>`, see `App.jsx`), not an IP check — no
server-side code, no IP address stored (simpler GDPR posture), matching what
most lightweight survey tools do. It's a courtesy, not a hard security
boundary: clearing storage or switching browsers resets it.

## Protected tables (owned by Tool B — never modified by this tool)
Per CLAUDE.md's Hard Rules, this tool must never change schema, RLS, or write
to these. Confirmed live in the project as of this session's verification:
`assessor_ratings`, `calibrations`, `calibration_history`, `participants`,
`stakeholder_groups`, `stakeholder_members`, `topic_library`.

This tool's data layer (`src/lib/data.js`) does a read-only, best-effort read
of `stakeholder_groups`/`stakeholder_members` (not `stakeholder_options` —
that table was never actually created; the real names are these two) for the
Stakeholder Group screen, and falls back to the spec's default option lists
if the read fails or returns no rows — see PROGRESS.md.

## Environment variables
- `VITE_SUPABASE_URL` = `https://evwmxduudcujtibirmga.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = the **publishable key** (`sb_publishable_...`),
  not the legacy anon JWT. Both work with `@supabase/supabase-js`, but use
  the publishable key — see the incident note below. Get it from Project
  Settings → API Keys → Publishable key. Set both as Netlify environment
  variables at deploy time; never commit real values (`.env` is gitignored,
  `.env.example` has empty placeholders).

## ⚠️ Security note (found this session, not caused by this tool)
Live policy inspection (`pg_policies`) found `anon`-role **INSERT/UPDATE/DELETE**
policies, named `TEMP anon insert/update/delete ...`, on three protected
tables: `stakeholder_groups`, `stakeholder_members`, and `topic_library`
(the latter also has a redundant `TEMP anon select`). That means the public
anon key — the one this participant-facing tool ships to every browser —
can currently write to Tool B's tables, not just read them.

This is outside this tool's authority to fix: CLAUDE.md's Hard Rules forbid
this tool from making *any* RLS change to `stakeholder_groups`,
`stakeholder_members`, or `topic_library`, including tightening a policy
someone else left open. Flagging here so the Consultant Console (Tool B)
builder removes those `TEMP` policies before going live — they read like
scaffolding from Tool B's own build/testing that was never cleaned up.

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

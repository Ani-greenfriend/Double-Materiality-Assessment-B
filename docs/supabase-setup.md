# Supabase Setup — Apus DMA (shared project, both tools)

> This file originated in Tool A (Participant Questionnaire) and is copied
> into both repos per each tool's CLAUDE.md. Tool B (Consultant Console)
> owns the sections below the "Tool B additions" marker; edit Tool A's copy
> for anything above it.

**Last updated:** 2026-09-20 — Tool A session 5, v2.0 shared migration
(performed in full per product-spec.md Section 5 and
product-spec-tool-b-consultant-console.md Section 5/6 — Tool A builds first
and migrates the whole shared schema). Replaces the v1.1 schema entirely.
Manual export of the pre-migration state: `docs/backups/pre-v2.0-migration-2026-09-20.md`.

## Project
- Name: `greenfriend Double Materiality Assessment` (existing project — reused per
  the builder's instruction; does **not** match the spec's originally proposed
  `greenfriend-dma` name, kept as-is rather than renaming/recreating)
- Project ID: `evwmxduudcujtibirmga`
- Project URL: `https://evwmxduudcujtibirmga.supabase.co`
- Region: `eu-west-1`
- Plan: Free — builder decided to stay on Free (2026-09-18); accepted risk:
  personal and resume links break while the project is paused after ~1 week
  without traffic. Open a survey link weekly during a survey window.

## Migrations applied this session (in order)
1. `v2_retire_old_objects` — unscheduled the `sync_ratings_to_assessor_ratings`
   cron job, dropped that function, `assessor_ratings`, `increment_respondents`,
   `session_comments`, `participants`; cleared the old-shape `ratings`, `iros`
   and the demo `assessments` row (v1.1-shaped, no `submission_id`/`justification` —
   exported first, see backup file above)
2. `v2_new_tables` — created `clients`, `practice_settings`, `cycles`,
   `threshold_changes`, `invitations`, `live_sessions`,
   `live_session_participants`, `attendance_edit_log`, `submissions`,
   `topic_justifications`; RLS enabled on all
3. `v2_alter_existing_tables` — changed `assessments`, `iros`, `ratings`,
   `topic_library`, `calibrations`, `stakeholder_groups` per the shared
   migration's "Changed" list
4. `v2_drop_old_policies`, `v2_drop_old_calibration_policies` — removed v1.1
   RLS policies before replacing them
5. `v2_rls_policies_and_views` — full RLS matrix (anon + authenticated) across
   every table, plus the `combined_ratings` view
6. `v2_fix_cycle_anon_access` — replaced a `SECURITY DEFINER`-style view (flagged
   ERROR by the Supabase security linter) with column-grant + RLS on `cycles`
   directly, matching the pattern already used for `invitations`
7. `v2_seed_demo_assessment` — re-created the `acme-2026` demo assessment,
   cycle, client and a demo invitation in the new structure
8. `v2_frontend_support` — widened the anon column grant on `cycles` to
   include `stage` and `client_id` (needed to detect a closed survey and to
   look up the client logo), added a unique constraint on
   `ratings (submission_id, iro_id, criterion_key)` so draft saves can
   upsert, and added `submit_survey_response(...)`, an atomic all-or-nothing
   submit function
9. `v2_fix_submit_rpc_no_delete` — bug fix: the first version of
   `submit_survey_response` deleted existing draft rows before re-inserting;
   anon has no DELETE policy on `ratings`/`topic_justifications` (correctly,
   per spec), so under `SECURITY INVOKER` that delete silently affected 0
   rows and the re-insert then hit the new unique constraint. Rewritten to
   use `ON CONFLICT ... DO UPDATE` instead — no delete anywhere, satisfies
   the existing INSERT/UPDATE policies as-is
10. `v2_security_lockdown_anon_link_access` — **security fix, caught in
    review after this branch's PR was open:** migrations 5 and 8 gave anon
    `using (true)` (every row) SELECT policies on `invitations`, `submissions`,
    `ratings` and `topic_justifications`, narrowed only by a column grant on
    `invitations`. That meant `link_code` — meant to be an unguessable secret
    — was fully listable via `GET /invitations?select=link_code`, and every
    expert's personal data (expertise, justifications, comments) was
    readable platform-wide via `GET /submissions?select=*` etc., violating
    spec Section 6 and acceptance criterion 16. Fixed by revoking **all**
    anon table-level access and RLS policies on those 4 tables and replacing
    every anon interaction with `SECURITY DEFINER` functions keyed by the
    link code itself — a value you must already hold as input, never one you
    can list. See "Functions added this session" and the RLS matrix below.
    `submit_survey_response`'s signature changed from `p_invitation_id uuid`
    to `p_link_code text` as part of this (the old uuid-keyed overload was
    dropped). Authenticated policies were not touched.

## Tables

### clients — New. Owned by Tool B.
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | default `gen_random_uuid()` |
| name | text | |
| logo_url | text | nullable — set via Supabase Storage upload in Tool B |
| created_at | timestamptz | default `now()` |

### practice_settings — New. Owned by Tool B. One row.
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| consultant_logo_url | text | nullable |

### cycles — New. Owned by Tool B. This tool only reads `esrs_version` (narrowly).
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| client_id | uuid, FK → clients | `on delete cascade` |
| name | text | |
| financial_year | integer | |
| esrs_version | text | `esrs_2023_amended` \| `esrs_2026` |
| stage | text | `collecting` \| `calibrating` \| `signed_off`, default `collecting` |
| impact_threshold, financial_threshold | numeric | default 3.0 each |
| baseline_impact_threshold, baseline_financial_threshold | numeric | default 3.0 each |
| require_both_sources | bool | default `false` |
| silent_stakeholders_considered | bool | default `false` |
| silent_stakeholders_note | text | nullable |
| methodology_version, approver_name, approver_role, minutes_reference | text | nullable |
| signed_off_at | timestamptz | nullable |
| signed_off_recorded_by, created_by | uuid, FK → auth.users | nullable |
| created_at | timestamptz | default `now()` |

### threshold_changes — New. Owned by Tool B. Append-only.
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| cycle_id | uuid, FK → cycles | `on delete cascade` |
| axis | text | `impact` \| `financial` |
| old_value, new_value | numeric | |
| reason | text | nullable |
| changed_by | uuid, FK → auth.users | nullable |
| changed_at | timestamptz | default `now()` |

### assessments — Changed. Owned by Tool B. This tool reads it.
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| cycle_id | uuid, FK → cycles | **new** |
| type | text | **new**, replaces `mode` — `expert_survey` \| `expert_live_session` |
| name, description | text | description nullable |
| perspective_filter | text | `full` \| `impact` \| `financial` |
| status | text | free text, default `'draft'` (demo uses `'active'`) |
| start_date, end_date | date | nullable |
| slug | text | unique — public link identifier for the survey route |
| welcome_text, task_text | text | nullable |
| mandatory | bool | default `false` |
| justification_mode | text | **new** — `per_criterion` (default) \| `per_topic` |
| created_at, updated_at | timestamptz | |
| created_by | uuid, FK → auth.users | nullable |

**Retired columns:** `mode` (→ `type`), `logo_url` (client logo used instead,
via `cycle_id` → `cycles.client_id` → `clients.logo_url`), `respondents_done`,
`respondents_total` (counts now derived from `invitations` + `submissions`).

### topic_library — Changed. Owned by Tool B, the master IRO library.
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| iro_type | text | `neg_impact` \| `pos_impact` \| `risk` \| `opportunity` |
| esrs_topic_id | text | E1–G1 |
| esrs_subtopic, short_title, description | text | subtopic/description nullable |
| actual | bool | default `false` |
| value_chain | text | nullable — `own` \| `upstream` \| `downstream` |
| esrs_version | text | **new** — `esrs_2023_amended` \| `esrs_2026`, backfilled `esrs_2023_amended` |
| time_horizon | text | **new**, nullable |
| potential_human_rights_impact | bool | **new**, default `false` |
| client_id | uuid, FK → clients | **new**, nullable — empty means shared master topic |
| reference_code | text | unique |
| signed_off_by | text | nullable |
| signed_off_at | timestamptz | nullable |
| created_at | timestamptz | |

### iros — Changed. Owned by Tool B (snapshot at assessment creation). This tool reads/writes ratings against it.
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| assessment_id | uuid, FK → assessments | `on delete cascade` |
| topic_library_id | uuid, FK → topic_library | nullable |
| esrs_topic_id | text | |
| name, description | text | description nullable |
| iro_type | text | `neg_impact` \| `pos_impact` \| `risk` \| `opportunity` |
| actual | bool | default `false` |
| time_horizon | text | **new**, nullable |
| potential_human_rights_impact | bool | **new**, default `false` |
| session_notes | text | nullable |
| order | integer | default `0` |
| created_at | timestamptz | |

**Retired columns:** `subtopic_raw`, `impact_threshold`, `financial_threshold`
(unused — never read by the ported UI, not in the v2.0 field list).

### stakeholder_groups — Changed. Owned by Tool B, the master stakeholder map. This tool reads it (anon, all rows — needed to render the "About you" group picker).
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| name | text | |
| type | text | **new**, nullable — `impact` \| `financial` \| `silent`; backfilled from the old `perspectives` array where it held exactly one value, left `null` for the ungrouped entries carried over from the v1.1 stakeholder map |
| perspectives | text[] | kept alongside `type` per spec's field list |
| order | integer | |

Three silent-stakeholder presets seeded: Nature and ecosystems, Species and
biodiversity, Future generations (`type = 'silent'`, custom entries allowed).

### stakeholder_members — Unchanged shape. Owned by Tool B. **No longer anon-readable** (see RLS below).
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| group_id | uuid, FK → stakeholder_groups | |
| name, role | text | |
| company, email, expertise | text | nullable |
| pillars | text[] | default `{}` |
| created_at | timestamptz | |

### invitations — New. Owned by Tool B. Anon has **no table-level access at all** — every read/write goes through a `SECURITY DEFINER` function keyed by `link_code` (see Functions below); `name`/`email` are never selectable from the public side under any path.
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| assessment_id | uuid, FK → assessments | `on delete cascade` |
| name, email | text | **never exposed to anon** |
| stakeholder_group_id | uuid, FK → stakeholder_groups | the group the consultant *expects* — not binding, "About you" is never pre-filled |
| stakeholder_member_id | uuid, FK → stakeholder_members, nullable | **new, migration `v2_add_stakeholder_member_id`** — links to the master map entry this invitee was chosen from (or created as) on Recipients; `on delete set null` (deleting the stakeholder never breaks the invitation) |
| link_code | text | unique, unguessable — the personal link's secret |
| status | text | `invited` \| `opened` \| `saved` \| `submitted`, default `invited` |
| sent_at, opened_at, last_saved_at, submitted_at, anonymised_at | timestamptz | nullable |
| created_at | timestamptz | |

### submissions — New. Owned/written by this tool. Anon has **no table-level access at all** — see `invitations` above; the same `SECURITY DEFINER` functions read/write this table internally.
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| assessment_id | uuid, FK → assessments | `on delete cascade` |
| source | text | `expert_survey` \| `expert_live_session` |
| invitation_id | uuid, FK → invitations | nullable — set for `expert_survey`, **unique** (one submission per invitation) |
| live_session_id | uuid, FK → live_sessions | nullable — set for `expert_live_session` |
| status | text | `draft` \| `submitted`, default `draft` |
| stakeholder_group | text | the group the expert chose (About you) |
| perspective | text | `impact` \| `financial` |
| expertise_topics | text[] | E1–G1 / Other, multi-select |
| expertise_explanation | text | |
| title, basis_for_representation, overall_comment | text | nullable |
| consent_given_at | timestamptz | nullable |
| current_topic_index | integer | default `0` |
| last_saved_at | timestamptz | default `now()` |
| submitted_at | timestamptz | nullable |
| created_at | timestamptz | |

`submissions_source_reference` check constraint enforces exactly one of
`invitation_id` / `live_session_id` is set, matching `source`.

### ratings — Changed. Owned/written by this tool (and, later, Tool B for live sessions). Anon has **no table-level access at all** — see `invitations` above.
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| submission_id | uuid, FK → submissions | **new**, `on delete cascade` — replaces the old bare `session_id` |
| assessment_id | uuid, FK → assessments | kept (denormalized, per spec) |
| iro_id | uuid, FK → iros | |
| criterion_key | text | `scale` \| `scope` \| `irreversibility` \| `likelihood` \| `magnitude` — **`financialLikelihood` retired**; CLAUDE.md's Business Rules list "risk or opportunity = magnitude, likelihood" and product-spec.md Section 9 confirm `likelihood` is reused for risk/opportunity, not a separate key |
| value | integer, nullable | 0–5, `null` = skipped |
| justification | text | **new**, nullable — required whenever `value` is set and `justification_mode = per_criterion` |

**Retired columns:** `stakeholder_group`, `session_id` (both moved to
`submissions`).

### topic_justifications — New. Owned/written by this tool. Anon has **no table-level access at all** — see `invitations` above.
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| submission_id | uuid, FK → submissions | `on delete cascade` |
| iro_id | uuid, FK → iros | `on delete cascade` |
| justification | text | required when `justification_mode = per_topic` |

Unique on `(submission_id, iro_id)` — one topic justification per topic per
submission.

### live_sessions, live_session_participants, attendance_edit_log — Owned by Tool B (Tier 3, live facilitation).
See product-spec.md Section 5 for full field definitions; created here as
part of the shared migration, RLS restricted to `authenticated` only.
`live_session_participants.stakeholder_member_id` (uuid, FK →
stakeholder_members, nullable, `on delete set null`) — **new, migration
`v2_add_stakeholder_member_id`** — same purpose as `invitations`' column
above: links a participant to the master map entry they were chosen from
or created as on the "Who participates" page.

### calibrations — Changed. Owned by Tool B.
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| cycle_id | uuid, FK → cycles | **new** |
| iro_id | uuid, FK → iros | |
| owner, moderator, notes | text | nullable |
| calibrated_value | numeric | nullable |
| band_value | integer | nullable, 1–5 |
| reviewed_with_owner | bool | **new**, default `false` |
| reviewed_with_owner_at | timestamptz | **new**, nullable |
| reviewed_with_owner_by | uuid, FK → auth.users, nullable | **new, migration `v2_add_reviewed_with_owner_by`** — spec v2.0 amended 9: "Sign off and Revoke record the logged-in user and time; editing clears it." `reviewed_with_owner`/`_at`/`_by` together *are* Sign off/Revoke now (the UI reads "Sign off"/"Revoke", not "Reviewed with owner") — never the retired `signed_off_by`/`signed_off_at` below. `saveCalibrationAdjustment`/`resetCalibrationToCalculated` clear all three when a signed-off IRO is edited. |
| calibrated_at | timestamptz | nullable |

**Retired columns:** `signed_off_by`, `signed_off_at` — never reference (CLAUDE.md). Cycle-level sign-off (`cycles.approver_name`/`approver_role`/`minutes_reference`/`signed_off_at`/`signed_off_recorded_by`) is also no longer read or written by this tool's UI as of amended 9 — no global stage banner or cycle-level sign-off in Calibrate & Results; those `cycles` columns stay in the schema, unused, same treatment as `cycles.stage`. `startCalibration`/`signOffCycle`/`revokeCycleSignOff`/`setRequireBothSources` (data.js) are dead code now — kept, not deleted, in case a future admin/report flow needs the same primitives.

### calibration_history — Unchanged. Owned by Tool B. Append-only.

### combined_ratings — Owned by Tool B, `authenticated`-only (confirmed `security_invoker=true` already set — RLS on the underlying tables is evaluated as the querying user, not the view owner, so the stray `anon` SELECT grant this view also carries can't actually read anything through it).
One row per **submitted** rating: `submission_id`, `cycle_id`, `assessment_id`,
`source`, `iro_id`, `criterion_key`, `value`, `justification` (the criterion's,
or the topic's when the mode is per topic, via `coalesce`), `stakeholder_group`,
`perspective`, `expertise_topics`, `invitation_id`, `live_session_id`.

### assessment_progress, group_engagement, iro_comments — New views. Owned by Tool B, `authenticated`-only. Section 8, Responses screen.
Added via migration `v2_responses_screen_views`, hardened by
`v2_responses_views_revoke_anon_and_security_invoker` — Supabase's default
public-schema privileges grant `anon` SELECT on any newly created view, and
a plain (non-`security_invoker`) view owned by `postgres` evaluates RLS
using the *owner's* privileges (a superuser, which bypasses RLS
entirely) — meaning without both fixes, `anon` could have read every row
in these views regardless of the underlying tables' RLS. Both migrations
explicitly set `security_invoker = true` and revoke `anon`'s SELECT; the
RLS matrix below only lists these three (and `combined_ratings`) under
"Authenticated user" — no anon row — which now matches the live grants.

- **assessment_progress** — raw counts only, one row per assessment:
  `assessment_id`, `cycle_id`, `type`, `status`, `start_date`, `end_date`,
  `invited_count`, `opened_count`, `saved_draft_count`, `submitted_count`
  (survey), `live_session_id`, `live_session_status`,
  `current_topic_index`, `expected_count`, `attended_count` (live
  session — `expected` = every participant ever added, `attended` = still
  active/non-removed; there's no per-sitting attendance, per CLAUDE.md's
  out-of-scope list, so this is the closest buildable proxy), `total_topics`,
  `topics_rated_count`. Status-label mapping (Draft/Scheduled/Active/
  Closed/Completed) stays a frontend concern, same as Assessment overview's
  existing `computeStatus()` — this view only supplies the ingredients.
- **group_engagement** — survey-side only (`invited`/`submitted` are
  invitation concepts): `assessment_id`, `stakeholder_group_id`,
  `group_name`, `group_type`, `invited_count`, `submitted_count`.
- **iro_comments** — every **submitted** per-criterion or per-topic
  justification tied to its IRO: `iro_id`, `assessment_id`, `source`,
  `stakeholder_group`, `expertise_topics`, `criterion_key` (null for a
  topic-level row), `value`, `comment`, `comment_type` (`criterion` /
  `topic`), `invitation_id`, `live_session_id`, `commented_at`. Never the
  invitee's name — the Responses screen's "Reveal name" does a separate,
  explicit `invitations.name` lookup by id when clicked. **Known
  simplification:** a submission's `overall_comment` isn't tied to one IRO
  and isn't included here — disclosed, not built this round.

**submissions/ratings/topic_justifications DELETE RLS — replaced.**
Migration `v2_delete_drafts_by_assessment_status` drops the three
cycle-stage-gated policies from an earlier session
(`v2_delete_drafts_in_calibrating_or_signed_off`) and replaces them with
assessment-status-gated ones, matching spec v2.0 amended 9 ("once the
assessment is Closed or Completed", not the retired cycle stage): Closed =
an `expert_survey` past its `end_date`; Completed = an
`expert_live_session` whose `live_sessions.status = 'finished'`. Draft
rows only, never submitted ones — same as before. `purgeUnfinishedDrafts`
(data.js) now takes an `assessmentId`, not a `cycleId` — "Delete unfinished
drafts" moved from the Calibrate & Results header to the Responses
screen's Expert survey panel, and is now scoped to that one assessment.

## RLS — full matrix (built this session, Tool A CLAUDE.md rules + Tool B spec Section 6)

**Anon (unauthenticated, public survey):**
| Table | Access |
|---|---|
| assessments, iros, clients, stakeholder_groups | SELECT, all columns, all rows (row-level scoping isn't possible without an auth identity — same accepted pattern as v1.1; data is non-sensitive display content, not a secret or personal data) |
| cycles | SELECT limited to columns `(id, esrs_version, stage, client_id)` via column grant — thresholds, sign-off/approver fields stay internal. `stage` and `client_id` were added in `v2_frontend_support` (needed for the closed-survey check and the client logo lookup) |
| invitations, submissions, ratings, topic_justifications | **No table-level access whatsoever** — no RLS policy, no grant, of any kind, for any operation. `migration 10` fixed a bug where these had `using (true)` SELECT policies (invitations narrowed only by a column grant, the other three not narrowed at all), which meant `link_code` — meant to be unguessable — was fully listable, and every expert's personal data was readable platform-wide. All anon access to these 4 tables now goes through the `SECURITY DEFINER` functions below, keyed by `link_code`: a value the caller must already hold as an input, never one that can be listed or enumerated from the table itself |
| stakeholder_members | **no access** — Tool A's CLAUDE.md read list never included this table; the v1.1 "anon select stakeholder_members" policy was dropped this session, not carried forward |
| topic_library, practice_settings, threshold_changes, live_sessions, live_session_participants, attendance_edit_log, calibrations, calibration_history | no access |
| All tables | **no DELETE ever** for anon, including inside the `SECURITY DEFINER` functions (they use `ON CONFLICT ... DO UPDATE`, never `DELETE`) |

**Authenticated (Tool B, magic-link login, one shared access level):** full
matrix per product-spec-tool-b-consultant-console.md Section 6 — SELECT/INSERT/UPDATE
on nearly everything, with DELETE gated by state (`clients` only if no cycles,
`cycles`/`assessments` only if no responses exist, `cycles` UPDATE blocked once
`stage = 'signed_off'`, `invitations` DELETE only before `opened_at`,
`live_sessions` DELETE only before `started_at`; `threshold_changes`,
`attendance_edit_log`, `calibration_history` are append-only — no
UPDATE/DELETE policy exists for any role).

> Every table has RLS enabled — confirmed via `list_tables`. Two migrations
> (`v2_drop_old_policies`, `v2_drop_old_calibration_policies`) were needed to
> clear v1.1 policy names before the new ones could be created — `apply_migration`
> runs each call in a transaction, so the one failed attempt rolled back cleanly
> with no partial state (verified via `pg_policies` before retrying).

## Functions added this session

All six below are `SECURITY DEFINER`, `SET search_path = public` (closes the
classic search-path-hijack hole on definer functions), `EXECUTE` revoked from
`PUBLIC` and granted explicitly to `anon`. Together they are the **entire**
anon access surface for `invitations`/`submissions`/`ratings`/
`topic_justifications` — the tables themselves have zero direct grants (see
the RLS matrix above), so a function's own `WHERE link_code = p_link_code`
(or a join through it) is the only thing scoping a caller to their own data.
`authenticated` can also call these (Supabase grants new function `EXECUTE`
to `authenticated` by default) but gains nothing from it — the authenticated
role already has full table access via its own broader RLS policies, so this
is redundant, not a new privilege.

- **lookup_invitation(p_link_code text) → table(id, assessment_id, status, submitted_at)** — the narrow lookup by link code. Returns zero or one row; never exposes `name`/`email`.
- **mark_invitation_opened(p_link_code text) → void** — bumps `invited → opened`; no-ops for any other status.
- **get_draft(p_link_code text) → jsonb** — returns `{submission, ratings, topic_justifications}` for the one invitation matching the code, or `null` if none/no draft yet.
- **create_draft(p_link_code, p_stakeholder_group, p_perspective, p_expertise_topics, p_expertise_explanation, p_title, p_basis_for_representation) → jsonb** — creates the one draft submission for that invitation (looks up `assessment_id` and sets `consent_given_at` server-side); raises if the invitation is invalid, already submitted, or already has a draft.
- **save_progress(p_link_code, p_current_topic_index, p_ratings, p_topic_justifications) → void** — best-effort draft upsert (see Build decisions on why this doesn't need the atomic guarantee); raises if the submission is no longer a draft.
- **submit_survey_response(p_link_code text, p_overall_comment text, p_ratings jsonb, p_topic_justifications jsonb) → uuid** — the only all-or-nothing write in the tool (product-spec.md: "written as one complete, all-or-nothing submission ... or nothing at all"). Upserts every rating row and topic justification, then marks the submission and invitation `submitted`. Raises if no draft exists or it's already submitted. Signature changed from `p_invitation_id uuid` in `migration 8`/`9` to `p_link_code text` in `migration 10` (the old overload was dropped) — the invitation id is no longer something the client needs to hold at all.

All six were functionally verified end to end against a fresh test
invitation (`link_code = a1b2c3d4e5f6a1b2c3d4e5f6`, created and then reset
back to a clean `invited` state afterward) via `execute_sql`: lookup on a
real and a bogus code, opened → draft → save → resume (`get_draft` round-
trips correctly) → submit → re-submit correctly rejected. Also confirmed via
`information_schema.role_table_grants`/`role_routine_grants` that `anon` has
zero grants on the 4 locked-down tables and exactly these 6 functions
executable.

## Retired functions, triggers and jobs
- `increment_respondents(uuid)` — dropped (was `SECURITY DEFINER`, callable by
  `anon`/`authenticated`, flagged by the security advisor pre-migration)
- `sync_ratings_to_assessor_ratings()` — dropped, along with the `pg_cron` job
  (`jobid 1`, `*/10 * * * *`) that called it every 10 minutes
- `cycle_public_info` view — created then immediately replaced in the same
  session: it used the `SECURITY DEFINER`-equivalent pattern (`security_invoker = false`)
  to expose `esrs_version` to anon, which the Supabase security linter flags at
  ERROR level (`security_definer_view`). Replaced with the column-grant pattern
  used everywhere else in this schema (see `cycles` above) — verified clean
  with `get_advisors` afterward (only the pre-existing, unrelated
  "leaked password protection disabled" Auth warning remains)

## Demo data (re-created this session, new structure)
- Client: **Acme Corp**
- Cycle: "Acme Corp DMA 2026", FY2026, `esrs_2023_amended`, stage `collecting`,
  thresholds 3.0/3.0
- Assessment: slug `acme-2026`, `type = expert_survey`,
  `justification_mode = per_criterion`, `mandatory = true`, `status = active`
- 10 IROs snapshotted from `topic_library` (all current master-library topics —
  a mix of `neg_impact`, `pos_impact`, `risk` and `opportunity` across E1, E2,
  E5, S1, S2, G1)
- 2 demo invitations, both placeholder names (GDPR-safe, not real people):
  - "Demo Expert", stakeholder group "Employees",
    `link_code = 33168bb608ca541d0a44a623` — used for a manual browser
    click-through this session (before the migration-10 security fix); now
    `submitted` and no longer usable for a fresh save/resume test
  - "Demo Expert 2", stakeholder group "Suppliers",
    `link_code = a1b2c3d4e5f6a1b2c3d4e5f6` — created to verify the new
    `SECURITY DEFINER` functions end to end (see Functions below), then
    reset back to a clean `invited` state; use this one for the next
    browser test of save/resume/submit
- `stakeholder_groups` (34 rows: 31 original + 3 new silent presets) and
  `stakeholder_members` (3 test rows: "k", "test", "s" — pre-existing test
  data, confirmed non-real before the migration) carried forward unchanged

## Tool B additions

### Storage — `logos` bucket (added Tool B session 2, 2026-09-20)
One public-read bucket holds both logo types named in CLAUDE.md's Storage
line (client, consultant) — no split by tool needed since both are
non-sensitive brand assets.
- `public = true` — required so Tool A's public survey can render the
  client logo (`clients.logo_url` is a public Storage URL); no other file
  in the bucket is sensitive either, so the whole bucket is public-read
  rather than scoping per-object.
- RLS on `storage.objects`, scoped to `bucket_id = 'logos'`: SELECT open to
  everyone (`public`, i.e. anon + authenticated); INSERT/UPDATE/DELETE
  restricted to `authenticated` (Tool B's one shared access level — no
  further scoping by uploader, consistent with every other authenticated
  policy in this schema).
- Path convention (enforced client-side, not by a storage policy):
  `clients/<client_id>/logo.<ext>` for client logos,
  `practice/logo.<ext>` for the consultant's own logo.
- Migration: `v2_logos_storage_bucket`.

### RLS fix — `cycles` Revoke sign-off (added Tool B session 2, 2026-09-20)
The `authenticated update cycles` policy from the v2.0 migration is
`USING (stage <> 'signed_off')` — once a cycle is signed off, **no** update
to that row passes RLS, including the sign-off revoke itself (spec Section
8: "revoking a sign-off returns the cycle to Calibrating"). Added a second,
OR'd permissive UPDATE policy, `authenticated revoke cycle sign-off`:
`USING (stage = 'signed_off') WITH CHECK (stage = 'calibrating')` — allows
exactly the `signed_off → calibrating` transition and nothing else about a
signed-off cycle. Migration: `v2_allow_cycle_revoke_signoff`.

### RLS — "Delete unfinished drafts" (resolved, builder decision 2026-09-20; **superseded 2026-09-23, part 17** — see below)
Section 8's Cycles and assessments overview specifies a manual "Delete
unfinished drafts" purge action, but Section 6's access matrix lists
`submissions` DELETE as **No** for every role, with no carve-out for
drafts, and no DELETE policy existed on `submissions`, `ratings` or
`topic_justifications`. Flagged as a spec contradiction earlier this
session rather than guessed at; the builder confirmed the feature should be
built, for drafts only. Originally gated on the owning cycle's `stage`
(`calibrating`/`signed_off`) — this stayed dormant once the cycle-level
stage banner was removed from the UI (part 17, below), since no assessment
was ever reaching a `stage`-gated cycle through the interface anymore.
**Replaced 2026-09-23 (part 17, Group B.8)** with assessment-status-gated
policies instead of cycle-stage — matches spec v2.0 amended 9 exactly
("once the assessment is Closed or Completed") and access-matrix.md rule
12. Current live policies, all requiring `status = 'draft'` and never
touching a submitted row:
- `authenticated delete draft submissions of closed or completed` on `submissions` — the assessment is Closed (`expert_survey`, `end_date` in the past) or Completed (`expert_live_session`, its `live_sessions.status = 'finished'`)
- `authenticated delete ratings of draft submissions closed or com` on `ratings` — same gate, joined via `submissions`/`assessments`
- `authenticated delete topic_justifications closed or completed` on `topic_justifications` — same gate

These three tables are shared with Tool A, but the policies are
`authenticated`-only (Tool B's own consultant login) and don't touch any
`anon` grant, policy or the tables' schema — outside the "never change
without going through Tool A" boundary in CLAUDE.md's Hard Rules. In
practice the app only ever calls the `submissions` delete directly
(`purgeUnfinishedDrafts` in `src/lib/data.js`, now scoped to one
assessment, not a whole cycle); `ratings`/`topic_justifications` cascade
automatically via their existing `on delete cascade` foreign keys, so
their own policies exist for completeness/direct access rather than
because the cascade needs them. Migration:
`v2_delete_drafts_by_assessment_status`.

## Access stage (2026-09-24, session 2 parts 21–26) — complete

Per docs/access-matrix.md and docs/user-stories.md (authoritative for
every role/table/policy — read those first, this is a schema log only).
Part 21 = Group 1 (schema delta, below). Part 23 = Group 2 (RLS policies,
documented further down this section) — every table's `authenticated`
policies were rewritten role-aware; no `anon` policy or grant was touched
anywhere (Tool A's public survey depends on those, per CLAUDE.md's Hard
Rules). Part 24 = Group 3 (Admin & Roles, plus the login gate and avatar
dropdown it needed). Part 25 = Group 4 (Profile). Part 26 = Group 5 (the
Half A refusal test — all 13 Section 6 rules run live). All five groups
are documented further down this section, in order. One UI-presentation
gap and one sandbox-tooling limitation are flagged in Group 5's write-up
— not silently marked done.

### team_members — New. Owned by Tool B. The people, and how a login finds its person.
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| auth_user_id | uuid, FK → auth.users, nullable | nullable until the person's first login; set by the trigger below |
| email | text, unique | the seed key — a row is created by email before the person ever logs in |
| name, phone_number, avatar_url, role_title | text, nullable | |
| access_level | text | `full` \| `signoff`, default `full`, checked |
| is_admin, is_owner, can_signoff_topics, can_signoff_results | bool | all default `false` |
| active | bool | default `true` |
| created_at, updated_at | timestamptz | default `now()` |

Seeded: Anika Lerch (`anikalerch@greenfriend.org`), `is_owner = true`,
`is_admin = true`, `access_level = 'full'`, `auth_user_id` still null until
she next signs in. Migration: `v3_access_team_members`.

### Audit columns — New, on `clients`, `topic_library`, `iros`, `stakeholder_groups`, `stakeholder_members`
`created_by`, `updated_by` (both FK → `team_members`, nullable — existing
rows unattributed), `updated_at` (timestamptz, default `now()`). Migration:
`v3_access_audit_columns`. `assessments` already had `created_by`/
`updated_at` from the v2.0 migration and wasn't in this list (no
`updated_by` added there — out of the user's stated scope this round).

### assessments — New: `iro_list_signed_off`, `iro_list_signed_off_by`, `iro_list_signed_off_at`
Bool default `false`, FK → `team_members` nullable, timestamptz nullable.
**Advisory only — this gate never blocks anything**, per spec v2.1: it
records that the topic selection was reviewed, nothing more. Migration:
`v3_access_iro_list_signoff`.

### cycles — New: `results_signed_off`, `results_signed_off_by`, `results_signed_off_at`
Bool default `false`, FK → `team_members` nullable, timestamptz nullable.
**A real locking gate**: once Group 2 lands, `calibrations.calibrated_value`/
`.band_value` for that cycle's IROs cannot be updated by anyone except
through an explicit, logged Revoke. **Deliberately new columns, not a
repurposing of the existing `signed_off_at`/`approver_name`/`approver_role`/
`minutes_reference`/`signed_off_recorded_by`** — despite
docs/access-matrix.md Section 5 and CLAUDE.md's own summary both saying
"repurpose the existing ... columns," the builder explicitly overrode that
in the instruction that started this stage: those columns are already
documented (Part 8/17 of this file's history, and PROGRESS.md) as retired
and staying unused, "same treatment as `cycles.stage`" — reusing them for
an unrelated new gate would contradict that. **Resolved 2026-09-24**:
docs/access-matrix.md and CLAUDE.md were both corrected on `main` (via a
direct upload, merged into this branch) to say "new columns, do not
repurpose" — no longer out of sync with what's actually built; the
flag above is kept as history, not a still-open item. Migration:
`v3_access_results_signoff`.

### Storage — `avatars` bucket (new, private — separate from the public-read `logos` bucket)
- `public = false` — unlike `logos`, no public tool ever needs an avatar
  without a login.
- RLS on `storage.objects`, scoped to `bucket_id = 'avatars'`: SELECT open
  to any `authenticated` user (needed to render any team member's avatar in
  the header everywhere, per access-matrix.md); INSERT/UPDATE/DELETE
  restricted to the uploader's own folder.
- Path convention, enforced by the policies themselves (not just
  client-side): `<auth.uid()>/avatar.<ext>` — `(storage.foldername(name))[1]
  = auth.uid()::text` in each policy's `USING`/`WITH CHECK`. **Implementation
  note**: access-matrix.md Section 5 describes this as "path scoped per
  `team_members.id`"; implemented instead as the auth identity's own
  `auth.uid()`, which is simpler (no subquery to `team_members` on every
  storage request) and behaviourally identical — `auth_user_id` uniquely
  maps to exactly one `team_members` row, so "my auth identity's folder"
  and "my team_members row's folder" are the same set of files for every
  real user. Flagged as an implementation-detail deviation, not a behaviour
  change.
- Migration: `v3_access_avatars_bucket`.

### Trigger — auth identity → team_members linking
`link_team_member_on_auth_signup()`, `SECURITY DEFINER`, fires
`AFTER INSERT ON auth.users`: matches the new identity's email to a
`team_members` row with a still-null `auth_user_id` and links it. No
match means no access — the app is responsible for checking for a linked
row and showing "No access yet — ask your Admin" (Group 3+ work; not yet
built as of this schema pass). Migration: `v3_access_auth_link_trigger`.

**Caught before it became a lockout**: Anika's `auth.users` row already
existed (created 2026-09-18, well before this migration) — the trigger
only fires on `INSERT`, so it would never fire for her; a returning
magic-link sign-in reuses the existing row, it doesn't insert a new one.
Backfilled her `team_members.auth_user_id` manually once, matching the
trigger's own logic (`where email = ... and auth_user_id is null`).
Confirmed linked. Migration: `v3_access_backfill_anika_link`. Anyone
whose `auth.users` row predates this migration needs the same one-time
backfill — not a concern going forward, since every *new* login from here
on is a genuine `INSERT` the trigger catches.

**Security check run after this migration** (same discipline as the
Responses-views finding in part 17): the Supabase advisor flagged
`link_team_member_on_auth_signup()` as callable directly via
`/rest/v1/rpc/...` by both `anon` and `authenticated` — Supabase's default
`GRANT EXECUTE` on every new `public` schema function. In practice a
`returns trigger` function can't be invoked this way (Postgres refuses it
outside a real trigger context — `NEW` is undefined), so this was never
actually exploitable, but the stray grant was revoked anyway for
cleanliness: `revoke execute on function
public.link_team_member_on_auth_signup() from anon, authenticated,
public;` — migration `v3_access_revoke_stray_grant`.

### Group 2 — RLS policies (2026-09-24, part 23)

**Two builder decisions this round resolved three access-matrix.md
internal contradictions** (Section 6 rule 2's blanket Sign-off-only read
grant disagreed with `topic_library`'s and `invitations`' own per-table
sections; `cycles` read was ungated in rule 2 but narrowly conditional in
its own section) — access-matrix.md Section 6 rule 2 is corrected in
place with a "resolved by builder 2026-09-24" note; nothing here
duplicates that, see the doc itself.

**Helper functions** (all `SET search_path = public`, all revoked from
`anon`/`public`, granted only to `authenticated`):
- `tm_active_row()` — `SECURITY DEFINER`, `STABLE`; the one function that
  actually reads `team_members`, bypassing its own RLS to do so (the
  standard Supabase pattern for a role table whose policies would
  otherwise need to read itself to evaluate). Returns the caller's own
  row via `auth_user_id = auth.uid()`, or nothing.
- `is_full_access()`, `is_signoff_only()`, `can_signoff_topics()`,
  `can_signoff_results()`, `is_owner_user()`, `is_admin_user()`,
  `current_team_member_id()` — thin `SECURITY INVOKER` wrappers over
  `tm_active_row()`, each returning a single boolean/uuid. Used directly
  inside every policy below instead of repeating the same subquery.

**Every table's `authenticated` policies were dropped and rebuilt**
role-aware (no `anon` policy, grant, or the tables' schema touched
anywhere — same boundary as always). Shape, table by table:
- **clients, practice_settings, topic_library, stakeholder_groups,
  stakeholder_members**: `is_full_access()` only, every action. Sign-off
  only has no access to any of these five — confirmed against the
  per-table sections, not the (now-corrected) rule 2.
- **assessments, iros**: read = `is_full_access() OR is_signoff_only()`;
  every write = `is_full_access()` only. `iros` DELETE gains the "only if
  the assessment has no responses" guard access-matrix.md always
  specified but the live policy never actually had (`qual` was bare
  `true`) — builder-confirmed fix, verified live (below).
- **cycles**: read = `is_full_access() OR can_signoff_results()` —
  narrower than every other table Sign-off only can see; holding only
  `can_signoff_topics` grants no `cycles` access at all, confirmed by the
  builder rather than widened for convenience. Every write =
  `is_full_access()` only. The old cycle-stage-gated policies from the
  pre-restore build (`authenticated update cycles`, `... revoke cycle
  sign-off`) are dropped, not just superseded — `cycles.stage` stays
  unused, no reason to leave dead rules referencing it.
- **calibrations**: read = `is_full_access() OR is_signoff_only()` (any
  permission, or none — this table alone grants Sign-off only read
  regardless, per its own section). Write (RLS) = `is_full_access()`
  only. The finer rule — `calibrated_value`/`band_value` locked while the
  cycle's `results_signed_off` is true, `owner`/`moderator`/`notes`/
  `reviewed_with_owner` never locked — is column-level, which
  `USING`/`WITH CHECK` can't express (they see the whole row, not which
  columns changed); enforced instead by a `BEFORE UPDATE` trigger,
  `enforce_results_signoff_lock()`, comparing `OLD`/`NEW` and raising only
  when a locked column actually changed while the flag is set.
- **calibration_history, threshold_changes**: `is_full_access()` only,
  read and the (still app-level, not a real trigger — see the "Delete
  unfinished drafts" precedent above for the same reasoning) insert.
  Sign-off only has no access to either — `calibration_history`'s own
  section says so explicitly, unlike `calibrations` itself.
- **invitations**: read = `is_full_access()` only (builder decision — no
  Sign-off-only access at all, GDPR rationale in the per-table section).
  Write = `is_full_access() AND opened_at IS NULL` for everything general
  (status, mark sent, etc.); the one exception — anonymising after the
  fact, which by definition happens once someone has already
  opened/responded — is the dedicated `anonymise_invitation()` function
  below, never the general policy.
- **submissions**: read = `is_full_access() OR is_signoff_only()`. Write
  (general) = `is_full_access() AND status = 'draft'` — **this is the
  fixed gap**: the live policy was previously just `true`, meaning a
  submitted response's content was never actually frozen in the database
  despite CLAUDE.md's Hard Rule saying it must be; verified live (below).
  The one exception — clearing a respondent's self-entered `title` on a
  GDPR request, alongside `invitations.name`/`email` — is
  `anonymise_submission_title()`, never the general policy.
- **ratings, topic_justifications**: read = `is_full_access() OR
  is_signoff_only()`; write keeps each row's existing (already-correct)
  "parent submission is still a draft" check, with `is_full_access()`
  added on top.
- **live_sessions, live_session_participants, attendance_edit_log**: read
  = `is_full_access() OR is_signoff_only()` ("session results, as part of
  Assessments/Responses"); every write = `is_full_access()` only.
- **team_members**: read = `is_full_access()` (all rows) OR
  `auth_user_id = auth.uid()` (own row — this is how Sign-off only's "own
  row only" actually resolves, since they fail the first clause). INSERT
  (add a row for an already-invited email) = `is_owner_user() OR
  is_admin_user()`. No DELETE policy at all — deactivate, never delete.
  UPDATE is deliberately broad at the RLS layer (`is_full_access() OR
  auth_user_id = auth.uid()`, so either "any row" or "my own row" can be
  attempted) because RLS can't see which columns an UPDATE actually
  touches — the real rules (rules 8/9 and CLAUDE.md's Hard Rules) are
  column-level and enforced by a second `BEFORE UPDATE` trigger,
  `enforce_team_members_protections()`: `is_owner` is never changeable by
  anyone through the app; `is_admin` and `active` are never changeable by
  the row's own owner (even the Tool Owner acting on herself); `is_admin`
  is only changeable by the Tool Owner; `access_level`/`can_signoff_*`/
  `role_title`/`active` are only changeable by Tool Owner or Admin.

**New functions**, all `SECURITY DEFINER`, `SET search_path = public`,
revoked from `anon`/`public`, granted only to `authenticated`, each
checking the caller's own authorization internally and raising if it
fails (same pattern as Tool A's six link-code functions):
`sign_off_assessment_topics(p_assessment_id)`,
`sign_off_cycle_results(p_cycle_id)`, `anonymise_invitation(p_invitation_id)`,
`anonymise_submission_title(p_submission_id)`. Revoke of a results
sign-off is deliberately **not** a function — it only ever goes through
`cycles`' general `is_full_access()`-only UPDATE policy, so Sign-off only
can never revoke (access-matrix.md rule 6), by construction rather than
an extra check.

**Verified live, not just read back from the migration SQL** — genuine
RLS simulation via `set local role authenticated` +
`request.jwt.claims`, each inside a rolled-back transaction so nothing
persisted:
- Anika's session: `is_full_access()` true, reads all rows of
  `topic_library`/`clients`/`team_members`.
- An unrecognised identity (a random UUID with no `team_members` row):
  `is_full_access()`/`is_signoff_only()` both false, zero rows back from
  `topic_library`/`team_members`/`calibrations`.
- Attempted to edit a **submitted** submission's `overall_comment` as
  Anika: 0 rows affected — the frozen-once-submitted fix genuinely blocks
  it, not just in theory.
- Temporarily set a real cycle's `results_signed_off = true` (inside the
  same rolled-back transaction): attempting to change that cycle's
  calibration's `calibrated_value` raised
  `enforce_results_signoff_lock()`'s exception exactly as written;
  updating its `notes` in the same locked state succeeded, confirming the
  advisory fields are never locked.
- Attempted to delete a real IRO belonging to an assessment that has
  submissions: blocked, still exists afterward. Attempted to delete a
  real IRO belonging to an assessment with **no** submissions (the
  builder's requested test for the Review & Customise flow): succeeded —
  the new guard protects exactly the case it's meant to and doesn't touch
  the common case (removing a topic before anyone has responded).

**Security check after this migration**: `get_advisors` flagged all nine
new helper/trigger functions for a mutable `search_path` (WARN) — fixed
immediately with `alter function ... set search_path = public` on each
(migration `v3_access_fix_search_path`), re-checked clean. The remaining
`authenticated_security_definer_function_executable` findings on the five
new functions are expected, same as Tool A's six — each is meant to be
authenticated-callable and checks the caller's own authorization
internally.

Migrations, in order: `v3_access_rls_clients_practice_stakeholders_topics`,
`v3_access_rls_assessments_iros`, `v3_access_rls_cycles`,
`v3_access_rls_calibrations`, `v3_access_rls_threshold_changes`,
`v3_access_rls_invitations`, `v3_access_rls_submissions`,
`v3_access_rls_live_sessions`, `v3_access_rls_team_members`,
`v3_access_fix_search_path`.

Group 5 (the formal Half A refusal test) is documented further down —
see "Group 5 — the refusal test, Half A" below. The access stage is
complete as of part 26.

### Group 3 — Settings → Admin & Roles (2026-09-24, part 24)

**Real gap found and fixed before building the screen**: access-matrix.md's
`team_members` per-table section (Section 1.2) says `name`/`phone_number`/
`avatar_url` are editable on **own row only**, for every role including Tool
Owner/Admin — but Group 2's `update team_members` RLS policy
(`is_full_access() OR auth_user_id = auth.uid()`) lets any full-access user
attempt an UPDATE on *any* row, and `enforce_team_members_protections()`
only guarded `is_owner`/`is_admin`/`active`/`access_level`/`can_signoff_*`/
`role_title` — leaving `name`/`phone_number`/`avatar_url`/`email` on another
person's row writable by any Owner/Admin/Full-access caller, contradicting
the matrix outright (not an ambiguous reading — the table is explicit).
Fixed via `v3_access_team_members_own_row_fields_and_email_lock`
(`create or replace function` on the same trigger, additive — no new
trigger, no RLS change): two new guards ahead of the existing ones — `email`
can never be changed through the app by anyone (it must keep matching the
Supabase Auth identity the auth-link trigger matches against — no per-table
row says otherwise, and every existing UI/data.js path already treats it as
immutable); `name`/`phone_number`/`avatar_url` can only change on the
caller's own row (`old.auth_user_id = auth.uid()`), regardless of role.

**Verified live**, same rolled-back-transaction impersonation pattern as
Group 2: Anika (full access) editing her own `name`/`phone_number` — allowed;
Anika attempting the same on a second, temporary `team_members` row —
blocked by the new guard; Anika attempting to change her own `email` — blocked.
Further checks built for this screen specifically, using temporary
`auth.users` rows created and rolled back inside the same transaction (this
project has no other real Auth identity yet to test against): a full-access,
non-admin caller attempting to INSERT a new `team_members` row — blocked by
the `create team_members` policy (`is_owner_user() OR is_admin_user()`); the
same caller attempting to self-grant `is_admin` — blocked by the existing
self-change guard; attempting to grant `is_admin` to a *different* row —
blocked (`Only the Tool Owner can grant or revoke Admin`); a Sign-off-only
caller's `SELECT` on `team_members` — returns only their own row, confirming
the `read team_members` policy's `own row` branch. Positive paths: an Admin
(not Owner) successfully creating a new team member and setting another
row's `access_level`/`can_signoff_results` — allowed, matching the matrix's
"Admin: yes" cells — while the same Admin's attempt to grant `is_admin` to
that row, or deactivate their own, are both blocked. `get_advisors` (security)
re-run clean — no new findings from this one function replacement.

**Built (frontend, no other schema change this part):**
- `src/lib/data.js` — `fetchOwnTeamMember`, `listTeamMembers`,
  `updateOwnProfile`, `uploadAvatar`, `createTeamMember`,
  `updateTeamMemberAccess`, `updateTeamMemberAdmin`,
  `updateTeamMemberActive`. `avatar_url` stores the storage **path**, not a
  URL — the `avatars` bucket is private (unlike the public-read `logos`
  bucket), so every read resolves stored paths to a fresh signed URL
  (`createSignedUrls`, batched; 7-day expiry, self-healing on next read).
- `App.jsx` — the login gate CLAUDE.md's Hard Rule requires: fetches the
  caller's own `team_members` row once the session resolves; `null` (no row)
  or `active: false` renders `NoAccessScreen.jsx` ("No access yet — ask your
  Admin" / "Access deactivated") instead of the app shell, sign-out only.
  This is the piece that makes every role/table boundary Group 2 built
  actually reachable through the UI, not just enforceable at the API.
- `SettingsMenu.jsx` — replaces the sidebar's plain email-and-sign-out block
  with an avatar dropdown (Profile · Admin & Roles, shown only for Tool
  Owner/Admin · Sign out) — Settings is not a left-rail nav item, per
  instruction. The "Profile" entry is wired but its screen isn't built yet
  (placeholder text) — that's Group 4.
- `AdminRolesTab.jsx` — the Tool Owner/Admin-only team table: search, a
  role/permission legend, "+ New team member" (email/name/role
  title/access level, with the two sign-off checkboxes only for Sign-off
  only), and per-row editable access level, sign-off permissions, role
  title, an Admin toggle (locked with a tooltip for Admin viewers, for the
  Owner's own row, and for anyone's own row — matching the trigger), and an
  Active toggle (locked on one's own row) — deactivate only, no delete path
  anywhere in this screen, per CLAUDE.md. Also refuses at the component
  level for a non-Owner/Admin caller who somehow reaches the route (defense
  in depth — the underlying `read team_members` RLS does allow any
  full-access caller to read all rows, so the *screen-level* refusal for
  plain Full-access carries real weight here, not just cosmetic hiding).

**Known gap, flagged rather than built**: access-matrix.md's people table
lists Sign-off only's screens as Topics/Assessments/Responses/Calibrate &
Results (read-only, with Dashboard/Report "locked, not just hidden"), and
user-stories.md's Topics story describes a Sign-off-only reviewer opening
"Topics" to read and sign off "this round's topic selection" — which, per
the Group 2 resolution, actually means the assessment's own `iros` (Review &
Customise's output, `assessments.iro_list_signed_off`), not the master
`topic_library` admin screen (`TopicsTab.jsx`) Sign-off only has no access
to at all. None of that role-gated nav visibility or read-only rendering for
the other five screens (Dashboard/Stakeholders/Topics/Assessments/
Responses/Calibrate & Results/Report) was built this part — it isn't one of
the five access-stage groups as scoped (Group 3 is Admin & Roles only,
Group 4 is Profile + the avatar dropdown), it would touch nearly every
existing screen, and Sign-off only's own Half B screen test is already
on record as deferred with no named holder. The database-layer refusal is
real regardless (Group 2's RLS already returns zero rows from
`topic_library`/`assessment_progress`/`group_engagement` etc. to a
Sign-off-only caller) — only the UI's *presentation* of that refusal (hiding
nav items, a stated "locked" message instead of a silently empty screen) is
outstanding. Flagged for a builder decision: fold this into Group 5, add it
as an explicit Group 6, or leave it until a named Sign-off-only holder
exists and Half B is unblocked anyway.

### Group 4 — Settings → Profile (2026-09-24, part 25)

No schema or RLS change — reuses Group 3's `fetchOwnTeamMember`,
`updateOwnProfile` and `uploadAvatar` (already built and already verified
live in part 24) and Group 1's private `avatars` bucket, whose storage
policies were re-confirmed this part (`storage.objects`, `avatars own
insert/update/delete/read any` — all four scoped to `{authenticated}`
only, path check `(storage.foldername(name))[1] = auth.uid()::text`,
matching `uploadAvatar`'s `${authUserId}/avatar.${ext}` path exactly) —
no live file upload was exercised (this sandbox has no browser), but the
policy shape leaves nothing to guess at.

**Built:** `ProfileTab.jsx` — avatar upload/change (reusing
`uploadAvatar`), Edit/Save for name and phone number (own row only, per
the part-24 fix), email displayed but never editable, role title
displayed but not editable here (only Owner/Admin can set it, via Admin &
Roles — matches the matrix's own-row exception list, which excludes
`role_title`), member since (`created_at`), and a read-only access-level
line in plain language: for Full access, whether the caller is also Tool
Owner or Admin and what that adds; for Sign-off only, exactly which of
`can_signoff_topics`/`can_signoff_results` they hold, or a note that
neither is granted yet. Wired into the `SettingsMenu.jsx` dropdown's
already-existing "Profile" entry (`App.jsx`, `tab === 'profile'`),
replacing the part-24 placeholder — the Settings avatar dropdown is now
feature-complete for both entries.

Every role reaches Profile (no nav gating needed — it's already
behind the avatar dropdown, not a left-rail item, and every role is
allowed to edit their own name/phone/photo).

### Group 5 — the refusal test, Half A (2026-09-24, part 26)

Ran every rule in Section 6 of docs/access-matrix.md (all 13) and every
row of docs/user-stories.md's "Stories that are refusals" table (all 11)
live against the real database, closing every remaining "pending — no
named holder" item by building temporary but real Sign-off-only,
plain Full-access and Admin identities (throwaway `auth.users` +
`team_members` rows, inserted and impersonated inside the same
rolled-back transaction — this project has no other real Auth identity).
No schema, RLS or frontend change — verification only. The full
rule-by-rule table and the exact test methodology are in PROGRESS.md's
part 26 (Last session) — not duplicated here to avoid drift between two
copies of the same table; this section is the pointer.

**Two items explicitly not "pass, fully verified":**
- Rule 7 (Dashboard/Report refused to Sign-off only) passes at the data
  layer (confirmed zero rows from `topic_library`/`threshold_changes`/
  `calibration_history`) but not yet at the UI layer — no nav hiding or
  stated refusal message exists for this role across most screens. See
  part 24's original flag.
- Rule 13 (avatars bucket, live cross-account delete) — the policy
  definition is confirmed correct, but a live delete test isn't possible
  from this sandbox: Supabase's storage schema refuses **any** direct SQL
  `DELETE` on `storage.objects`, regardless of caller ("Direct deletion
  from storage tables is not allowed. Use the Storage API instead.") —
  needs the real Storage API (browser or authenticated REST) to finish.

**This closes the five-group access stage.** Half B (a named Sign-off-only
person's own screen test) remains explicitly deferred — no named holder
exists yet.

## Notes
  this environment's proxy policy (confirmed via `curl -v` — `CONNECT tunnel
  failed, response 403`; same restriction noted in earlier sessions for
  click-testing). RLS/grants were verified via Supabase MCP `execute_sql`
  (which runs server-side, not through the sandboxed network) rather than a
  live REST call with the anon key. A real click-through still needs a Netlify
  deploy preview or a browser outside this sandbox, same as before.
- Builder must still upgrade to Pro before real client use if the accepted
  Free-plan risk (link breakage during a pause) becomes unacceptable — no
  change to that decision this session.

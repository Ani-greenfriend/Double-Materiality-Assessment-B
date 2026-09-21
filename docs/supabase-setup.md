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

### RLS — "Delete unfinished drafts" (resolved, builder decision 2026-09-20)
Section 8's Cycles and assessments overview specifies a manual "Delete
unfinished drafts" purge action, but Section 6's access matrix lists
`submissions` DELETE as **No** for every role, with no carve-out for
drafts, and no DELETE policy existed on `submissions`, `ratings` or
`topic_justifications`. Flagged as a spec contradiction earlier this
session rather than guessed at; the builder confirmed the feature should be
built, for drafts only. Added three narrow DELETE policies, all requiring
`status = 'draft'` on the submission and the owning cycle's `stage` to be
`calibrating` or `signed_off` — submitted rows are never covered by any of
them, matching Section 7's immutability rule for submitted responses:
- `authenticated delete draft submissions in calibrating or signed off cycles` on `submissions`
- `authenticated delete ratings of draft submissions in calibrating or signed off cycles` on `ratings`
- `authenticated delete topic_justifications of draft submissions in calibrating or signed off cycles` on `topic_justifications`

These three tables are shared with Tool A, but the policies are
`authenticated`-only (Tool B's own consultant login) and don't touch any
`anon` grant, policy or the tables' schema — outside the "never change
without going through Tool A" boundary in CLAUDE.md's Hard Rules. In
practice the app only ever calls the `submissions` delete directly
(`purgeUnfinishedDrafts` in `src/lib/data.js`); `ratings`/
`topic_justifications` cascade automatically via their existing `on delete
cascade` foreign keys, so their own policies exist for completeness/direct
access rather than because the cascade needs them. Migration:
`v2_delete_drafts_in_calibrating_or_signed_off`.

## Notes
- Network egress from the Claude Code sandbox to `*.supabase.co` is blocked by
  this environment's proxy policy (confirmed via `curl -v` — `CONNECT tunnel
  failed, response 403`; same restriction noted in earlier sessions for
  click-testing). RLS/grants were verified via Supabase MCP `execute_sql`
  (which runs server-side, not through the sandboxed network) rather than a
  live REST call with the anon key. A real click-through still needs a Netlify
  deploy preview or a browser outside this sandbox, same as before.
- Builder must still upgrade to Pro before real client use if the accepted
  Free-plan risk (link breakage during a pause) becomes unacceptable — no
  change to that decision this session.

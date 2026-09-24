# Access Matrix — Apus DMA (Consultant Console + Expert Survey, shared database)

**Written against:** product-spec.md (Tool B) v2.0 amended 9 · product-spec.md (Tool A) v2.0 (amended) · supabase-setup.md as of 2026-09-20 (Tool A session 5, v2.0 shared migration) — **flagged as possibly stale**: this file predates the PR #5 restore work (Dashboard, Stakeholders, Topics, wizard, Calibrate & Results, Report builder) and the correction that moved calibration sign-off from cycle-level to per-IRO. Where this matrix and the real, current schema disagree, **the real schema wins** — re-run this skill's confirmation once a fresh supabase-setup.md is available.
**Population pattern:** P1-variant, stack (see Section 1.1)
**Date:** 23 September 2026
**Author:** Anika (greenfriend)
**Status:** Confirmed
**Companion file:** user-stories.md

> The source of truth for who may do what. The Project Governor lifts Section 7 into
> CLAUDE.md for both tools. Claude Code builds the login and every line of Section 6 with
> the mechanism that line names (an RLS policy, a trigger, a narrow function, a bucket
> policy, or the screen) in the same pass. The screen test as each named person triggers
> every `no` and every `own` in Section 1. The handover ships this file unchanged.
>
> Every cell names a real table and one of the seven actions. A screen or route is never a
> cell; screen refusals live in user-stories.md and are enforced through the tables behind
> the screen. Export never exceeds read.

---

## 1. The matrix

Legend: `yes` = all rows · `own` = rows the role owns (definition in Section 2) · `no` =
refused, in the database, not only in the screen · `—` = not applicable to this table.

### 1.1 — Population pattern: what "anon" already is (Tool A, built and verified)

This is a stack: Tool A (the public Expert Survey) and Tool B (the Consultant Console)
share one Supabase project. One matrix, because one database. Tool A's own anon
access was designed and built before this skill ran on it formally, so this section
records what already exists rather than proposing it fresh — it is close to the skill's
P1 pattern but broader in one respect, and that deviation is deliberate and accepted:

| Anon can | On |
|---|---|
| **Read, all rows, all columns** — no link-code needed | `assessments`, `iros`, `clients`, `stakeholder_groups` — display content for rendering the survey before an invitation is resolved (topic names, welcome text, client name/logo, group names). **Accepted deviation from strict P1**, flagged in the spec since single-client testing: none of this is a secret or personal data, but it is not scoped per invitation either. Route these reads through link-code functions too before a second client is onboarded. |
| **Read, columns limited to `(id, esrs_version, stage, client_id)`** | `cycles` — via a column grant, not a policy; thresholds, sign-off and approver fields stay internal |
| **Create and update, scoped to their own draft, only through six `SECURITY DEFINER` functions keyed by `link_code`** (`lookup_invitation`, `mark_invitation_opened`, `get_draft`, `create_draft`, `save_progress`, `submit_survey_response`) | `invitations`, `submissions`, `ratings`, `topic_justifications` — **no table-level access whatsoever** otherwise; a function's own `WHERE link_code = ...` is the only thing that scopes a caller to their own data. `link_code` is a value the caller must already hold, never one that can be listed. |
| **Nothing** | `stakeholder_members`, `topic_library`, `practice_settings`, `threshold_changes`, `live_sessions`, `live_session_participants`, `attendance_edit_log`, `calibrations`, `calibration_history`, `team_members` |
| **Never** | delete, on anything, anywhere — including inside the functions (`ON CONFLICT ... DO UPDATE`, never `DELETE`) |

This is final and already verified end to end (see supabase-setup.md's "Functions added
this session"). It does not change in this run; Section 1.2 onward covers Tool B, the
authenticated side, freshly.

### 1.2 — The four roles (Tool B, authenticated)

Three of the four roles — **Tool Owner, Admin, Full access** — have **identical**
read/write access to every workflow table. What separates them is entirely on
`team_members` (Section 1.2.9) and which screens render (Section 6, user-stories.md).
**Sign-off only** is genuinely different: read-only everywhere it can see at all, with
exactly two narrow writes gated by two independent permissions.

Where a table's column below reads the same for Tool Owner / Admin / Full access, they
are written together as **"Owner/Admin/Full"**.

### clients

| Action | Owner/Admin/Full | Sign-off only |
|---|---|---|
| create | yes | no |
| read | yes | no |
| update | yes | no |
| delete | only if the client has no cycles | no |

### practice_settings (one row)

| Action | Owner/Admin/Full | Sign-off only |
|---|---|---|
| read | yes | no |
| update | yes | no |

### cycles

| Action | Owner/Admin/Full | Sign-off only (`can_signoff_results`) | Sign-off only (no permission) |
|---|---|---|---|
| create | yes | no | no |
| read | yes | yes | no |
| update (thresholds, name, etc.) | yes, blocked on calibration-affecting fields while `results_signed_off = true` for that cycle (see calibrations below) | no | no |
| change state → `results_signed_off` | yes | **yes — the one write this permission grants** | no |
| change state → revoke `results_signed_off` | yes | no | no |
| delete | only if the cycle has no responses | no | no |

`results_signed_off` is the real lock: while true, **`calibrations.calibrated_value` and
`.band_value` for that cycle's IROs cannot be updated** by anyone except through a Revoke.
Revoking is logged (who, when) exactly like every other calibration action.

### threshold_changes (append-only)

| Action | Owner/Admin/Full | Sign-off only |
|---|---|---|
| read | yes | no |
| write | trigger only (fired by a threshold update) | — |

### assessments

| Action | Owner/Admin/Full | Sign-off only (`can_signoff_topics`) | Sign-off only (no permission) |
|---|---|---|---|
| create | yes | no | no |
| read | yes | yes | no |
| update | yes; editing the topic selection auto-clears `iro_list_signed_off` if set | no | no |
| change state → `iro_list_signed_off` | yes | **yes — the one write this permission grants** | no |
| delete | only if the assessment has no responses | no | no |

`iro_list_signed_off` is **advisory only** — it does not block starting or continuing an
assessment, per the earlier confirmed decision. This is a deliberate exception to the
frozen-row default in Section 7 rule 3.

### topic_library

| Action | Owner/Admin/Full | Sign-off only |
|---|---|---|
| create (incl. CSV upload) | yes | no |
| read | yes | no |
| update | yes; editing a signed-off entry clears its own `signed_off_by`/`signed_off_at` (a second, separate sign-off from the two v2.1 gates above — this one is per library entry, always editable, never a lock) | no |
| change state → signed off / revoked | yes | no |
| delete | only if no `iros` snapshot references it | no |

### iros (per-assessment snapshot)

| Action | Owner/Admin/Full | Sign-off only |
|---|---|---|
| create (via assessment setup, from topic_library) | yes | no |
| read | yes | yes (as part of Assessment/Topics visibility) |
| update | yes | no |
| delete | only if the assessment has no responses | no |

### stakeholder_groups

| Action | Owner/Admin/Full | Sign-off only |
|---|---|---|
| create (incl. marking `type = 'silent'`) | yes | no |
| read (active, for new choices) | yes | no |
| read (a deactivated group an existing record references) | yes | no |
| update (rename) | yes, only if never used in an invitation/participant | no |
| deactivate | yes | no |
| delete | no | no |

### stakeholder_members

| Action | Owner/Admin/Full | Sign-off only |
|---|---|---|
| create | yes | no |
| read | yes | no |
| update | yes | no |
| delete | no — deactivate pattern not currently modelled; treat as a later-list item if removal is ever needed | no |

### invitations

| Action | Owner/Admin/Full | Sign-off only |
|---|---|---|
| create | yes | no |
| read | yes | no — sign-off-only sees responses (submissions/ratings), never the invitee's name/email |
| update (status, mark sent) | yes, before `opened_at` for most fields | no |
| change state → anonymised (GDPR) | yes | no |
| delete | only before `opened_at` | no |

### submissions

| Action | Owner/Admin/Full | Sign-off only |
|---|---|---|
| create (live session; also the "Enter expert responses" grid, `entered_by` set) | yes | no |
| read | yes | yes, read-only |
| update (while `status = draft`) | yes | no |
| update (once `status = submitted`) | no — frozen; only the anonymise action on the linked invitation touches personal fields | no |
| change state → submitted | yes | no |
| delete (drafts only, "Delete unfinished drafts") | yes, only when `status = draft` **and** the assessment is Closed or Completed; never a submitted row | no |

### ratings, topic_justifications

Follow their parent `submissions` row exactly: writable while the submission is a draft,
frozen once submitted, readable by Owner/Admin/Full always and by Sign-off only as part of
read-only Assessment/Responses visibility.

### live_sessions, live_session_participants, attendance_edit_log

| Action | Owner/Admin/Full | Sign-off only |
|---|---|---|
| create | yes | no |
| read | yes | yes (session results, as part of Assessments/Responses) |
| update (participants: add/edit/soft-remove, logged) | yes | no |
| update (session: pause/resume/finish) | yes | no |
| delete (session only, before `started_at`) | yes | no |

### calibrations

| Action | Owner/Admin/Full | Sign-off only (`can_signoff_results`) | Sign-off only (no permission) |
|---|---|---|---|
| create | automatic, one row per IRO | — | — |
| read | yes | yes | yes (read-only, as part of Calibrate visibility) |
| update (`calibrated_value`, `band_value`) | yes, **refused while the cycle's `results_signed_off = true`** | no | no |
| update (`owner`, `moderator`, `notes`, `reviewed_with_owner`) | yes, always — this is the per-entry advisory flag, never a lock | no | no |
| delete | no | no | no |

### calibration_history (append-only)

| Action | Owner/Admin/Full | Sign-off only |
|---|---|---|
| read | yes | no |
| write | trigger only (fired by every calibration change) | — |

### team_members

| Action | Tool Owner | Admin | Full access | Sign-off only (own row) |
|---|---|---|---|---|
| read | all rows | all rows | all rows | own row only |
| update (`name`, `phone_number`, `avatar_url` — own row) | own | own | own | own |
| update (`access_level`, `can_signoff_topics`, `can_signoff_results`, `role_title` — any row) | yes | yes | no | no |
| update (`is_admin`) | yes | **no** | no | no |
| update (`is_owner`) | no — set once, at project creation, never changed in-app | no | no | no |
| create (add a row for an already-invited Supabase Auth email) | yes | yes | no | no |
| delete | no — deactivate (`active = false`) instead | as above | no | no |

**First-login-with-no-row:** a Supabase Auth identity with no matching `team_members` row
sees a plain "No access yet — ask your Admin" screen and reaches nothing. This is the
default-deny the skill expects, made explicit because it is the one place a missing row
could silently grant broad access if built carelessly.

### avatars (storage bucket, new)

Private, authenticated-only. Separate from the existing public-read `logos` bucket (Tool
A's survey needs the client logo without a login; avatars never need to be public).

| Action | Any authenticated team_member | anon |
|---|---|---|
| upload | own avatar only | no |
| read | any team_member's avatar (needed to render the header everywhere) | no |
| delete | own avatar only | no |

---

## 2. Ownership

Most tables in this tool are **not** individually owned — this is one consultancy running
one client's assessment, and every Owner/Admin/Full-access person sees and edits the same
data. There is no "my cycle" vs. "someone else's cycle." The one table where ownership in
the usual sense applies is `team_members`, and `submissions` has a narrower, structural
version of it (tied to an invitation or a live session, not to a Tool B user).

- **team_members**: a row belongs to the person in `auth_user_id`. A person owns their own
  `name`, `phone_number`, `avatar_url`. Ownership never changes.
- **submissions**: belongs structurally to its `invitation_id` (survey) or `live_session_id`
  (live session) — not to any Tool B user. "Own" in the matrix above for Sign-off only means
  "read-only regardless of which invitation/session," since no Tool B user creates these on
  their own account.
- **avatars**: a file belongs to the `team_members` row that uploaded it (path keyed by
  `team_member_id` or `auth_user_id`).
- **Every other table**: organisation-wide. Owner/Admin/Full access is one shared level for
  data purposes; what differs between those three is `team_members` management rights only.

---

## 3. The people

| Role | Named first holder | Layer | Screens |
|---|---|---|---|
| Tool Owner | Anika Lerch, anikalerch@greenfriend.org | business + app admin, superset | everything, incl. Settings → Admin & Roles |
| Admin | *(none yet — Anika covers this today as Tool Owner)* | business + app admin | everything, incl. Settings → Admin & Roles |
| Full access | *(none yet — Anika covers this today as Tool Owner)* | business | everything except Settings → Admin & Roles |
| Sign-off only | *(no named holder yet)* — two independent permissions, `can_signoff_topics` and `can_signoff_results`, assignable separately | business, restricted | Topics (read + conditional sign-off), Assessments (read), Responses (read), Calibrate & Results (read + conditional sign-off). **Dashboard and Report are locked, not just hidden from nav.** |
| platform owner | Anika Lerch | outside the app | Supabase, Netlify |

Admin actions, fixed: invite (add a row for an already-Auth-invited email) and deactivate
team_members · maintain the lists (topic_library, stakeholder_groups) · withdraw/anonymise
a record (invitations) · read everything. Only Tool Owner may additionally grant or revoke
`is_admin`. Admin is not exempt from Section 7 rule 3 where it applies (submissions, once
submitted, are frozen for Admin too).

This is a stack: the public-facing tool (Apus DMA — Expert Survey) has the `anon` column
only (Section 1.1). The internal tool (Apus DMA — Consultant Console) has all four roles
above. One matrix, because one database.

**Sign-off only has no named holder today.** Its mechanism (schema, RLS, the two
permissions, the locked screens) is built in this pass regardless, per the confirmed
approach: the role goes live in the database and policies now; its live screen test (Half
B of the refusal test) is deferred and recorded as pending in user-stories.md until a real
person and email exist.

---

## 4. Exceptions (column-level, not built at the access stage)

None identified. No column needs hiding from a role that can otherwise read the row —
Sign-off only's restriction is table-level (whole tables locked), not column-level.

---

## 5. Schema delta (what the access stage adds to supabase-setup.md, in one pass with the login)

| Table | Add | Why |
|---|---|---|
| `team_members` (new) | `id`, `auth_user_id` (nullable until a login exists), `email` (unique, the seed key), `name`, `phone_number`, `avatar_url`, `role_title`, `access_level` (enum: `full`, `signoff`), `is_admin` bool default false, `is_owner` bool default false, `can_signoff_topics` bool default false, `can_signoff_results` bool default false, `active` bool default true, `created_at`, `updated_at`. Seeded first with Anika's row, `is_owner = true`, `is_admin = true`, `access_level = 'full'`. A trigger matches each new Auth identity's email to a row and sets `auth_user_id`; no matching row means no access. | the people, and how a login finds its person |
| `clients`, `topic_library`, `iros`, `stakeholder_groups`, `stakeholder_members` | `created_by` → team_members (nullable, existing rows unattributed), `updated_by`, `updated_at` | audit trail, currently missing on these five tables |
| `assessments` | `iro_list_signed_off` bool default false, `iro_list_signed_off_by` → team_members, `iro_list_signed_off_at` timestamptz | the v2.1 Topics gate, advisory |
| `cycles` | `results_signed_off` bool default false; **repurpose** the existing `signed_off_at`, `approver_name`, `approver_role`, `minutes_reference` columns as `results_signed_off_at` and the approval-detail fields (renamed, not duplicated) | the v2.1 Results gate, locking |
| `avatars` bucket (new, Storage) | private; path scoped per `team_members.id` | Profile photos |

Seed: Anika Lerch's `team_members` row as above. No other named people exist yet to seed.

---

## 6. Policy plan (login and rules together; one line per `own` and per `no`)

| # | Table | Action | Role | Rule in words | Mechanism | Screen test |
|---|---|---|---|---|---|---|
| 1 | every workflow table | read/write | Owner/Admin/Full | all rows, no scoping beyond `active team_members` | policy, checking `team_members.active` and `access_level = 'full'` (or `is_owner`) via `auth_user_id` | Anika reads and edits everything |
| 2 | assessments, iros, submissions, ratings, topic_justifications, live_sessions, live_session_participants, attendance_edit_log, calibrations | read | Sign-off only | all rows, read-only | policy (SELECT), checking `access_level = 'signoff'` | pending — no named holder; test as soon as one exists |
| 3 | assessments | update → `iro_list_signed_off` | Sign-off only | only when `can_signoff_topics = true` on the caller's row | function | pending — as above |
| 4 | cycles | update → `results_signed_off` | Sign-off only | only when `can_signoff_results = true` on the caller's row | function | pending — as above |
| 5 | calibrations | update (`calibrated_value`, `band_value`) | Owner/Admin/Full | refused while the cycle's `results_signed_off = true` | policy (UPDATE) with a join to `cycles.results_signed_off`, or a trigger | Anika adjusts a value pre-signoff (works), attempts the same post-signoff (refused), revokes, attempts again (works) |
| 6 | cycles | update → revoke `results_signed_off` | Sign-off only | refused — Owner/Admin/Full only | policy | pending — as above |
| 7 | Dashboard's and Report's underlying tables | read | Sign-off only | refused — not just hidden from nav | policy (SELECT), scoped tables excluded from the Sign-off-only read grant | pending — as above; once named, confirm they see "No access" not an empty screen |
| 8 | team_members | update (`is_admin`) | Admin | refused — Tool Owner only | policy (UPDATE) + column trigger | Anika, acting as if Admin (not yet a real second person), cannot toggle her own `is_owner`-derived admin flag via the app path meant for Admin; confirmed by code review until a second Admin exists to test live |
| 9 | team_members | update (`is_owner`) | anyone | refused — set once, never through the app | policy: no UPDATE path exists on this column for any role | attempted via direct API call, refused |
| 10 | every table | any | anon (Tool B) | nothing — Tool B has no anon access of its own; the shared anon surface is entirely Tool A's, per Section 1.1 | none (default deny) | a logged-out visitor to the Console reaches only the login screen |
| 11 | login with no team_members row | read anything | the identity | refused — "No access yet" screen | trigger sets `auth_user_id` only when a row matches; the app checks for a row and refuses otherwise | test with a Supabase Auth identity that has no team_members row |
| 12 | submissions | delete | Owner/Admin/Full | refused unless `status = 'draft'` and the assessment is Closed or Completed | policy (DELETE) | Anika deletes an old draft on a closed assessment (works); attempts the same on a submitted response (refused) |
| 13 | avatars bucket | upload/read/delete | any team_member | own avatar only for upload/delete; any avatar readable (for the header) | bucket policy | Anika uploads her own photo; a second account cannot delete it |

**Rule 2, resolved by builder 2026-09-24.** This row originally also listed
`topic_library` and `invitations` in Sign-off only's blanket read grant,
contradicting both tables' own per-table sections in Section 1.2 (which say
`no`, the latter with an explicit reason: "sign-off-only sees responses
[submissions/ratings], never the invitee's name/email"). Builder decision:
the per-table sections and user-stories.md win — **Sign-off only has no
access to `topic_library` or `invitations`**, full stop. The row above is
corrected accordingly (also adding `iros`, `topic_justifications`,
`live_session_participants` and `attendance_edit_log`, which the per-table
sections grant but this row had omitted; `calibration_history` stays
excluded, per its own section — append-only, Owner/Admin/Full read only).
`cycles` was never in this row and stays governed solely by its own
narrower condition (rule 4 and its per-table section): Sign-off only reads
`cycles` **only** with `can_signoff_results` — holding `can_signoff_topics`
alone grants no `cycles` access. If a Topics sign-off screen ever needs a
cycle-level field (e.g. the financial year or ESRS version for display),
that's a gap to report, not a reason to widen this grant.

**The gate.** The refusal test has two halves, recorded in PROGRESS.md before this stage
deploys. **Half A (Claude Code):** every `no` cell and one `own`/scoped boundary attempted
through the API as Anika's session and as a logged-out visitor, pasted into PROGRESS.md.
**Half B (the named people):** every test above, run on the actual screen. For Sign-off
only, Half B is explicitly deferred and tracked as open in user-stories.md until a real
person exists — Half A still runs in full against the policies themselves.

---

## 7. Hard rules for CLAUDE.md (the Governor lifts these verbatim)

1. The refusal happens in the database, or in a server function that holds the secret key
   and checks every request itself; never only in the screen. RLS is enabled on every table
   and never disabled to make something work. Tool A's `anon` has no policy and no table
   grant on `invitations`, `submissions`, `ratings`, `topic_justifications` — access is only
   through the six `SECURITY DEFINER` functions keyed by `link_code`. Tool B has no anon
   access of its own.
2. No team_member can change their own `is_admin`, `is_owner` or `active` through the app; a
   trigger refuses it. `is_owner` is never changed through the app by anyone. These are set
   from the Supabase dashboard.
3. A submitted response (`submissions.status = 'submitted'`) is frozen for everyone,
   including Owner/Admin/Full — the one exception is anonymising the linked invitation's
   `name`/`email` on a GDPR request. **Exception to this rule:** `iro_list_signed_off` and a
   topic_library entry's own sign-off are advisory only and never freeze anything; only
   `cycles.results_signed_off` is a true lock, and it locks `calibrations.calibrated_value`/
   `band_value` specifically, nothing else, until revoked.
4. Nothing is deleted through the app except: a draft submission on a Closed/Completed
   assessment (never a submitted one), an invitation before it's opened, a live session
   before it's started, a client with no cycles, a cycle or assessment with no responses. A
   GDPR erasure request is actioned as anonymising the invitation's personal fields, never a
   row delete. List entries (`stakeholder_groups`, potentially `stakeholder_members`) are
   deactivated, not deleted, once used.
5. Every table getting the audit-column delta in Section 5 carries `created_by`,
   `updated_by`, `updated_at`. `calibration_history`, `threshold_changes` and
   `attendance_edit_log` are append-only — no UPDATE/DELETE policy on any of them, for any
   role.

---

## 8. Handover paragraph (for the handover package, plain language)

Apus DMA has two tools sharing one database. The public Expert Survey has no login: an
invited expert reaches only their own draft, through a personal link, and can never list
another invitation or read anyone else's response — enforced entirely by six narrow
database functions, not by the frontend. The Consultant Console has four kinds of user.
Tool Owner, Admin and Full access (today, only Anika Lerch holds these, as Tool Owner) see
and edit everything in the assessment workflow; only the Tool Owner can grant another
person Admin rights. Sign-off only is a narrower reviewer role with two independent
switches — sign off the topic selection, sign off the final results — and sees nothing
outside Topics, Assessments, Responses and Calibrate & Results; nobody holds this role yet,
but the database rules for it are built and ready. Nothing is ever deleted except drafts
that were never submitted; a submitted response is frozen, even for Anika. Signing off the
final results locks calibration until it's deliberately revoked, logged each time. The
Supabase and Netlify accounts are held by Anika Lerch.

# Schema Draft — Apus DMA Consultant Console

> Authoritative until `docs/supabase-setup.md` exists. Written by Project Governor
> from product-spec.md Section 5. Claude Code creates these tables during session 1
> (after confirming docs/supabase-setup.md already exists from Tool A's build —
> see CLAUDE.md First Session Setup) and documents them in docs/supabase-setup.md
> as the very next save point.

## Tables this tool adds to the shared `greenfriend-dma` project

### topic_library
The master IRO library — independent of any single assessment, the sole source
assessments read their topics from.
- id (pk)
- iro_type — `neg_impact` / `pos_impact` / `risk` / `opportunity`
- esrs_topic_id — top-level, e.g. `E1`
- esrs_subtopic — the real EFRAG disclosure-requirement string, e.g.
  `E1-6 Gross Scopes 1, 2, 3 and Total GHG emissions`
- short_title
- description
- actual — boolean
- value_chain — `own` / `upstream` / `downstream`
- reference_code — auto-generated, e.g. `IMP-E1-01`
- signed_off_by — nullable
- signed_off_at — nullable
- created_at

RLS: authenticated — full read/write/delete. anon — no access.

### iros
One row per IRO within an assessment, synced from `topic_library` at creation
time (filtered by the assessment's perspective), keeping its own accumulated
ratings even if the source library entry changes later.
- id (pk)
- assessment_id (FK → assessments, existing table from Tool A)
- topic_library_id (FK → topic_library, nullable if the source entry was deleted)
- esrs_topic_id, name, description, iro_type, actual
- impact_threshold, financial_threshold — default 3.0
- session_notes — nullable, free text captured during a qualitative live session
- order

RLS: authenticated — full read/write. anon — read-only, scoped to the assessment
being viewed (needed so Tool A can render the questionnaire).

### assessor_ratings
One row per (IRO × assessor) — the admin grid and qualitative live-session
consolidated rating, distinct from Tool A's per-criterion `ratings` table.
- id (pk), iro_id (FK), assessor_label
- scale, scope, irreversibility, likelihood, magnitude, financial_likelihood
- recorded_at

RLS: authenticated — read/insert/update, no delete. anon — no access.

### calibrations
One row per IRO's **current** calibration state.
- id (pk), iro_id (FK), owner, moderator
- calibrated_value — nullable, current
- notes — current
- band_value — nullable, EBITDA band 1–5
- calibrated_at
- signed_off_by — nullable, signed_off_at — nullable

RLS: authenticated — read/insert/update, no delete. anon — no access.

### calibration_history
Append-only audit log — one row per calibration change, never overwritten.
- id (pk), calibration_id (FK)
- from_value — nullable, to_value
- notes, changed_by, changed_at

RLS: authenticated — read/insert only, no update or delete (append-only by policy,
not just by convention).

### participants
Expected participant list for a qualitative live session.
- id (pk), assessment_id (FK), name, title, expert_topic

RLS: authenticated — full read/write/delete. anon — no access.

### stakeholder_groups
The master stakeholder map — persists independently of any single assessment.
- id (pk), name, perspectives — array of `impact`/`financial` (both possible), order

RLS: authenticated — full read/write/delete. anon — read-only, scoped to the
assessment being viewed (participant-list pre-fill only).

### stakeholder_members
Named contacts within a stakeholder group.
- id (pk), group_id (FK)
- name (required), title/role (required), company, email (optional,
  format-validated in the frontend, not enforced at the DB level)
- pillars — array of `E`/`S`/`G` (a person can be tagged across all three)
- expertise — free text

RLS: same as stakeholder_groups.

## Existing tables this tool touches but does not own

- **assessments** (created by Tool A) — this tool adds columns: mode, perspective_filter,
  status, welcome_text, task_text, mandatory, respondents_done, respondents_total,
  slug, logo_url. See CLAUDE.md Hard Rules — this table is shared, coordinate schema
  changes with Tool A's docs/supabase-setup.md.
- **ratings** (owned and written by Tool A) — this tool only ever reads it. Never
  write, alter its schema, or change its RLS.

## Notes for Claude Code

- Reconcile the shape mismatch between Tool A's `ratings` (one row per criterion
  answer, supports skip) and this tool's `assessor_ratings` (one row per assessor
  per IRO) — the spec flags this as a genuine open design decision, not yet
  resolved. Pick an approach at build time and document the reasoning in
  docs/supabase-setup.md.
- Auth: magic link, invite-only. No roles table needed — one shared permission
  level for all logged-in users.

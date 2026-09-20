# Product Spec — Apus DMA — Consultant Console

**Version:** 2.0
**Date:** 2026-09-20
**Author:** greenfriend
**Status:** Confirmed

---

> **Stack notice:** This is Tool B of a two-tool stack. Tool A — **Apus DMA — Expert Survey** — is the public, link-based page where invited experts submit their ratings, and it shares this tool's Supabase project. See `product-spec-tool-a-expert-survey.md`. **Tool A builds first** and carries the shared database migration (its Section 5); this tool's build session must not start until Tool A's build is complete and `docs/supabase-setup.md` reflects the new schema.
>
> **CLAUDE.md must be regenerated:** the previous Consultant Console CLAUDE.md marks `ratings` as a protected, read-only table and describes an older design. Under v2.0 this tool **writes** live-session submissions and ratings into the shared `submissions` and `ratings` tables. Re-run the Project Governor on this v2.0 spec before building.
>
> **What changed from v1.2 (summary):** the two assessment types are renamed **Expert survey** and **Expert live session**; work is organised into **cycles** per client and financial year; the cycle starts with the financial year, which pre-selects the ESRS version; survey experts are invited individually (an **invitation list**); live sessions get an owner-managed **participant list** and **save and pause**; all responses land in **one combined ratings table** with source, who and justification; **justifications** are collected per criterion or per topic; **silent stakeholders** (nature and others who cannot speak for themselves) are supported through representatives; calibration and results merge into one **Calibrate & Results workspace** with **two thresholds** (impact and financial) and clear stages; scoring rules follow the simplified ESRS logic; a **Word report builder** replaces the PDF/PNG/CSV export panel.
>
> **Prototype note:** `reference-prototype/` remains authoritative for the look, copy and interaction of screens that already exist and are unchanged (Review Hub, existing wizard steps, live session rating controls) and for exact scoring arithmetic where this spec does not change it. New screens in this version (cycle setup, invitations, participants, Calibrate & Results workspace, report builder, silent stakeholders prompt) have no prototype: Claude Code builds them in the same visual language. Where the prototype and this spec disagree on behaviour, **this spec wins**.

---

## Section 1 — Tool Summary

**Tool name:** Apus DMA — Consultant Console

**What it does:** The private working tool a sustainability consultant uses to run ESRS Double Materiality Assessments for a client. She creates a **cycle** (client, financial year, ESRS version, thresholds), maintains a master **stakeholder map** (including silent stakeholders such as nature) and a master **topics library** of Impacts, Risks and Opportunities, and runs two kinds of assessment: an **Expert survey** (invited experts answer through the Expert Survey tool via personal links) and an **Expert live session** (the consultant rates topics with a group and records the participants). All ratings and justifications land in one combined table. She then reviews and **calibrates** results, sets the impact and financial materiality thresholds, signs off the cycle, and produces a Word report.

**Who uses it:** Independent CSRD/ESRS sustainability consultants (built around greenfriend's own practice) and invited collaborators, all with the same access level.

**Why it exists:** Replaces a spreadsheet-and-slide-deck double materiality workflow with one guided tool that keeps raw expert input, justifications, calibration decisions and thresholds together as audit-defensible evidence, and lets both assessment types feed one result.

**Build status:** Iteration — the previous version (v1.2) documented a prototype where assessments, ratings and calibrations lived in browser memory, and a first database-backed build (session 1) delivered login, a simplified Results view, Calibration and a read-only Stakeholders view. This build reorganises the tool around cycles, the two renamed assessment types, invitations, live-session participants, justifications, silent stakeholders, a merged Calibrate & Results workspace, two thresholds and a Word report. Most of the workflow (wizard, topics library, live session, report) is not yet built. Only demo data exists; there is no real response data.

---

## Section 2 — Classification

### Data Model

**Decision:** D3

| Label | What it means | This tool? |
|-------|--------------|-----------|
| D1 — Hardcoded | All data is written into the code by the developer. Users cannot input anything that persists. The tool displays what the developer put in. | No |
| D2 — Session | Data enters the tool during use and disappears when the tab closes. No database. Covers both uploaded files and form inputs. | No |
| D3 — Persisted | Data is written to a database and survives after the session ends. Supabase is required. | **Yes** |

**Reason:** Cycles, invitations, expert responses, live-session results, calibration decisions, threshold changes and sign-off must persist and be reviewable across weeks and devices, and each expert's response must be visible to the consultant after their session ended.

**D3 is triggered if any of the following are true — check all that apply:**
- [x] Data must be retrievable after the session ends
- [x] Multiple sessions contribute to the same dataset
- [x] An audit trail or history is needed (calibration history, threshold changes, attendee edits)
- [x] Data submitted by one person must be visible to another
- [ ] Results must be accessible via a URL after the session ends
- [x] Files uploaded by users must be stored and retrievable later *(client logo and the consultant's own logo — small files; not the driver of D3 on their own)*

---

### Access Model

**Decision:** A2

| Label | What it means | This tool? |
|-------|--------------|-----------|
| A1 — Public | Anyone with the URL can use it. No login, no account required. | No |
| A2 — Authentication | Users must log in. All logged-in users see the same thing and have the same permissions. | **Yes** |
| A3 — Authorization | Users must log in and have different roles. Different roles see different data or have different permissions. | No |

**Reason:** Only the consultant and explicitly invited collaborators may create, edit or view cycles and results. Everyone who logs in has the same permissions (owner, moderator and approver are names recorded on calibrations, not login roles).

> **Promotion rule:** Auth requires a database. A2 always implies D3.

### Auth reason and signup model

**Auth reason:** Identity and continuity — the consultant saves cycles and returns to them across sessions and devices, and the tool records who made each change.

**Signup model:** Invite-only — the builder invites collaborators through the Supabase dashboard; there is no self-signup. Self-signup has been confirmed switched off.

---

### Tier

**Tier:** 3

| Tier | D+A combination | Stack | Deployment |
|------|----------------|-------|------------|
| 3 | D3+A2 | Netlify + Supabase (auth + RLS) | Netlify |

---

### Standalone or Stack

**This tool is:** Part of a stack — see Section 4. Tool B is the internal tool; it builds second.

---

## Section 3 — Arms

### AI API Arm

**Active:** No

### Export Arm

**Active:** Yes

| Detail | Answer |
|--------|--------|
| Format | Word document (.docx), built in the browser. No server function. Replaces the earlier CSV / PNG / PDF export panel. |
| What is exported | A configurable **DMA report** with six sections: (1) Cover and basis, (2) Process and methodology, (3) Engagement, (4) Topics and results, (5) Calibration and sign-off, (6) Appendix. Built by the report builder in Section 8. |
| PDF design intent | Not applicable — the output is Word, not PDF. **Word design intent (required before build):** A professional, well-structured, compact document on **white pages**. Cover page with two optional logo slots (the consultant's own logo and the client's logo) and the cycle basis. Headings and body in a standard font (Calibri, falling back to Arial) so the file looks the same on any computer, dark text, **one accent colour** for headings and table header rows. Graphs (bar chart, heatmaps, matrix) are drawn in the browser and placed as **images on a white background**. **Topics and stakeholders appear in tables.** Every page has a footer with the cycle name, ESRS version, export date and a **Provisional** label (replaced by **Final** only after the cycle is signed off). Keep it compressed — no decorative elements, no long explanatory prose beyond the methodology section. |

### Email Arm

**Active:** No — links are copied from the invitation list and sent manually by the consultant. The email address on an invitation is for her reference only.

### Scheduled Automation Arm

**Active:** No — the consultant purges unfinished drafts manually when a cycle closes.

---

## Section 4 — Stack and Deployment

### All Tiers

| Detail | Answer |
|--------|--------|
| Frontend framework | React + Vite + Tailwind |
| Deployment target | Netlify |
| Netlify MCP | **Active** — Netlify is connected via Claude Desktop Connectors. Claude Code will create the site, set environment variables and deploy automatically. |

**GitHub — pre-build requirement:** The user creates the GitHub repo before the first Claude Code session. `product-spec.md`, `CLAUDE.md` and `PROGRESS.md` must be uploaded to the repo root before Claude Code opens.

---

### Supabase project

**Supabase project status:** Existing — the project already exists and is shared with Tool A.

**Supabase plan:** Free (builder decision — no Pro upgrade is planned). A Free project pauses after roughly one week without traffic, which breaks experts' personal and resume links until the project is restored in the Supabase dashboard. Accepted risk (see Section 15).

| Detail | Answer |
|--------|--------|
| Project name | greenfriend Double Materiality Assessment |
| Project ID | evwmxduudcujtibirmga |
| supabase-setup.md location | docs/supabase-setup.md in the project folder |

> Claude Code reads `docs/supabase-setup.md` before any schema change and never recreates what already exists. It must not create a new Supabase project. Tool A's build performs the shared migration first; this tool's build must not start until that is done.

**supabase-setup.md:** created and updated by Claude Code whenever it touches the database; it is the schema source of truth for both tools.

---

### Stack detail

**Stack name / Supabase project name:** greenfriend Double Materiality Assessment

**This tool's role in the stack:** Tool B — internal consultant console.

| Tool | Tier | Role in the stack |
|------|------|------------------|
| Apus DMA — Expert Survey | 2 | Public, link-based survey; writes expert survey submissions and ratings |
| Apus DMA — Consultant Console (this spec) | 3 | Internal, login-only: cycles, assessments, invitations, live sessions, calibration, results, Word report |

> **Build order:** Tool A builds first and carries the shared migration; this tool builds second, against the schema documented in `docs/supabase-setup.md`. Each tool has its own spec, repo, CLAUDE.md, PROGRESS.md and Netlify site.

---

## Section 5 — Data Architecture

### Terminology

- **Expert survey** (database value `expert_survey`) — invited experts answer through Tool A. Formerly "quantitative".
- **Expert live session** (`expert_live_session`) — the consultant rates topics with a group in this tool. Formerly "qualitative".
- **Cycle** — one DMA round for one client. It groups the assessments whose results are combined.
- **Assessment** — one expert survey or one expert live session inside a cycle.
- **Silent stakeholder** — a party that cannot speak for itself (nature and ecosystems, species and biodiversity, future generations). Represented by an invited proxy expert, in line with the ESRS notion that nature may be considered a silent stakeholder.

### What data is collected or stored in this tool

| Field name | Plain language label | Data type | Who provides it | Required? |
|-----------|---------------------|-----------|----------------|-----------|
| financial_year | The financial year the assessment is for | Integer (year) | Consultant (first question of cycle setup) | Yes |
| esrs_version | Which standards version the cycle follows | Text — `esrs_2023_amended` or `esrs_2026`; pre-selected from the financial year (2026 → 2023 as amended, 2027 or later → 2026), overridable | Consultant | Yes |
| stage | Cycle stage | Text — `collecting`, `calibrating`, `signed_off` | Consultant | Yes |
| impact_threshold, financial_threshold | The two materiality thresholds | Number, default 3.0 each | Consultant | Yes |
| baseline_impact_threshold, baseline_financial_threshold | Thresholds recorded at cycle setup | Number | Automatic | Yes |
| silent_stakeholders_considered, silent_stakeholders_note | Whether silent stakeholders were considered, and the reasoning | Yes/No + text | Consultant (prompt during cycle setup) | Yes for the flag; note optional |
| require_both_sources | Require both survey and live session before sign-off | Yes/No, default No | Consultant | Yes |
| justification_mode | Justification per criterion or per topic | Text — `per_criterion` (recommended default) or `per_topic` | Consultant, per assessment | Yes |
| mandatory | Every criterion must be answered or skipped | Yes/No | Consultant, per assessment | Yes |
| invitation name, email | Who is invited | Text | Consultant | Yes |
| invitation stakeholder group | The group the consultant expects the invitee to represent | Reference | Consultant | Yes |
| link_code | Personal link code | Text, unguessable | Automatic | Yes |
| invitation status | Invited / Opened / Saved / Submitted | Text | Automatic (and "mark as sent" by consultant) | Yes |
| participant name, expertise | Live session attendee and field of expertise (E1–G1) | Text / list | Consultant | Yes (both) |
| time_horizon | Short, medium or long term for a risk or opportunity | Text, optional | Consultant (topic library) | No |
| potential_human_rights_impact | Flags a potential negative human rights impact (severity takes precedence over likelihood) | Yes/No | Consultant (topic library) | No |
| calibrated_value, band_value | Calibrated score and EBITDA band (1–5) for financial IROs | Number, nullable | Consultant | No |
| reviewed_with_owner | Topic owner has seen and agreed the calibrated result | Yes/No + date | Consultant | No |
| approver_name, approver_role, minutes_reference, signed_off_at | Cycle sign-off record | Text / date | Consultant | Yes at sign-off |
| recorded_by | The logged-in user who recorded a change | Reference to the login | Automatic | Yes |

**Tables needed:**

| Table name | What it stores | Key fields |
|-----------|---------------|-----------|
| clients | The company a DMA is for | id, name, logo_url, created_at |
| practice_settings | One row for the consultant's own settings | id, consultant_logo_url |
| cycles | One DMA round for one client | id, client_id, name, financial_year, esrs_version, stage, impact_threshold, financial_threshold, baseline_impact_threshold, baseline_financial_threshold, require_both_sources, silent_stakeholders_considered, silent_stakeholders_note, methodology_version, approver_name, approver_role, minutes_reference, signed_off_at, signed_off_recorded_by, created_by, created_at |
| threshold_changes | Append-only log of every threshold change | id, cycle_id, axis (`impact` / `financial`), old_value, new_value, reason, changed_by, changed_at |
| assessments | One expert survey or one expert live session inside a cycle | id, cycle_id, type (`expert_survey` / `expert_live_session`), name, description, perspective_filter (`full` / `impact` / `financial`), slug, welcome_text, task_text, mandatory, justification_mode, status, start_date, end_date, created_by, created_at, updated_at |
| topic_library | The master IRO library, independent of any single cycle | id, esrs_version, iro_type (`neg_impact` / `pos_impact` / `risk` / `opportunity`), esrs_topic_id (E1–G1), esrs_subtopic, short_title, description, actual (bool), value_chain (`own` / `upstream` / `downstream`), time_horizon (nullable), potential_human_rights_impact (bool), client_id (nullable — empty means shared master topic), reference_code, signed_off_by, signed_off_at |
| iros | Snapshot of the library for one assessment, taken at creation, keeping its own ratings even if the library entry later changes | id, assessment_id, topic_library_id (nullable), esrs_topic_id, name, description, iro_type, actual, time_horizon, potential_human_rights_impact, session_notes (nullable), order |
| stakeholder_groups | The master stakeholder map | id, name, type (`impact` / `financial` / `silent`), perspectives, order — silent presets: Nature and ecosystems, Species and biodiversity, Future generations (custom entries allowed) |
| stakeholder_members | Named contacts within a group | id, group_id, name, title / role, company, email (optional, format-checked), pillars (E / S / G), expertise |
| invitations | One row per invited expert of an expert survey | id, assessment_id, name, email, stakeholder_group_id, link_code, status, sent_at, opened_at, last_saved_at, submitted_at, anonymised_at |
| submissions | One row per expert response (survey) or per live session result, draft or submitted | id, assessment_id, source, invitation_id (nullable), live_session_id (nullable), status (`draft` / `submitted`), stakeholder_group, perspective, expertise_topics, expertise_explanation, title, basis_for_representation, overall_comment, consent_given_at, current_topic_index, last_saved_at, submitted_at |
| ratings | One row per (IRO × criterion) per submission; value empty means skipped. criterion_key is `scale`, `scope`, `irreversibility`, `likelihood` or `magnitude` — for a risk or opportunity the `likelihood` row is the financial likelihood (there is no `financialLikelihood` key) | id, submission_id, assessment_id, iro_id, criterion_key, value, justification |
| topic_justifications | One justification per IRO per submission when the mode is per topic | id, submission_id, iro_id, justification |
| live_sessions | One expert live session run in this tool | id, assessment_id, status (`planned` / `paused` / `finished`), facilitator, current_topic_index, started_at, last_saved_at, finished_at |
| live_session_participants | The attendee list, set by the consultant up front and editable | id, live_session_id, name, expertise (E1–G1, multi), represents_group_id (nullable — for a silent stakeholder), removed_at (nullable), removed_reason |
| attendance_edit_log | Append-only log of attendee list edits | id, live_session_id, participant_id, action (`added` / `edited` / `removed`), reason, changed_by, changed_at |
| calibrations | One row per IRO's current calibration state | id, cycle_id, iro_id, owner, moderator, calibrated_value (nullable), band_value (nullable), notes, reviewed_with_owner, reviewed_with_owner_at, calibrated_at |
| calibration_history | Append-only audit log — every adjustment or reset adds a row | id, calibration_id, from_value (nullable), to_value, notes, changed_by, changed_at |
| **combined ratings view** | A saved view, not a table: one row per **submitted** rating with cycle, assessment, source (`expert_survey` / `expert_live_session`), IRO, criterion, value, justification (the criterion's, or the topic's when the mode is per topic), stakeholder group, perspective, expertise, invitation reference (survey) or the live session's participant list (live session) | — |

**Retired by the shared migration (performed in Tool A's build):** `session_comments` (folded into `submissions.overall_comment`), `assessor_ratings` and its scheduled sync job (replaced by the combined ratings view), the `increment_respondents` function, and the `assessments.respondents_done` / `respondents_total` columns (counts are derived from invitations and submissions), and the old `participants` table (replaced by `live_session_participants`).

**File storage:** Yes — the client's logo (uploaded once per client, shown at the top of every screen of Tool A's survey and on the report cover) and the consultant's own logo (report cover). Stored in Supabase Storage, with the URL saved on `clients.logo_url` and `practice_settings.consultant_logo_url`. Not retrievable by the public beyond the client logo needed to render the survey. The Word report itself is **not** stored — it is built in the browser on demand.

**Derived or calculated data:** Yes — severity, impact and financial scores, material yes/no, discrepancy and source-gap flags, override flags, topic-level roll-ups, response counts and completeness checks are computed on read (Section 9), not stored. The real build decides whether to compute in a database view or in the frontend; the frontend port of `reference-prototype/src/lib/calc.js` (updated per Section 9) is the default.

> **Completeness check:** for every submitted response, Tool B compares the expected rows (topics × applicable criteria) with the rows received and flags any gap.

---

## Section 6 — Access and Permissions

**Auth configuration:**

| Detail | Answer |
|--------|--------|
| Authentication method | Magic link — the consultant and collaborators click an emailed link and are in (no password to forget), chosen for an invite-only internal tool |
| Signup model | Invite-only — the builder invites specific users through the Supabase dashboard; self-signup is off |

> **Privacy note:** User accounts store email addresses. For internal and client tools this falls under the organization's existing privacy framework rather than a consent flow.

**One shared access level.** Every logged-in user can see and change everything, including every client. This is acceptable with one client and one user; per-client access (roles) is a Phase 2 item (Section 12).

**RLS — who can read and write what:**

| Table | User type | Can read | Can insert | Can update | Can delete |
|-------|-----------|----------|------------|------------|------------|
| clients, practice_settings | Authenticated user | All rows | Yes | Yes | Only a client with no cycles |
| cycles | Authenticated user | All rows | Yes | Yes (thresholds only in stage Calibrating; nothing once signed off) | Only before any response exists |
| threshold_changes | Authenticated user | All rows | Yes | No | No |
| assessments | Authenticated user | All rows | Yes | Yes | Only before any response exists |
| assessments | Unauthenticated (anon) | All rows (display content for Tool A's survey) | No | No | No |
| topic_library | Authenticated user | All rows | Yes | Yes | Yes |
| iros | Authenticated user | All rows | Yes | Yes | Yes |
| iros | Unauthenticated (anon) | All rows (display content for Tool A's survey) | No | No | No |
| stakeholder_groups | Authenticated user | All rows | Yes | Yes | Yes |
| stakeholder_groups | Unauthenticated (anon) | All rows (names and perspectives, for Tool A's About you) | No | No | No |
| clients, cycles | Unauthenticated (anon) | clients: all rows (name, logo). cycles: only the columns id, esrs_version, stage and client_id (column grant) | No | No | No |
| stakeholder_members | Authenticated user | All rows | Yes | Yes | Yes |
| invitations | Authenticated user | All rows | Yes | Yes | Only before the invitee has opened it |
| invitations | Unauthenticated (anon) | No direct access — only through Tool A's six link-code functions | No direct access | No direct access | No |
| submissions | Authenticated user | All rows | Yes (live sessions) | Yes (status changes, live session drafts, anonymising the optional title) | No |
| submissions | Unauthenticated (anon) | No direct access — only through Tool A's six link-code functions | No direct access | No direct access | No |
| ratings, topic_justifications | Authenticated user | All rows | Yes (live sessions) | Only while the submission is a draft | No |
| ratings, topic_justifications | Unauthenticated (anon) | No direct access — only through Tool A's six link-code functions | No direct access | No direct access | No |
| live_sessions, live_session_participants | Authenticated user | All rows | Yes | Yes | Only before the session has started (participants are otherwise removed softly) |
| attendance_edit_log | Authenticated user | All rows | Yes | No | No |
| calibrations | Authenticated user | All rows | Yes | Yes | No |
| calibration_history | Authenticated user | All rows | Yes | No | No |
| All tables above not listed for anon | Unauthenticated (anon) | No | No | No | No |

> Claude Code builds all RLS via Supabase MCP; RLS is never disabled on any table. A submitted response is never edited or deleted — deletion requests are handled by anonymising (Section 7). Once a cycle is signed off, the database blocks new ratings and edits for that cycle until sign-off is revoked.

---

## Section 7 — GDPR

**GDPR outcome:** Applies — personal data is collected through this tool's forms.

**Personal data collected:**
- **Invitations:** invitee name and email (entered by the consultant about each invited expert)
- **Live session participants:** name and field of expertise (entered by the consultant)
- **Live session facilitator** name
- **Stakeholder contacts:** name (required), title or role (required), company, email (optional, format-checked), E/S/G tags, expertise
- **Calibration and sign-off records:** owner, moderator and approver names and roles; the logged-in user who recorded each change
- **Expert responses** written by Tool A carry an optional job title and free-text fields (see Tool A spec Section 7)

> **Scope note:** Unlike a self-submitted form, invitee, participant and contact details are entered by the consultant *about* named individuals. They are still personal data stored in the database and are in scope. Whether the legal basis is consent or something else (for example legitimate interest) should be confirmed with legal advice.

**Business reason for holding invitation details (for the legal check):** audit traceability — being able to show that every response comes from a real, identifiable, invited person and not from fabricated input.

**Consent checkpoint on the form:** Yes — a confirmation checkbox and the data statement must appear on **each form that adds a named person**: the invitation form, the live session participants form, and the stakeholder contact form. The checkbox reads: "I have informed this person how their data is used." It must be ticked before saving.

**Data statement text shown to users at the point of collection:**
> The details you enter about this person are stored securely and used only to organise and document this materiality assessment. Their answers can be connected to them through their invitation or the session attendee list. They may be shared with the client company and its auditor. They can request deletion or anonymisation at any time by contacting: **anikalerch@greenfriend.org**.

**Deletion mechanism:** On request, the consultant clears the person's name and email on the invitation, participant or contact record, which then shows "Anonymised" with the date (`anonymised_at`), and clears any optional title on their submission. Ratings, justifications, stakeholder group and expertise remain, so the assessment stays intact and auditable, but they can no longer be connected to a person. Deleting the responses themselves would change the scores and break the audit trail, so it is not the default. Requests go to **anikalerch@greenfriend.org**, and the consultant (greenfriend) processes them.

> This is a legal requirement in the EU. The deletion contact (anikalerch@greenfriend.org) is confirmed. The anonymise-on-request approach and the legal basis must still be confirmed with legal advice **before real experts are invited** (it does not block the build; this spec is not legal advice). Note that Tool B does not display any expert's name or email in results tables or exports by default (Section 8, report builder).

---

## Section 8 — Screen and UI Structure

The console uses a dark theme (Section 10). Every screen except Login requires a signed-in user. Screens marked *(existing)* keep their look and behaviour from the reference prototype unless noted.

### Login

- **Purpose:** Let invited users in.
- **What is visible:** Email field, "Send magic link" button, a note that access is by invitation only.
- **User actions:** Enter email and request a link.
- **What happens next:** Clicking the emailed link signs the user in and opens the Dashboard. Unknown emails get no account (self-signup is off).

### Dashboard

- **Purpose:** Show where the work stands and what to do next.
- **What is visible:** A hero area, and six connected process-step cards with real progress: (1) Cycle, (2) Stakeholders, (3) Topics, (4) Assessments, (5) Calibrate & Results, (6) Report. A short list of quick tips. A cycle selector when more than one exists.
- **User actions:** Open a step; switch cycle; create a new cycle.
- **What happens next:** Each card opens its screen.

### Stakeholders (master map — independent of any single cycle)

- **Purpose:** Maintain who the stakeholders are, including silent stakeholders.
- **What is visible:** Groups by type — **Impact**, **Financial** and **Silent stakeholders** — each with member counts; the **silent stakeholder presets** (Nature and ecosystems, Species and biodiversity, Future generations) with the guidance text: "Nature and other silent stakeholders cannot speak for themselves. ESRS allows a proxy — for example an ecologist, a nature NGO or a scientific study. Consider whether any silent stakeholder is affected by this company's activities and, if so, add a representative." Members within a group: name (required), title or role (required), company, email (optional, format-checked), E/S/G tags (multi-select) and free-text expertise. The **consent checkbox and data statement** (Section 7) on the add-contact form.
- **User actions:** Add, edit, remove groups and contacts; add a custom silent stakeholder group.
- **What happens next:** Groups and contacts are available when building invitations and live session participant lists.

### Topics (master IRO library — independent of any single cycle)

- **Purpose:** Maintain the master list of Impacts, Risks and Opportunities that assessments snapshot from.
- **What is visible:** The library table filtered by **ESRS version** (2023 as amended, or 2026); per entry: type, ESRS topic (E1–G1), sub-topic, short title, description, actual or potential, value-chain position, **time horizon** (risks and opportunities, optional), **potential human rights impact** flag (negative impacts), optional client, reference code and sign-off state. The sub-topic dropdown follows the selected ESRS version's list; under ESRS 2026 a custom sub-topic can be entered where the company's IRO does not fit the list, because the sub-topic list is non-binding input. Manual add and bulk CSV upload (sub-topic codes matched by prefix; unmatched codes flagged, never silently dropped).
- **User actions:** Add, edit, upload CSV, sign off or revoke sign-off (records the logged-in user and time; editing a signed-off entry clears the sign-off).
- **What happens next:** Entries are copied (as a snapshot) into an assessment's IROs at creation, filtered by perspective and, if set, by client.

### Cycles and assessments overview

- **Purpose:** Manage cycles and the assessments inside them.
- **What is visible:** Cycles with client, financial year, ESRS version, stage (Collecting / Calibrating / Signed off) and thresholds; assessments inside each cycle with type (Expert survey / Expert live session), status, response counts (invited, opened, saved, submitted for surveys; participants and session status for live sessions) and a completeness indicator; the stage actions **Start calibration**, **Sign off cycle** and **Revoke sign-off**; **Delete unfinished drafts** (manual purge, available once the cycle is in Calibrating or Signed off).
- **User actions:** Open, edit, delete (only before any response exists), start calibration, sign off, revoke, purge drafts.
- **What happens next:** Stage changes update the labels in the Calibrate & Results workspace. **Sign off cycle** asks for the approver's name, role, date and a minutes reference, records the logged-in user as "recorded by", and is blocked when the cycle's "require both sources" setting is on and either the survey or the live session has no submitted data.

### New cycle (first step of any new assessment work)

- **Purpose:** Set the basis for the whole DMA round.
- **What is visible:** Step 1 — **"Which financial year is this assessment for?"** Step 2 — **ESRS version**, pre-selected from the year (2026 → Current standards, ESRS 2023 as amended; 2027 or later → Simplified standards, ESRS 2026) with a one-line plain-language explanation of each, overridable. Step 3 — client (choose or create, with logo upload). Step 4 — cycle name and the two thresholds (impact and financial, default 3.0 each), recorded as the **baseline**. Step 5 — **silent stakeholders prompt**: "Are any silent stakeholders (for example nature) affected by this company's activities? If so, invite a representative." with a Yes/No, a free-text note, and a link to the Stakeholders screen; the answer is stored on the cycle for the record and does not block progress.
- **User actions:** Answer each step; create the cycle.
- **What happens next:** Opens the cycle, ready for its first assessment.

### New assessment — Mode select, Perspective select, Survey setup, Review & customise

- **Purpose:** Create one Expert survey or one Expert live session inside a cycle.
- **What is visible:** Mode select (**Expert survey** or **Expert live session**, with a one-line description of each); Perspective select (Full, Impact only, Financial only); Survey setup (name, description, run dates, welcome text and task text shown to participants); Review & customise — the IROs snapshotted from the library (filtered by perspective, ESRS version and client), the **justification mode** (per criterion — recommended default — or per topic, with a one-line note that per criterion is the more audit-defensible choice and per topic suits smaller or lighter-touch companies), the **mandatory** setting, and the stakeholder groups offered to experts (including any silent stakeholder groups enabled for this assessment).
- **User actions:** Choose, edit, reorder or remove topics, set justification mode and mandatory, add or edit groups.
- **What happens next:** An expert survey continues to Invitations; an expert live session continues to Participants. A draft assessment row is auto-saved from the moment mode and perspective are chosen and kept in sync at every step, so abandoning the wizard never loses progress.

### Invitations (expert survey)

- **Purpose:** Build the invitation list and hand out personal links.
- **What is visible:** A table with name, email, stakeholder group (silent stakeholder groups included), status (Invited / Opened / Saved / Submitted), a **Copy personal link** button per row (the link is Tool A's site address plus `/survey/[assessment slug]/[link code]`), a **Mark as sent** toggle, and counts per stakeholder group (invited versus submitted) with a flag where the group an expert chose in Tool A differs from the group invited. An "Add from stakeholder map" shortcut and manual entry. The **consent checkbox and data statement** on the add form.
- **User actions:** Add, edit and remove invitations (removal only before the invitee has opened the link); copy a link; mark as sent; anonymise an invitation on a deletion request.
- **What happens next:** The consultant sends each link manually. Nothing is emailed by the tool.

### Participants (expert live session)

- **Purpose:** Set up who takes part in a live session, before it starts.
- **What is visible:** The attendee list — name and **field of expertise** (E1–G1, multi-select) required for each attendee; an optional "represents" field for a silent stakeholder; the facilitator name. The **consent checkbox and data statement** on the add form.
- **User actions:** Add, edit and remove attendees at any time, including after the session (for example to remove someone who did not show up). Removal is soft (the person is marked removed with a reason); every add, edit and removal is written to the attendance edit log.
- **What happens next:** The list is attached to every rating from the session in the combined table.

### Created / Congratulations

- **Purpose:** Confirm creation and hand off.
- **What is visible:** For an expert survey: run dates and the invitation list summary, a Preview card (inline Review Hub) and a link to the Invitations screen. For an expert live session: "Kick off your expert session →". When re-editing an already-completed assessment's setup, the message becomes "Your changes are saved" with "Back to overview" as the primary action; re-editing setup never resets a response count or status.
- **User actions:** Preview, open Invitations, kick off, back to overview.
- **What happens next:** Preview → Review Hub; kick off → Intro flow.

### Review Hub *(existing)*

- **Purpose:** Let the consultant see and edit exactly what participants will see, without answering anything.
- **What is visible:** Unchanged from v1.2 — a jump-navigation bar across every screen and topic, per-screen Edit toggles, fully inert rating controls, save or discard confirmation on Exit. Renders Tool A's screens locally, including the About you screen, justification fields and the Save and continue later button as specified in Tool A.
- **User actions / What happens next:** As in v1.2.

### Live session — Intro flow and Questionnaire

- **Purpose:** Run the expert live session and record the group's ratings.
- **What is visible:** Intro screens (skipped on resume), then one topic per screen. The consultant enters the group's rating for each applicable criterion (the same criteria per IRO type as Tool A's Section 9) using the existing live session rating controls, with a **justification** per criterion or per topic according to the assessment's justification mode (required once a value is entered), and the optional **"Session notes for this topic"** box after the ratings. The session shows the participant list. A **"Save and pause session"** button is on every topic screen, plus **Finish session**.
- **User actions:** Enter ratings and justifications, write notes, move between topics, pause, finish.
- **What happens next:** **Save and pause** stores everything so far (ratings, justifications, notes, current topic) with the session status Paused; reopening from the Cycles and assessments overview jumps straight back to the exact topic, skipping the intro. A paused session can be resumed as many times as needed. **Finish session** writes the session as one submitted submission (source expert live session); until then its ratings are drafts and never count in results.

### Calibrate & Results workspace

- **Purpose:** One place to review results, calibrate them and set thresholds, so the effect of every change is visible immediately.
- **What is visible (shared header):** cycle name, client, financial year, ESRS version, the **stage banner** (Collecting / Calibrating / Signed off) that states what can be changed now, a **Provisional** or **Final** label, the two thresholds (impact and financial), and filters (assessment source, ESRS topic, material only) that persist across the three tabs. Three tabs:
  1. **Calibrate** — the topic table, one row per IRO: type, calculated score, scores by source (survey average and live session, side by side), source basis label ("survey only", "session only" or "combined"), number of ratings and how many have justifications, discrepancy and source-gap flags, calibrated value, status (Needs review / Calibrated / Reviewed with owner), and material yes/no under the current thresholds. Opening a row shows a **detail panel**: every individual rating per criterion and per source with its justification; who answered (survey: the invitation reference, stakeholder group, expertise and explanation; the invitee's name and any title are shown here only; live session: the participant list); each expert's overall comment; session notes; the IRO's type, description, time horizon and methodology version; calculated versus calibrated value; **Owner** and **Moderator** fields (chosen from the stakeholder map or typed; a warning — not a block — if they are the same person); the EBITDA band selector for financial IROs; a small live position against the thresholds; the **full change history** (old → new value, reason, who, when — never overwritten); and the actions **Adjust this topic** (slider and reason; saving confirms the exact before and after values and appends a history row), **Reset to calculated** (also appends a row) and **Reviewed with owner** (a tick with date). Calibration is available in stage Calibrating only.
  2. **Results** — the topic summary (one card per ESRS topic in use: IRO count, rated count, average impact and financial score, MATERIAL badge), the **bar chart** of every scored IRO (colour-coded by ESRS pillar, sorted high to low), a compact table of material topics, and the **threshold controls**. Thresholds are editable **only here and only in stage Calibrating**; a banner says so. Changing one requires an explicit **Apply** with a reason, which appends a row to the threshold change log. In stages Collecting and Signed off the threshold controls are read-only with an explanation.
  3. **Matrix** — the two heatmaps (Impact: severity × likelihood; Financial: magnitude × likelihood, numbered 1–5 scales, shaded higher-materiality zone) and the impact × financial materiality matrix, with points colour-coded by ESRS pillar and shape-coded by type. Thresholds shown are the cycle's stored thresholds; they cannot be changed here.
- **User actions:** Filter, open rows, adjust, reset, mark reviewed, edit thresholds (Results tab, Calibrating only), switch tabs.
- **What happens next:** Every change updates all three tabs immediately from the calibrated value where one exists, otherwise the calculated one, with a "calibrated" or "calculated" marker on each point. Results are labelled **Provisional** until the cycle is signed off. Nothing is hidden while data is incomplete — only submitted responses count.

### Report builder

- **Purpose:** Produce the DMA report as a Word document.
- **What is visible:** A four-step flow. **Step 1 — Preset:** *Audit pack* (all six sections) or *Client report* (sections 1, 3, 4 and 5; sections 2 and 6 optional). **Step 2 — Sections** (tick or untick each): (1) **Cover and basis** — the two optional logo slots (the consultant's and the client's), client, financial year, ESRS version, cycle, dates, Provisional or Final label; (2) **Process and methodology** — steps followed, scoring rules, methodology version, both thresholds with their baseline and change log; (3) **Engagement** — a table of stakeholder groups (invited versus responded), including silent stakeholders with who represents them and the basis for representation, expertise coverage E1–G1, and live session dates and attendees; (4) **Topics and results** — the graphs as images on a white background plus the topic table (type, score by source, calibrated value, material yes/no); (5) **Calibration and sign-off** — every calibration change with old value, new value, reason, who and when, then the approver, role, date and minutes reference; (6) **Appendix** — all ratings with justifications in a table, and experts' overall comments. **Step 3 — Options:** personal data **off by default** (expertise and stakeholder group only; names and titles included only if ticked); justifications (in full / only for flagged topics / excluded); scope (all topics, material only, or one ESRS topic); an optional free-text note per section. **Step 4 — Preview and download** as a Word file.
- **User actions:** Choose preset, sections and options; preview; download.
- **What happens next:** The .docx is built in the browser and downloaded. A **Provisional** footer stamp runs on every page until the cycle is signed off; Final appears only after sign-off. For a locked copy the consultant uses Word's own "Save as PDF".

---

## Section 9 — Logic and Calculations

**Reference:** `reference-prototype/src/lib/calc.js` is authoritative for the arithmetic below **except where this section changes it**; port it, then apply the v2 changes listed here.

**What is calculated or scored:** Severity, impact score, financial score, discrepancy and source-gap flags, override flag, materiality per IRO and per topic, response completeness.

**Inputs:** Submitted ratings (from the combined ratings view), the IRO's type, actual/potential and human rights flag, the cycle's two thresholds, and calibrated values.

**Which criteria apply (what is asked, and therefore what can be scored):**

| IRO | Criteria |
|-----|----------|
| Negative impact, potential | Scale, Scope, Irremediability, Likelihood |
| Negative impact, actual | Scale, Scope, Irremediability (likelihood not asked) |
| Negative impact flagged potential human rights impact | Scale, Scope, Irremediability (likelihood not asked) |
| Positive impact, potential | Scale, Scope, Likelihood |
| Positive impact, actual | Scale, Scope (likelihood not asked) |
| Risk or opportunity | Magnitude, Likelihood (financial likelihood) |

**Formula or rules:**
- **Assessor:** every submitted expert survey response counts as **one assessor**; a finished expert live session counts as **one assessor**. Drafts are excluded.
- **Severity, negative impact:** average of Scale, Scope, Irremediability — **unless any one of the three equals 5, in which case severity is 5** (precautionary override).
- **Severity, positive impact:** average of Scale and Scope. No override.
- **Impact score, potential impact:** severity × (likelihood ÷ 5). Likelihood is asked on the 0–5 scale and divided by 5 at calculation.
- **Impact score, actual impact:** severity (likelihood treated as 5).
- **Impact score, potential human rights impact:** severity alone — likelihood is not applied (severity takes precedence).
- **Financial score:** magnitude × (financial likelihood ÷ 5). No override.
- **Aggregating assessors:** the IRO's impact score is the average of every assessor's impact score; likewise for the financial score. Results always show the **scores by source** (survey average, live session) side by side, and the basis label ("survey only", "session only", "combined").
- **Discrepancy ("Needs review"):** the spread (max − min) across assessors' scores on the relevant axis is ≥ 1.5. **Source gap:** the survey average and the live session score differ by ≥ 1.5. **Override flag:** at least one assessor's negative-impact rating hit the override (any of Scale, Scope, Irremediability = 5), with the triggering dimension recorded.
- **Effective value:** the calibrated value where one exists, otherwise the calculated score.
- **Materiality per IRO:** an impact IRO (negative or positive impact) is material if its effective score ≥ the cycle's **impact threshold**; a risk or opportunity is material if its effective score ≥ the cycle's **financial threshold**. Both default to 3.0 and are stored **per cycle**, not per IRO. Either axis being met is sufficient for materiality (impact OR financial).
- **Topic roll-up:** a topic's impact score is the average of its impact IROs' effective scores (baseline 1 if none); its financial score is the average of its risks' and opportunities' effective scores (baseline 1 if none). A topic is material if **any** constituent IRO is individually material.
- **Thresholds:** two per cycle, impact and financial. The **baseline** is recorded at cycle setup. They can be changed only in stage Calibrating, in the Results tab, by pressing **Apply** with a reason; each change appends (old, new, reason, who, when) to `threshold_changes`. They are read-only in Collecting and Signed off. Impact thresholds are commonly set differently from financial ones because impact ratings tend to come out lower; the reason for any difference should be recorded.
- **Stages and labels:** Collecting (Provisional; thresholds read-only) → Calibrating (Provisional; thresholds and calibration editable) → Signed off (Final; everything locked until sign-off is revoked; the database blocks new ratings and edits for the cycle). Revoking a sign-off returns the cycle to Calibrating and is logged.
- **Sign-off:** records approver name, role, date, minutes reference and the logged-in user as "recorded by". If the cycle's "require both sources" setting is on, sign-off is blocked until both an expert survey and an expert live session have submitted data. The maker–checker rule (Owner ≠ Moderator on a flagged IRO) is shown as a warning, not enforced, in v1.
- **Calibration:** every adjustment or reset appends to `calibration_history` (old value, new value, reason, who, when); the calculated value is never deleted or overwritten. Sign-off is cycle-level, not per topic; "Reviewed with owner" is a tick with a date per topic.
- **Methodology version tag:** every calculated result is stamped `severity-avg-with-override-v2`, shown in Calibrate and in the report, so a later change to the method is traceable.
- **Financial year to ESRS version:** financial year 2026 pre-selects ESRS 2023 as amended; 2027 or later pre-selects ESRS 2026; the consultant can override, and the choice and year are stored on the cycle and printed on every report.
- **Completeness check:** for each submitted response, expected rows (topics × applicable criteria) versus rows received; any gap is flagged. Response counts are derived from invitations and submissions.

**Output:** Scores (number 0–5), material yes/no per IRO and topic, flags, and the Provisional or Final label.

**Edge cases:**
- Skipped criteria (empty value) are **excluded** from averages; if an assessor skipped every criterion of an axis for an IRO, that assessor is excluded from that IRO's average for that axis. An IRO with no rating on an axis shows "Not yet rated" and is not material by default.
- If no likelihood was recorded for a **potential** impact, show the severity unscaled and flag it.
- A cycle with only one assessment type shows the basis label accordingly and results still display.
- Draft or paused sessions and unsubmitted surveys are excluded from every result.
- Editing a signed-off cycle is blocked; revoking sign-off unlocks it and is logged.
- **Draft auto-save:** from the moment mode and perspective are chosen, a draft assessment is kept in sync at each step. **Live session resume:** in-progress ratings and the current topic are preserved across pause, tab switches and explicit exit.

---

## Section 10 — Brand and Visual Direction

**Brand reference:** No brand skill file — described here directly (Apus brand for the console).

**Console (dark, data-tool feel — deliberately distinct from Tool A's light theme):**
- **Primary colour:** accent `#4C6FFF` (never Tailwind blue defaults)
- **Secondary colour:** base `#07070B`, surface `#100E15`, surface-2 `#1A1820`, border `#2A2830` (never white or Tailwind gray defaults); semantic colours `#5ED996` (positive / Environmental / Calibrated), `#D79A4C` (Material / risk / Governance), `#9B7FE0` (assessments-run stat only)
- **Font:** Inter (body), Jost (wordmark)
- **Logo:** Apus swift mark; the client logo and consultant logo are uploaded for Tool A and the report.

**Word report:** white pages, dark text, **one accent colour** for headings and table header rows (default `#1F9A63`, the Expert Survey green, unless a greenfriend brand colour is supplied — see Section 15), Calibri with an Arial fallback, graphs on white backgrounds, topics and stakeholders in tables, professional and compact.

**Visual feel:** Console — dark, focused and data-heavy. Report — professional and corporate.

**Reference or inspiration:** `reference-prototype/` is authoritative for the existing console screens (see the prototype note at the top).

---

## Section 11 — API and Credentials

| Service | What it does in this tool | Key required | Where key is stored |
|---------|--------------------------|-------------|-------------------|
| Supabase | Database, Auth (magic link), file storage (logos) | Anon / publishable key (public, browser-safe) | Netlify environment variables |

No other external service is used. The Word report is built in the browser with a Word-generation library chosen by Claude Code (no key). The service role key exists in the project but has **no use case here** — do not wire it into anything; flag to the builder first if one appears.

**Credentials readiness:**

| Credential | Status | Where to get it |
|-----------|--------|----------------|
| Supabase anon / publishable key | Available (existing project) | Supabase dashboard → Project Settings → API |
| Supabase service role key | Not used by this tool | — |

> No API key, token or password may appear in any HTML or JavaScript file or any file committed to GitHub.

---

## Section 12 — Out of Scope — Phase 2

| Deferred feature | Reason it is deferred |
|-----------------|----------------------|
| Approver role with its own login, and per-client permissions (roles) | Needs per-client permission rules; a single client and a single access level are enough to validate the idea. Sign-off in v1 is recorded by the consultant with the approver's name, role, date and minutes reference |
| Emailed links (sending invitations from the tool) | Links are copied and sent manually; the email arm stays off |
| Weighting between the expert survey and the live session | Live session counts as one assessor; a weighting setting needs a methodology decision |
| A formal methodology change log | The methodology version tag is enough for v1 |
| Per-sitting attendance for live sessions | One editable attendee list with an edit log is used instead |
| Locked PDF export and PNG chart downloads | Replaced by the Word report; Word's own "Save as PDF" covers a locked copy |
| CSV export of raw ratings | The report appendix table covers it; add if needed |
| File upload for approval minutes | A reference field is used instead |
| Word report editing inside the tool, or a second report format | The consultant edits the downloaded Word file |
| Automatic scheduled purge of drafts | Manual purge action instead |
| Tying calibration owner and moderator to login accounts | Names are recorded as text |
| Document search or knowledge base | Out of framework scope — advanced build |

---

## Section 13 — Acceptance Criteria

| # | What to verify | Expected result | Done? |
|---|---------------|-----------------|-------|
| 1 | Login works and is invite-only | Magic link signs in an invited user; an uninvited email cannot create an account; self-signup is off | [ ] |
| 2 | New cycle starts with the financial year | Step 1 asks the financial year; the ESRS version is pre-selected (2026 → 2023 as amended, 2027+ → 2026), overridable; thresholds default 3.0/3.0 and are stored as baseline | [ ] |
| 3 | Silent stakeholders prompt appears | The cycle setup asks the question, stores the answer and note, and does not block progress | [ ] |
| 4 | Stakeholders module supports silent stakeholders | Silent group type with the three presets, custom entries allowed, guidance text shown, consent checkbox on the add-contact form | [ ] |
| 5 | Topics library respects ESRS version and flags | Entries carry version, time horizon (risks and opportunities) and the human rights flag; sub-topic list follows the version; custom sub-topic allowed under ESRS 2026; CSV flags unmatched codes | [ ] |
| 6 | Assessment types are renamed everywhere | UI and stored values use Expert survey / Expert live session (`expert_survey` / `expert_live_session`); no "quantitative" or "qualitative" remains | [ ] |
| 7 | Justification mode is settable per assessment | Per criterion (default) or per topic; Tool A and the live session both follow it | [ ] |
| 8 | Invitations work | Adding an invitation (with consent checkbox) creates a unique personal link; the link opens only that invitation's survey; status moves Invited → Opened → Saved → Submitted; a group mismatch is flagged | [ ] |
| 9 | Participants list works | Name and expertise are required; add, edit and soft-remove work at any time; every change appears in the attendance edit log | [ ] |
| 10 | Live session save and pause | "Save and pause session" is on every topic screen; the session shows Paused; reopening resumes at the exact topic; ratings stay drafts until Finish | [ ] |
| 11 | All responses land in one combined table | The combined ratings view shows one row per submitted rating with source, stakeholder group, expertise, justification and who (invitation reference or participant list) | [ ] |
| 12 | Drafts never count | Draft surveys and paused sessions do not appear in any score or result | [ ] |
| 13 | Scoring follows Section 9 | Severity override, impact and financial formulas, actual-impact likelihood default, human rights severity-only rule, live session as one assessor, discrepancy ≥ 1.5 and source-gap flags all match a hand-calculated test set | [ ] |
| 14 | Completeness check works | A submission with missing (IRO × criterion) rows is flagged | [ ] |
| 15 | Calibrate tab works | Table shows scores by source, flags, status and material yes/no; the detail panel shows every rating with justification, who answered and comments; adjust and reset append to history and never overwrite the calculated value | [ ] |
| 16 | Workspace stays in sync | An adjustment or threshold change updates the Calibrate, Results and Matrix tabs immediately, with a calibrated or calculated marker | [ ] |
| 17 | Thresholds are controlled | Impact and financial thresholds are editable only in the Results tab and only in stage Calibrating, only through Apply with a reason, each change logged; read-only in Collecting and Signed off | [ ] |
| 18 | Stages and labels work | Banner shows the stage; results show Provisional until sign-off, then Final | [ ] |
| 19 | Sign-off works | Records approver name, role, date, minutes reference and the logged-in user; locks edits and blocks new ratings; revoke returns to Calibrating and is logged; "require both sources" blocks sign-off when one source is missing | [ ] |
| 20 | Results content is correct | Topic summary, bar chart (pillar colours), material topics table, both heatmaps and the matrix render from effective values | [ ] |
| 21 | Report builder produces the Word file | Four steps work; presets set the right sections; the .docx has white pages, tables for topics and stakeholders, graphs as images, logo slots, and a footer with cycle, ESRS version, date and Provisional or Final | [ ] |
| 22 | Report protects personal data by default | Names and titles are absent unless explicitly ticked; silent stakeholders appear with their representatives and basis | [ ] |
| 23 | GDPR forms are complete | Consent checkbox and data statement on the invitation, participant and stakeholder contact forms; anonymising a person clears name and email and keeps ratings intact | [ ] |
| 24 | Security holds | With the anon key alone no personal data, invitation, participant or calibration record can be read; RLS is enabled on every table | [ ] |
| 25 | Tool deploys and is accessible at its Netlify URL | Live URL loads correctly on desktop after login | [ ] |

---

## Section 14 — Build Path

**This tool's tier:** Tier 3

---

### Pre-build steps — complete these before opening Claude Code

- [ ] Tool A (Expert Survey) is fully built and its shared migration is done
- [ ] `docs/supabase-setup.md` reflects the new schema (required input)
- [ ] Tool Architect skill — interview complete, this spec is written and confirmed by the builder
- [ ] Project Governor skill — CLAUDE.md and PROGRESS.md regenerated from this v2.0 spec (run **after** Tool A's build)
- [ ] GitHub repo for this tool exists
- [ ] product-spec.md (this file, renamed) uploaded to the repo root
- [ ] CLAUDE.md uploaded to the repo root
- [ ] PROGRESS.md uploaded to the repo root
- [ ] Netlify already connected (Netlify MCP is active)
- [x] Deletion contact confirmed and written into the data statement (Section 7)
- [ ] All credentials identified and ready as environment variables — not written in any file (Section 11)

> Claude Code organizes these files into the correct folder structure automatically at the start of the first session.

---

### Tier 3 — build session

- [ ] Open Claude Code in the project folder
- [ ] Claude Code runs the Session Protocol: stops if the spec version is newer than the CLAUDE.md
- [ ] Claude Code reads product-spec.md, CLAUDE.md and PROGRESS.md
- [ ] **Supabase — existing project:** Claude Code reads docs/supabase-setup.md and reviews the current schema before any change; it does not create a project or recreate tables
- [ ] Claude Code builds any remaining tables, RLS policies and Auth configuration via Supabase MCP (the shared migration was done in Tool A's build)
- [ ] Claude Code updates docs/supabase-setup.md
- [ ] Claude Code builds the frontend from Section 8
- [ ] Test locally before deploying, including a full click-through of the signed-in workflow
- [ ] **Netlify MCP active:** Claude Code sets environment variables and deploys automatically
- [ ] Optional post-build: run the Supabase QA skill to verify schema, RLS and auth configuration

---

## Section 15 — Open Questions

| Question | Who answers it | Blocking? |
|----------|---------------|-----------|
| Is the legal basis for holding invitee, participant and contact details, and the anonymise-on-request approach, acceptable? (Legal advice recommended.) | Builder | Pre-launch task — must be done before real experts are invited; does not block the build |
| Which financial year is the test client's assessment for? | Builder | No — chosen at cycle creation |
| The simplified ESRS delegated act was adopted on 3 July 2026 but may still be in its scrutiny period: check the act text for the topic and sub-topic list, time-horizon wording and top-down rules before locking the ESRS 2026 library | Builder + Claude Code, at build time | No — the library is version-tagged so it can be updated |
| Show a sample export to the assurance provider and ask what evidence they would want added | Builder | No — before the first real client cycle |
| Edge-case scoring rule: skipped criteria excluded from averages; an assessor who skipped every criterion of an axis is excluded from that axis. Confirm this is acceptable | Builder | No — default applies |
| Accent colour for the Word report: use `#1F9A63` or a greenfriend brand colour? | Builder | No — default `#1F9A63` |
| Can one representative cover several silent stakeholders, or one each? | Builder | No — the model allows both |
| How does this tool know Tool A's site address for building personal links (no environment variable or setting is defined for it yet)? | Builder + Claude Code, at build time | No — resolve during the build |
| Before a second client is onboarded, the public key can still read Tool A's display tables in full (assessments, iros, clients, stakeholder groups). Route these reads through link-code functions to keep clients' topics separate | Builder + Claude Code | No — before a second client |
| Should the expert survey's "require both sources before sign-off" default stay off? | Builder | No — default off |
| The project stays on the Free plan, which pauses after about a week without traffic and breaks personal and resume links until restored. Accepted risk: during a survey window, open a survey link or the console at least weekly, and check before sending links | Builder | No — accepted |
| Whether score calculation should later move into a database view (multiple assessors aggregated) | Claude Code, at build time | No — the frontend port is the default |

---

## Section 16 — Tool Version History

| Version | Date | What changed in the tool |
|---------|------|--------------------------|
| v1.0 | 2026-09-10 | Initial build — documents the working prototype's full consultant workflow (dashboard, wizard for both assessment modes, live session, calibration, results) |
| v1.1 | 2026-09-11 | Consolidated Preview into one Review Hub; added assessment deletion |
| v1.2 | 2026-09-16 | Master Stakeholders and Topics modules replacing per-assessment CSV upload; sign-off and calibration history; session notes; redesigned Dashboard and Results |
| v2.0 | 2026-09-20 | Assessment types renamed **Expert survey** and **Expert live session**. Work organised into **cycles** per client, starting with the financial year, which pre-selects the ESRS version (2023 as amended or 2026). **Invitation list** (name, email, group) with personal links; **live session participants** (name and expertise, editable, with an edit log) and **Save and pause**. All responses in one combined ratings table with source, who and justification; **justification** per criterion or per topic. **Silent stakeholders** (nature and others) supported through representatives and a cycle-setup prompt. Merged **Calibrate & Results workspace** with three tabs, **two thresholds** (impact and financial) controlled by stage, Provisional/Final labels and cycle-level sign-off with approver, role, date and minutes reference. Scoring updated: actual impacts and potential human rights impacts need no likelihood; live session counts as one assessor; source-gap flag; methodology v2. **Word report builder** (six sections, two presets, logo slots) replaces the CSV/PNG/PDF export panel. Consent forms added for every form that adds a named person; GDPR applies. |
| v2.0 (amended) | 2026-09-20 | Documentation aligned with the build, no scope change: Tool A's public access to invitations, submissions, ratings and topic justifications is through six link-code functions (anon has no direct table access); `financialLikelihood` retired as a criterion key; personal link format recorded; two open items added. |

---

*This spec is written for Claude Code. It assumes zero prior context. Every decision, rule, and requirement must be explicit enough that the builder can hand this document to Claude Code without a single verbal explanation.*

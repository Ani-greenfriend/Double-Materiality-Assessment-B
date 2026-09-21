> **REFERENCE ONLY — the v1.2 spec, kept because it describes every prototype screen in detail.** Section 8 here is the reference for the look, copy and behaviour of each screen being restored. Where `product-spec.md` (v2.0) removes or changes something — the renamed assessment types (Expert survey, Expert live session), cycles, invitations and participants, justifications, silent stakeholders as a group option only, the merged Calibrate & Results workspace with two thresholds, the PDF report, Enter expert responses, cycle-level sign-off — **v2.0 wins**. Everything else described below must exist in the restored screens.

---

# Product Spec — Apus DMA — Consultant Console

**Version:** 1.2
**Date:** 2026-09-16
**Author:** Anika (greenfriend)
**Status:** Confirmed

---

> **Stack notice:** This is Tool B of a two-tool stack. Tool A — **Apus DMA — Participant Questionnaire** — is the public, no-login page stakeholders use to submit ratings, and it shares this tool's Supabase project. See `product-spec-apus-dma-participant.md`. Tool A must be built first (it creates the shared schema); this tool's build session must not start until `docs/supabase-setup.md` exists.
>
> **Prototype note:** the working prototype (React/Vite, in-memory state, no backend, single-user) currently keeps everything — assessments, IROs, ratings, calibrations — in React state that resets on reload. The real build replaces all of this with Supabase tables (Section 5) and real authentication (Section 6). The "Preview" feature currently renders Tool A's own component tree inline, inside this app; in the real build this stays true, since Preview is explicitly meant to be a local render, not a network round-trip to the live Tool A site (see Tool A spec's prototype note).

---

## Section 1 — Tool Summary

**Tool name:** Apus DMA — Consultant Console

**What it does:** The internal working tool a sustainability consultant uses to run ESRS Double Materiality Assessments for a client: maintain a master Stakeholder map, build a master Topics library (Impacts/Risks/Opportunities against ESRS AR16 topics and their real disclosure-requirement sub-topics, added one at a time or via bulk CSV upload), choose between a quantitative multi-criteria stakeholder questionnaire (distributed via a link) or a qualitative single-slider expert live session, customize what participants see, run or distribute the assessment, calibrate the results with subject-matter experts (with a full audit-trail history and a formal sign-off step), and view the final materiality determination — a topic-level rollup summary, a colour-coded bar chart, two large detailed heatmaps, and an adjustable Impact × Financial materiality matrix — exportable as CSV, PNG, or PDF.

**Who uses it:** Independent CSRD/ESRS sustainability consultants (the tool was designed around greenfriend's own practice) and, potentially, collaborators they work with on the same engagement.

**Why it exists:** Replaces a spreadsheet-and-slide-deck double materiality workflow with one guided tool that enforces the audit-defensible methodology (per-criterion scoring with a documented override rule, multi-assessor discrepancy detection, an explicit calibration step with a maker-checker rule) end to end.

**Build status:** First build — no prior version.

---

## Section 2 — Classification

### Data Model

**Decision:** D3

**Reason:** Assessments, IRO lists, every individual rating, and calibration decisions must all persist and be reviewable long after any single session ends — often across weeks, as different stakeholder groups or live sessions complete at different times.

**D3 triggers that apply:**
- [x] Data must be retrievable after the session ends
- [x] Multiple sessions contribute to the same dataset (multiple assessments per topic set, multiple assessors per IRO)
- [x] An audit trail or history is needed (calibration keeps the original calculated value alongside any override, with a stated reason)
- [x] Data submitted by one person must be visible to another (participant submissions reviewed by the consultant; calibration involves an owner and a separate moderator)
- [ ] Results must be accessible via a URL after the session ends
- [ ] Files uploaded by users must be stored and retrievable later *(the company logo is the only file — small enough to store as a data URL or in Supabase Storage; not a driver of D3 on its own)*

---

### Access Model

**Decision:** A2

**Reason:** Only the consultant (and any collaborators explicitly given access) should be able to create, edit, or view assessments and results. All logged-in users currently have the same permissions — there is no distinction between e.g. an owner and a junior team member in what was built.

> **Promotion rule applied:** this tool's data model was already D3 independent of auth, so the promotion rule doesn't change the outcome — but it would apply regardless, since A2 always implies D3.

### Auth reason and signup model

**Auth reason:** Identity and continuity — the consultant needs to save assessments and return to them across sessions, and (per the Peniche/Amsterdam working pattern) across devices.

**Signup model:** Invite-only — the builder (Anika) invites specific collaborators (e.g. a partner such as Becca, or freelance specialists in her network) through the Supabase dashboard, rather than open self-signup. Nothing in the built prototype implies public signup should be possible.

**Authentication method:** Magic link — recommended for an invite-only tool with a small number of known users; no password to manage.

---

### Tier

**Tier:** 3 (D3 + A2)

---

### Standalone or Stack

**This tool is:** Part of a stack — see the stack notice at the top and Section 4.

---

## Section 3 — Arms

**AI API:** Not active. Every scoring, aggregation, and materiality decision in the built prototype is deterministic arithmetic (Section 9) — no model call is involved anywhere.

**Export:** **Active.** The Results screen offers a download panel with a format switch — CSV (raw data behind each chart: IRO scores, heatmap points, topic matrix rows, each naming exactly which IRO sits behind which data point), PNG (one rasterized image per selected chart, 2x scale), or PDF (all selected charts combined into one multi-page document with titles). The user picks which of three chart groups to include (Bar chart, Impact & Financial heatmaps, Topic matrix) independently of format; the bar chart is CSV-only since it has no axes to rasterize meaningfully. Client-side only — no server-side rendering or storage involved, uses the browser's own canvas/SVG-to-PNG rasterization plus the `jspdf` library for the PDF path.

**Email:** Not active. The participant link is generated and shown for manual copy/paste; nothing is emailed by the tool itself.

**Scheduled Automation:** Not active.

---

## Section 4 — Stack and Deployment

| Detail | Answer |
|--------|--------|
| Frontend framework | React + Vite + Tailwind (exact match to the built prototype) |
| Deployment target | Netlify |
| Netlify MCP | **Open question** — see Section 15 |

**GitHub:** A separate repo from Tool A's, containing this spec, CLAUDE.md, and PROGRESS.md at its root before the first Claude Code session.

### Supabase project

**Status:** Existing — this build uses the project Tool A already created.

| Detail | Answer |
|--------|--------|
| Project name | `greenfriend-dma` — confirmed (same project Tool A creates) |
| Project ID | From `docs/supabase-setup.md`, produced by Tool A's build |
| supabase-setup.md location | docs/supabase-setup.md, read by Claude Code before any schema change |

**Plan:** Pro (same project as Tool A — see that spec's reasoning).

### Stack detail

**This tool's role in the stack:** Tool B — internal, authenticated console (reads and writes everything except the raw `ratings` rows Tool A writes).

See Tool A's spec Section 4 for the full stack table and build-order rule.

---

## Section 5 — Data Architecture

This section is the authoritative schema description for the shared Supabase project — Tool A's spec Section 5 covers only the `ratings` table it writes; every other table below is owned by this tool.

### Tables

| Table name | What it stores | Key fields |
|-----------|-----------------|-----------|
| assessments | One row per created survey/session | id, name, description, mode (`quantitative`/`qualitative`), perspective_filter (`full`/`impact`/`financial`), status, start_date, end_date, slug, logo_url, welcome_text, task_text, mandatory (bool), respondents_done, respondents_total, created_by, created_at, updated_at |
| topic_library | The master IRO library, independent of any single assessment — this is now the single source assessments read their topics from, replacing the old per-assessment CSV upload step entirely | id, iro_type (`neg_impact`/`pos_impact`/`risk`/`opportunity`), esrs_topic_id (top-level, e.g. `E1`), esrs_subtopic (the real EFRAG disclosure-requirement string, e.g. `E1-6 Gross Scopes 1, 2, 3 and Total GHG emissions` — not a separate coded field, matched by code prefix on CSV import), short_title, description, actual (bool), value_chain (`own`/`upstream`/`downstream`), reference_code (auto-generated, e.g. `IMP-E1-01`), signed_off_by (nullable), signed_off_at (nullable) |
| iros | One row per Impact/Risk/Opportunity topic within an assessment — now synced from `topic_library` rather than populated by CSV import; an assessment's `iros` are a perspective-filtered snapshot of the library at creation time, keeping their own accumulated ratings even if the library entry later changes | id, assessment_id (FK), topic_library_id (FK, nullable if the source library entry was later deleted), esrs_topic_id, name, description, iro_type, actual, impact_threshold, financial_threshold, session_notes (nullable, free text — see below), order |
| ratings | Owned by Tool A — see that spec. This tool reads it to compute scores. | — |
| assessor_ratings | One row per (IRO × assessor), used by the quantitative admin grid and the qualitative live session — distinct from Tool A's per-criterion `ratings` rows, which are the raw per-question form used by public link participants; this table holds one consolidated row per assessor per IRO once a full pass is complete | id, iro_id (FK), assessor_label (e.g. "Live session," or a named expert), scale, scope, irreversibility, likelihood, magnitude, financial_likelihood, recorded_at |
| calibrations | One row per IRO's **current** calibration state, plus a full change history — every adjustment is appended, never overwritten, so the old→new trail stays visible even after multiple rounds of calibration | id, iro_id (FK), owner, moderator, calibrated_value (nullable, current), notes (current), band_value (nullable, EBITDA band 1–5), calibrated_at, signed_off_by (nullable), signed_off_at (nullable) |
| calibration_history | One row per calibration change (append-only audit log) | id, calibration_id (FK), from_value (nullable), to_value, notes, changed_by, changed_at |
| participants | Expected participant list for a qualitative live session | id, assessment_id (FK), name, title, expert_topic |
| stakeholder_groups | The master stakeholder map — persists independently of any single assessment, unlike the old per-assessment option lists | id, name, perspectives (array: `impact`/`financial`, both possible), order |
| stakeholder_members | Named contacts within a stakeholder group | id, group_id (FK), name (required), title/role (required), company, email (optional, format-validated), pillars (array of `E`/`S`/`G` — a person can be tagged across all three, not just one), expertise (free text, e.g. "Climate risk") |

> **Reconciling `ratings` vs. `assessor_ratings`:** the prototype's in-memory model stores one `assessments` array *per IRO*, each entry keyed by `assessor` (e.g. `"Live session"`, or an actual name) and holding the full set of six possible values (scale, scope, irreversibility, likelihood, magnitude, financialLikelihood — nulled out per type). Tool A's public questionnaire instead writes one row per *individual criterion answer*, because it needs to track skips at that granularity. Reconciling these two shapes into one clean schema (a single `assessor_ratings`-style table that both the public form and the admin grid write to, with per-criterion nullability) is a genuine design decision for the real build — flagged in Section 15, not resolved here.

**Sign-off (topic_library and calibrations):** both tables carry `signed_off_by`/`signed_off_at`. In the prototype this is a plain name-entry field ("real sign-in comes later," matching the pattern used for Owner/Moderator elsewhere) rather than tied to an authenticated user row — the real build should decide whether to keep it as free text or tie it to `auth.users` once real login exists (see Section 15). Editing a signed-off topic library entry, or making a further calibration adjustment on a signed-off IRO, clears the sign-off automatically — the UI blocks further edits until the sign-off is explicitly revoked.

**Derived or calculated data:** Yes — severity, impact score, financial score, discrepancy flags, override flags, and topic-level materiality are all computed on read (Section 9), not stored as columns. The real build should decide whether to compute these in the database (a view or RPC function) or in the frontend on load; the prototype does it in the frontend (`src/lib/calc.js`).

**File storage:** Yes — the company logo uploaded during survey setup, shown prominently at the top of every screen in Tool A's participant survey (not the Apus host branding, which stays small and secondary). Small enough to store as a data URL in the prototype; the real build should move this to Supabase Storage and store a URL in `assessments.logo_url`.

---

## Section 6 — Access and Permissions

**Auth configuration:**

| Detail | Answer |
|--------|--------|
| Authentication method | Magic link |
| Signup model | Invite-only |

> **Privacy note:** user accounts store email addresses; for this internal/client-facing tool, that falls under greenfriend's own privacy practice rather than a public consent flow.

**RLS — who can read and write what:**

| Table | User type | Can read | Can insert | Can update | Can delete |
|-------|-----------|----------|------------|------------|------------|
| assessments | Authenticated | All rows | Yes | Yes | Yes |
| assessments | Unauthenticated (anon) | Own assessment only, via slug (needed so Tool A can render the questionnaire) | No | No | No |
| topic_library | Authenticated | All rows | Yes | Yes | Yes |
| iros | Authenticated | All rows | Yes | Yes | Yes |
| iros | Unauthenticated (anon) | Rows belonging to the assessment being viewed | No | No | No |
| assessor_ratings | Authenticated | All rows | Yes | Yes | No |
| calibrations | Authenticated | All rows | Yes | Yes | No |
| calibration_history | Authenticated | All rows | Yes | No | No |
| participants | Authenticated | All rows | Yes | Yes | Yes |
| stakeholder_groups | Authenticated | All rows | Yes | Yes | Yes |
| stakeholder_members | Authenticated | All rows | Yes | Yes | Yes |
| stakeholder_groups / stakeholder_members | Unauthenticated (anon) | Rows belonging to the assessment being viewed (participant list pre-fill only) | No | No | No |

> This build has one access level for every authenticated user (no admin/team-member distinction was built) — if Anika later works with named collaborators who should have *different* permissions from her own, that becomes an A3 revision (add a `role` column and per-role RLS rows).

---

## Section 7 — GDPR

**GDPR outcome:** Applies.

**Personal data collected:**
- Participant name, job title, and area of expertise — collected through the "Expected participants" form when setting up a *qualitative* expert live session (Review & Customize screen).
- Named stakeholder contacts — name (required), title/role (required), company, email (optional), and which E/S/G field(s) they're an expert in — collected through the master Stakeholder module, independent of any single assessment.

> **Scope note:** unlike Tool A, this data is entered by the consultant *about* named individuals, ahead of a live session or as part of building the stakeholder map — not self-submitted by those individuals through a public form. It is still personal data stored in the database and should be treated as in scope.

**Consent checkpoint on the form:** Not currently implemented in the prototype — neither the "Expected participants" add-form nor the Stakeholder module's add-contact form has a consent checkbox or data statement. **This needs to be added before a real build ships** (see Section 15).

**Data statement text (to confirm with Anika before build):**
> "Your data will be stored securely and used only to organize and run this materiality assessment session. You can request deletion at any time by contacting [confirm contact]."

**Deletion mechanism:** Not yet defined — needs Anika's confirmation of who processes a deletion request and how (Section 15).

---

## Section 8 — Screen and UI Structure

Verified against the built source. Nav tabs, in order: Dashboard, Stakeholders, Topics, Assessment, Calibration, Results.

### Dashboard
- **Purpose:** Landing screen, at-a-glance status, and the entry point into the whole workflow.
- **What is visible:** A greeting ("Hello 👋" or "Hello, [name] 👋"), a notification bell (flags any assessment whose end date is within 3 days), a profile-initials button (click to set a display name); a large gradient hero card ("Start your double materiality assessment" / "Continue your assessment") with a glow effect and a pill-shaped "Get started →" button — clicking it goes straight to the Stakeholders tab, since that's step one of the real process; a row of six connected process-step cards (Stakeholder selection → Topic selection → Assessment of impact topics → Assessment of financial topics → Calibration → Downloadable result), each with a gradient icon badge, a connecting arrow to the next step, a hover tooltip explaining that step, and a real progress chip computed from actual data (e.g. "11 groups active," "62% rated," "Not started") — clicking a card navigates straight to that area; an Overview section with two columns — Assessments submitted count + a gradient-avatar Recent activity feed on the left, a "Quick tips" checklist card on the right.
- **User actions:** Click the hero button; hover or click any process-step card; click the bell or profile button.
- **What happens next:** Hero → Stakeholders tab. Process-step card → that specific tab (Stakeholders, Topics, Assessment mode-select, or Calibration/Results directly).

### Stakeholders (master map — independent of any single assessment)
- **Purpose:** Build and maintain the full stakeholder map once, up front, before any assessment references it.
- **What is visible — group overview:** Three summary stat cards (stakeholder groups selected, named stakeholders, groups still needing people added); a bold two-step explainer banner ("1 · Select stakeholder groups" / "2 · Add stakeholders in detail"); an Impact-perspective column and a Financial-perspective column of stakeholder groups (drag between them, or a "+ Both" quick button; dragging into the pool below removes a group non-destructively), plus a "Generic pool" of ~20 pre-seeded suggestions; each group row shows a large, prominent pill — "N people" in blue if it has named contacts, or a pulsing amber "+ Add stakeholders" call-to-action if it doesn't; a gradient "Stakeholders mapped — what's next?" banner at the bottom linking straight to Topics.
- **What is visible — inside a group:** A clearly labeled "← Back to all groups" button (not just an icon); an always-visible "Add a stakeholder to this group" form (one row of Name*/Role*/Company/Email, an "Expert in" E/S/G multi-select plus a free-text "area of expertise" field, then a large full-width "+ Add stakeholder" button below); Name and Role are required to save, with inline validation messaging; Email, if filled in, is checked against a standard email-format pattern and flagged if invalid (it stays optional — only the format is checked); the contact table shows Name/Role/Company/Email/Expert-in (multiple E/S/G badges plus the expertise text)/Actions (edit, delete).
- **User actions:** Drag groups between columns; add/remove/edit named contacts; click "+ Both"; navigate into/out of a group.
- **What happens next:** Clicking the sidebar's "Stakeholders" nav item always resets back to the group overview, even mid-way through a specific group. The bottom banner's button goes to Topics.

### Topics (master IRO library — independent of any single assessment; the sole source assessments read from)
- **Purpose:** Define every Impact, Risk, and Opportunity in scope, once, before any assessment is created.
- **What is visible:** A mascot ("How to select IROs") explaining the ESRS-topic-first, both-directions, actual-vs-potential, value-chain, when-in-doubt-include-it guidance; a "Bulk upload" panel with "Download template" (a semicolon-CSV with columns IRO Type / ESRS Topic / ESRS Sub-topic Code / Short Title / Description / Actual or Potential / Value Chain Location, plus a documented-values instruction row since plain CSV can't carry real Excel dropdowns) and "Upload CSV" (parses and reports per-row errors, flags unmatched sub-topic codes rather than silently dropping them); E/S/G filter pills; two sections — "Impacts (negative and positive)" and "Risks and opportunities" — each with a "+ Add topic" form: IRO Type, ESRS Topic (top-level select, E1–G1), **ESRS Sub-topic** (a second, dependent dropdown populated with the real EFRAG disclosure-requirement list for whichever top-level topic is selected — not free text), Short Title, Description, Actual/Potential, Value Chain (own/upstream/downstream); each saved topic gets an auto-generated reference code (e.g. `IMP-E1-01`); each topic row can be expanded to Edit (reopens the same form inline) or Delete (confirmation dialog, warns it will be removed from any assessment referencing it); each topic can be individually **signed off** (name-entry now, real auth later) — a green "✓ Signed off" badge appears, and editing the topic afterward automatically clears the sign-off; a gradient "Topics defined — what's next?" banner at the bottom linking straight to the Assessment mode-select screen.
- **User actions:** Add/edit/delete/sign off topics one at a time, or upload a CSV of many at once.
- **What happens next:** The banner's button goes to Assessment → Mode Select (skipping the Assessment Overview table).

### Assessment Overview
- **Purpose:** The list of every assessment created for the project.
- **What is visible:** A table — No., Survey name (clickable — opens the Review Hub), Survey type, Dates, Respondents, Status (a coloured pill — Draft / Scheduled / Active / Closed / Completed), and four action icons: eye (Review Hub), pencil (Edit setup), bar-chart (View results), trash (Delete, with confirmation). A "+ New Assessment" button.
- **User actions:** Click the survey name or eye icon; click pencil, bar-chart, or trash; click "+ New Assessment."
- **What happens next:** Name/eye → Review Hub. Pencil → re-opens the setup wizard pre-filled with this assessment's data (see the Congratulations screen entry below for what changed here this pass). Bar-chart → Results tab. Trash → on confirmation, permanently removes the assessment.

### New Assessment — Mode Select
- **Purpose:** Choose the assessment's delivery mechanism before anything else.
- **What is visible:** A floating "swift" mascot button (bottom-right, brightened gradient background so it stands out against the dark theme) that shows "What is a DMA?" on hover/click; a breadcrumb across the top (Mode → Perspective → General info → Review → Recipients); two gradient-icon cards — "Quantitative — stakeholder questionnaire" and "Qualitative — expert live session," each with a "USE THIS WHEN" sub-panel.
- **User actions:** Pick one card.
- **What happens next:** Moves to Perspective Select.

### New Assessment — Perspective Select
- **Purpose:** Scope the assessment to Impact IROs, Financial IROs, or both — and, critically, this is the point where the qualitative Expected Participants list gets pre-filled from the master Stakeholder map, filtered to only the groups tagged with the matching perspective (Impact-only pulls only Impact-tagged groups; Financial-only pulls only Financial-tagged; Full pulls every active group).
- **What is visible:** A mascot with "Impact vs. Financial perspective?" explanation; three option cards — Full, Impact perspective, Financial perspective.
- **User actions:** Pick one; "← Back" returns to Mode Select.
- **What happens next:** Moves to Survey Setup (General Information).

### New Assessment — Survey Setup (General Information)
- **Purpose:** Capture the assessment's identity and (for quantitative only) its schedule and link.
- **What is visible:** Survey name (with a live example placeholder), survey description, company logo upload. **Quantitative only:** start/end date pickers and a survey link field. "Proceed →" is disabled until required fields are valid.
- **User actions:** Fill fields; "← Back" returns to Perspective Select.
- **What happens next:** Moves **directly to Review & Customize** — there is no longer a separate Upload IROs step; the assessment's topic set comes from the master Topics library, filtered by the chosen perspective, automatically. Every field here is auto-saved as a Draft-status assessment row the moment Perspective is chosen.

### New Assessment — Review & Customize
- **Purpose:** Let the consultant see and edit exactly what participants will see before creating the questionnaire.
- **What is visible:** Colour-accented cards with icons — "Introduction" (welcome text, editable), "Rating Criteria" (task text, editable); for **quantitative** — a Stakeholder Groups card; for **qualitative** — an Expected Participants card (pre-filled per the perspective-filtering above, with an autocomplete suggesting existing master-map group names so a name typed here writes back to the master map too); an Assessment card listing every topic pulled from the library, scoped to the chosen perspective, each with its own Edit control; a mandatory-answers toggle. Button: "Choose who participates →" (qualitative) or "Choose who receives it →" (quantitative).
- **User actions:** Edit any field; add/remove participants or stakeholders; edit individual topics; toggle mandatory; click through.
- **What happens next:** Moves to the Recipients screen.

### Recipients
- **Purpose:** Confirm the final list of who actually gets the questionnaire / joins the session, with a way to exclude specific people without leaving the wizard.
- **What is visible:** Named contacts grouped under their stakeholder group headers; an included count and a "⭳ Download Excel (CSV)" export; drag any person down into an "EXCLUDED" zone (and back); a "+ Add more stakeholders" link that jumps to the Stakeholders tab and shows a floating "← Back to where you left off" banner across every other tab until the user returns.
- **User actions:** Drag to exclude/reinstate; download the list; add more stakeholders mid-flow.
- **What happens next:** "Continue →" creates the assessment and moves to the Created/Congratulations screen.

### Created / Congratulations
- **Purpose:** Confirm creation (or a re-edit of setup) and hand off to either review or the real thing.
- **What is visible — quantitative:** the run dates; a Preview card (inline Review Hub) and a Participant Link card (the real, external Tool A link).
  **What is visible — qualitative, first time:** "'[Name]' has been created. You're ready to run this live..." with a "Kick off your expert session →" button.
  **What is visible — qualitative, re-editing an already-completed session:** the messaging changes to "'[Name]' has been updated" / "Your changes are saved," with **"Back to overview"** as the primary button and "Or re-open the live session to continue rating" demoted to a secondary link — re-editing setup no longer silently resets the assessment's respondent count or completion status back to "not yet run" (a real bug found and fixed this pass; see Section 16).
- **User actions:** Preview / Kick off / Back to overview.
- **What happens next:** Preview → Review Hub. Kick off → Intro Flow, then the live Questionnaire. Back to overview → Assessment Overview, respondents/status untouched.

### Review Hub (both modes)
- **Purpose:** Let the consultant see and edit exactly what participants will see — without answering anything.
- Unchanged from v1.1 — jump-navigation bar, per-screen Edit toggles, fully inert rating controls, save/discard confirmation on Exit.

### Intro Flow (qualitative only) / Questionnaire (qualitative, one topic at a time)
- Unchanged from v1.1 in structure, plus: each topic now has a **"Session notes for this topic (optional)"** free-text box, positioned after the rating sliders and before Next/Finish — captured per-topic and, once the session finishes, surfaced automatically as context on that same topic's row in Calibration, so whoever calibrates later can see what the room actually discussed rather than reconstructing it from memory.

### QuantAssessmentGrid
- Unchanged from v1.1.

### Calibration
- **Purpose:** Let leadership or subject-matter experts review calculated results and, where the group agrees, adjust them with a documented, auditable reason — then formally sign off the final number.
- **What is visible:** A mascot ("What is calibration?"); an "All assessments" filter dropdown; a collapsed accordion, one bar per topic, colour-tinted by ESRS pillar, each showing the current score and a "Needs review" / "Calibrated" / "✓ Signed off" tag. Expanding a bar shows: the session notes captured during the live rating (if any), the IRO type/description/methodology version, calculated vs. calibrated value, Owner/Moderator fields for flagged IROs (maker-checker rule), an EBITDA magnitude-band selector for financial IROs, a **full change history** (every past adjustment listed with its old→new value, stated reason, who made it, and when — never overwritten), and the action row: "Adjust this topic" (opens a slider + notes field; saving requires confirming the exact before/after values and appends a new history entry), "↺ Reset to calculated" (also appends a history entry), and "✓ Sign off this result" (name-entry, timestamp; once signed off, Adjust/Reset are disabled until "Revoke" is clicked — a further adjustment always clears the sign-off automatically rather than letting a signed-off number silently drift).
- **User actions:** Filter by assessment; expand/collapse rows; adjust, reset, sign off, or revoke sign-off on a calibration.
- **What happens next:** Nothing forced — the consultant moves to Results when ready.

### Results
- **Purpose:** The final materiality output, with a full explanation of the methodology alongside it and multiple export options.
- **What is visible:** A mascot explaining exactly how each score is calculated and how to read the matrix. A **Topic Summary** section — one rollup card per top-level ESRS topic actually in use (e.g. "E1 · Climate change"), showing IRO count, how many are rated, average Impact/Financial score, and a MATERIAL badge. **Primary** — every scored IRO as a horizontal bar, now colour-coded by ESRS pillar (E/S/G), sorted highest to lowest. **Secondary** — two large, unified-SVG heatmaps (Impact: Severity × Likelihood; Financial: Magnitude × Likelihood), each with real numbered 1–5 scales on both axes, a clearly shaded "HIGHER MATERIALITY" zone with a dashed reference line, points colour-coded by ESRS pillar and shape-coded (circle = negative impact / risk, triangle = positive impact / opportunity) with non-overlapping labels placed directly on the chart (collision-avoided, not just hover tooltips). **Tertiary** — the Topic Matrix: E/S/G and Material/Not-material filters, adjustable Impact/Financial threshold inputs that redraw the quadrant lines and a "MATERIAL ZONE" label, an SVG scatter plot (one dot per topic — consistent full opacity regardless of material status; material topics are distinguished only by a ring and a slightly larger radius, never by fading non-material ones out), labels collision-avoided so nothing overlaps or gets clipped, and a side panel listing the IROs behind whichever topic is hovered or pinned, with a clear "👆 Hover or tap a dot" prompt when nothing is selected. A **download panel** at the bottom: pick which of the three chart groups to include, then pick a format — CSV (raw data), PNG (one image per chart), or PDF (all charts combined, one per page).
- **User actions:** Toggle filters; adjust thresholds; hover/click a topic dot; choose sections and format and download.
- **What happens next:** End of the current workflow — this is the deliverable view.

---

## Section 9 — Logic and Calculations

Verified line-by-line against `src/lib/calc.js`. This is the exact methodology the real build must reproduce.

**Severity (per assessor, per IRO):**
- Negative impact: average of Scale, Scope, Irreversibility — **unless any one of the three equals 5**, in which case severity is forced to 5 regardless of the average (the "precautionary principle" override).
- Positive impact: average of Scale and Scope only — no Irreversibility, no override.
- Risk/Opportunity: no severity axis (financial score is computed separately, see below).

**Impact score (per assessor, per IRO):** `severity × (likelihood / 5)`. Likelihood is captured on the same 0–5 scale as every other criterion for a consistent UX, then divided by 5 at the point of calculation. If no likelihood was ever answered, an *actual* impact defaults to likelihood = 5 (already occurring); otherwise the severity is shown unscaled and flagged.

**Financial score (per assessor, per IRO):** `magnitude × (financialLikelihood / 5)` — no override; a symmetric, expected-value approach (deliberately different from the impact axis's precautionary override).

**Aggregating multiple assessors on one IRO:** impact score = the average of every assessor's impact score; financial score = the average of every assessor's financial score.

**Discrepancy flag:** triggered when the spread (max − min) across assessors' scores on the relevant axis is **≥ 1.5**.

**Override-triggered flag:** true when at least one assessor's negative-impact rating hit the severity override (any of Scale/Scope/Irreversibility = 5). The specific dimension that triggered it is recorded for display.

**Materiality determination (per IRO):** impact-axis IROs are material if their impact score ≥ `impactThreshold` (default **3.0**, fixed per IRO at CSV import); financial-axis IROs are material if their financial score ≥ `financialThreshold` (default **3.0**). **Note:** these per-IRO thresholds are fixed at 3.0 and are *not* the same as the Results screen's adjustable matrix threshold inputs — those only redraw the matrix's visual quadrant lines and do not change which IROs are flagged material. This is a real inconsistency in the prototype worth resolving deliberately in the real build (see Section 15).

**Topic-level roll-up:** a topic's impact score is the average of its constituent impact-type IROs' scores (baseline 1 if the topic has no impact-type IRO); its financial score is the average of its constituent risk/opportunity IROs' scores (baseline 1 if none). A topic is material if **any one** of its constituent IROs is individually material.

**Methodology version tag:** every calculated result is stamped `severity-avg-with-override-v1`, shown in Calibration, so a later methodology change is traceable against results calculated under the old version.

**Calibration history and sign-off:** every calibration adjustment (or reset-to-calculated) is appended to a history log rather than overwriting the previous value — each entry records the old value, the new value, the stated reason, who made the change, and when. Sign-off is a distinct, later action from adjusting the value: it locks further adjustment until explicitly revoked, and any adjustment made after a sign-off automatically clears it (a signed-off number can never silently drift). The same "propose a change with a reason, append rather than overwrite" pattern is not applied to the raw calculated value itself — only to calibration overrides.

**CSV import matching:** see Section 8's Topics description — sub-topic codes on bulk upload are matched by prefix against the real EFRAG disclosure-requirement list for the given top-level topic (e.g. a CSV cell of "E1-6" resolves to the full "E1-6 Gross Scopes 1, 2, 3 and Total GHG emissions" string); unmatched codes are flagged for manual assignment, never silently dropped.

**Draft auto-save:** starting from the moment Mode + Perspective are chosen, a Draft-status row is created and kept in sync (name, dates, link, and every edit made on the Review & Customize screen) at each step transition — so abandoning the wizard mid-way never loses progress, and re-opening it via the pencil icon resumes exactly where it left off.

**Live-session resume:** for a qualitative assessment, in-progress ratings and the current topic index are preserved if the consultant navigates to another tab and back, or explicitly uses "Exit — resume later" — reopening via the eye icon on the Assessment Overview jumps straight back to the exact topic, skipping the intro screens entirely if there's already progress.

---

## Section 10 — Brand and Visual Direction

**Brand reference:** No brand skill file — described directly below (Apus brand).

- **Base colours:** App black `#07070B`, surface `#100E15`, surface-2 `#1A1820`, border `#2A2830`
- **Primary accent:** Badge Blue `#4C6FFF` — used for the active nav item, every primary button, progress bars, and the sidebar's diagonal gradient/dot-texture background
- **Secondary/semantic colours:** Signal Emerald `#5ED996` reserved for "positive impact"/"Environmental" semantics and the "Calibrated" status tag; Badge Amber `#D79A4C` reserved for "Material," "risk," "Governance," and EBITDA-band UI; a muted purple `#9B7FE0` for the "Assessments run" stat only
- **Typography:** Inter (body), Jost (wordmark)
- **Logo:** Apus swift icon, blue body / emerald wingtip, "apus" wordmark, "by greenfriend." beneath it in League Spartan
- **Sidebar:** a subtle diagonal blue gradient glow plus a fine dot texture, echoing the osapiens reference Anika supplied, recoloured to the Apus blue

**Visual feel:** Dark, focused, data-tool professional — distinct on purpose from Tool A's light, welcoming participant theme.

**Reference implementation — authoritative for UI/UX:** The working React/Vite prototype's full source is included in this repo at `reference-prototype/`. This spec describes structure and behavior in prose; the reference code (every file under `src/`) is authoritative for exact layout, copy, spacing, colours, and interaction detail — including the calculation logic in `src/lib/calc.js`, which must be ported exactly, not re-derived from Section 9's prose alone. Port this application faithfully onto Supabase + Auth — do not redesign from the prose description.

---

## Section 11 — API and Credentials

| Service | What it does in this tool | Key required | Where key is stored |
|---------|-----------------------------|---------------|------------------------|
| Supabase | Database, Auth (magic link), file storage for the logo | Anon key (browser) + Service role key (server-side only) | Netlify environment variables |

No AI, email, or export service is used — no other credentials apply to this build.

**Credentials readiness:**

| Credential | Status | Where to get it |
|-----------|--------|--------------------|
| Supabase anon key | Already created with the shared project (Tool A) | Supabase dashboard → Project Settings → API |
| Supabase service role key | Already created with the shared project (Tool A) | Supabase dashboard → Project Settings → API |

---

## Section 12 — Out of Scope — Phase 2

| Deferred feature | Reason it is deferred |
|-------------------|--------------------------|
| Email delivery of the participant link | Deferred — manual copy/paste today |
| Role-based permissions among multiple logged-in team members (A3) | Only one access level was built; would need explicit role definitions from Anika |
| Multi-tenant support (more than one consulting practice sharing this deployment) | Out of scope — this build is scoped to greenfriend |
| True concurrent-participant response counting in real time | The prototype simulated cross-tab handoff via `localStorage` + the browser `storage` event during design, but the final build relies on real Supabase writes and reads instead |
| GDPR consent checkbox on the Expected Participants form **and** the Stakeholder module's add-contact form | Identified as missing during this documentation pass — must be added before a real build ships (see Section 15) |
| Real authentication tied to Topics/Calibration sign-off | Currently a free-text name field, matching the existing Owner/Moderator pattern — should move to `auth.users` once real login exists |
| Admin-facing display of the qualitative session's free-text "Any other comments" field (Tool A) | The field exists and submits correctly from the participant side; nothing in this console currently surfaces it anywhere |

---

## Section 13 — Acceptance Criteria

| # | What to verify | Expected result | Done? |
|---|------------------|--------------------|-------|
| 1 | Dashboard stat cards and process-step progress chips reflect real data, not placeholders | Every chip (e.g. "11 groups active," "62% rated") matches the actual database state | [ ] |
| 2 | Mode Select → Perspective Select → Survey Setup → Review → Recipients flow completes for both modes | Each step's data is present on the next; "Create" produces a real assessment row | [ ] |
| 3 | Quantitative setup shows dates + link; qualitative setup shows neither | Confirmed by mode, per Section 8 | [ ] |
| 4 | Draft auto-save works | Abandoning the wizard after Perspective Select leaves a Draft-status row in Assessment Overview with whatever was filled in so far | [ ] |
| 5 | Topics module's dependent ESRS sub-topic dropdown only shows real EFRAG codes for the selected top-level topic, and CSV bulk-upload correctly matches sub-topic codes by prefix, flagging unmatched ones without dropping the row | Verified against the sub-topic list in Section 8 | [ ] |
| 6 | Severity override rule fires correctly | A negative-impact IRO with any one of Scale/Scope/Irreversibility = 5 always shows severity = 5, regardless of the other two values | [ ] |
| 7 | Discrepancy flag fires at the correct threshold | Two assessors ≥1.5 apart on the same IRO's relevant axis show "Needs review" | [ ] |
| 8 | Calibration's maker-checker rule blocks a matching moderator | Entering the same name as Owner and Moderator shows the blocking message and does not allow saving | [ ] |
| 9 | A calibrated value never deletes the calculated value, and every adjustment is appended to history, never overwritten | Both remain visible; "Reset to calculated" restores the original number and adds its own history entry; two successive adjustments both remain visible in the log | [ ] |
| 10 | Calibration sign-off locks further edits until revoked | "Adjust"/"Reset" are disabled once signed off; any adjustment after "Revoke" clears the sign-off automatically | [ ] |
| 11 | Results matrix reflects calibrated values where present | An IRO with a calibration override plots using that value, not the raw calculated one | [ ] |
| 12 | Live-session resume works | Exiting mid-questionnaire and reopening via the eye icon returns to the exact topic with prior answers intact | [ ] |
| 13 | Session notes captured during a qualitative rating pass appear as context on that same topic in Calibration | Notes typed during the live session are visible, not lost | [ ] |
| 14 | Stakeholder contact form enforces Name and Role as required, and validates Email format (without making it required) | Cannot save a contact missing Name or Role; an invalid email shows an inline warning but doesn't block saving if left blank | [ ] |
| 15 | Perspective-based participant pre-fill only pulls matching stakeholder groups | An Impact-only qualitative assessment's Expected Participants list excludes contacts from Financial-only-tagged groups, and vice versa | [ ] |
| 16 | GDPR consent checkbox blocks participant-list and stakeholder-contact submission (once added — see Section 15) | Neither form can save a person without the checkbox checked | [ ] |
| 17 | Editing an already-completed assessment's setup does not reset its respondents/status | Re-editing via the pencil icon and saving again leaves "Completed"/respondent counts untouched; only a real new rating session changes them | [ ] |
| 18 | Tool deploys and is accessible at its own Netlify URL, separate from Tool A's | Live URL loads correctly | [ ] |
| 19 | Deleting an assessment or a Topics-library entry requires confirmation | Confirmation dialog shown; only removes on confirmation | [ ] |
| 20 | Review Hub jump-nav reaches every screen directly, and edits only persist on explicit confirmation | Same as v1.1 behavior, unchanged | [ ] |
| 21 | Results download panel produces correct output for every format | CSV rows, PNG images, and the combined PDF all contain the same underlying data as the on-screen hover panels, correctly attributing each data point to its IRO/topic | [ ] |

---

## Section 14 — Build Path

**This tool's tier:** Tier 3

### Pre-build steps
- [ ] Tool Architect interview complete, this spec confirmed
- [ ] Project Governor run — CLAUDE.md and PROGRESS.md produced from this spec
- [ ] GitHub repo created for this tool specifically (separate from Tool A's)
- [ ] product-spec.md, CLAUDE.md, PROGRESS.md uploaded to this repo's root
- [ ] Netlify connected to this repo (skip if Netlify MCP is active)
- [ ] Confirm Tool A's build is complete and docs/supabase-setup.md exists before starting

### Tier 3 — build session
- [ ] Open Claude Code in this tool's project folder
- [ ] Claude Code runs First Session Setup
- [ ] Claude Code reads product-spec.md, CLAUDE.md, PROGRESS.md
- [ ] Claude Code reads docs/supabase-setup.md and reviews the existing schema (from Tool A) before making changes
- [ ] Claude Code builds the remaining tables (topic_library, assessments, iros, assessor_ratings, calibrations, calibration_history, participants, stakeholder_groups, stakeholder_members), RLS policies, and Auth configuration via MCP
- [ ] Claude Code updates docs/supabase-setup.md
- [ ] Claude Code builds the frontend from Section 8
- [ ] Test locally before deploying
- [ ] Deploy (automatic if Netlify MCP active, otherwise push to main + manual env vars)
- [ ] Optional: run the Supabase QA skill to verify schema, RLS, and auth configuration

---

## Section 15 — Open Questions

| Question | Who answers it | Blocking? |
|----------|-------------------|-----------|
| Is the Netlify MCP connector active in Claude Desktop? | Anika | No — affects deploy step only |
| Reconcile the `ratings` (Tool A, per-criterion, supports skip) vs. `assessor_ratings` (Tool B, one row per assessor per IRO) data shapes into one clean schema | Anika + Claude Code, at build time | Yes — needed before Section 5's tables can be finalized |
| Decide whether the per-IRO materiality threshold (fixed at 3.0) and the Results matrix's adjustable threshold inputs should be unified, or are intentionally two separate concepts | Anika | No — can ship with today's prototype behavior and revisit |
| Add the missing GDPR consent checkbox + data statement to the Expected Participants form **and** the Stakeholder module's add-contact form, and confirm the deletion-request contact/process | Anika | Yes — legal requirement before this tool collects personal names for real |
| Should collaborators (e.g. Becca) get different permissions from Anika (A3), or is one shared access level (A2) sufficient for v1? | Anika | No — can ship as A2 and revisit |
| Should severity/score calculation move into the database (a view or RPC) instead of the frontend, given multiple assessors' data is aggregated? | Anika + Claude Code, at build time | No — either approach works; affects maintainability, not correctness |
| Confirm Supabase project name (shared with Tool A) | Anika | Yes — needed before Tool A's build session, which this tool depends on |
| Should Topics/Calibration sign-off be tied to real `auth.users` rows instead of a free-text name field, now that Tier 3 auth exists? | Anika + Claude Code, at build time | No — the free-text pattern ships fine for v1 and can be upgraded once login is live |
| Should the qualitative "Any other comments" free-text field (submitted from Tool A) be surfaced anywhere in this console — e.g. attached to the relevant assessment or IRO? | Anika | No — the field already submits correctly; it's just not displayed anywhere yet |
| `jspdf` (and its bundled `html2canvas` dependency) was added for the Results PDF export — confirm this dependency and its bundle-size impact are acceptable for the real build, or whether a lighter PDF approach is preferred | Anika + Claude Code, at build time | No — works correctly in the prototype; purely a size/dependency tradeoff |

---

## Section 16 — Tool Version History

| Version | Date | What changed in the tool |
|---------|------|------------------------------|
| v1.0 | 2026-09-10 | Initial build — documents the working React/Vite prototype's full consultant workflow: Dashboard, Assessment Overview, the Mode/Perspective/Setup/Upload/Review creation wizard for both quantitative and qualitative assessments, draft auto-save, inline Preview, the qualitative live Questionnaire and quantitative admin grid, session resume, Calibration with maker-checker and EBITDA bands, and the Results screen (bar chart, heatmaps, adjustable materiality matrix). |
| v1.1 | 2026-09-11 | Consolidated the two separate "Preview" mechanisms into one Review Hub, reachable identically from the Created screen's Preview button and from Assessment Overview's survey-name/eye click: a jump-navigation bar across every screen and topic, per-screen Edit toggles, fully inert rating controls (no answer ever required), and an exit flow that only prompts to save when something was actually changed. Added assessment deletion (trash icon, confirmation dialog) to Assessment Overview. |
| v1.2 | 2026-09-16 | Major workflow restructure: added a master **Stakeholders** module (independent of any single assessment, mandatory Name/Role, format-validated optional email, multi-select E/S/G "expert in" tags plus free-text expertise, prominent group-size indicators, next-step guidance) and a master **Topics** module (manual add with a dependent real-EFRAG-sub-topic dropdown, or bulk CSV upload in a matching format) that together replace the old per-assessment CSV-upload step entirely — assessments now read their topic set from the Topics library, filtered by perspective. Added **sign-off** (Topics and Calibration) as a distinct, revocable action, and a full **calibration change-history log** (append-only, old→new, reason, who, when) replacing simple overwrite. Added qualitative **session notes** per topic, surfaced automatically in Calibration. Perspective selection now correctly pre-fills qualitative participants from only the matching-perspective stakeholder groups (previously pulled from all active groups regardless of perspective). Redesigned the Dashboard (gradient hero, six connected process-step cards with real progress, Quick tips). Substantially redesigned Results: a top-level ESRS topic-summary rollup, a pillar-coloured bar chart, larger heatmaps with real numbered 1–5 scales and a clearly shaded material zone, shape-coded points (impact type / risk-opportunity), collision-avoided labels throughout, and a new export panel offering CSV, PNG, or PDF output. Fixed a real bug where re-editing an already-completed assessment's setup silently reset its respondent count and status back to "not yet run." |

---

*This spec is written for Claude Code. It assumes zero prior context.*

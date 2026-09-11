# Product Spec — Apus DMA — Consultant Console

**Version:** 1.0
**Date:** 2026-09-10
**Author:** Anika (greenfriend)
**Status:** Confirmed

---

> **Stack notice:** This is Tool B of a two-tool stack. Tool A — **Apus DMA — Participant Questionnaire** — is the public, no-login page stakeholders use to submit ratings, and it shares this tool's Supabase project. See `product-spec-apus-dma-participant.md`. Tool A must be built first (it creates the shared schema); this tool's build session must not start until `docs/supabase-setup.md` exists.
>
> **Prototype note:** the working prototype (React/Vite, in-memory state, no backend, single-user) currently keeps everything — assessments, IROs, ratings, calibrations — in React state that resets on reload. The real build replaces all of this with Supabase tables (Section 5) and real authentication (Section 6). The "Preview" feature currently renders Tool A's own component tree inline, inside this app; in the real build this stays true, since Preview is explicitly meant to be a local render, not a network round-trip to the live Tool A site (see Tool A spec's prototype note).

---

## Section 1 — Tool Summary

**Tool name:** Apus DMA — Consultant Console

**What it does:** The internal working tool a sustainability consultant uses to run ESRS Double Materiality Assessments for a client: import a topic/IRO list, choose between a quantitative multi-criteria stakeholder questionnaire (distributed via a link) or a qualitative single-slider expert live session, customize what participants see, run or distribute the assessment, calibrate the results with subject-matter experts, and view the final materiality determination (bar chart, heatmaps, and an adjustable Impact × Financial materiality matrix).

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

**Export:** Not active in this build. No CSV/PDF download of results was built (CSV is used only as an *import* format for the initial IRO list — see Section 9). Deferred to Phase 2 (Section 12).

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
| iros | One row per Impact/Risk/Opportunity topic within an assessment | id, assessment_id (FK), esrs_topic_id (e.g. `E1`), subtopic_raw, name, description, iro_type (`neg_impact`/`pos_impact`/`risk`/`opportunity`), actual (bool), impact_threshold, financial_threshold, order |
| ratings | Owned by Tool A — see that spec. This tool reads it to compute scores. | — |
| assessor_ratings | One row per (IRO × assessor), used by the quantitative admin grid and the qualitative live session — distinct from Tool A's per-criterion `ratings` rows, which are the raw per-question form used by public link participants; this table holds one consolidated row per assessor per IRO once a full pass is complete | id, iro_id (FK), assessor_label (e.g. "Live session," or a named expert), scale, scope, irreversibility, likelihood, magnitude, financial_likelihood, recorded_at |
| calibrations | One row per IRO's calibration decision | id, iro_id (FK), owner, moderator, calibrated_value (nullable), notes, band_value (nullable, EBITDA band 1–5), calibrated_at |
| participants | Expected participant list for a qualitative live session | id, assessment_id (FK), name, title, expert_topic |
| stakeholder_options | The editable Impact/Financial stakeholder group option lists shown to participants (defaults are built-in; consultant can add/remove per assessment) | id, assessment_id (FK), group (`impact`/`financial`), label |

> **Reconciling `ratings` vs. `assessor_ratings`:** the prototype's in-memory model stores one `assessments` array *per IRO*, each entry keyed by `assessor` (e.g. `"Live session"`, or an actual name) and holding the full set of six possible values (scale, scope, irreversibility, likelihood, magnitude, financialLikelihood — nulled out per type). Tool A's public questionnaire instead writes one row per *individual criterion answer*, because it needs to track skips at that granularity. Reconciling these two shapes into one clean schema (a single `assessor_ratings`-style table that both the public form and the admin grid write to, with per-criterion nullability) is a genuine design decision for the real build — flagged in Section 15, not resolved here.

**Derived or calculated data:** Yes — severity, impact score, financial score, discrepancy flags, override flags, and topic-level materiality are all computed on read (Section 9), not stored as columns. The real build should decide whether to compute these in the database (a view or RPC function) or in the frontend on load; the prototype does it in the frontend (`src/lib/calc.js`).

**File storage:** Yes — the company logo uploaded during survey setup. Small enough to store as a data URL in the prototype; the real build should move this to Supabase Storage and store a URL in `assessments.logo_url`.

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
| iros | Authenticated | All rows | Yes | Yes | Yes |
| iros | Unauthenticated (anon) | Rows belonging to the assessment being viewed | No | No | No |
| assessor_ratings | Authenticated | All rows | Yes | Yes | No |
| calibrations | Authenticated | All rows | Yes | Yes | No |
| participants | Authenticated | All rows | Yes | Yes | Yes |
| stakeholder_options | Authenticated | All rows | Yes | Yes | Yes |
| stakeholder_options | Unauthenticated (anon) | Rows belonging to the assessment being viewed | No | No | No |

> This build has one access level for every authenticated user (no admin/team-member distinction was built) — if Anika later works with named collaborators who should have *different* permissions from her own, that becomes an A3 revision (add a `role` column and per-role RLS rows).

---

## Section 7 — GDPR

**GDPR outcome:** Applies.

**Personal data collected:** Participant name, job title, and area of expertise — collected through the "Expected participants" form when setting up a *qualitative* expert live session (Review & Customize screen). Not collected anywhere in the quantitative flow.

> **Scope note:** unlike Tool A, this data is entered by the consultant *about* named individuals, ahead of a live session — not self-submitted by those individuals through a public form. It is still personal data stored in the database and should be treated as in scope.

**Consent checkpoint on the form:** Not currently implemented in the prototype — the "Expected participants" add-form has no consent checkbox or data statement. **This needs to be added before a real build ships** (see Section 15).

**Data statement text (to confirm with Anika before build):**
> "Your data will be stored securely and used only to organize and run this materiality assessment session. You can request deletion at any time by contacting [confirm contact]."

**Deletion mechanism:** Not yet defined — needs Anika's confirmation of who processes a deletion request and how (Section 15).

---

## Section 8 — Screen and UI Structure

Verified against the built source (`App.jsx` flow states: `overview`, `mode`, `perspective`, `survey-details`, `upload`, `review`, `expert-created`, `intro`, `questionnaire`, `preview`).

### Dashboard
- **Purpose:** Landing screen and at-a-glance status.
- **What is visible:** A greeting ("Hello 👋" or "Hello, [name] 👋" once a name is set), a "Start here →" button (or "Continue to assessments →" once any assessment exists), a notification bell (flags any assessment whose end date is within 3 days, or "Nothing needs your attention right now"), a profile initials button (click to set a display name); four stat cards — Rating progress (%, with "X/Y IROs rated"), Topics tracked, Material topics (with "of N tracked"), Assessments run; a "Topics by materiality" bar (Material vs. Not material counts), a circular Rating progress gauge, and a "Recent activity" feed (real events only — assessment completions/adjustments and calibration saves, each with a relative timestamp, newest six shown).
- **User actions:** Click the greeting button to go to Assessment; click the bell to see notifications; click the profile circle to set a name.
- **What happens next:** Navigates to the Assessment tab.

### Assessment Overview
- **Purpose:** The list of every assessment created for the project.
- **What is visible:** A table — No., Survey name, Survey type (e.g. "Quantitative — Impact perspective"), Dates (start → end, or "–"), Respondents (e.g. "12/?"), Status (a coloured pill — Draft / Scheduled / Active / Closed / Completed, computed from dates unless a terminal status like Completed is stored directly), and three action icons: eye (Preview), pencil (Edit setup), bar-chart (View results, jumps to the Results tab). A "+ New Assessment" button.
- **User actions:** Click any action icon; click "+ New Assessment."
- **What happens next:** Preview opens Tool A's questionnaire inline with a "Preview mode" banner (quantitative) or resumes/starts the live session (qualitative); Edit re-opens the setup wizard pre-filled with this assessment's data; View results switches to Results.

### New Assessment — Mode Select
- **Purpose:** Choose the assessment's delivery mechanism before anything else.
- **What is visible:** A floating "swift" mascot button (bottom-right) that shows "What is a DMA?" on hover and a full explanation on click; two cards — "Quantitative — stakeholder questionnaire" (every criterion as its own multiple-choice question, filled independently by stakeholders via a link, footnoted "*The quantitative assessment results still need to be validated by experts") and "Qualitative — expert live session" (a simplified single-slider version rated holistically per topic, run with a small expert group).
- **User actions:** Pick one card.
- **What happens next:** Moves to Perspective Select.

### New Assessment — Perspective Select
- **Purpose:** Scope the assessment to Impact IROs, Financial IROs, or both.
- **What is visible:** A mascot with "Impact vs. Financial perspective?" explanation; three option cards — Full (all IROs), Impact perspective (negative/positive impacts only), Financial perspective (risks/opportunities only).
- **User actions:** Pick one; "← Back" returns to Mode Select.
- **What happens next:** Moves to Survey Setup (General Information).

### New Assessment — Survey Setup (General Information)
- **Purpose:** Capture the assessment's identity and (for quantitative only) its schedule and link.
- **What is visible:** Survey name (with a live example placeholder drawn from the chosen perspective, e.g. `Impact assessment of [Company]`), survey description, company logo upload (drag/drop or browse, shown at 80×80). **Quantitative only:** start/end date pickers (a real calendar-grid component — not a native date input — with a "most teams keep it open 1–2 weeks" note, minimum start date = today) and a survey link field (auto-slugified from the name, editable, with a Copy button and validity check for lowercase/number/hyphen only). "Proceed →" is disabled until the name is filled and (for quantitative) the link is valid and the date range is valid.
- **User actions:** Fill fields; "← Back" returns to Perspective Select.
- **What happens next:** Moves to Upload IROs. Every field here is auto-saved as a Draft-status assessment row the moment Perspective is chosen, and kept current at each step — closing the tab or navigating away never loses what was typed (see Section 9's note on drafts).

### New Assessment — Upload IROs
- **Purpose:** Import the topic/IRO list this assessment will rate.
- **What is visible:** "Download example CSV" and "Upload CSV" buttons; a semicolon-delimited format with columns Topic, "Actual or Potential," "IRO Name," Description, "IRO Type" (accepting `Negative Impact` / `Positive Impact` / `Risk` / `Opportunity`, case-insensitive). Per-row import errors are shown, never silently dropped. Topic names are matched to the 10 standard ESRS AR16 topics (E1–E5, S1–S4, G1) both by exact ID and by a built-in sub-topic name list (e.g. "Climate Change Mitigation" → E1); unmatched topics are flagged for manual assignment rather than dropped.
- **User actions:** Upload a file.
- **What happens next:** Moves to Review & Customize.

### New Assessment — Review & Customize
- **Purpose:** Let the consultant see and edit exactly what participants will see before creating the questionnaire.
- **What is visible:** "Introduction" (the welcome text, editable, defaulting to different copy for quantitative vs. qualitative — see Section 9); "Rating Criteria" (the task-explanation text, editable, defaulting by perspective); for **quantitative** — a Stakeholder Groups card (two labeled lists, add/remove entries); for **qualitative** — an Expected Participants card instead (add name/title/expert-topic, remove); an Assessment card listing every imported topic with its own Edit control (rename, edit description) and a scrollable list scoped to the chosen perspective only; a "Require an answer for every question" toggle. The button at the bottom reads "Create expert assessment" (qualitative) or "Create questionnaire — [name]" (quantitative).
- **User actions:** Edit any field; add/remove stakeholders or participants; edit individual topics; toggle mandatory; click Create; "← Back to general info" returns to Survey Setup.
- **What happens next:** Moves to the Created/Congratulations screen.

### Created / Congratulations
- **Purpose:** Confirm creation and hand off to either preview or the real thing.
- **What is visible — quantitative:** "'[Name]' has been created," the run dates; two clearly separated cards — **"PREVIEW — INSIDE THIS TOOL"** (a Preview button that opens Tool A's questionnaire inline, within this app, with a way back to setup — nothing recorded) and **"PARTICIPANT LINK — OUTSIDE THIS PLATFORM"** (the real link each participant opens independently, with a Copy button); "Or go to Assessment overview."
  **What is visible — qualitative:** "'[Name]' has been created. You're ready to run this live with your expert group whenever you are." One button: "Kick off your expert session →." "Or go to Assessment overview."
- **User actions:** Preview / Kick off / go to overview.
- **What happens next:** Preview → inline Tool A render with a preview banner, exits back to Overview. Kick off → Intro Flow, then the live Questionnaire.

### Intro Flow (qualitative only, run inside this tool)
- **Purpose:** Brief the expert group immediately before rating begins.
- **What is visible:** **Welcome** — a compass icon or the company logo, the (editable) welcome text, three fixed reassurance bullets ("A guided, topic-by-topic discussion," "Disagreements are expected — that's what calibration is for," "An explanation is always one hover away"), and — if any participants were added during setup — a fold-out "N joining this session" card showing each participant's initials, name, title, and expert topic. **Rating Criteria** — same content/structure as Tool A's Rating Criteria screen, with a "← Back" and "Continue →."
- **User actions:** Expand/collapse the participant list; continue.
- **What happens next:** Moves straight into the Questionnaire (no separate "start" screen — this was removed as redundant with the Congratulations screen's "Kick off" button).

### Questionnaire (qualitative rating, one topic at a time)
- **Purpose:** Collect the expert group's holistic per-criterion ratings.
- **What is visible:** A fixed banner explaining the pass ("A few quick questions per topic..." with the likelihood-scoring note); a progress bar; "Topic X of Y"; "← Previous topic" and "Exit — resume later"; a card with the IRO-type badge, Actual/Potential badge, topic name/description, a short "rate each criterion on its own" tip, then one labeled slider per applicable criterion (0–5, with the anchor label shown live above the thumb while dragging — "How would you rate: [Criterion]" precedes each). "Next topic →" (or "Finish assessment ✓" on the last) is disabled if "mandatory" is on and any criterion hasn't been touched.
- **User actions:** Drag each slider; go back/forward; exit and resume later.
- **What happens next:** After the last topic, shows a results summary (a sorted bar list of every topic's average, colour-graded green→amber→red, "thank you for your participation") before "To Results →," which writes the session's ratings and switches the app to the Calibration tab.

### QuantAssessmentGrid (used when an admin opens/adjusts a quantitative assessment directly, not by public-link participants)
- **Purpose:** A dense, spreadsheet-style pass across every topic at once.
- **What is visible:** One row per IRO — topic-ID badge, name with an info icon for the description, IRO-type badge, Actual/Potential badge — and one column per applicable criterion, each cell a row of 6 dots (0–5), disabled where not applicable to that row's type. If scope is "Full," the header shows the union of all six possible criteria and disabled placeholder dots appear where a given row's type doesn't use that column. "Proceed" is disabled (with a "X topics still need an answer" note and an amber dot marking incomplete rows) if "mandatory" is on.
- **User actions:** Click dots; proceed.
- **What happens next:** Writes ratings and switches to Calibration.

### Calibration
- **Purpose:** Let leadership or subject-matter experts review calculated results and, where the group agrees, adjust them with a documented reason.
- **What is visible:** A mascot ("What is calibration?"); an "All assessments" filter dropdown (scopes the list to one assessment's IROs instead of every IRO ever imported); a collapsed accordion, one bar per topic, colour-tinted by ESRS pillar (E/S/G — green/amber/blue), each bar showing the current score and a "Needs review" or "Calibrated" tag. Expanding a bar shows the IRO type, description, the methodology version tag, calculated value, and — only for flagged IROs (override triggered or high discrepancy across assessors) — Owner/Moderator fields (a maker-checker rule blocks the moderator name from matching the owner) and, for financial IROs, an EBITDA magnitude-band selector (5 bands, e.g. "< 0.5% of EBITDA" … "> 5% of EBITDA"). "Adjust this topic" opens a slider + notes field; saving requires confirming the exact before/after values; "↺ Reset to calculated" is available once calibrated. The original calculated value is never discarded.
- **User actions:** Filter by assessment; expand/collapse rows; adjust or reset a calibration.
- **What happens next:** Nothing forced — the consultant moves to Results when ready.

### Results
- **Purpose:** The final materiality output.
- **What is visible:** **Primary** — every scored IRO as a horizontal bar, sorted highest to lowest, using the calibrated value where one exists, otherwise the calculated value. **Secondary** — two heatmaps (Impact: asymmetric, "high severity stays flagged even at low likelihood"; Financial: symmetric). **Tertiary** — a Topic Matrix: E/S/G category filters, Material/Not material filters, adjustable Impact and Financial threshold number inputs (0.1 steps) that redraw the matrix's quadrant lines, an SVG scatter plot (one dot per topic, positioned by topic-level impact/financial score, styled solid + amber ring if material, faint if not), and a side panel listing the IROs behind whichever topic is hovered or pinned.
- **User actions:** Toggle filters; adjust thresholds; hover/click a topic dot.
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

**CSV import matching:** see Section 8's Upload IROs description — sub-topic names are matched to the 10 fixed ESRS AR16 topics via a built-in alias list; unmatched rows are still imported but flagged for manual topic assignment, never silently dropped or rejected.

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
| Stakeholder Mapping module (the original "Step 1" of the full 6-step vision) | Not needed to validate the core rating/calibration/results loop |
| In-tool IRO selection UI (vs. CSV-only import) | CSV import covers the MVP need; a picker UI is a nice-to-have |
| PDF/CSV export of results | Deferred — no export arm active |
| Email delivery of the participant link | Deferred — manual copy/paste today |
| Role-based permissions among multiple logged-in team members (A3) | Only one access level was built; would need explicit role definitions from Anika |
| Multi-tenant support (more than one consulting practice sharing this deployment) | Out of scope — this build is scoped to greenfriend |
| True concurrent-participant response counting in real time | The prototype simulated cross-tab handoff via `localStorage` + the browser `storage` event during design, but the final build relies on real Supabase writes and reads instead |
| GDPR consent checkbox on the Expected Participants form | Identified as missing during this documentation pass — must be added before a real build ships (see Section 15) |

---

## Section 13 — Acceptance Criteria

| # | What to verify | Expected result | Done? |
|---|------------------|--------------------|-------|
| 1 | Dashboard stat cards reflect real data, not placeholders | Rating progress, Topics tracked, Material topics, Assessments run all match the actual database state | [ ] |
| 2 | Mode Select → Perspective Select → Survey Setup → Upload → Review flow completes for both modes | Each step's data is present on the next; "Create" produces a real assessment row | [ ] |
| 3 | Quantitative setup shows dates + link; qualitative setup shows neither | Confirmed by mode, per Section 8 | [ ] |
| 4 | Draft auto-save works | Abandoning the wizard after Perspective Select leaves a Draft-status row in Assessment Overview with whatever was filled in so far | [ ] |
| 5 | CSV import matches sub-topic names to the 10 ESRS AR16 topics correctly, and flags unmatched rows without dropping them | Verified against the alias list in Section 9 | [ ] |
| 6 | Severity override rule fires correctly | A negative-impact IRO with any one of Scale/Scope/Irreversibility = 5 always shows severity = 5, regardless of the other two values | [ ] |
| 7 | Discrepancy flag fires at the correct threshold | Two assessors ≥1.5 apart on the same IRO's relevant axis show "Needs review" | [ ] |
| 8 | Calibration's maker-checker rule blocks a matching moderator | Entering the same name as Owner and Moderator shows the blocking message and does not allow saving | [ ] |
| 9 | A calibrated value never deletes the calculated value | Both remain visible; "Reset to calculated" restores the original number | [ ] |
| 10 | Results matrix reflects calibrated values where present | An IRO with a calibration override plots using that value, not the raw calculated one | [ ] |
| 11 | Live-session resume works | Exiting mid-questionnaire and reopening via the eye icon returns to the exact topic with prior answers intact | [ ] |
| 12 | GDPR consent checkbox blocks participant-list submission (once added — see Section 15) | Form cannot save a participant without the checkbox checked | [ ] |
| 13 | Tool deploys and is accessible at its own Netlify URL, separate from Tool A's | Live URL loads correctly | [ ] |

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
- [ ] Claude Code builds the remaining tables (assessments, iros, assessor_ratings, calibrations, participants, stakeholder_options), RLS policies, and Auth configuration via MCP
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
| Add the missing GDPR consent checkbox + data statement to the Expected Participants form, and confirm the deletion-request contact/process | Anika | Yes — legal requirement before this tool collects participant names for real |
| Should collaborators (e.g. Becca) get different permissions from Anika (A3), or is one shared access level (A2) sufficient for v1? | Anika | No — can ship as A2 and revisit |
| Should severity/score calculation move into the database (a view or RPC) instead of the frontend, given multiple assessors' data is aggregated? | Anika + Claude Code, at build time | No — either approach works; affects maintainability, not correctness |
| Confirm Supabase project name (shared with Tool A) | Anika | Yes — needed before Tool A's build session, which this tool depends on |

---

## Section 16 — Tool Version History

| Version | Date | What changed in the tool |
|---------|------|------------------------------|
| v1.0 | 2026-09-10 | Initial build — documents the working React/Vite prototype's full consultant workflow: Dashboard, Assessment Overview, the Mode/Perspective/Setup/Upload/Review creation wizard for both quantitative and qualitative assessments, draft auto-save, inline Preview, the qualitative live Questionnaire and quantitative admin grid, session resume, Calibration with maker-checker and EBITDA bands, and the Results screen (bar chart, heatmaps, adjustable materiality matrix). |

---

*This spec is written for Claude Code. It assumes zero prior context.*

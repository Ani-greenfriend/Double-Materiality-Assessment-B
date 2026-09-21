# Apus DMA — Consultant Console

## Identity
The internal tool a sustainability consultant uses to run ESRS Double Materiality Assessments — cycles, expert surveys and live sessions, calibration, results and a PDF report — used by the consultant and invited collaborators via magic-link login.
Tier: 3 — login required, data persists to Supabase, invite-only, one shared access level (D3+A2)
Spec version governed: v2.0 — the version of docs/product-spec.md these rules were derived from.
Position: Tool B of 2 in the greenfriend Double Materiality Assessment stack — shares the Supabase project with Apus DMA — Expert Survey (Tool A); this tool builds on the existing schema Tool A migrated.

## Session Protocol
At the start of every session:
1. Pull the latest from main before reading anything else.
2. Check docs/product-spec.md: if its version is newer than the "Spec version governed" line in this file, STOP. Tell the builder: "The spec has changed since this CLAUDE.md was written — re-run the Project Governor on the revised spec before building, or these rules may contradict it." Do not build against a stale CLAUDE.md.
3. Read PROGRESS.md in the project root — it is the current state of this build. If it is missing, recreate it with the structure at the end of this section, then continue.
4. Increment the session number and update the date in PROGRESS.md.
5. If "Notes for next session" has content: repeat the notes back to the builder, treat them as this session's priorities, then clear the section.
6. If this is session 1, run First Session Setup below before any build work.

Save point — after completing any module, feature, fix, or schema change:
1. Update PROGRESS.md: current state, remaining work, build decisions, known issues.
2. If the database was touched (any table, policy, bucket, or auth change), update docs/supabase-setup.md in the same save point.
3. Commit and push to main.
4. Tell the builder in one line: "Save point committed: [what changed]."
Do not start the next piece of work before the save point is pushed. Never end a session without one — an ending session is a save point.

First Session Setup (session 1 only):
1. Create docs/ and move product-spec.md into it. Move supabase-setup.md into docs/.
2. Announce what moved, then commit and push before building anything.

PROGRESS.md structure (for the recreate rule): status header (Session / Last updated / Live URL), Current state, Last session (3–5 lines, replace each session), Remaining work (shrinking checklist), Build decisions (one line each), Known issues, Notes for next session.

## Commands
```
npm install
npm run dev
npm run build
```

## Tech Stack
React · Vite · Tailwind CSS · Netlify · Supabase. Deployment: GitHub → Netlify, auto-deploys from main. Netlify MCP is active — create the site, set environment variables, and deploy via MCP.

## Arms
Export — browser only, no server function — PDF DMA report built by the report builder: white pages, tables for topics and stakeholders, graphs as images on white, footer with cycle, ESRS version, date, page number and Provisional/Final (design intent: docs/product-spec.md Section 3). Results keeps the prototype's PNG (chart image) and CSV (chart data) downloads; the report builder is the PDF export.

## Environment Variables
VITE_SUPABASE_URL — Supabase: Project Settings → API → Project URL — Netlify env var
VITE_SUPABASE_ANON_KEY — the publishable key (sb_publishable_...), not the legacy anon JWT — Netlify env var
No server functions; both are browser-exposed. Confirm both exist at session start; prompt the builder if missing. No value ever appears in code or a committed file.

## Supabase
Project: "greenfriend Double Materiality Assessment" — already exists. Project URL: https://evwmxduudcujtibirmga.supabase.co
docs/supabase-setup.md is the schema source of truth (Tool A migrated the v2.0 schema). Read it before any database work; never recreate what exists; update it at every save point that touches the database. docs/schema-draft.md, if present, is superseded — ignore it. Plan: Free (pause risk accepted).

Tables this tool owns: clients, practice_settings, cycles, threshold_changes, assessments, topic_library, iros, stakeholder_groups, stakeholder_members, invitations, live_sessions, live_session_participants, attendance_edit_log, calibrations, calibration_history. Read-only views: combined_ratings, assessment_progress, group_engagement, iro_comments.
Shared with Tool A: submissions, ratings, topic_justifications — read all; write only live-session rows (source 'expert_live_session', live_session_id set, invitation_id null).
Fields: docs/supabase-setup.md; for live_sessions, live_session_participants and attendance_edit_log, docs/product-spec.md Section 5.
Values: cycles.stage collecting|calibrating|signed_off; cycles.esrs_version esrs_2023_amended|esrs_2026; assessments.type expert_survey|expert_live_session; justification_mode per_criterion|per_topic; submissions.status draft|submitted; ratings.criterion_key scale|scope|irreversibility|likelihood|magnitude (no financialLikelihood — for a risk or opportunity the likelihood row is the financial likelihood).
Retired — never reference: assessor_ratings, participants, session_comments, increment_respondents, assessments.mode/logo_url/respondents_done/respondents_total, calibrations.signed_off_by/signed_off_at.
Auth: magic link — invite-only (self-signup off), one shared level, no roles.
RLS: `authenticated` policies as built (docs/supabase-setup.md, spec Section 6); never disable RLS. Storage: logos (client, consultant) — no bucket is documented yet; create one and record it in docs/supabase-setup.md. The client logo must be public-read so Tool A can show it.

## Hard Rules
- API keys never in any frontend file or GitHub commit. This tool uses only the browser-safe publishable key; the service role key is not used.
- Netlify Identity: never; Supabase Auth is the only auth system. RLS: never disabled on any table — if a query fails, fix the policy or the query.
- GDPR: consent checkbox and the data statement (docs/product-spec.md Section 7) on every form that adds a named person — invitation, live-session participant, stakeholder contact. Personal data: invitee name/email, participant name/expertise, facilitator, stakeholder contacts, calibration owner/moderator, approver. Deletion requests go to anikalerch@greenfriend.org; on request clear name and email ("Anonymised") and keep ratings. Region eu-west-1 (EU).
- Tool A's public survey depends on the anon policies and column grants on assessments, iros, clients, cycles and stakeholder_groups, and on six SECURITY DEFINER functions (lookup_invitation, mark_invitation_opened, get_draft, create_draft, save_progress, submit_survey_response) — anon has no direct table access to invitations, submissions, ratings or topic_justifications. Never change any of it, or the schema of submissions, ratings and topic_justifications, from this tool — changes go through Tool A.
- calibration_history, threshold_changes and attendance_edit_log are append-only: never update or delete rows.
- Never show invitee names, emails or titles in results tables or exports unless the builder ticks it in the report builder.
- Prototype screens are copied, not rewritten: port each component verbatim from reference-prototype/ (the PR #3 branch claude/elegant-hypatia-vx86i7 also holds it, wired to Supabase). Change only data wiring, the renamed wording (Expert survey / Expert live session) and the v2.0 changes in docs/product-spec.md. Never restyle, simplify or rewrite a prototype screen; if unsure, ask the builder. Every feature that docs/product-spec-v1.2-prototype-reference.md Section 8 describes for a screen must exist in the restored screen unless docs/product-spec.md removes or changes it. Before building a screen, list those features as a checklist; after building it, show the checklist with each item marked done, changed (with the v2.0 reason) or missing.

## Project Structure
```
/                     ← root: CLAUDE.md, PROGRESS.md only
/src
  /components
  /lib                ← Supabase client, calc.js (port from reference-prototype, then apply Section 9 v2 changes)
/docs                 ← product-spec.md, product-spec-tool-a-expert-survey.md, supabase-setup.md
/reference-prototype  ← working prototype — authoritative for existing screens and calc arithmetic
```

## Brand
No brand skill yet. These inline rules apply until one is added to the repo (then install it and defer to it):
- Console: base #07070B · surface #100E15 · surface-2 #1A1820 · border #2A2830 — never white or Tailwind gray defaults
- Accent #4C6FFF — never Tailwind blue defaults. Semantic: #5ED996 positive/Environmental/Calibrated, #D79A4C Material/risk/Governance, #9B7FE0 assessments-run stat only
- Font: Inter (body), Jost (wordmark). Dark, focused, data-tool feel — distinct from Tool A's light theme.
- PDF report: white pages, dark text, one accent colour (default #1F9A63), standard sans-serif font.

## Business Rules
- Cycles exist only in the database, never in the interface (no Cycles screen, selector or wizard; never say "cycle" to the user). A cycle is created automatically with the first assessment of a financial year and shared by every assessment of that year. The first assessment's setup asks the financial year and pre-selects the ESRS version (2026 → esrs_2023_amended, 2027 or later → esrs_2026), overridable. The assessment flow is the prototype's full flow.
- Each assessment is an Expert survey (invited experts answer in Tool A) or an Expert live session (run here). Never use the words quantitative/qualitative.
- The assessment flow (overview, Mode, Perspective, General info, Review & customise, Recipients, Created, Review Hub, Intro, Questionnaire, grid) is the prototype exactly. The only allowed differences are listed in docs/product-spec.md Section 8, "New assessment": renamed types; recipients and participants chosen from the master stakeholder map (existing person or a new one also saved to Stakeholders), on one Who participates page — personal links (survey), expertise (live session); no stakeholder section in the live session's Review step; the step navigation on every screen including Kick off, and Kick off guarded with guidance; financial year as a 2022–2027 dropdown; a justification setting; financial year and ESRS version in General info; the Created link card; a justification per rating, Save and pause, and who-answered details in the grid. Revert anything else.
- Severity, negative impact = avg(Scale, Scope, Irremediability), or 5 if any one is 5; positive impact = avg(Scale, Scope).
- Impact score = severity × (likelihood ÷ 5); actual impact = severity; potential human rights impact = severity alone. Financial = magnitude × (likelihood ÷ 5), no override.
- Each submitted survey response and each finished live session is one assessor; average across assessors; show survey and session scores side by side. Drafts never count.
- Discrepancy: spread across assessors ≥ 1.5 on an axis, or survey average and live session differ by ≥ 1.5. Skipped criteria are excluded from averages.
- Two thresholds per financial-year round (impact, financial), default 3.0, baseline stored automatically. Editable at any time in the Results tab via Apply with a reason logged to threshold_changes.
- Material if an impact IRO ≥ impact threshold or a risk/opportunity ≥ financial threshold, using the calibrated value if one exists; a topic is material if any IRO is.
- No global stage banner, no cycle-level sign-off and no "require both sources" setting. Results and exports are Provisional until every IRO is signed off, then Final. The cycles.stage column stays unused.
- Responses screen and Dashboard Overview follow the approved mockup (docs/product-spec.md Section 8): engagement rate = submitted ÷ invited (survey), attended ÷ expected (live session), combined = both together; IRO table shows survey, live session and combined scores; comments show source, group and expertise, never names until "Reveal name"; no expertise-coverage view.
- Sign-off is per IRO, as in the prototype: Sign off and Revoke record the logged-in user and time; editing clears it. Optional approval details (approver, role, date, minutes reference) are entered in the report builder.
- Calibration is append-only history (old, new, reason, who, when); the calculated value is never overwritten; owner ≠ moderator is a warning, not a block.
- Justification is per criterion or per topic per assessment.justification_mode and is required whenever a rating has a value.
- Live session: participant list (name and expertise required) set by the owner, editable with soft removal and an edit log; "Save and pause" keeps ratings as drafts until Finish.
- Invitations hold name, email and stakeholder group; each gets a personal link (Tool A's survey address for the assessment slug plus the invitation's link_code); links are copied and sent manually.
- Silent stakeholders: groups of type 'silent' (Nature and ecosystems, Species and biodiversity, Future generations) ordinary entries in the stakeholder list (generic pool, dragged into the Impact column) with a "Silent stakeholder" marker and explanation on the entry, and selectable in group selection; no separate panel, no wizard step, no per-IRO tag (the cycles.silent_stakeholders_* columns stay unused).
- Shell: the prototype's collapsible left rail — Dashboard, Stakeholders, Topics, Assessments, Responses, Calibrate & Results, Report; no top tab bar and no Cycles item. The Dashboard keeps the prototype's six cards (Stakeholder selection, Topic selection, Assessment of impact topics, Assessment of financial topics, Calibration, Downloadable result) with live data, editable header and bell.
- The prototype's assessment grid (QuantAssessmentGrid) is kept as "Enter expert responses": the consultant enters an expert's responses from an invitation; saved as a submitted expert_survey submission tied to that invitation with entered_by = the logged-in user (nullable column, approve with the builder before adding).
- "Delete unfinished drafts" (on the Responses screen) deletes draft submissions (and their ratings and justifications) only, once the assessment is Closed or Completed; never submitted rows.
- Assessments snapshot topic_library into iros at creation (by perspective, ESRS version, client); re-editing a completed assessment's setup never resets its responses or status. Sub-topics follow the ESRS version; CSV upload flags unmatched codes, never drops them.
- Stakeholder contact needs Name + Role; email optional, format-checked.

Out of scope — do not build:
- Approver role with its own login; per-client permissions (roles)
- Emailed links or any email sending
- Weighting between the expert survey and the live session; a formal methodology change log
- Per-sitting attendance for live sessions; file upload for approval minutes; automatic scheduled purge of drafts
- An editable Word version of the report; CSV of the full raw ratings table; editing the report inside the tool
- Tying calibration owner/moderator to login accounts; document search or knowledge base

## Reference Docs
Read before building the related part:
- docs/product-spec.md — full module specs, UI sections, logic, acceptance criteria
- docs/supabase-setup.md — schema source of truth (exists — read first)
- docs/product-spec-tool-a-expert-survey.md — Tool A spec; the Review Hub must render its screens exactly
- docs/product-spec-v1.2-prototype-reference.md — detailed behaviour of every prototype screen (Section 8); v2.0 wins where they differ
- reference-prototype/ — authoritative for existing screens and calc arithmetic
PROGRESS.md in the root is read at every session start per the Session Protocol.

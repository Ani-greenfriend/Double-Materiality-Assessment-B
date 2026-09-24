# Apus DMA — Consultant Console

## Identity
The internal tool a sustainability consultant uses to run ESRS Double Materiality Assessments — stakeholders, topics, expert surveys and live sessions, calibration, results, and a PDF report — used by four kinds of logged-in user with different access.
Tier: 3 — login required (magic link, invite-only), data persists to Supabase, role-based access (D3+A3)
Spec version governed: v2.0 amended 9, plus the confirmed v2.1 Admin & Roles design and docs/access-matrix.md + docs/user-stories.md — the version these rules were derived from.
Position: Tool B of 2 in the greenfriend Double Materiality Assessment stack — shares the Supabase project with Apus DMA — Expert Survey (Tool A); this tool builds on the existing schema.

## Session Protocol
At the start of every session:
1. Pull the latest from main before reading anything else.
2. Check docs/product-spec.md: if its version is newer than "Spec version governed" above, STOP and tell the builder to re-run the Project Governor first.
3. Read PROGRESS.md — the current state of this build. If missing, recreate it per the structure at the end of this section, then continue.
4. Increment the session number and date in PROGRESS.md.
5. If "Notes for next session" has content, repeat it back, treat it as this session's priorities, then clear it.
6. If session 1, run First Session Setup below first.

Save point — after completing any module, feature, fix, or schema change:
1. Update PROGRESS.md: current state, remaining work, build decisions, known issues.
2. If the database was touched (table, policy, bucket, or auth change), update docs/supabase-setup.md in the same save point.
3. Commit and push to main.
4. Tell the builder in one line: "Save point committed: [what changed]."
Never end a session without a save point.

First Session Setup (session 1 only): create docs/ and move product-spec.md, docs/access-matrix.md and docs/user-stories.md into it if not already there; announce, commit, push before building.

PROGRESS.md structure (recreate rule): status header (Session / Last updated / Live URL), Current state, Last session (3–5 lines), Remaining work (shrinking checklist), Build decisions, Known issues, Notes for next session.

## Commands
```
npm install
npm run dev
npm run build
```

## Tech Stack
React · Vite · Tailwind CSS · Netlify · Supabase. Deployment: GitHub → Netlify, auto-deploys from main. **No Netlify MCP connector is available to Claude Code in this environment** (confirmed by direct check, contradicting an earlier assumption) — the builder connects and deploys manually via the Netlify dashboard (New site → Import from GitHub; build `npm run build`, publish `dist`, already set in netlify.toml). Tool A's site address is hardcoded as the default in `buildPersonalLink()` (src/lib/data.js), overridable via `VITE_TOOL_A_URL`.

## Arms
Export — browser only, no server function — the PDF DMA report (report builder): six sections, two presets, logo slots, personal data off by default, graphs as images on white, tables for topics and stakeholders, a footer on every page with cycle, ESRS version, date, page number and Provisional/Final. Results and Matrix keep PNG (chart image) and CSV (chart data) downloads alongside it.

## Environment Variables
VITE_SUPABASE_URL — Supabase: Project Settings → API → Project URL — Netlify env var
VITE_SUPABASE_ANON_KEY — the publishable key, not the legacy anon JWT — Netlify env var
VITE_SURVEY_BASE_URL — Tool A's site address for building personal links (e.g. `https://questionnaire-dma.netlify.app`) — resolves product-spec.md Section 15's open question; required, never hardcoded — Netlify env var
No server functions in this tool; all three are browser-exposed (none is a secret — they're public URLs/keys). Confirm all three exist at session start. No value ever appears in code or a committed file.

## Supabase
Project: "greenfriend Double Materiality Assessment" — already exists. Project URL: https://evwmxduudcujtibirmga.supabase.co
docs/supabase-setup.md is the schema source of truth — read it first, every session, before any database work; it may have changed since this file was written. Never recreate what exists. Update it at every save point that touches the database. Plan: Free (accepted risk, pause during quiet spells — open a link weekly).

**RLS and roles — docs/access-matrix.md and docs/user-stories.md are the authoritative source, not this file.** Read both before writing or changing any policy, trigger, or role check. Summary only:
- Four roles, stored on a new `team_members` table (schema delta below): Tool Owner, Admin, Full access — identical data access, differ only in team-management rights — and Sign-off only, read-only everywhere it can see at all, with exactly two independent writes gated by `can_signoff_topics` and `can_signoff_results`.
- A login with no matching `team_members` row sees "No access yet — ask your Admin" and reaches nothing. This is the default-deny; build it explicitly, don't rely on RLS alone to make an unrecognised identity harmless.
- Sign-off only's Dashboard and Report access is refused at the table level, not just hidden from nav.
- `cycles.results_signed_off` is a real lock: while true, `calibrations.calibrated_value`/`.band_value` for that cycle cannot be updated by anyone except through an explicit, logged Revoke. `assessments.iro_list_signed_off` is advisory only and never blocks anything — this is a deliberate asymmetry, do not make it symmetric.
- A submitted response (`submissions.status = 'submitted'`) is frozen for every role, including Tool Owner — the only exception is anonymising the linked invitation's name/email on a GDPR request.
- Schema delta this pass: new `team_members` table (id, auth_user_id, email, name, phone_number, avatar_url, role_title, access_level enum 'full'/'signoff', is_admin, is_owner, can_signoff_topics, can_signoff_results, active, created_at, updated_at) seeded with Anika Lerch (anikalerch@greenfriend.org), is_owner=true, is_admin=true, access_level='full'; add created_by/updated_by/updated_at to clients, topic_library, iros, stakeholder_groups, stakeholder_members; add `iro_list_signed_off`(+by/at) to assessments; add **new** `results_signed_off` (bool), `results_signed_off_at`, `results_signed_off_by` columns to cycles — do not repurpose the existing dead `signed_off_at`/`approver_name`/`approver_role`/`minutes_reference`/`signed_off_recorded_by` columns, which supabase-setup.md already documents as retired and given "the same treatment as `cycles.stage`" (left alone, unused); this pass follows that same convention rather than reviving them. New private `avatars` storage bucket, separate from the existing public-read `logos` bucket.
- A trigger matches a new Supabase Auth identity's email to a `team_members` row and sets `auth_user_id`; no match means no access.
- Run the full refusal test from docs/access-matrix.md Section 6 before this stage deploys: every `no` attempted through the API, pasted into PROGRESS.md. Sign-off only has no named holder yet — verify its policies mechanically (Half A); its live screen test (Half B) is explicitly deferred, not skipped.

## Hard Rules
- API keys never in any frontend file or GitHub commit. Only the publishable key is used; the service role key is not used by this tool.
- Netlify Identity: never; Supabase Auth is the only auth system in this stack.
- RLS: never disabled on any table. If a query fails, fix the policy or the query.
- GDPR: applies. Consent checkbox and data statement on every form that adds a named person (invitations, participants, stakeholder contacts). Deletion requests go to anikalerch@greenfriend.org — handled as anonymising name/email, never a row delete.
- This tool shares a Supabase project with Tool A. Tool A's tables (`submissions`, `ratings`, `topic_justifications`, `invitations`) and its six SECURITY DEFINER link-code functions are protected: no schema changes, no RLS changes, no touching the anon-facing side, from this tool. This tool writes only live-session rows into `submissions`/`ratings`, following the existing pattern — every expert survey response comes through Tool A, with no exception. **"Enter expert responses" (QuantAssessmentGrid, an `entered_by` column) was proposed, then explicitly dropped by the builder mid-build — do not build it; product-spec.md's remaining references to it are stale and are being corrected.**
- No team_member can change their own is_admin, is_owner, or active through the app — a trigger refuses it; is_owner is never changed through the app by anyone, only from the Supabase dashboard.
- Nothing is deleted except: a draft submission on a Closed/Completed assessment (never submitted), an invitation before opened, a live session before started, a client with no cycles, a cycle/assessment with no responses. Deactivate list entries, never delete them once used.

## Project Structure
```
/                     ← root: CLAUDE.md, PROGRESS.md only
/src
  /components
  /lib                ← Supabase client, calc.js
/docs                 ← product-spec.md, supabase-setup.md, access-matrix.md, user-stories.md
/reference-prototype  ← authoritative for existing screens, ported verbatim; change only data wiring, renamed wording (Expert survey/Expert live session), and confirmed v2.0/v2.1 changes
```

## Brand
Dark console theme: base #07070B · surface #100E15 · border #2A2830 · accent #4C6FFF (never Tailwind blue defaults) · semantic #5ED996 positive/Calibrated, #D79A4C Material/risk, #9B7FE0 live-session-only. Font: Inter (body), Jost (wordmark). PDF report: white pages, dark text, one accent colour (default #1F9A63), standard sans-serif.

## Business Rules
- Cycles are database-only, never shown in the interface — no Cycles screen, selector or wizard. Created automatically with the first assessment of a financial year (dropdown 2022–2027); later assessments of that year join it.
- Severity (negative impact) = avg(Scale, Scope, Irremediability), or 5 if any one is 5. Actual impact and potential-human-rights impact skip likelihood.
- Two thresholds per cycle-year (impact, financial), default 3.0, editable any time in Results via Apply + reason, logged.
- A live session counts as one assessor; discrepancy flag at spread ≥1.5 between sources.
- Silent stakeholders are ordinary entries in the stakeholder list (ticked as type 'silent'), never a separate step or panel.
- The whole assessment flow (overview, wizard, Recipients, Created, Review Hub, live session) is the reference prototype, unchanged, except: renamed wording; personal-link recipients / expertise-tagged participants; a per-assessment justification-mode setting; financial year + ESRS version in General info; the report keeps PNG/CSV chart downloads alongside the new PDF. No "Enter expert responses" grid — dropped, see Hard Rules.
- "Delete unfinished drafts" was previously flagged (PROGRESS.md) as a spec contradiction with no supporting RLS. This pass resolves it: a DELETE policy on `submissions`/`ratings`/`topic_justifications`, scoped to `status = 'draft'` rows only, once the assessment is Closed or Completed — never a submitted row. Treat this as the resolution, not a re-open.

Out of scope — do not build this pass:
- The Topics Longlist → Shortlist → Sign-off redesign (AR16 hierarchy, IRO examples per sub-topic, reference-standard tags, per-topic include/exclude decisions with comments) — confirmed in design, explicitly parked. Keep the existing simpler topic_library (manual add, CSV upload, per-entry sign-off that clears on edit) as-is.
- In-app email invitations (Edge Function + service role key) — Option A (Supabase-dashboard invite, then set the role in Admin & Roles) is what ships.
- Approver role beyond what's already in Sign-off only; per-client permissions; ownership transfer.

## Reference Docs
- docs/product-spec.md — module specs, UI, logic, acceptance criteria
- docs/access-matrix.md, docs/user-stories.md — authoritative for every role, table, and policy; read before touching auth or RLS
- docs/supabase-setup.md — schema source of truth (exists — read first)
- reference-prototype/ — authoritative for the UI of existing screens
PROGRESS.md in the root is read at every session start per the Session Protocol.

# Apus DMA — Consultant Console

## Identity
The internal working tool a sustainability consultant uses to run ESRS Double Materiality Assessments: import IROs, run a quantitative questionnaire or qualitative live session, calibrate results, and view the final materiality determination.
Tier: 3 — persists to Supabase, invite-only login (D3+A2) — **currently built as a frontend-only pass; see "Database status" below.**
Spec version governed: v1.0 — the version of docs/product-spec.md these rules were derived from.
Position: Tool B of 2 in the greenfriend-dma stack — shares the Supabase project with Apus DMA — Participant Questionnaire (Tool A), which is already built and live at its own repo.

## Database status — IMPORTANT
The builder explicitly asked to leave the database out of this build for now. This session ported the full consultant workflow faithfully from `reference-prototype/` with **in-memory React state only** (exactly like the prototype) — nothing persists across a page reload, and there is no Supabase client, no auth, no `.env` in this build.

This is a deliberate, temporary state, not a shortcut taken silently. Before treating this tool as done against product-spec.md:
- Tool A (already built) created `assessments`, `iros`, `ratings` in the shared Supabase project (`evwmxduudcujtibirmga`) — see that repo's `docs/supabase-setup.md`.
- This tool still needs: `assessor_ratings`, `calibrations`, `participants`, `stakeholder_options` tables + RLS, magic-link Auth (invite-only), and a `src/lib/` data layer that replaces every in-memory array in `App.jsx` with real reads/writes — including reconciling Tool A's per-criterion `ratings` rows with this tool's per-assessor `assessor_ratings` shape at read time (see product-spec.md Section 15).
- Do not start that work until the builder explicitly asks for the database/auth pass — do not infer it from a generic "continue" instruction.

## Session Protocol
At the start of every session:
1. Pull the latest from main before reading anything else.
2. Check docs/product-spec.md: if its version is newer than the "Spec version governed" line in this file, STOP and tell the builder before building.
3. Read PROGRESS.md in the project root — it is the current state of this build. If missing, recreate it with the structure described there, then continue.
4. Increment the session number and update the date in PROGRESS.md.
5. If "Notes for next session" has content: repeat the notes back to the builder, treat them as this session's priorities, then clear the section.

Save point — after completing any module, feature, fix, or schema change:
1. Update PROGRESS.md: current state, remaining work, build decisions, known issues.
2. If the database was touched, update docs/supabase-setup.md in the same save point.
3. Commit and push to the working branch.
4. Tell the builder in one line what changed.

PROGRESS.md structure (for the recreate rule): status header (Session / Last updated / Live URL), Current state, Last session (3–5 lines, replace each session), Remaining work (shrinking checklist), Build decisions (one line each), Known issues, Notes for next session.

## Commands
```
npm install
npm run dev
npm run build
```

## Tech Stack
React 19 · Vite · Tailwind CSS 4 · Netlify (planned) · Supabase (deferred — see Database status)

## Project Structure
```
/                     ← root: CLAUDE.md, PROGRESS.md
/src
  /components         ← ported verbatim from reference-prototype, presentational
  /lib                ← calc.js (scoring), csv.js (import), topics.js (constants) — pure, no I/O yet
  App.jsx             ← orchestrator: in-memory state today, will own Supabase reads/writes later
/docs                 ← product-spec.md (supabase-setup.md to be added once DB work starts)
/reference-prototype  ← working prototype source — authoritative for UI/UX, kept for reference
/public
```

## Brand
- Base colours: App black `#07070B`, surface `#100E15`, surface-2 `#1A1820`, border `#2A2830`
- Primary accent: Badge Blue `#4C6FFF`
- Semantic: Signal Emerald `#5ED996` (positive impact / Environmental / Calibrated), Badge Amber `#D79A4C` (Material / risk / Governance / EBITDA bands), muted purple `#9B7FE0` (Assessments run stat only)
- Typography: Inter (body), Jost (wordmark), League Spartan ("by greenfriend.")
- Dark, focused, data-tool feel — deliberately distinct from Tool A's light participant theme.

## Business Rules (already implemented, in-memory)
- Severity override: any of Scale/Scope/Irreversibility = 5 on a negative impact forces severity to 5 (precautionary principle) — `src/lib/calc.js`.
- Impact score = severity × (likelihood / 5); financial score = magnitude × (financialLikelihood / 5), no override on the financial axis.
- Discrepancy flag at spread ≥ 1.5 across assessors on the relevant axis.
- Per-IRO materiality thresholds fixed at 3.0 at CSV import time, independent of the Results screen's adjustable matrix threshold inputs (a known prototype inconsistency, see product-spec.md Section 15 — not resolved here).
- Calibration keeps the calculated value alongside any override; maker-checker blocks a moderator name matching the owner.
- Draft auto-save and live-session resume both work today, but only within one browser tab's memory — they do not survive a reload since there is no persistence yet.

## Out of scope for this pass
- Supabase schema/RLS, Auth (magic link), Netlify env vars — deferred per builder instruction.
- Everything already out of scope per product-spec.md Section 12 (stakeholder mapping module, export, email delivery, role-based permissions, GDPR consent checkbox on Expected Participants).

## Reference Docs
- docs/product-spec.md — full module specs, UI sections, logic, arm detail
- reference-prototype/ — working prototype source, authoritative for UI/UX (see its README.md)
- Tool A's repo (`Double-Materiality-Assessment-A`) — `docs/supabase-setup.md` there documents the shared project's `assessments`/`iros`/`ratings` tables once the database pass on this tool begins.
PROGRESS.md in the root is read at every session start per the Session Protocol.

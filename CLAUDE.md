# Apus DMA — Consultant Console

## Identity
The internal tool a sustainability consultant uses to run ESRS Double Materiality
Assessments — maintain a master Stakeholder map, build a master Topics library,
run quantitative or qualitative assessments, calibrate results with experts, and
view the final materiality determination. Accessed by the consultant (and any
invited collaborators) via login.
Tier: 3 — authenticated, data persists to Supabase, invite-only login (D3+A2)
Spec version governed: v1.2
Position: Tool 2 of 2 in the greenfriend-dma stack — shares the Supabase project
with the participant questionnaire (Tool A); this tool builds on Tool A's schema
and adds its own tables to it.

## Session Protocol
At the start of every session:
1. Pull the latest from main before reading anything else.
2. Check docs/product-spec.md: if its version is newer than "Spec version
   governed" above, STOP — tell the builder to re-run Project Governor first.
3. Read PROGRESS.md in the root — it is the current state. If missing, recreate
   it with the structure noted at the end of this section, then continue.
4. Increment the session number and date in PROGRESS.md.
5. If "Notes for next session" has content, repeat it back, treat it as this
   session's priorities, then clear it.
6. If session 1, run First Session Setup below before any build work.

Save point — after completing any module, feature, fix, or schema change:
1. Update PROGRESS.md: current state, remaining work, build decisions, known issues.
2. If the database was touched, update docs/supabase-setup.md in the same save point.
3. Commit and push to main.
4. Tell the builder in one line: "Save point committed: [what changed]."
Never end a session without a save point.

First Session Setup (session 1 only):
1. **Before anything else:** confirm docs/supabase-setup.md exists — this tool
   shares Tool A's Supabase project and does not create it. If missing, Tool A
   hasn't been built yet: stop, tell the builder. Never create a new Supabase
   project here — that would fork the stack onto two databases.
2. Create docs/, move product-spec.md and schema-draft.md into it; move
   supabase-setup.md in once step 1 is satisfied.
3. Announce what moved, commit and push before building anything.

PROGRESS.md structure (recreate rule): status header (Session / Last updated /
Live URL), Current state, Last session (3–5 lines), Remaining work (shrinking
checklist), Build decisions, Known issues, Notes for next session.

## Commands
```
npm install
npm run dev
npm run build
```

## Tech Stack
React · Vite · Tailwind CSS · Supabase
Deployment: GitHub → Netlify, auto-deploys from main. Netlify MCP status is
unconfirmed — if not active, the builder connects the repo and enters environment
variables in the Netlify dashboard; remind them before the first deploy.

## Arms
Export — browser only, no server function — CSV (raw chart data), PNG (canvas
rasterization), or PDF (`jspdf`, all selected charts combined). No other arm is
active — every score is deterministic frontend arithmetic (spec Section 9); no AI,
email, or scheduled job anywhere in this tool.

## Environment Variables
VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — Supabase Project Settings → API —
Netlify env vars.
SUPABASE_SERVICE_ROLE_KEY — listed in the spec's credentials table but no stated
server-side use case exists here (Export is client-side only). Do not wire it
into anything unless a real need is identified later — flag to the builder first.
Netlify Functions read Netlify env vars; Supabase Edge Functions read Edge
Function secrets — never the other store. Confirm all required keys exist at
session start. No value ever appears in code or a committed file.

## Supabase
Project: "greenfriend-dma" — already exists, created during Tool A's build.
docs/supabase-setup.md is the schema source of truth; read it before any database
work; never recreate what already exists; update it at every save point that
touches the database.
Plan: Pro (manual billing step in the Supabase dashboard — confirm it's done).

This tool's schema is 8 new tables — see docs/schema-draft.md for the full field
list and RLS (authoritative until docs/supabase-setup.md exists). This tool adds
columns to the existing `assessments` table and only ever reads `ratings`, never
writes it.

Auth: Magic link, invite-only (builder invites collaborators via the Supabase
dashboard; no self-signup). One shared permission level — no roles.

## Hard Rules
- API keys never in frontend code or a commit. Netlify env vars for Netlify
  Functions, Edge Function secrets for Supabase Edge Functions — never mixed.
- Netlify Identity: never. Supabase Auth only. RLS: never disabled — fix the
  policy or query instead.
- GDPR applies: consent checkbox + data statement required on both the
  Expected Participants and Stakeholder add-contact forms — neither exists yet.
  Personal data: participant name/title/expertise; stakeholder name (required),
  role (required), company, email (optional, format-checked), E/S/G tags.
  Deletion contact unconfirmed — do not ship without it. Confirm Supabase region
  matches Tool A's; region can't change after creation.
- Shares a Supabase project with Tool A. Protected table: `ratings` — read only,
  never write, never alter its schema or RLS.
- Calibration changes are append-only history, never overwritten — every
  adjustment (or reset) adds a row with old value, new value, reason, who, when.
  The calculated value is never deleted.
- Sign-off (Topics-library entries and calibrations) blocks further edits until
  explicitly revoked; any edit made after sign-off clears it automatically.
- Assessments read their topics from `topic_library`, filtered by perspective, at
  creation time — no per-assessment CSV step. Re-editing a genuinely-completed
  assessment's setup must never reset its respondent count or status.

Out of scope — do not build: email delivery of the link; role-based permissions;
multi-tenant support; real-time concurrent-response counting beyond normal
Supabase reads/writes; admin display of Tool A's "Any other comments" field.

## Project Structure
```
/                     ← root: CLAUDE.md, PROGRESS.md only
/src
  /components
  /lib                ← Supabase client, calc.js (port exactly)
/docs                 ← product-spec.md, schema-draft.md, supabase-setup.md
/reference-prototype  ← authoritative working source for UI/UX
```

## Brand
No brand skill file — inline from spec Section 10:
- Background #07070B · Surface #100E15 · Surface-2 #1A1820 · Border #2A2830 —
  never white or Tailwind gray defaults
- Accent #4C6FFF — never Tailwind blue defaults
- Semantic: #5ED996 (positive/Environmental/Calibrated), #D79A4C
  (Material/risk/Governance), #9B7FE0 (Assessments-run stat only)
- Font: Inter (body), Jost (wordmark)
- Dark, focused, data-tool feel — deliberately distinct from Tool A's light theme

**Reference implementation — authoritative for UI/UX:** `reference-prototype/` is
the full working source, authoritative for exact layout, copy, spacing, and
interaction — including `reference-prototype/src/lib/calc.js`, which must be
ported exactly, not re-derived from spec prose. Port faithfully; do not redesign.

## Business Rules
- Severity = avg(Scale, Scope, Irremediability) unless any one = 5, then 5.
- Impact score = severity × (likelihood ÷ 5). Financial = magnitude × (likelihood
  ÷ 5) — no override on the financial axis.
- Discrepancy: two assessors ≥1.5 apart on the same axis → "Needs review."
- Threshold defaults to 3.0 both axes; confirm whether the Results screen's
  threshold inputs are a second stored value or a display-only re-slice (spec
  open question).
- Maker-checker: Moderator ≠ Owner on a flagged IRO.
- ESRS sub-topics come from the real EFRAG list per top-level topic, never free
  text; CSV upload matches codes by prefix, flags unmatched rather than dropping.
- Stakeholder contact needs Name + Role; Email optional, format-checked if filled.
- Qualitative participant pre-fill only pulls groups tagged with the assessment's
  chosen perspective, set when Perspective is chosen.

## Reference Docs
- docs/product-spec.md — full module specs, UI sections, logic, arm detail
- docs/schema-draft.md — full table/field list and RLS (authoritative until
  docs/supabase-setup.md exists)
- docs/supabase-setup.md — schema source of truth once Tool A's build produces it
- reference-prototype/ — working source; authoritative for UI/UX and calc.js
PROGRESS.md in the root is read at every session start per the Session Protocol.

# Reference Prototype

This is the working React + Vite prototype built during design — no backend, no
persistence, everything lives in `App.jsx` component state. It is the authoritative
reference for exact UI/UX: layout, copy, spacing, colours, and interaction detail.

**Unused/dead files were removed before this copy was made** — every file here is
actually imported and rendered somewhere in the app.

Entry point: `src/main.jsx` → `src/App.jsx` (the consultant console) or
`src/PreviewWindowApp.jsx` (the standalone participant-preview bootstrap, superseded
in the real build by Tool A being a genuinely separate deployed site).

Key files for **Tool A** (Participant Questionnaire):
- `src/components/ParticipantExperience.jsx` — the entire participant-facing flow
- `src/components/ApusLogoLight.jsx` — the light-theme logo variant
- `src/lib/calc.js`, `src/lib/topics.js` — shared constants/labels (Tool A reads,
  does not compute)

Key files for **Tool B** (Consultant Console): everything else under
`src/components/`, plus `src/lib/calc.js` (the full scoring logic — port this
exactly) and `src/lib/csv.js` (the CSV import/topic-matching logic).

Run it standalone with `npm install && npm run dev`.

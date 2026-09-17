# Reference Prototype

Working React + Vite prototype — no backend, no persistence, everything lives in
`App.jsx` component state. Authoritative for exact UI/UX: layout, copy, spacing,
colours, and interaction detail. Unused/dead files were removed before this copy
was made — every file here is actually imported and rendered somewhere in the app.

Entry point: `src/main.jsx` → `src/App.jsx` (the consultant console) or
`src/PreviewWindowApp.jsx` (a standalone bootstrap for a real participant link,
superseded in the real build by Tool A being a genuinely separate deployed site).

Key files for **Tool A** (Participant Questionnaire):
- `src/components/ParticipantExperience.jsx` — the entire real participant-facing flow
- `src/components/ApusLogoLight.jsx` — the light-theme logo variant
- `src/lib/calc.js`, `src/lib/topics.js` — shared constants/labels (Tool A reads, does not compute)

Key files for **Tool B** (Consultant Console): everything else under
`src/components/`, plus `src/lib/calc.js` (the full scoring logic — port exactly)
and `src/lib/csv.js` (CSV import/topic-matching logic).

Note on Preview: `src/components/AssessmentReviewHub.jsx` is the single "Preview"
surface for both quantitative and qualitative assessments — a jump-navigation bar
across every screen/topic, per-screen Edit toggles, fully inert rating controls,
and a save/discard confirmation on exit. It is reached the same way from the
Created screen's Preview button and from Assessment Overview's survey-name/eye
click (both just set the same flow state). This replaced an earlier, separate
inline-preview mechanism built on `ParticipantExperience.jsx` — that component is
no longer used for the admin-side preview, only as Tool A's real reference.

Run standalone with `npm install && npm run dev`.

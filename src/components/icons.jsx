// Subset ported from reference-prototype/src/components/icons.jsx — only
// what this dashboard's three tabs use.
export function StakeholderIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="8" r="2.4" />
      <path d="M15.5 14.2c2.8.4 5 2.8 5 5.8" />
    </svg>
  );
}

export function CalibrationIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v18M5 7l-3 6a3 3 0 006 0l-3-6zM19 7l-3 6a3 3 0 006 0l-3-6z" />
      <path d="M5 7h14M9 21h6" />
    </svg>
  );
}

export function ResultsIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  );
}

export function CycleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12a9 9 0 0115-6.7M21 12a9 9 0 01-15 6.7" />
      <path d="M18 3v4h-4M6 21v-4h4" />
    </svg>
  );
}

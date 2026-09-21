import { useState, useRef, useEffect } from 'react';

function fmt(d) {
  if (!d) return '';
  // Build from local date parts — toISOString() converts to UTC and can
  // shift the date back a day in timezones ahead of UTC.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function parse(s) {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d) ? null : d;
}
function displayFmt(s) {
  const d = parse(s);
  return d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
}

export default function DatePicker({ value, onChange, min }) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => parse(value) || parse(min) || new Date());
  const [textInput, setTextInput] = useState(value || '');
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => { setTextInput(value || ''); }, [value]);

  const minDate = parse(min);
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  function selectDay(day) {
    const d = new Date(year, month, day);
    if (minDate && d < minDate) return;
    const s = fmt(d);
    onChange(s);
    setTextInput(s);
    setOpen(false);
  }

  function commitText() {
    const d = parse(textInput);
    if (d && (!minDate || d >= minDate)) {
      onChange(fmt(d));
      setViewMonth(d);
    } else {
      setTextInput(value || '');
    }
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center bg-surface-2 rounded-lg overflow-hidden">
        <input
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onBlur={commitText}
          onFocus={() => setOpen(true)}
          placeholder="YYYY-MM-DD"
          className="flex-1 bg-transparent px-3 py-2.5 text-[12.5px] outline-none"
        />
        <button type="button" onClick={() => setOpen((o) => !o)} className="px-3 text-text-secondary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
        </button>
      </div>
      {value && <p className="text-[10.5px] text-text-secondary mt-1">{displayFmt(value)}</p>}

      {open && (
        <div className="absolute z-30 mt-2 bg-surface-2 border border-border-apus rounded-xl p-3 w-64 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setViewMonth(new Date(year, month - 1, 1))} className="text-text-secondary px-2">‹</button>
            <p className="text-[12px] font-medium">{viewMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
            <button type="button" onClick={() => setViewMonth(new Date(year, month + 1, 1))} className="text-text-secondary px-2">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <span key={i} className="text-[9.5px] text-text-secondary text-center">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <span key={i} />;
              const d = new Date(year, month, day);
              const disabled = minDate && d < minDate;
              const selected = value === fmt(d);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDay(day)}
                  className="text-[11px] rounded-md py-1.5 disabled:opacity-25 disabled:cursor-not-allowed"
                  style={{ background: selected ? '#4C6FFF' : 'transparent', color: selected ? '#F5F6FA' : '#F5F6FA' }}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => selectDay(new Date().getDate())} className="text-[10.5px] text-badge-blue mt-2">Today</button>
        </div>
      )}
    </div>
  );
}

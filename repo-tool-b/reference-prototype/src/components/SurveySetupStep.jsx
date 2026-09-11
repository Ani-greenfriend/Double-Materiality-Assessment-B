import { useState } from 'react';
import LogoUpload from './LogoUpload';
import DatePicker from './DatePicker';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function SurveySetupStep({ mode, modeLabel, defaultNameHint, value, onChange, onProceed, onBack }) {
  const isQual = mode === 'qualitative';
  const meta = value;
  const [slugTouched, setSlugTouched] = useState(Boolean(meta.slug));
  const [copied, setCopied] = useState(false);

  function set(field, v) {
    onChange({ ...meta, [field]: v });
  }

  const start = meta.startDate || todayStr();
  const effectiveSlug = slugTouched ? (meta.slug ?? '') : slugify(meta.name || 'survey');
  const slugValid = isQual || (/^[a-z0-9-]+$/.test(effectiveSlug) && effectiveSlug.length > 0);
  const dateValid = isQual || !meta.endDate || meta.endDate >= start;
  const canProceed = (meta.name || '').trim().length > 0 && slugValid && dateValid;

  function copyLink() {
    navigator.clipboard?.writeText(`apus.app/survey/${effectiveSlug}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="max-w-2xl">
      <button onClick={onBack} className="text-[11.5px] text-text-secondary mb-4">← Back</button>
      <p className="text-[11px] font-semibold text-text-secondary tracking-wide mb-3">GENERAL INFORMATION — {modeLabel}</p>

      <div className="bg-surface rounded-2xl p-5 mb-5">
        <p className="text-[11px] text-text-secondary mb-1.5">SURVEY NAME</p>
        <input
          value={meta.name || ''} onChange={(e) => set('name', e.target.value)}
          placeholder={defaultNameHint}
          className="w-full bg-surface-2 rounded-lg px-3 py-2.5 text-[12.5px] outline-none mb-1"
        />
        <p className="text-[10.5px] text-text-secondary mb-4 italic">e.g. "{defaultNameHint}"</p>

        <p className="text-[11px] text-text-secondary mb-1.5">SURVEY DESCRIPTION</p>
        <textarea
          value={meta.description || ''} onChange={(e) => set('description', e.target.value)}
          placeholder={`This is the ${defaultNameHint.toLowerCase()} (for internal use).`}
          className="w-full bg-surface-2 rounded-lg px-3 py-2.5 text-[12.5px] outline-none min-h-[70px] mb-1"
        />
        <p className="text-[10.5px] text-text-secondary italic">Internal only — participants won't see this.</p>
      </div>

      <div className="bg-surface rounded-2xl p-5 mb-5">
        <LogoUpload logo={meta.logo} onChange={(v) => set('logo', v)} />
      </div>

      {!isQual && (
        <>
          <div className="bg-surface rounded-2xl p-5 mb-5">
            <p className="text-[12px] font-medium mb-1">Select a start and end date when participants can fill in the survey</p>
            <p className="text-[10.5px] text-text-secondary mb-4">Most teams keep a survey open for 1–2 weeks — enough time to reach people without losing momentum.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] text-text-secondary mb-1.5">START DATE</p>
                <DatePicker value={start} min={todayStr()} onChange={(v) => set('startDate', v)} />
              </div>
              <div>
                <p className="text-[11px] text-text-secondary mb-1.5">END DATE</p>
                <DatePicker value={meta.endDate || ''} min={start} onChange={(v) => set('endDate', v)} />
              </div>
            </div>
            {!dateValid && <p className="text-[11px] mt-2" style={{ color: '#D79A4C' }}>End date can't be before the start date.</p>}
          </div>

          <div className="bg-surface rounded-2xl p-5 mb-6">
            <p className="text-[11px] text-text-secondary mb-1.5">SURVEY LINK</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-surface-2 rounded-lg overflow-hidden">
                <span className="text-[12px] text-text-secondary pl-3 whitespace-nowrap">apus.app/survey/</span>
                <input
                  value={effectiveSlug}
                  onChange={(e) => { set('slug', e.target.value); setSlugTouched(true); }}
                  className="flex-1 bg-transparent py-2.5 pr-3 text-[12px] outline-none"
                />
              </div>
              <button onClick={copyLink} className="text-[11.5px] border border-border-apus rounded-lg px-3 py-2.5 shrink-0">{copied ? 'Copied ✓' : 'Copy'}</button>
            </div>
            {!slugValid && <p className="text-[11px] mt-2" style={{ color: '#D79A4C' }}>Only lowercase letters, numbers, and hyphens.</p>}
            {slugValid && <p className="text-[10.5px] text-text-secondary mt-2">✓ This link will be active only between the selected dates.</p>}
          </div>
        </>
      )}

      <button
        onClick={() => onProceed(isQual ? { ...meta, slug: undefined, startDate: undefined, endDate: undefined } : { ...meta, startDate: start, slug: effectiveSlug })}
        disabled={!canProceed}
        className="text-[13px] font-semibold rounded-xl px-6 py-3 disabled:opacity-40"
        style={{ background: '#4C6FFF', color: '#F5F6FA' }}
      >
        Proceed →
      </button>
    </div>
  );
}

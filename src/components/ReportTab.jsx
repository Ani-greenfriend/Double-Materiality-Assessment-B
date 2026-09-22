import { useEffect, useState } from 'react';
import { ReportIcon } from './icons';
import { fetchReportData, fetchPracticeSettings, uploadConsultantLogo } from '../lib/data';
import { buildReportPdf } from '../lib/reportPdf';
import { ESRS_TOPICS } from '../lib/topics';

const SECTION_META = [
  { id: 'cover', label: 'Cover and basis' },
  { id: 'methodology', label: 'Process and methodology' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'results', label: 'Topics and results' },
  { id: 'calibration', label: 'Calibration and sign-off' },
  { id: 'appendix', label: 'Appendix' },
];

const PRESETS = {
  audit: { label: 'Audit pack', description: 'All six sections — the full record for an assurance provider.', sections: { cover: true, methodology: true, engagement: true, results: true, calibration: true, appendix: true } },
  client: { label: 'Client report', description: 'Cover, Engagement, Topics and results, and Calibration and sign-off. Process and methodology and the Appendix are optional extras.', sections: { cover: true, methodology: false, engagement: true, results: true, calibration: true, appendix: false } },
};

const STEP_LABEL = { 1: 'Preset', 2: 'Sections', 3: 'Options', 4: 'Preview and download' };

function StepNav({ step, onJump }) {
  return (
    <div className="flex items-center gap-1.5 mb-5 flex-wrap">
      {[1, 2, 3, 4].map((s, i) => (
        <div key={s} className="flex items-center gap-1.5">
          <button
            onClick={() => s < step && onJump(s)}
            disabled={s >= step}
            className="text-[11px] font-medium rounded-full px-2.5 py-1"
            style={{
              background: s === step ? '#4C6FFF' : s < step ? 'rgba(76,111,255,0.12)' : 'transparent',
              color: s === step ? '#F5F6FA' : s < step ? '#4C6FFF' : '#5B5B66',
              cursor: s < step ? 'pointer' : 'default',
            }}
          >
            {STEP_LABEL[s]}
          </button>
          {i < 3 && <span className="text-[10px] text-text-secondary">→</span>}
        </div>
      ))}
    </div>
  );
}

// Section 8, "Report builder" — a four-step flow (Preset -> Sections ->
// Options -> Preview and download), built per Section 3's PDF design
// intent (white pages, one accent colour, graphs as images, tables that
// repeat their header row) and Section 8's exact field list. The actual
// PDF assembly lives in lib/reportPdf.js — this component is just the
// wizard UI plus fetching the data buildReportPdf needs.
export default function ReportTab({ cycles }) {
  const financialYears = [...new Set(cycles.map((c) => c.financialYear))].sort((a, b) => b - a);
  const [financialYear, setFinancialYear] = useState(financialYears[0] ?? null);
  const [step, setStep] = useState(1);
  const [preset, setPreset] = useState(null);
  const [sections, setSections] = useState(PRESETS.audit.sections);
  const [options, setOptions] = useState({
    personalData: false,
    justifications: 'full', // full | flagged | excluded
    scope: 'all', // all | material | <esrs topic id>
    notes: {},
    approvalDetails: { approverName: '', approverRole: '', approvalDate: '', minutesReference: '' },
  });
  const [practiceSettings, setPracticeSettings] = useState({ consultant_logo_url: null });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (cycles.length && !cycles.some((c) => c.financialYear === financialYear)) setFinancialYear(financialYears[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycles]);

  useEffect(() => {
    fetchPracticeSettings().then(setPracticeSettings).catch((err) => setError(err.message));
  }, []);

  const cycle = cycles.find((c) => c.financialYear === financialYear) ?? null;

  function choosePreset(key) {
    setPreset(key);
    setSections(PRESETS[key].sections);
    setStep(2);
  }

  function toggleSection(id) {
    setSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleLogoFile(file) {
    if (!file) return;
    try {
      const url = await uploadConsultantLogo(file);
      setPracticeSettings((prev) => ({ ...prev, consultant_logo_url: url }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function generatePreview() {
    if (!cycle) return;
    setBusy(true);
    setError('');
    try {
      const data = await fetchReportData(cycle.id);
      const doc = await buildReportPdf({ cycle, ...data, consultantLogoUrl: practiceSettings.consultant_logo_url }, { sections, options });
      const blobUrl = doc.output('bloburl');
      setPreviewUrl(String(blobUrl));
      return doc;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function goToPreview() {
    setStep(4);
    await generatePreview();
  }

  async function handleDownload() {
    setBusy(true);
    setError('');
    try {
      const data = await fetchReportData(cycle.id);
      const doc = await buildReportPdf({ cycle, ...data, consultantLogoUrl: practiceSettings.consultant_logo_url }, { sections, options });
      doc.save(`DMA-report-${cycle.clientName ?? 'client'}-FY${cycle.financialYear}.pdf`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="text-[24px] font-bold flex items-center gap-3 mb-1">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #B79BF0, #9B7FE0)' }}>
          <ReportIcon size={19} />
        </span>
        Report
      </h2>
      <p className="text-[12px] text-text-secondary mb-5">Build the DMA report as a PDF document.</p>

      {error && <p className="text-[12px] text-badge-amber mb-4">{error}</p>}

      {financialYears.length > 1 && step === 1 && (
        <div className="mb-4">
          <select value={financialYear ?? ''} onChange={(e) => setFinancialYear(Number(e.target.value))} className="bg-surface border border-border-apus rounded-lg px-3 py-1.5 text-[12px] outline-none">
            {financialYears.map((y) => <option key={y} value={y}>FY{y}</option>)}
          </select>
        </div>
      )}

      {!cycle ? (
        <div className="bg-surface rounded-2xl p-10 text-center text-text-secondary text-[13px]">No assessments yet.</div>
      ) : (
        <>
          <StepNav step={step} onJump={setStep} />

          {step === 1 && (
            <div className="grid grid-cols-2 gap-4 max-w-2xl">
              {Object.entries(PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => choosePreset(key)}
                  className="text-left bg-surface rounded-2xl p-5 border-2 hover:border-badge-blue"
                  style={{ borderColor: preset === key ? '#4C6FFF' : 'transparent' }}
                >
                  <p className="font-semibold text-[14px] mb-1.5">{p.label}</p>
                  <p className="text-[11.5px] text-text-secondary">{p.description}</p>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="max-w-xl">
              <div className="bg-surface rounded-2xl p-5 mb-5">
                {SECTION_META.map(({ id, label }) => (
                  <label key={id} className="flex items-center justify-between py-2 border-b border-border-apus last:border-b-0 cursor-pointer">
                    <span className="text-[13px]">{label}</span>
                    <button
                      type="button"
                      onClick={() => toggleSection(id)}
                      className="w-9 h-5 rounded-full relative transition-colors shrink-0"
                      style={{ background: sections[id] ? '#4C6FFF' : '#2A2830' }}
                    >
                      <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: sections[id] ? '18px' : '2px' }} />
                    </button>
                  </label>
                ))}
              </div>

              {sections.cover && (
                <div className="bg-surface rounded-2xl p-5 mb-5">
                  <p className="text-[12.5px] font-semibold mb-2">Consultant logo (optional — cover page)</p>
                  <div className="flex items-center gap-3">
                    {practiceSettings.consultant_logo_url ? (
                      <img src={practiceSettings.consultant_logo_url} alt="" className="w-14 h-14 rounded-lg object-contain bg-surface-2" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-surface-2 flex items-center justify-center text-text-secondary text-[10px]">No logo</div>
                    )}
                    <label className="text-[11.5px] border border-border-apus rounded-lg px-3 py-1.5 cursor-pointer">
                      Browse file
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoFile(e.target.files[0])} />
                    </label>
                  </div>
                  <p className="text-[10.5px] text-text-secondary mt-2">The client logo already on file is used automatically.</p>
                </div>
              )}

              <button onClick={() => setStep(3)} className="text-[13px] font-semibold rounded-xl px-6 py-3" style={{ background: '#4C6FFF', color: '#F5F6FA' }}>Continue →</button>
            </div>
          )}

          {step === 3 && (
            <div className="max-w-xl">
              <div className="bg-surface rounded-2xl p-5 mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[12.5px] font-semibold">Include personal data</p>
                  <p className="text-[11px] text-text-secondary mt-0.5">Off by default — expertise and stakeholder group only. Names and titles appear only if this is on.</p>
                </div>
                <button
                  onClick={() => setOptions((o) => ({ ...o, personalData: !o.personalData }))}
                  className="w-11 h-6 rounded-full relative transition-colors shrink-0"
                  style={{ background: options.personalData ? '#4C6FFF' : '#2A2830' }}
                >
                  <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: options.personalData ? '22px' : '2px' }} />
                </button>
              </div>

              <div className="bg-surface rounded-2xl p-5 mb-4">
                <p className="text-[12.5px] font-semibold mb-3">Justifications</p>
                <div className="flex flex-col gap-2">
                  {[['full', 'In full'], ['flagged', 'Only for flagged topics'], ['excluded', 'Excluded']].map(([val, label]) => (
                    <label key={val} className="flex items-center gap-2.5 bg-surface-2 rounded-lg px-3 py-2 cursor-pointer">
                      <input type="radio" checked={options.justifications === val} onChange={() => setOptions((o) => ({ ...o, justifications: val }))} />
                      <span className="text-[12.5px]">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-surface rounded-2xl p-5 mb-4">
                <p className="text-[12.5px] font-semibold mb-3">Scope</p>
                <select value={options.scope} onChange={(e) => setOptions((o) => ({ ...o, scope: e.target.value }))} className="w-full bg-surface-2 rounded-lg px-3 py-2 text-[12.5px] outline-none">
                  <option value="all">All topics</option>
                  <option value="material">Material only</option>
                  {ESRS_TOPICS.map((t) => <option key={t.id} value={t.id}>{t.id} · {t.name}</option>)}
                </select>
              </div>

              <div className="bg-surface rounded-2xl p-5 mb-4">
                <p className="text-[12.5px] font-semibold mb-1">Approval details <span className="text-text-secondary font-normal">(optional — printed in Calibration and sign-off)</span></p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input value={options.approvalDetails.approverName} onChange={(e) => setOptions((o) => ({ ...o, approvalDetails: { ...o.approvalDetails, approverName: e.target.value } }))} placeholder="Approver name" className="bg-surface-2 rounded-lg px-3 py-2 text-[12.5px] outline-none" />
                  <input value={options.approvalDetails.approverRole} onChange={(e) => setOptions((o) => ({ ...o, approvalDetails: { ...o.approvalDetails, approverRole: e.target.value } }))} placeholder="Role" className="bg-surface-2 rounded-lg px-3 py-2 text-[12.5px] outline-none" />
                  <input type="date" value={options.approvalDetails.approvalDate} onChange={(e) => setOptions((o) => ({ ...o, approvalDetails: { ...o.approvalDetails, approvalDate: e.target.value } }))} className="bg-surface-2 rounded-lg px-3 py-2 text-[12.5px] outline-none" />
                  <input value={options.approvalDetails.minutesReference} onChange={(e) => setOptions((o) => ({ ...o, approvalDetails: { ...o.approvalDetails, minutesReference: e.target.value } }))} placeholder="Minutes reference" className="bg-surface-2 rounded-lg px-3 py-2 text-[12.5px] outline-none" />
                </div>
              </div>

              {SECTION_META.filter(({ id }) => sections[id]).map(({ id, label }) => (
                <div key={id} className="bg-surface rounded-2xl p-5 mb-4">
                  <p className="text-[12.5px] font-semibold mb-2">Note for "{label}" <span className="text-text-secondary font-normal">(optional)</span></p>
                  <textarea
                    value={options.notes[id] ?? ''}
                    onChange={(e) => setOptions((o) => ({ ...o, notes: { ...o.notes, [id]: e.target.value } }))}
                    className="w-full bg-surface-2 rounded-lg px-3 py-2 text-[12px] outline-none min-h-[50px]"
                  />
                </div>
              ))}

              <button onClick={goToPreview} disabled={busy} className="text-[13px] font-semibold rounded-xl px-6 py-3 disabled:opacity-40" style={{ background: '#4C6FFF', color: '#F5F6FA' }}>
                {busy ? 'Building…' : 'Preview →'}
              </button>
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <button onClick={generatePreview} disabled={busy} className="text-[12px] border border-border-apus rounded-lg px-3.5 py-2 disabled:opacity-40">{busy ? 'Building…' : 'Regenerate preview'}</button>
                <button onClick={handleDownload} disabled={busy} className="text-[13px] font-semibold rounded-xl px-5 py-2.5 disabled:opacity-40" style={{ background: '#4C6FFF', color: '#F5F6FA' }}>⭳ Download PDF</button>
              </div>
              {previewUrl ? (
                <iframe title="Report preview" src={previewUrl} className="w-full rounded-2xl border border-border-apus" style={{ height: '80vh', background: '#FFFFFF' }} />
              ) : (
                <div className="bg-surface rounded-2xl p-10 text-center text-text-secondary text-[13px]">{busy ? 'Building the report…' : 'Nothing to preview yet.'}</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

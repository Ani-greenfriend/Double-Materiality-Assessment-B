import { ReportIcon } from './icons';

export default function ReportTab() {
  return (
    <div>
      <h2 className="text-[24px] font-bold flex items-center gap-3 mb-1">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #B79BF0, #9B7FE0)' }}>
          <ReportIcon size={19} />
        </span>
        Report
      </h2>
      <p className="text-[12px] text-text-secondary mb-5">Build the DMA report as a Word (.docx) document.</p>
      <div className="bg-surface rounded-2xl p-10 text-center text-text-secondary text-[13px]">
        Not built yet — the report builder (preset, sections, options, preview and download) is later in the build order.
      </div>
    </div>
  );
}

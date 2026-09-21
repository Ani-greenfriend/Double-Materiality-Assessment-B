import { AssessmentIcon } from './icons';

// Section 8: "Cycles and assessments overview" describes assessments living
// inside Cycles, but the App shell lists Assessments as its own nav item —
// the Assessment overview scoped to the selected cycle (perspective filter
// included) is Step 3 of the restore. Stub until then.
export default function AssessmentsTab({ perspective }) {
  return (
    <div>
      <h2 className="text-[24px] font-bold flex items-center gap-3 mb-1">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #5ED996, #4C6FFF)' }}>
          <AssessmentIcon size={19} />
        </span>
        Assessments
      </h2>
      <p className="text-[12px] text-text-secondary mb-5">
        {perspective ? `Filtered to ${perspective}. ` : ''}Not built yet — the Assessment overview scoped to the selected cycle is step 3 of the restore.
      </p>
      <div className="bg-surface rounded-2xl p-10 text-center text-text-secondary text-[13px]">Manage assessments for now in Cycles.</div>
    </div>
  );
}

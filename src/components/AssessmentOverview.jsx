import { AssessmentIcon } from './icons';

const STATUS_STYLE = {
  Draft: { text: '#8B8B98', bg: 'rgba(139,139,152,0.12)' },
  Scheduled: { text: '#8B8B98', bg: 'rgba(139,139,152,0.12)' },
  Active: { text: '#4C6FFF', bg: 'rgba(76,111,255,0.12)' },
  Closed: { text: '#8B8B98', bg: 'rgba(139,139,152,0.12)' },
  Completed: { text: '#4C6FFF', bg: 'rgba(76,111,255,0.12)' },
};

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function ResultsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" />
    </svg>
  );
}

// A survey with dates isn't "Active" just because it was created — it only goes
// live once today falls inside the start/end window, and closes after.
function computeStatus(a) {
  if (a.status) return a.status; // expert live sessions store a real terminal status directly
  if (!a.startDate) return 'Active';
  const today = new Date().toISOString().split('T')[0];
  if (today < a.startDate) return 'Scheduled';
  if (a.endDate && today > a.endDate) return 'Closed';
  return 'Active';
}

function fmtDate(s) {
  if (!s) return '–';
  return new Date(s + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AssessmentOverview({ assessments, onNew, onEdit, onPreview, onViewResults, onDelete }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-[24px] font-bold text-white flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg, #7C9BFF, #4C6FFF)', boxShadow: '0 6px 14px -4px rgba(0,0,0,0.4)' }}>
            <AssessmentIcon size={19} />
          </span>
          Assessment
        </h2>
      </div>
      <p className="text-[12px] text-text-secondary mb-6">Every survey you've set up for this project, Expert survey and Expert live session, impact and financial.</p>

      <div className="bg-surface rounded-2xl p-5">
        <p className="font-semibold text-[14px] mb-4">Assessment overview</p>

        {assessments.length === 0 ? (
          <p className="text-[12.5px] text-text-secondary py-6 text-center">No assessments yet — create your first one below.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10.5px] text-text-secondary tracking-wide">
                <th className="font-medium pb-3 pr-3">NO.</th>
                <th className="font-medium pb-3 pr-3">SURVEY NAME</th>
                <th className="font-medium pb-3 pr-3">SURVEY TYPE</th>
                <th className="font-medium pb-3 pr-3">DATES</th>
                <th className="font-medium pb-3 pr-3">RESPONDENTS</th>
                <th className="font-medium pb-3 pr-3">STATUS</th>
                <th className="font-medium pb-3">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a, i) => {
                const status = computeStatus(a);
                return (
                  <tr key={a.id} className="border-t border-border-apus">
                    <td className="py-3 pr-3 text-[12.5px] text-text-secondary">{String(i + 1).padStart(2, '0')}</td>
                    <td className="py-3 pr-3 text-[12.5px] font-medium">
                      <button onClick={() => onPreview(a)} className="hover:underline text-left" title="Open the detailed review view">
                        {a.name}
                      </button>
                    </td>
                    <td className="py-3 pr-3 text-[12.5px] text-text-secondary">{a.type}</td>
                    <td className="py-3 pr-3 text-[11.5px] text-text-secondary whitespace-nowrap">
                      {a.startDate ? `${fmtDate(a.startDate)} → ${a.endDate ? fmtDate(a.endDate) : 'open'}` : '–'}
                    </td>
                    <td className="py-3 pr-3 text-[12.5px] text-text-secondary">{a.respondents}</td>
                    <td className="py-3 pr-3">
                      <span
                        className="text-[10.5px] font-semibold rounded-full px-2.5 py-1"
                        style={{ color: STATUS_STYLE[status].text, background: STATUS_STYLE[status].bg }}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-3 text-text-secondary">
                        <button onClick={() => onPreview(a)} className="hover:text-text-primary" title="Preview how this looks for participants">
                          <EyeIcon />
                        </button>
                        <button onClick={() => onEdit(a)} className="hover:text-text-primary" title="Edit setup">
                          <EditIcon />
                        </button>
                        <button onClick={() => onViewResults(a)} className="hover:text-text-primary" title="View results">
                          <ResultsIcon />
                        </button>
                        <button
                          onClick={() => { if (window.confirm(`Are you sure you want to delete "${a.name}"? This cannot be undone.`)) onDelete(a); }}
                          className="hover:text-[#E0645A]"
                          title="Delete assessment"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <button onClick={onNew} className="text-[12.5px] font-semibold border border-border-apus rounded-lg px-4 py-2.5 mt-5">
        + New Assessment
      </button>
    </div>
  );
}

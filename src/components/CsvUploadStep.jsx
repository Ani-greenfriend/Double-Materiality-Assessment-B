import { useRef, useState } from 'react';
import { parseCsv, generateExampleCsv } from '../lib/csv';
import { ESRS_TOPICS } from '../lib/topics';

export default function CsvUploadStep({ onLoaded }) {
  const fileRef = useRef(null);
  const [errors, setErrors] = useState([]);

  function downloadExample() {
    const csv = generateExampleCsv();
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'apus-example-iros.csv';
    a.click();
  }

  function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { iros, errors: parseErrors } = parseCsv(ev.target.result, ESRS_TOPICS);
      setErrors(parseErrors);
      if (iros.length) onLoaded(iros);
    };
    reader.readAsText(file);
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-[24px] font-bold text-white mb-1">Upload IROs</h2>
      <p className="text-[12px] text-text-secondary mb-6">
        Upload the list of IROs to rate in this session. Ratings themselves are collected next, live with participants.
      </p>

      <div className="bg-surface rounded-2xl p-8 text-center">
        <p className="text-[12.5px] text-text-secondary mb-5">Download the template if you don't have a file ready yet.</p>
        <div className="flex gap-2 justify-center">
          <button onClick={downloadExample} className="text-[12px] border border-border-apus rounded-lg px-4 py-2 text-text-secondary">
            Download example CSV
          </button>
          <button onClick={() => fileRef.current.click()} className="text-[12px] bg-emerald text-app-black font-semibold rounded-lg px-4 py-2">
            Upload CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {errors.length > 0 && (
        <div className="bg-surface-2 border border-border-apus rounded-xl p-3 mt-4">
          {errors.map((e, i) => (
            <p key={i} className="text-[12px] text-badge-amber">Row {e.row}: {e.message}</p>
          ))}
        </div>
      )}
    </div>
  );
}

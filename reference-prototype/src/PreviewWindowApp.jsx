import { useState, useEffect } from 'react';
import ParticipantExperience from './components/ParticipantExperience';

export default function PreviewWindowApp({ assessmentId }) {
  const [data, setData] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(`apus_preview_${assessmentId}`);
    if (raw) setData(JSON.parse(raw));
  }, [assessmentId]);

  const PreviewBar = () => (
    <div className="flex items-center justify-between px-5 py-2" style={{ background: '#FFF4E0', borderBottom: '1px solid #F0DBAE' }}>
      <span className="text-[11.5px] font-semibold" style={{ color: '#9A6B1F' }}>👁 Preview — nothing entered here is recorded</span>
      <button onClick={() => window.close()} className="text-[11.5px] font-medium" style={{ color: '#9A6B1F' }}>← Back to setup</button>
    </div>
  );

  if (submitted) {
    return (
      <div>
        <PreviewBar />
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF8' }}>
          <div className="text-center">
            <p className="text-[28px] mb-2">✓</p>
            <p className="text-[15px] font-semibold mb-1" style={{ color: '#111318' }}>That's what submitting looks like</p>
            <p className="text-[12.5px]" style={{ color: '#8A8A94' }}>Nothing was actually recorded — this was a preview. You can close this tab.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF8' }}>
        <p className="text-[13px]" style={{ color: '#8A8A94' }}>This preview link has expired — ask for a fresh one.</p>
      </div>
    );
  }

  return (
    <div>
      <PreviewBar />
      <ParticipantExperience
        {...data}
        onSubmit={() => setSubmitted(true)}
      />
    </div>
  );
}

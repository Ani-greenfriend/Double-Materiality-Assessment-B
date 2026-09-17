import { useState } from 'react';

export default function LogoUpload({ logo, onChange }) {
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target.result);
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <p className="text-[11px] text-text-secondary mb-1.5">COMPANY LOGO <span className="opacity-60">(optional — shown on the questionnaire)</span></p>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        className="flex items-center gap-4 rounded-xl p-4 border border-dashed"
        style={{ borderColor: dragOver ? '#4C6FFF' : '#2A2830' }}
      >
        {logo ? (
          <img src={logo} alt="Logo preview" className="w-20 h-20 rounded-xl object-contain bg-surface-2" />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-surface-2 flex items-center justify-center text-text-secondary text-[11px]">No logo</div>
        )}
        <div className="flex-1">
          <p className="text-[12px] text-text-secondary mb-1.5">Drag & drop, or</p>
          <label className="text-[11.5px] border border-border-apus rounded-lg px-3 py-1.5 cursor-pointer inline-block">
            Browse file
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
          </label>
        </div>
        {logo && (
          <button onClick={() => onChange(null)} className="text-[11px] text-text-secondary">Remove</button>
        )}
      </div>
    </div>
  );
}

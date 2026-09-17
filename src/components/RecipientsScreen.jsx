import { useState } from 'react';
import { PILLAR_COLOR } from '../lib/topics';

const PILLAR_LABEL = { E: 'Environmental', S: 'Social', G: 'Governance' };

function downloadCsv(rows, filename) {
  const header = ['Name', 'Title', 'Company', 'Email', 'Stakeholder group', 'Assign'];
  const lines = [header, ...rows.map((r) => [r.name, r.title, r.company, r.email, r.groupName, PILLAR_LABEL[r.pillar] || ''])]
    .map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(','));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function PersonRow({ p, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', p.key); onDragStart?.(); }}
      className="flex items-center gap-3 bg-surface-2 rounded-lg px-3 py-2 cursor-grab"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-text-secondary shrink-0">
        <circle cx="8" cy="6" r="1.6" /><circle cx="16" cy="6" r="1.6" />
        <circle cx="8" cy="12" r="1.6" /><circle cx="16" cy="12" r="1.6" />
        <circle cx="8" cy="18" r="1.6" /><circle cx="16" cy="18" r="1.6" />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-medium truncate">{p.name}</p>
        {(p.title || p.company) && <p className="text-[10.5px] text-text-secondary truncate">{p.title}{p.title && p.company && ' · '}{p.company}</p>}
      </div>
      {p.pillar && (
        <span className="text-[9.5px] font-semibold rounded-full px-2 py-0.5 shrink-0" style={{ color: PILLAR_COLOR[p.pillar].text, background: PILLAR_COLOR[p.pillar].bg }}>
          {PILLAR_LABEL[p.pillar]}
        </span>
      )}
    </div>
  );
}

export default function RecipientsScreen({ mode, stakeholders, stakeholderMap, onBack, onContinue, onGoToStakeholders }) {
  const chosenNames = new Set([...(stakeholders.impact || []), ...(stakeholders.financial || [])]);
  const chosenGroups = stakeholderMap.filter((g) => chosenNames.has(g.name));

  const allPeople = chosenGroups.flatMap((g) =>
    g.members.map((m) => ({ key: `${g.id}::${m.id}`, groupName: g.name, ...m }))
  );

  const [excluded, setExcluded] = useState(new Set());
  const [dragOverZone, setDragOverZone] = useState(null);

  function drop(zone) {
    return (e) => {
      e.preventDefault();
      const key = e.dataTransfer.getData('text/plain');
      setExcluded((prev) => {
        const next = new Set(prev);
        if (zone === 'excluded') next.add(key); else next.delete(key);
        return next;
      });
      setDragOverZone(null);
    };
  }

  const included = allPeople.filter((p) => !excluded.has(p.key));
  const excludedPeople = allPeople.filter((p) => excluded.has(p.key));
  const includedByGroup = chosenGroups.map((g) => ({
    group: g,
    people: included.filter((p) => p.groupName === g.name),
  }));

  const heading = mode === 'qualitative' ? 'Who participates' : 'Who receives the questionnaire';
  const subheading = mode === 'qualitative'
    ? 'The named contacts below come from the stakeholder groups you chose for this session. Drag anyone you don\u2019t want in the room down to Excluded.'
    : 'These are the detailed contacts behind the stakeholder groups you chose. Drag anyone who shouldn\u2019t receive the link down to Excluded — this list is for your own planning and export, since the link itself works for anyone who has it.';

  return (
    <div className="max-w-2xl">
      <button onClick={onBack} className="text-[11.5px] text-text-secondary mb-4">← Back to review</button>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[24px] font-bold text-white">{heading}</h2>
        <button onClick={onGoToStakeholders} className="text-[11.5px] font-semibold rounded-lg px-3.5 py-2 border border-border-apus">
          + Add more stakeholders
        </button>
      </div>
      <p className="text-[12px] text-text-secondary mb-6">{subheading}</p>

      {allPeople.length === 0 ? (
        <div className="bg-surface rounded-2xl p-6 mb-5">
          <p className="text-[12.5px] text-text-secondary">
            None of the stakeholder groups you chose have named contacts yet — add some in the Stakeholders section, or just continue without a detailed list.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12.5px] font-semibold">Included ({included.length})</p>
            <button
              onClick={() => downloadCsv(included, `${heading.toLowerCase().replace(/\s+/g, '-')}.csv`)}
              className="text-[11.5px] font-semibold border border-border-apus rounded-lg px-3 py-1.5"
            >
              ⭳ Download Excel (CSV)
            </button>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOverZone('included'); }}
            onDragLeave={() => setDragOverZone(null)}
            onDrop={drop('included')}
            className="bg-surface rounded-2xl p-4 mb-6"
            style={{ outline: dragOverZone === 'included' ? '2px dashed #4C6FFF' : 'none', minHeight: 80 }}
          >
            {includedByGroup.every(({ people }) => people.length === 0) ? (
              <p className="text-[12px] text-text-secondary text-center py-4">Everyone has been excluded — drag someone back up from below.</p>
            ) : (
              includedByGroup.map(({ group, people }) => people.length > 0 && (
                <div key={group.id} className="mb-4 last:mb-0">
                  <p className="text-[10.5px] font-semibold text-text-secondary tracking-wide mb-2">{group.name.toUpperCase()}</p>
                  <div className="flex flex-col gap-1.5">
                    {people.map((p) => <PersonRow key={p.key} p={p} />)}
                  </div>
                </div>
              ))
            )}
          </div>

          <p className="text-[10.5px] text-text-secondary mb-2">EXCLUDED — drag here to leave someone out of this assessment</p>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOverZone('excluded'); }}
            onDragLeave={() => setDragOverZone(null)}
            onDrop={drop('excluded')}
            className="rounded-2xl p-4 mb-6"
            style={{ background: 'rgba(139,139,152,0.04)', outline: dragOverZone === 'excluded' ? '2px dashed #8B8B98' : 'none', minHeight: 70 }}
          >
            {excludedPeople.length === 0 ? (
              <p className="text-[11.5px] text-text-secondary text-center py-4">Nobody excluded — drag a name here to leave them out.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {excludedPeople.map((p) => <PersonRow key={p.key} p={p} />)}
              </div>
            )}
          </div>
        </>
      )}

      <button
        onClick={() => onContinue(included)}
        className="text-[13px] font-semibold rounded-xl px-6 py-3"
        style={{ background: '#4C6FFF', color: '#F5F6FA' }}
      >
        Continue →
      </button>
    </div>
  );
}

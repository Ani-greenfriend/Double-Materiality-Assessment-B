import { StakeholderIcon } from './icons';

const TYPE_LABEL = { impact: 'Impact', financial: 'Financial', silent: 'Silent stakeholders' };

export default function StakeholdersTab({ master, participation }) {
  const totalSubmissions = participation.reduce((sum, p) => sum + p.submissionCount, 0);

  return (
    <div>
      <h2 className="text-[24px] font-bold flex items-center gap-3 mb-1">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #B08CFF, #9B7FE0)' }}>
          <StakeholderIcon size={19} />
        </span>
        Stakeholders
      </h2>
      <p className="text-[12px] text-text-secondary mb-5">Who's in the master map, and who actually rated this assessment.</p>

      <p className="text-[13px] font-semibold mb-2">Participation in this assessment</p>
      {participation.length === 0 ? (
        <div className="bg-surface border border-border-apus rounded-2xl p-6 text-[13px] text-text-secondary mb-6">
          No ratings recorded for this assessment yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-6">
          {participation.map((p) => (
            <div key={p.group} className="bg-surface border border-border-apus rounded-xl p-3.5 flex items-center justify-between">
              <span className="text-[13px] font-medium">{p.group}</span>
              <span className="text-[12px] text-text-secondary">{p.submissionCount} submission{p.submissionCount === 1 ? '' : 's'} · {totalSubmissions ? Math.round((p.submissionCount / totalSubmissions) * 100) : 0}% of responses</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-[13px] font-semibold mb-2">Master stakeholder map</p>
      {master.length === 0 ? (
        <div className="bg-surface border border-border-apus rounded-2xl p-6 text-[13px] text-text-secondary">
          No stakeholder groups defined yet.
        </div>
      ) : (
        ['impact', 'financial', 'silent', null].map((type) => {
          const groups = master.filter((g) => g.type === type);
          if (!groups.length) return null;
          return (
            <div key={type ?? 'unclassified'} className="mb-5">
              <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-2">
                {type ? TYPE_LABEL[type] : 'Unclassified — needs a type'} · {groups.length}
              </p>
              {type === 'silent' && (
                <p className="text-[11.5px] text-text-secondary mb-3 leading-relaxed">
                  Nature and other silent stakeholders cannot speak for themselves. ESRS allows a proxy — for example
                  an ecologist, a nature NGO or a scientific study. Consider whether any silent stakeholder is
                  affected by this company's activities and, if so, add a representative.
                </p>
              )}
              <div className="flex flex-col gap-2">
                {groups.map((g) => (
                  <div key={g.id} className="bg-surface border border-border-apus rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-semibold">{g.name}</span>
                      <span className="text-[10.5px] text-text-secondary">{g.members.length} contact{g.members.length === 1 ? '' : 's'}</span>
                    </div>
                    {g.members.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {g.members.map((m) => (
                          <div key={m.id} className="text-[11.5px] text-text-secondary flex flex-wrap gap-x-2">
                            <span className="text-text-primary font-medium">{m.name}</span>
                            <span>{m.role}</span>
                            {m.company && <span>· {m.company}</span>}
                            {(m.pillars ?? []).length > 0 && <span>· {m.pillars.join('/')}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

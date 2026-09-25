import { useRef, useState } from 'react';

// Matches RecipientsScreen.jsx's own downloadCsv exactly (comma-delimited,
// quoted cells, same Blob/anchor-click pattern) — "same format and naming
// style as the existing Recipients download," per direct instruction.
function downloadCsv(rows, header, filename) {
  const lines = [header, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ExpertAssessmentCreated({ mode, surveyName, assessmentSlug, invitations = [], startDate, endDate, alreadyRun, participantCount = 0, hasStakeholderGroups = true, readOnly, onCopyInvitation, onPreview, onKickOff, onGoToRecipients, onGoToStakeholders, onGoToOverview }) {
  const isQuant = mode === 'expert_survey';
  // Per-invitation copy feedback — never silent, per direct instruction.
  // 'copied' auto-clears after 2s; 'failed' stays until the next attempt,
  // with the row's own link field selected as the copy-by-hand fallback.
  const [copyState, setCopyState] = useState({});
  const inputRefs = useRef({});

  async function handleCopyClick(inv) {
    const result = await onCopyInvitation(inv);
    if (result?.ok) {
      setCopyState((s) => ({ ...s, [inv.id]: 'copied' }));
      setTimeout(() => setCopyState((s) => (s[inv.id] === 'copied' ? { ...s, [inv.id]: undefined } : s)), 2000);
    } else {
      setCopyState((s) => ({ ...s, [inv.id]: 'failed' }));
      const el = inputRefs.current[inv.id];
      el?.focus();
      el?.select();
    }
  }

  function downloadInvitationsCsv() {
    downloadCsv(
      invitations.map((inv) => [inv.name, inv.email ?? '', inv.groupName ?? '', inv.status ?? '', inv.link]),
      ['Name', 'Email', 'Stakeholder group', 'Status', 'Personal link'],
      `${assessmentSlug}-invitations.csv`
    );
  }

  return (
    <div className="max-w-xl mx-auto text-center">
      <div className="bg-surface rounded-2xl p-10">
        <p className="text-[32px] mb-3">{alreadyRun ? '✓' : '🎉'}</p>
        <p className="font-semibold text-[17px] mb-2">
          {alreadyRun ? `"${surveyName}" has been updated` : `"${surveyName}" has been created`}
        </p>
        <p className="text-[12.5px] text-text-secondary mb-6">
          {isQuant
            ? <>It will run from <b className="text-text-primary">{startDate}</b> to <b className="text-text-primary">{endDate || 'no end date set'}</b>.</>
            : alreadyRun
            ? 'Your changes are saved. The session you already ran keeps its existing ratings — re-open it below only if you want to continue or re-rate topics.'
            : "You're ready to run this live with your expert group whenever you are."}
        </p>

        {isQuant && (
          <>
            <div className="text-left rounded-xl p-4 mb-3" style={{ background: 'rgba(76,111,255,0.08)', border: '1px solid rgba(76,111,255,0.2)' }}>
              <p className="text-[10.5px] font-semibold mb-1" style={{ color: '#4C6FFF' }}>PREVIEW — INSIDE THIS TOOL</p>
              <p className="text-[11.5px] text-text-secondary mb-3">See exactly what participants will see, right here — with a way back to setup, nothing sent or recorded.</p>
              <button
                onClick={onPreview}
                className="text-[12.5px] font-semibold rounded-lg px-4 py-2.5"
                style={{ background: '#4C6FFF', color: '#F5F6FA' }}
              >
                Preview →
              </button>
            </div>

            <div className="text-left bg-surface-2 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-[10.5px] font-semibold text-text-secondary">PERSONAL LINKS — OUTSIDE THIS PLATFORM</p>
                {!readOnly && invitations.length > 0 && (
                  <button onClick={downloadInvitationsCsv} className="text-[10.5px] text-text-secondary hover:text-text-primary shrink-0">⭳ Download Excel (CSV)</button>
                )}
              </div>
              <p className="text-[11.5px] text-text-secondary mb-3">
                Each invitee has their own link to fill in the assessment on their own device — separately from this tool, no account needed. Manage the full list any time from Recipients.
              </p>
              {invitations.length === 0 ? (
                <p className="text-[11.5px] text-text-secondary">No invitations yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {invitations.map((inv) => (
                    <div key={inv.id}>
                      <div className="flex items-center gap-2">
                        <span className="text-[11.5px] w-28 truncate shrink-0">{inv.name}</span>
                        <input
                          readOnly
                          ref={(el) => { inputRefs.current[inv.id] = el; }}
                          value={inv.link}
                          onFocus={(e) => e.target.select()}
                          className="flex-1 bg-app-black rounded-lg px-3 py-2 text-[12px] outline-none"
                        />
                        <button
                          onClick={() => handleCopyClick(inv)}
                          className="text-[11.5px] border rounded-lg px-3 py-2 shrink-0"
                          style={{ borderColor: copyState[inv.id] === 'copied' ? '#5ED996' : '#2A2830', color: copyState[inv.id] === 'copied' ? '#5ED996' : undefined }}
                        >
                          {copyState[inv.id] === 'copied' ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                      {copyState[inv.id] === 'failed' && (
                        <p className="text-[10.5px] mt-1" style={{ color: '#D79A4C' }}>
                          Couldn't copy automatically — the link above is selected, press Ctrl+C (⌘+C on Mac) to copy it.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {!isQuant && alreadyRun && (
          <>
            <button
              onClick={onGoToOverview}
              className="w-full text-[13px] font-semibold rounded-xl px-4 py-3"
              style={{ background: '#4C6FFF', color: '#F5F6FA' }}
            >
              Back to overview
            </button>
            <button onClick={onKickOff} className="w-full text-[12.5px] text-text-secondary mt-3">
              Or re-open the live session to continue rating
            </button>
          </>
        )}

        {!isQuant && !alreadyRun && participantCount === 0 && (
          <div className="text-left rounded-xl p-4 mb-3" style={{ background: 'rgba(215,154,76,0.1)', border: '1px solid rgba(215,154,76,0.3)' }}>
            <p className="text-[12.5px] font-semibold mb-1" style={{ color: '#D79A4C' }}>Add who participates first</p>
            <p className="text-[11.5px] text-text-secondary mb-3">This session has no participants yet — kicking it off needs at least one.</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={onGoToRecipients} className="text-[12px] font-semibold rounded-lg px-3.5 py-2" style={{ background: '#4C6FFF', color: '#07070B' }}>Back to Recipients</button>
              {!hasStakeholderGroups && (
                <button onClick={onGoToStakeholders} className="text-[12px] font-semibold rounded-lg px-3.5 py-2 border border-border-apus">Go to Stakeholders</button>
              )}
            </div>
          </div>
        )}

        {!isQuant && !alreadyRun && participantCount > 0 && (
          <button
            onClick={onKickOff}
            className="w-full text-[13px] font-semibold rounded-xl px-4 py-3"
            style={{ background: '#4C6FFF', color: '#F5F6FA' }}
          >
            Kick off your expert session →
          </button>
        )}

        {!(!isQuant && alreadyRun) && (
          <button onClick={onGoToOverview} className="w-full text-[12.5px] text-text-secondary mt-3">
            Or go to Assessment overview
          </button>
        )}
      </div>
    </div>
  );
}

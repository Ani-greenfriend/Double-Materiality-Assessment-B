export default function ExpertAssessmentCreated({ mode, surveyName, link, startDate, endDate, alreadyRun, onCopy, onPreview, onKickOff, onGoToOverview }) {
  const isQuant = mode === 'quantitative';
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
              <p className="text-[10.5px] font-semibold text-text-secondary mb-1">PARTICIPANT LINK — OUTSIDE THIS PLATFORM</p>
              <p className="text-[11.5px] text-text-secondary mb-3">
                This is the real link each participant opens on their own device to fill in the assessment — separately from this tool, no account needed.
              </p>
              <div className="flex items-center gap-2">
                <input readOnly value={link} className="flex-1 bg-app-black rounded-lg px-3 py-2 text-[12px] outline-none" />
                <button onClick={onCopy} className="text-[11.5px] border border-border-apus rounded-lg px-3 py-2 shrink-0">Copy</button>
              </div>
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

        {!isQuant && !alreadyRun && (
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

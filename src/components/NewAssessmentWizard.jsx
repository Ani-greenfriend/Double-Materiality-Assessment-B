import { useEffect, useState } from 'react';
import { fetchTopicLibraryForSnapshot, createAssessment, snapshotTopicsIntoIros } from '../lib/data';

const STEPS = ['Mode', 'Perspective', 'Survey setup', 'Review & customise'];
const inputClass = 'w-full bg-app-black border border-border-apus rounded-lg px-3 py-2.5 text-[13px] outline-none';

export default function NewAssessmentWizard({ cycle, userId, stakeholderMaster, onCreated, onCancel }) {
  const [step, setStep] = useState(0);
  const [type, setType] = useState(null); // expert_survey | expert_live_session
  const [perspective, setPerspective] = useState(null); // full | impact | financial

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [welcomeText, setWelcomeText] = useState('');
  const [taskText, setTaskText] = useState('');

  const [candidateTopics, setCandidateTopics] = useState([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState(new Set());
  const [justificationMode, setJustificationMode] = useState('per_criterion');
  const [mandatory, setMandatory] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (step !== 3 || !perspective) return;
    fetchTopicLibraryForSnapshot({ esrsVersion: cycle.esrsVersion, clientId: cycle.clientId, perspective })
      .then((topics) => {
        setCandidateTopics(topics);
        setSelectedTopicIds(new Set(topics.map((t) => t.id)));
      })
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, perspective]);

  function toggleTopic(id) {
    setSelectedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    setBusy(true);
    setError('');
    try {
      const assessment = await createAssessment({
        cycleId: cycle.id,
        type,
        perspectiveFilter: perspective,
        name: name.trim(),
        description: description.trim(),
        startDate: startDate || null,
        endDate: endDate || null,
        welcomeText: welcomeText.trim(),
        taskText: taskText.trim(),
        justificationMode,
        mandatory,
        createdBy: userId,
      });
      const topics = candidateTopics.filter((t) => selectedTopicIds.has(t.id));
      await snapshotTopicsIntoIros(assessment.id, topics);
      onCreated({ id: assessment.id, type, name: name.trim() });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const canAdvance = [!!type, !!perspective, name.trim().length > 0, true];

  return (
    <div className="bg-surface border border-border-apus rounded-2xl p-6">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[16px] font-bold">New assessment — {cycle.name}</p>
        <button onClick={onCancel} className="text-text-secondary hover:text-text-primary text-[13px]">Cancel</button>
      </div>
      <p className="text-[11px] text-text-secondary mb-5">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>

      {step === 0 && (
        <div className="flex flex-col gap-2">
          <label className="flex items-start gap-2.5 bg-app-black rounded-lg px-3 py-3 cursor-pointer">
            <input type="radio" checked={type === 'expert_survey'} onChange={() => setType('expert_survey')} className="mt-0.5" />
            <span>
              <span className="text-[13px] font-medium block">Expert survey</span>
              <span className="text-[11px] text-text-secondary">Invited experts answer individually through the Expert Survey tool via personal links.</span>
            </span>
          </label>
          <label className="flex items-start gap-2.5 bg-app-black rounded-lg px-3 py-3 cursor-pointer">
            <input type="radio" checked={type === 'expert_live_session'} onChange={() => setType('expert_live_session')} className="mt-0.5" />
            <span>
              <span className="text-[13px] font-medium block">Expert live session</span>
              <span className="text-[11px] text-text-secondary">You rate topics with a group in this tool and record who attended.</span>
            </span>
          </label>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-2">
          {[
            { id: 'full', label: 'Full', blurb: 'Both impact and financial topics.' },
            { id: 'impact', label: 'Impact only', blurb: 'Negative and positive impact topics only.' },
            { id: 'financial', label: 'Financial only', blurb: 'Risks and opportunities only.' },
          ].map((p) => (
            <label key={p.id} className="flex items-start gap-2.5 bg-app-black rounded-lg px-3 py-3 cursor-pointer">
              <input type="radio" checked={perspective === p.id} onChange={() => setPerspective(p.id)} className="mt-0.5" />
              <span>
                <span className="text-[13px] font-medium block">{p.label}</span>
                <span className="text-[11px] text-text-secondary">{p.blurb}</span>
              </span>
            </label>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[10.5px] text-text-secondary mb-1">NAME</p>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoFocus />
          </div>
          <div>
            <p className="text-[10.5px] text-text-secondary mb-1">DESCRIPTION (optional)</p>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} min-h-[60px]`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10.5px] text-text-secondary mb-1">START DATE</p>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <p className="text-[10.5px] text-text-secondary mb-1">END DATE</p>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
            </div>
          </div>
          {type === 'expert_survey' && (
            <>
              <div>
                <p className="text-[10.5px] text-text-secondary mb-1">WELCOME TEXT (shown to participants)</p>
                <textarea value={welcomeText} onChange={(e) => setWelcomeText(e.target.value)} className={`${inputClass} min-h-[60px]`} />
              </div>
              <div>
                <p className="text-[10.5px] text-text-secondary mb-1">TASK TEXT (shown to participants)</p>
                <textarea value={taskText} onChange={(e) => setTaskText(e.target.value)} className={`${inputClass} min-h-[60px]`} />
              </div>
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div>
          <p className="text-[10.5px] font-semibold text-text-secondary uppercase tracking-wide mb-2">
            Topics ({selectedTopicIds.size} of {candidateTopics.length} selected)
          </p>
          {candidateTopics.length === 0 ? (
            <p className="text-[12px] text-text-secondary mb-4">
              No topics in the library match this ESRS version, client and perspective yet — add some in Topics (not built yet) first.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5 mb-4 max-h-64 overflow-y-auto">
              {candidateTopics.map((t) => (
                <label key={t.id} className="flex items-center gap-2.5 bg-app-black rounded-lg px-3 py-2 cursor-pointer">
                  <input type="checkbox" checked={selectedTopicIds.has(t.id)} onChange={() => toggleTopic(t.id)} />
                  <span className="text-[9.5px] text-text-secondary shrink-0">{t.esrs_topic_id}</span>
                  <span className="text-[12px] flex-1">{t.short_title}</span>
                </label>
              ))}
            </div>
          )}

          <p className="text-[10.5px] font-semibold text-text-secondary uppercase tracking-wide mb-2">Justification mode</p>
          <div className="flex flex-col gap-2 mb-4">
            <label className="flex items-start gap-2.5 bg-app-black rounded-lg px-3 py-2.5 cursor-pointer">
              <input type="radio" checked={justificationMode === 'per_criterion'} onChange={() => setJustificationMode('per_criterion')} className="mt-0.5" />
              <span>
                <span className="text-[12.5px] font-medium block">Per criterion (recommended)</span>
                <span className="text-[11px] text-text-secondary">More audit-defensible — a justification for each rated criterion.</span>
              </span>
            </label>
            <label className="flex items-start gap-2.5 bg-app-black rounded-lg px-3 py-2.5 cursor-pointer">
              <input type="radio" checked={justificationMode === 'per_topic'} onChange={() => setJustificationMode('per_topic')} className="mt-0.5" />
              <span>
                <span className="text-[12.5px] font-medium block">Per topic</span>
                <span className="text-[11px] text-text-secondary">One justification per topic — suits smaller or lighter-touch companies.</span>
              </span>
            </label>
          </div>

          <label className="flex items-center gap-2.5 mb-4 cursor-pointer">
            <input type="checkbox" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} />
            <span className="text-[12.5px]">Every criterion must be answered or explicitly skipped</span>
          </label>

          <p className="text-[10.5px] font-semibold text-text-secondary uppercase tracking-wide mb-2">Stakeholder groups offered to experts</p>
          <p className="text-[11px] text-text-secondary mb-2">Every group in the master map is available to experts in "About you" — add or edit groups in Stakeholders.</p>
          <div className="flex flex-wrap gap-1.5">
            {stakeholderMaster.map((g) => (
              <span key={g.id} className="text-[10.5px] rounded-full px-2.5 py-1 bg-app-black text-text-secondary">{g.name}</span>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-[11.5px] text-badge-amber mt-4">{error}</p>}

      <div className="flex gap-2 mt-6">
        {step > 0 && <button onClick={() => setStep((s) => s - 1)} className="text-[12.5px] text-text-secondary px-3 py-2">Back</button>}
        <div className="flex-1" />
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance[step]}
            className="text-[12.5px] font-semibold rounded-lg px-4 py-2 disabled:opacity-40"
            style={{ background: '#4C6FFF', color: '#07070B' }}
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={busy}
            className="text-[12.5px] font-semibold rounded-lg px-4 py-2 disabled:opacity-40"
            style={{ background: '#4C6FFF', color: '#07070B' }}
          >
            {busy ? 'Creating…' : `Create ${type === 'expert_live_session' ? 'and continue to Participants' : 'and continue to Invitations'}`}
          </button>
        )}
      </div>
    </div>
  );
}

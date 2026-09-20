import { useEffect, useState } from 'react';
import { fetchClients, createClient, uploadClientLogo, createCycle } from '../lib/data';

const STEPS = ['Financial year', 'ESRS version', 'Client', 'Cycle & thresholds'];

// Financial year 2026 pre-selects ESRS 2023 as amended; 2027 or later pre-selects ESRS 2026 (Section 8/9).
function esrsVersionForYear(year) {
  return year >= 2027 ? 'esrs_2026' : 'esrs_2023_amended';
}

const inputClass = 'w-full bg-app-black border border-border-apus rounded-lg px-3 py-2.5 text-[13px] outline-none';

export default function NewCycleWizard({ userId, onCreated, onCancel }) {
  const [step, setStep] = useState(0);
  const thisYear = new Date().getFullYear();

  const [financialYear, setFinancialYear] = useState(thisYear + 1);
  const [esrsVersion, setEsrsVersion] = useState(esrsVersionForYear(thisYear + 1));
  const [esrsVersionTouched, setEsrsVersionTouched] = useState(false);

  const [clients, setClients] = useState([]);
  const [clientMode, setClientMode] = useState('existing');
  const [clientId, setClientId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [logoFile, setLogoFile] = useState(null);

  const [cycleName, setCycleName] = useState('');
  const [impactThreshold, setImpactThreshold] = useState(3.0);
  const [financialThreshold, setFinancialThreshold] = useState(3.0);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClients()
      .then((rows) => {
        setClients(rows);
        if (rows.length === 1) setClientId(rows[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  function handleYearChange(value) {
    const year = Number(value);
    setFinancialYear(year);
    if (!esrsVersionTouched) setEsrsVersion(esrsVersionForYear(year));
  }

  const selectedClientName = clientMode === 'existing' ? clients.find((c) => c.id === clientId)?.name ?? '' : newClientName;

  const canAdvance = [
    !!financialYear,
    !!esrsVersion,
    clientMode === 'existing' ? !!clientId : newClientName.trim().length > 0,
    cycleName.trim().length > 0 || selectedClientName,
  ];

  async function handleCreate() {
    setBusy(true);
    setError('');
    try {
      let finalClientId = clientId;
      if (clientMode === 'new') {
        const created = await createClient({ name: newClientName.trim() });
        finalClientId = created.id;
        if (logoFile) await uploadClientLogo(created.id, logoFile);
      }
      const name = cycleName.trim() || `${selectedClientName} DMA ${financialYear}`;
      const newCycleId = await createCycle({
        clientId: finalClientId,
        name,
        financialYear: Number(financialYear),
        esrsVersion,
        impactThreshold: Number(impactThreshold),
        financialThreshold: Number(financialThreshold),
        createdBy: userId,
      });
      onCreated(newCycleId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-surface border border-border-apus rounded-2xl p-6 max-w-xl">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[16px] font-bold">New cycle</p>
        <button onClick={onCancel} className="text-text-secondary hover:text-text-primary text-[13px]">Cancel</button>
      </div>
      <p className="text-[11px] text-text-secondary mb-5">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>

      {step === 0 && (
        <div>
          <p className="text-[13px] font-medium mb-3">Which financial year is this assessment for?</p>
          <input
            type="number"
            value={financialYear}
            onChange={(e) => handleYearChange(e.target.value)}
            className={inputClass}
            autoFocus
          />
        </div>
      )}

      {step === 1 && (
        <div>
          <p className="text-[13px] font-medium mb-3">ESRS version</p>
          <p className="text-[11.5px] text-text-secondary mb-3">
            Pre-selected from financial year {financialYear} — {esrsVersionForYear(financialYear) === 'esrs_2026' ? 'Simplified standards' : 'Current standards'}. Overridable below.
          </p>
          <div className="flex flex-col gap-2">
            <label className="flex items-start gap-2.5 bg-app-black rounded-lg px-3 py-2.5 cursor-pointer">
              <input
                type="radio"
                checked={esrsVersion === 'esrs_2023_amended'}
                onChange={() => { setEsrsVersion('esrs_2023_amended'); setEsrsVersionTouched(true); }}
                className="mt-0.5"
              />
              <span>
                <span className="text-[13px] font-medium block">Current standards — ESRS 2023 as amended</span>
                <span className="text-[11px] text-text-secondary">The ESRS in force today, with the 2023 amendments.</span>
              </span>
            </label>
            <label className="flex items-start gap-2.5 bg-app-black rounded-lg px-3 py-2.5 cursor-pointer">
              <input
                type="radio"
                checked={esrsVersion === 'esrs_2026'}
                onChange={() => { setEsrsVersion('esrs_2026'); setEsrsVersionTouched(true); }}
                className="mt-0.5"
              />
              <span>
                <span className="text-[13px] font-medium block">Simplified standards — ESRS 2026</span>
                <span className="text-[11px] text-text-secondary">The upcoming simplified set, expected to apply from 2027 reporting.</span>
              </span>
            </label>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="text-[13px] font-medium mb-3">Client</p>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setClientMode('existing')} className={`text-[12px] rounded-lg px-3 py-1.5 ${clientMode === 'existing' ? 'bg-app-black font-semibold' : 'text-text-secondary'}`}>Choose existing</button>
            <button onClick={() => setClientMode('new')} className={`text-[12px] rounded-lg px-3 py-1.5 ${clientMode === 'new' ? 'bg-app-black font-semibold' : 'text-text-secondary'}`}>Create new</button>
          </div>
          {clientMode === 'existing' ? (
            clients.length === 0 ? (
              <p className="text-[12px] text-text-secondary">No clients yet — switch to "Create new".</p>
            ) : (
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputClass}>
                <option value="">Select a client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )
          ) : (
            <div className="flex flex-col gap-3">
              <input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Client name" className={inputClass} autoFocus />
              <div>
                <p className="text-[10.5px] text-text-secondary mb-1">LOGO (optional)</p>
                <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} className="text-[12px] text-text-secondary" />
              </div>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div>
          <p className="text-[13px] font-medium mb-3">Cycle name and thresholds</p>
          <p className="text-[10.5px] text-text-secondary mb-1">CYCLE NAME</p>
          <input
            value={cycleName}
            onChange={(e) => setCycleName(e.target.value)}
            placeholder={selectedClientName ? `${selectedClientName} DMA ${financialYear}` : `DMA ${financialYear}`}
            className={`${inputClass} mb-4`}
          />
          <p className="text-[10.5px] text-text-secondary mb-2">THRESHOLDS (baseline — recorded now, editable later only in stage Calibrating)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10.5px] text-text-secondary mb-1">IMPACT</p>
              <input type="number" step="0.1" min="0" max="5" value={impactThreshold} onChange={(e) => setImpactThreshold(e.target.value)} className={inputClass} />
            </div>
            <div>
              <p className="text-[10.5px] text-text-secondary mb-1">FINANCIAL</p>
              <input type="number" step="0.1" min="0" max="5" value={financialThreshold} onChange={(e) => setFinancialThreshold(e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-[11.5px] text-badge-amber mt-4">{error}</p>}

      <div className="flex gap-2 mt-6">
        {step > 0 && (
          <button onClick={() => setStep((s) => s - 1)} className="text-[12.5px] text-text-secondary px-3 py-2">Back</button>
        )}
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
            {busy ? 'Creating…' : 'Create cycle'}
          </button>
        )}
      </div>
    </div>
  );
}

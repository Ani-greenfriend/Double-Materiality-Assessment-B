import { useState } from 'react';
import { sendMagicLink } from '../lib/data';

export default function Login() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');
    try {
      await sendMagicLink(email.trim());
      setStatus('sent');
    } catch (err) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface border border-border-apus rounded-2xl p-8">
        <p className="font-jost text-[20px] mb-1">apus</p>
        <p className="text-[11px] text-text-secondary mb-6">by greenfriend. — Consultant Console</p>

        {status === 'sent' ? (
          <p className="text-[13px] text-text-secondary">
            Check <b className="text-text-primary">{email}</b> for a sign-in link.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="text-[10.5px] text-text-secondary mb-1.5">EMAIL</p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-app-black border border-border-apus rounded-lg px-3 py-2.5 text-[13px] outline-none mb-4"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-lg px-3 py-2.5 text-[13px] font-semibold disabled:opacity-50"
              style={{ background: '#4C6FFF', color: '#07070B' }}
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
            {status === 'error' && <p className="text-[12px] text-badge-amber mt-3">{errorMessage}</p>}
            <p className="text-[10.5px] text-text-secondary mt-4">
              Invite-only — ask the consultant to add your email in Supabase if you don't have access yet.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

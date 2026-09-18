import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

function describeEnvVar(name, value) {
  if (!value) return `${name}: MISSING`;
  return `${name}: present (${value.length} chars, starts "${value.slice(0, 12)}…")`;
}

// createClient() throws synchronously on a missing/invalid URL, which would
// otherwise crash the whole app before React can render anything. Surface it
// as data instead so the UI can show a real message.
export const supabaseConfigError = !url || !key
  ? `${describeEnvVar('VITE_SUPABASE_URL', url)} / ${describeEnvVar('VITE_SUPABASE_ANON_KEY', key)}`
  : null;

export const supabase = supabaseConfigError ? null : createClient(url, key);

'use client';

import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'disabled'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setStatus('disabled');
      setMessage('Auth ist nicht konfiguriert (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY fehlen).');
      return;
    }
    setStatus('sending');
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` }
    });
    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }
    setStatus('sent');
    setMessage('Magic Link verschickt. Bitte E-Mail prüfen.');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h1 className="text-2xl font-bold">Anmelden</h1>
      <p className="text-sm text-slate-400">Wir senden einen Magic Link an deine E-Mail-Adresse.</p>
      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">E-Mail</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500 disabled:opacity-50"
      >
        {status === 'sending' ? 'Wird gesendet…' : 'Magic Link senden'}
      </button>
      {message && (
        <p className={`text-sm ${status === 'error' || status === 'disabled' ? 'text-rose-400' : 'text-slate-300'}`}>{message}</p>
      )}
    </form>
  );
}

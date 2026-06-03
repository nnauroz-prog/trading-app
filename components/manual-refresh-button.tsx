'use client';

import { useState } from 'react';

// Manueller Refresh-Button. Lädt die Seite neu und zeigt einen Spinner.
// Praktisch für „ich will JETZT die neuesten Daten sehen" — auch wenn
// die Server-Side-Daten erst in 10 Min frisch nachfließen.
export function ManualRefreshButton() {
  const [busy, setBusy] = useState(false);
  const onClick = () => {
    if (busy) return;
    setBusy(true);
    if (typeof window !== 'undefined') window.location.reload();
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-mono text-slate-300 transition hover:border-emerald-400/60 hover:text-emerald-200 disabled:opacity-50"
    >
      <span aria-hidden className={busy ? 'animate-spin' : ''}>↻</span>
      {busy ? 'lädt …' : 'neu laden'}
    </button>
  );
}

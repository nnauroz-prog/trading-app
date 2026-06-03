'use client';

import { useState } from 'react';

const KEYS = [
  'trading-app.sport-tip-journal-v1',
  'trading-app.tipprunde-profile-v1',
  'trading-app.tipprunde-wochenziel-v1',
  'trading-app.sport-quality-min-v1',
  'trading-app.sport-quick-filter-v1',
  'trading-app.sport-onboarding-seen-v1',
  'trading-app.sport-tier-90-journal-v1'
];

// Notfall-Reset: löscht ALLE lokal gespeicherten Sport-Daten in einem Rutsch.
// Steht ganz unten am Sport-Reiter, hinter zwei Bestätigungen.
export function SportDataReset() {
  const [confirmed, setConfirmed] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => {
    for (const key of KEYS) {
      try { window.localStorage.removeItem(key); } catch { /* noop */ }
    }
    setDone(true);
    setTimeout(() => window.location.reload(), 800);
  };

  if (done) {
    return (
      <p className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-[10.5px] text-emerald-200">
        ✓ Sport-Daten gelöscht. Seite wird neu geladen…
      </p>
    );
  }

  return (
    <details className="rounded-md border border-slate-800 bg-slate-950/40 p-2.5">
      <summary className="cursor-pointer text-[10.5px] uppercase tracking-wider text-slate-500 hover:text-rose-300">
        ▸ Alle lokalen Sport-Daten zurücksetzen
      </summary>
      <div className="mt-2 space-y-2">
        <p className="text-[10.5px] leading-snug text-slate-400">
          Löscht Tipp-Tagebuch, Tipprunde-Profil, Wochenziel, Filter-Einstellungen und Onboarding-Status.
          Keine Server-Daten betroffen. Diese Aktion ist endgültig.
        </p>
        <label className="flex items-center gap-2 text-[10.5px] text-slate-300">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="h-3.5 w-3.5 accent-rose-400"
          />
          Ich bin sicher.
        </label>
        <button
          type="button"
          onClick={reset}
          disabled={!confirmed}
          className="rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          jetzt zurücksetzen
        </button>
      </div>
    </details>
  );
}

'use client';

import { useEffect, useState } from 'react';
import {
  WOCHENZIEL_CHANGED_EVENT,
  computeWochenzielProgress,
  loadWochenziel,
  saveWochenziel,
  clearWochenziel,
  type WochenzielProgress
} from '@/lib/sport/wochenziel';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT } from '@/lib/sport/tip-journal';

export function WochenzielCard() {
  const [progress, setProgress] = useState<WochenzielProgress | null>(null);
  const [draft, setDraft] = useState<string>('5');
  const [editing, setEditing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      setProgress(computeWochenzielProgress());
      const z = loadWochenziel();
      if (z) setDraft(String(z.targetWins));
    };
    sync();
    setMounted(true);
    window.addEventListener(WOCHENZIEL_CHANGED_EVENT, sync);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener(WOCHENZIEL_CHANGED_EVENT, sync);
      window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    };
  }, []);

  if (!mounted) return null;

  const submit = () => {
    const n = parseInt(draft, 10);
    if (!Number.isFinite(n) || n <= 0) return;
    saveWochenziel(n);
    setEditing(false);
  };

  if (!progress || editing) {
    return (
      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Wochen-Ziel setzen</h2>
          <p className="mt-1 text-[10.5px] leading-snug text-slate-500">
            Wie viele Treffer willst du diese Woche schaffen? Fortschritt wird live aus deinen Tipps berechnet.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={30}
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-center font-mono text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none"
          />
          <span className="text-[10px] text-slate-500">Treffer / Woche</span>
          <button
            type="button"
            onClick={submit}
            className="ml-auto rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/20"
          >
            speichern
          </button>
          {progress && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-[10px] text-slate-500 hover:text-slate-300"
            >
              abbrechen
            </button>
          )}
        </div>
      </section>
    );
  }

  const toneBorder = progress.reached ? 'border-emerald-400/50' : 'border-slate-800/80';
  const toneBg = progress.reached ? 'bg-emerald-950/15' : 'bg-slate-900/40';

  return (
    <section className={`space-y-2 rounded-2xl border ${toneBorder} ${toneBg} p-4`}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Wochen-Ziel</h2>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300 hover:border-emerald-400/40 hover:text-emerald-200"
        >
          ändern
        </button>
      </div>
      <div className="flex items-baseline justify-between gap-2 text-[12px]">
        <span className="text-slate-200">
          <span className="font-mono text-lg font-bold text-emerald-200">{progress.currentWins}</span>
          <span className="text-slate-500"> von </span>
          <span className="font-mono text-lg font-bold text-slate-100">{progress.targetWins}</span>
          <span className="text-slate-500"> Treffern</span>
        </span>
        <span className={`font-mono text-[11px] ${progress.reached ? 'text-emerald-300' : 'text-slate-400'}`}>
          {progress.reached ? '✓ erreicht' : `${progress.percent}%`}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full border border-slate-800 bg-slate-950">
        <div
          className={`h-full ${progress.reached ? 'bg-emerald-500' : 'bg-emerald-400/70'}`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <p className="text-[10px] leading-snug text-slate-500">
        {progress.pending} offen · {progress.resolved} ausgewertet · Woche läuft seit{' '}
        {new Date(progress.weekStart).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' })}
      </p>
      <button
        type="button"
        onClick={() => { if (window.confirm('Wochen-Ziel löschen?')) clearWochenziel(); }}
        className="text-[10px] text-slate-500 hover:text-rose-300"
      >
        Ziel löschen
      </button>
    </section>
  );
}

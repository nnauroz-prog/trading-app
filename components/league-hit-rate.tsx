'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal } from '@/lib/sport/tip-journal';

// Pro Liga: wie oft hat die Firma in dieser Liga richtig gelegen?
// Reine Auswertung des Tipp-Tagebuchs, läuft client-side.
export function LeagueHitRate() {
  const [rows, setRows] = useState<{ league: string; resolved: number; wins: number; pct: number | null }[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      const log = loadTipJournal();
      const byLeague = new Map<string, { resolved: number; wins: number }>();
      for (const e of log) {
        if (e.outcome === 'pending') continue;
        const entry = byLeague.get(e.league) ?? { resolved: 0, wins: 0 };
        entry.resolved++;
        if (e.outcome === 'win') entry.wins++;
        byLeague.set(e.league, entry);
      }
      const data = Array.from(byLeague.entries()).map(([league, d]) => ({
        league,
        resolved: d.resolved,
        wins: d.wins,
        pct: d.resolved > 0 ? Math.round((d.wins / d.resolved) * 100) : null
      }));
      data.sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0) || b.resolved - a.resolved);
      setRows(data);
    };
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, []);

  if (!mounted || rows.length === 0) return null;
  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Trefferquote pro Liga</h2>
        <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">
          Aus deinem lokalen Tipp-Tagebuch ausgewertet. Hilft zu sehen, in welcher Liga die Firma besonders gut tippt.
        </p>
      </div>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.league} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
            <span className="text-slate-200">{r.league}</span>
            <span className="text-[10px] text-slate-500">{r.wins}/{r.resolved}</span>
            <span className={`font-mono text-[10.5px] ${r.pct !== null && r.pct >= 60 ? 'text-emerald-300' : r.pct !== null && r.pct < 40 ? 'text-rose-300' : 'text-slate-300'}`}>
              {r.pct !== null ? `${r.pct}%` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

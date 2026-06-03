'use client';

import { useEffect, useState } from 'react';
import {
  SPORT_TIER_90_JOURNAL_CHANGED_EVENT,
  loadSportTier90Journal,
  resolveSportTier90,
  summariseSportTier90,
  type SportTier90Entry
} from '@/lib/sport/sport-tier-90-journal';

interface Props {
  // Liste der bereits stattgefundenen Spiele mit Endstand (vom Server)
  finishedFixtures: { id: string; homeScore: number; awayScore: number }[];
}

const STORAGE_KEY = 'trading-app.sport-tier-90-journal-v1';

// Auto-Auflöser plus Anzeige für das Sport-Tier-90-Tagebuch.
export function SportTier90History({ finishedFixtures }: Props) {
  const [log, setLog] = useState<SportTier90Entry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setLog(loadSportTier90Journal());
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIER_90_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIER_90_JOURNAL_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const current = loadSportTier90Journal();
    if (current.length === 0 || finishedFixtures.length === 0) return;
    const byId = new Map(finishedFixtures.map((f) => [f.id, f]));
    let changed = false;
    const updated = current.map((e) => {
      if (e.outcome !== 'pending') return e;
      const finished = byId.get(e.fixtureId);
      if (!finished) return e;
      const r = resolveSportTier90(e, finished.homeScore, finished.awayScore);
      if (r.outcome !== e.outcome) changed = true;
      return r;
    });
    if (changed && typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(SPORT_TIER_90_JOURNAL_CHANGED_EVENT));
    }
  }, [mounted, finishedFixtures]);

  if (!mounted || log.length === 0) return null;
  const stats = summariseSportTier90(log);
  const sorted = [...log].sort((a, b) => b.recordedAt - a.recordedAt).slice(0, 14);

  return (
    <section className="space-y-3 rounded-2xl border border-yellow-300/30 bg-yellow-950/10 p-4">
      <header>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-yellow-300">Sport-Tier-90-Tagebuch</h2>
        <p className="mt-0.5 text-[10.5px] leading-snug text-slate-400">
          Jede Spielansetzung, die alle 10/11 Signale grün hatte, ist hier festgehalten. Sobald der Endstand kommt, wird automatisch ausgewertet.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Tier-90-Picks" value={stats.total} tone="neutral" />
        <Stat label="Treffer" value={stats.wins} tone="good" />
        <Stat label="Daneben" value={stats.losses} tone="bad" />
        <Stat label="Trefferquote" value={stats.hitRatePct !== null ? `${stats.hitRatePct} %` : '—'} tone={stats.hitRatePct !== null && stats.hitRatePct >= 60 ? 'good' : 'neutral'} />
      </div>

      <details className="rounded-lg border border-slate-800 bg-slate-950/40">
        <summary className="cursor-pointer p-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
          ▸ Letzte {sorted.length} Tier-90-Picks ansehen
        </summary>
        <ul className="space-y-1 p-2 pt-0">
          {sorted.map((e) => (
            <li key={e.fixtureId} className="grid grid-cols-[auto_1fr_auto] gap-2 rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-[11px]">
              <span className="font-mono text-[10px] text-slate-500">{e.date}</span>
              <span className="truncate text-slate-100">{e.homeTeam} vs. {e.awayTeam}</span>
              <span className={`font-mono text-[9.5px] uppercase tracking-wider ${e.outcome === 'win' ? 'text-emerald-300' : e.outcome === 'loss' ? 'text-rose-300' : 'text-amber-300'}`}>
                {e.outcome === 'win' ? '✓ Treffer' : e.outcome === 'loss' ? '✗ Daneben' : '… offen'}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone: 'good' | 'bad' | 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-300' : tone === 'bad' ? 'text-rose-300' : 'text-slate-100';
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono text-base font-bold ${cls}`}>{value}</div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIER_90_JOURNAL_CHANGED_EVENT, loadSportTier90Journal, type SportTier90Entry } from '@/lib/sport/sport-tier-90-journal';

const WINDOW_DAYS = 30;

function lastNDates(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function cellColor(outcome: SportTier90Entry['outcome'] | null): string {
  if (outcome === 'win') return 'bg-emerald-500/80';
  if (outcome === 'loss') return 'bg-rose-500/70';
  if (outcome === 'pending') return 'bg-amber-500/70';
  if (outcome === 'push') return 'bg-slate-600';
  return 'bg-slate-800';
}

// 30-Tage-Heatmap der Sport-Tier-90-Picks — visuell wie selten alle Signale
// für ein Spiel grün waren und wie oft sie getroffen haben.
export function SportTier90HistoryStrip() {
  const [log, setLog] = useState<SportTier90Entry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setLog(loadSportTier90Journal());
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIER_90_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIER_90_JOURNAL_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;
  const dates = lastNDates(WINDOW_DAYS);
  const byDate = new Map<string, SportTier90Entry>();
  for (const e of log) byDate.set(e.date, e);
  const cells = dates.map((d) => ({ date: d, entry: byDate.get(d) ?? null }));
  const tier90Days = cells.filter((c) => c.entry !== null).length;

  if (tier90Days === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-yellow-300/30 bg-yellow-950/10 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-yellow-300">Sport-Tier-90-Verlauf · 30 Tage</h2>
        <span className="text-[10px] text-slate-500">{tier90Days}× Tier 90</span>
      </div>
      <p className="text-[10.5px] leading-snug text-slate-500">
        Eine Zelle pro Tag. Grün = Tipp getroffen, rot = daneben, gelb = noch offen, grau = kein Tier-90-Pick.
      </p>
      <div className="flex gap-0.5">
        {cells.map((c) => (
          <div
            key={c.date}
            title={`${c.date}: ${c.entry ? `${c.entry.homeTeam} vs ${c.entry.awayTeam} — ${c.entry.outcome}` : 'kein Tier 90'}`}
            className={`h-4 flex-1 rounded-sm ${cellColor(c.entry?.outcome ?? null)}`}
          />
        ))}
      </div>
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { TIER_90_JOURNAL_CHANGED_EVENT, loadTier90Journal, type Tier90JournalEntry } from '@/lib/agents/tier-90-journal';

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

function cellColor(outcome: Tier90JournalEntry['outcome'] | null): string {
  if (outcome === 'tp_hit') return 'bg-emerald-500/80';
  if (outcome === 'stop_hit') return 'bg-rose-500/70';
  if (outcome === 'pending') return 'bg-amber-500/70';
  if (outcome === 'expired') return 'bg-slate-600';
  return 'bg-slate-800';
}

// 30-Tage-Strip wie der Sicherheits-Verlauf — pro Tag eine Zelle, eingefärbt
// nach dem Tier-90-Outcome an diesem Tag. Macht visuell sofort sichtbar wie
// selten der Filter überhaupt grünes Licht gibt.
export function Tier90HistoryStrip() {
  const [log, setLog] = useState<Tier90JournalEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setLog(loadTier90Journal());
    sync();
    setMounted(true);
    window.addEventListener(TIER_90_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(TIER_90_JOURNAL_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;
  const dates = lastNDates(WINDOW_DAYS);
  const byDate = new Map<string, Tier90JournalEntry>();
  for (const e of log) byDate.set(e.date, e);
  const cells = dates.map((d) => ({ date: d, entry: byDate.get(d) ?? null }));
  const hitDays = cells.filter((c) => c.entry !== null).length;

  return (
    <section className="space-y-2 rounded-2xl border border-yellow-300/30 bg-yellow-950/10 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-yellow-300">Tier-90-Verlauf · 30 Tage</h2>
        <span className="text-[10px] text-slate-500">{hitDays === 0 ? 'kein Tier-90-Tag' : `${hitDays}× Tier 90`}</span>
      </div>
      <p className="text-[10.5px] leading-snug text-slate-500">
        Jede Zelle ein Tag. Grün = Ziel getroffen, rot = Stop, gelb = noch offen, leer = kein Tier-90. So sieht man auf einen Blick, wie selten alle 5 Säulen wirklich grün werden — das ist Absicht.
      </p>
      <div className="flex gap-0.5">
        {cells.map((c) => (
          <div
            key={c.date}
            title={`${c.date}: ${c.entry ? `${c.entry.coinSymbol} ${c.entry.outcome}` : 'kein Tier 90'}`}
            className={`h-4 flex-1 rounded-sm ${cellColor(c.entry?.outcome ?? null)}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1 text-[9.5px] text-slate-500">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500/80" />Ziel</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-rose-500/70" />Stop</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-500/70" />offen</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-slate-600" />abgelaufen</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-slate-800" />kein Tier 90</span>
      </div>
    </section>
  );
}

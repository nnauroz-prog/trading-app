'use client';

import { useEffect, useState } from 'react';
import { TIER_90_JOURNAL_CHANGED_EVENT, loadTier90Journal, summariseTier90, type Tier90JournalEntry } from '@/lib/agents/tier-90-journal';

// Zeigt das Tier-90-Tagebuch: wie oft sind alle 5 Säulen historisch grün
// gewesen und wie hat es sich aufgelöst.
export function Tier90HistoryCard() {
  const [log, setLog] = useState<Tier90JournalEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setLog(loadTier90Journal());
    sync();
    setMounted(true);
    window.addEventListener(TIER_90_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(TIER_90_JOURNAL_CHANGED_EVENT, sync);
  }, []);

  if (!mounted || log.length === 0) {
    return null;
  }
  const stats = summariseTier90(log);
  const sorted = [...log].sort((a, b) => b.recordedAt - a.recordedAt).slice(0, 14);

  return (
    <section className="space-y-3 rounded-2xl border border-yellow-300/30 bg-yellow-950/10 p-4">
      <header>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-yellow-300">Tier-90-Tagebuch</h2>
        <p className="mt-0.5 text-[10.5px] leading-snug text-slate-400">
          Jeder Tag, an dem alle 5 Säulen grün waren, ist hier festgehalten. Wenn der Stop oder das Ziel später getriggert hat, wird das eingetragen — über Zeit wächst eine echte Tier-90-Bilanz.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Tier-90-Tage" value={stats.total} tone="neutral" />
        <Stat label="Ziel getroffen" value={stats.tpHit} tone="good" />
        <Stat label="Stop ausgelöst" value={stats.stopHit} tone="bad" />
        <Stat label="Trefferquote" value={stats.hitRatePct !== null ? `${stats.hitRatePct} %` : '—'} tone={stats.hitRatePct !== null && stats.hitRatePct >= 60 ? 'good' : 'neutral'} />
      </div>

      <details className="rounded-lg border border-slate-800 bg-slate-950/40">
        <summary className="cursor-pointer p-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
          ▸ Letzte {sorted.length} Tier-90-Picks ansehen
        </summary>
        <ul className="space-y-1 p-2 pt-0">
          {sorted.map((e, i) => (
            <li key={`${e.date}-${e.coinSymbol}-${i}`} className="grid grid-cols-[auto_1fr_auto] gap-2 rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-[11px]">
              <span className="font-mono text-[10px] text-slate-500">{e.date}</span>
              <span className="font-semibold text-slate-100">{e.coinSymbol}</span>
              <span className={`font-mono text-[9.5px] uppercase tracking-wider ${e.outcome === 'tp_hit' ? 'text-emerald-300' : e.outcome === 'stop_hit' ? 'text-rose-300' : e.outcome === 'expired' ? 'text-slate-500' : 'text-amber-300'}`}>
                {e.outcome === 'tp_hit' ? '✓ Ziel' : e.outcome === 'stop_hit' ? '✗ Stop' : e.outcome === 'expired' ? '⊘ abgelaufen' : '… offen'}
              </span>
            </li>
          ))}
        </ul>
      </details>

      {stats.pending > 0 && (
        <p className="rounded border border-amber-500/30 bg-amber-950/15 p-2 text-[10px] leading-snug text-amber-100/90">
          {stats.pending} Pick{stats.pending === 1 ? '' : 's'} noch offen — werden bei nächstem Auflösungs-Lauf gegen Hoch/Tief geprüft.
        </p>
      )}
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

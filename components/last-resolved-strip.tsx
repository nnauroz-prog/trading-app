'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal, type TipJournalEntry } from '@/lib/sport/tip-journal';

interface Recent {
  id: string;
  homeTeam: string;
  awayTeam: string;
  market: string;
  outcome: TipJournalEntry['outcome'];
  finalHome: number | undefined;
  finalAway: number | undefined;
  resolvedAt: number;
}

// Streifen mit den letzten 3 ausgewerteten Tipps — beruhigender Beweis,
// dass die App still arbeitet, auch ohne neue Tipps anzuklicken.
export function LastResolvedStrip() {
  const [recent, setRecent] = useState<Recent[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      const log = loadTipJournal();
      const resolved = log
        .filter((e) => e.outcome !== 'pending')
        .sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0))
        .slice(0, 3)
        .map<Recent>((e) => ({
          id: e.id,
          homeTeam: e.homeTeam,
          awayTeam: e.awayTeam,
          market: e.market,
          outcome: e.outcome,
          finalHome: e.finalHomeScore,
          finalAway: e.finalAwayScore,
          resolvedAt: e.resolvedAt ?? 0
        }));
      setRecent(resolved);
    };
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, []);

  if (!mounted || recent.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">zuletzt ausgewertet</div>
      <ul className="mt-1.5 space-y-0.5">
        {recent.map((r) => {
          const tone = r.outcome === 'win' ? 'text-emerald-300'
            : r.outcome === 'loss' ? 'text-rose-300'
            : 'text-slate-400';
          const icon = r.outcome === 'win' ? '✓' : r.outcome === 'loss' ? '✗' : '·';
          return (
            <li key={r.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-[11px]">
              <span className={`font-mono font-bold ${tone}`}>{icon}</span>
              <span className="min-w-0 truncate text-slate-200">
                <span className="font-semibold">{r.homeTeam} – {r.awayTeam}</span>
                <span className="text-slate-500"> · {r.market}</span>
              </span>
              {r.finalHome !== undefined && r.finalAway !== undefined && (
                <span className="font-mono text-[10px] text-slate-400">{r.finalHome}:{r.finalAway}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

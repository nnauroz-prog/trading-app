'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal } from '@/lib/sport/tip-journal';
import { tipsByLeague, type LeagueStats } from '@/lib/sport/tipprunde-by-league';

// Stärke pro Liga: in welcher Liga tippst du gut, in welcher schwach.
// Hilft, sich zukünftig auf Stärken zu konzentrieren.
export function TipprundeByLeague() {
  const [stats, setStats] = useState<LeagueStats[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setStats(tipsByLeague(loadTipJournal()));
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;
  const decisive = stats.filter((s) => (s.decisive ?? 0) > 0);
  if (decisive.length === 0) return null;

  return (
    <details className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
      <summary className="cursor-pointer text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
        ▸ Trefferquote pro Liga
      </summary>
      <ul className="mt-2 space-y-0.5">
        {decisive.map((s) => {
          const tone = (s.hitRatePct ?? 0) >= 60 ? 'text-emerald-300'
            : (s.hitRatePct ?? 0) >= 40 ? 'text-amber-300'
            : 'text-rose-300';
          return (
            <li key={s.league} className="grid grid-cols-[1fr_auto_auto] gap-2 text-[10.5px]">
              <span className="truncate text-slate-300">{s.league}</span>
              <span className="font-mono text-slate-500">{s.wins}/{s.decisive}</span>
              <span className={`font-mono ${tone}`}>{s.hitRatePct !== null ? `${s.hitRatePct}%` : '—'}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[10px] leading-snug text-slate-500">
        Aus deinem persönlichen Tipp-Tagebuch. Zeigt nur Ligen mit ≥ 1 ausgewertetem Tipp.
      </p>
    </details>
  );
}

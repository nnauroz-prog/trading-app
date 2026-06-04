'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal } from '@/lib/sport/tip-journal';
import { tipsByMarket, type MarketStats } from '@/lib/sport/tips-by-market';

export function TipprundeByMarket() {
  const [stats, setStats] = useState<MarketStats[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setStats(tipsByMarket(loadTipJournal()));
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;
  const decisive = stats.filter((s) => s.decisive > 0);
  if (decisive.length === 0) return null;

  return (
    <details className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
      <summary className="cursor-pointer text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
        ▸ Trefferquote pro Markt-Typ
      </summary>
      <ul className="mt-2 space-y-0.5">
        {decisive.map((s) => {
          const tone = (s.hitRatePct ?? 0) >= 60 ? 'text-emerald-300'
            : (s.hitRatePct ?? 0) >= 40 ? 'text-amber-300'
            : 'text-rose-300';
          return (
            <li key={s.category} className="grid grid-cols-[1fr_auto_auto] gap-2 text-[10.5px]">
              <span className="truncate text-slate-300">{s.category}</span>
              <span className="font-mono text-slate-500">{s.wins}/{s.decisive}</span>
              <span className={`font-mono ${tone}`}>{s.hitRatePct !== null ? `${s.hitRatePct}%` : '—'}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[10px] leading-snug text-slate-500">
        Gruppiert nach Markt-Schlüsselwörtern. Push wird nicht in die Quote eingerechnet.
      </p>
    </details>
  );
}

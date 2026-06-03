'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal } from '@/lib/sport/tip-journal';
import { weeklyHistory, type WeekSummary } from '@/lib/sport/tipprunde-history';

interface Props {
  weeks?: number;
}

function fmtRange(start: number): string {
  const d = new Date(start);
  const end = new Date(start + 6 * 24 * 60 * 60 * 1000);
  const fmt = (x: Date) => x.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
  return `${fmt(d)}–${fmt(end)}`;
}

// Letzte N Wochen als kompakte Liste: Datum-Range, Treffer, Quote, kleiner
// horizontaler Bar. Hilft dem User zu sehen, ob die Quote sich stabilisiert.
export function TipprundeWeeklyHistory({ weeks = 6 }: Props) {
  const [history, setHistory] = useState<WeekSummary[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setHistory(weeklyHistory(loadTipJournal(), weeks));
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, [weeks]);

  if (!mounted) return null;
  const hasAny = history.some((w) => w.resolved > 0);
  if (!hasAny) return null;

  return (
    <details className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
      <summary className="cursor-pointer text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
        ▸ Wochen-Vergleich (letzte {weeks})
      </summary>
      <ul className="mt-2 space-y-1">
        {history.map((w) => {
          const barWidth = w.hitRatePct ?? 0;
          const tone = w.hitRatePct === null ? 'bg-slate-700'
            : w.hitRatePct >= 60 ? 'bg-emerald-500/60'
            : w.hitRatePct >= 40 ? 'bg-amber-500/60'
            : 'bg-rose-500/50';
          return (
            <li key={w.weekStart} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-[10.5px]">
              <span className="font-mono text-slate-500">{fmtRange(w.weekStart)}</span>
              <div className="h-2 overflow-hidden rounded-full border border-slate-800 bg-slate-900">
                <div className={tone} style={{ width: `${barWidth}%`, height: '100%' }} />
              </div>
              <span className="font-mono text-slate-300">
                {w.wins}/{w.decisive} {w.hitRatePct !== null ? <span className="text-slate-500">({w.hitRatePct}%)</span> : <span className="text-slate-600">—</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

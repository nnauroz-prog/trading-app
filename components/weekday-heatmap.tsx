'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal } from '@/lib/sport/tip-journal';
import { tipsByWeekday, type WeekdayStats } from '@/lib/sport/weekday-stats';

// Heatmap pro Wochentag: Mo–So mit Trefferquoten-Färbung. Hilft dem User
// Muster zu erkennen — z. B. „Samstags tippe ich besser".
export function WeekdayHeatmap() {
  const [stats, setStats] = useState<WeekdayStats[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setStats(tipsByWeekday(loadTipJournal()));
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;
  const anyResolved = stats.some((s) => s.resolved > 0);
  if (!anyResolved) return null;

  return (
    <details className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
      <summary className="cursor-pointer text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
        ▸ Trefferquote pro Wochentag
      </summary>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center">
        {stats.map((s) => {
          const cls = s.decisive === 0 ? 'border-slate-800 bg-slate-900/40 text-slate-600'
            : (s.hitRatePct ?? 0) >= 60 ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
            : (s.hitRatePct ?? 0) >= 40 ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
            : 'border-rose-400/40 bg-rose-500/10 text-rose-200';
          return (
            <div key={s.weekday} className={`rounded-md border p-1.5 ${cls}`}>
              <div className="text-[10px] font-semibold uppercase tracking-wider">{s.label}</div>
              {s.decisive > 0 ? (
                <>
                  <div className="font-mono text-[12px] font-bold">{s.hitRatePct}%</div>
                  <div className="font-mono text-[9px] opacity-70">{s.wins}/{s.decisive}</div>
                </>
              ) : (
                <div className="text-[9px] opacity-50">—</div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] leading-snug text-slate-500">
        Datum des Spiels (nicht der Auflösung). Push wird nicht in die Quote eingerechnet.
      </p>
    </details>
  );
}

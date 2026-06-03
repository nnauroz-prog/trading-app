'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal } from '@/lib/sport/tip-journal';

interface Props {
  todayIso: string;
}

// Schmale Pille mit „Heute · X Tipps offen / Y bereits aufgelöst" — gehört
// in die SportTopNav-Zeile, gibt schnellen Status ohne Scrollen.
export function SportTodayPill({ todayIso }: Props) {
  const [counts, setCounts] = useState({ pending: 0, resolved: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      const today = loadTipJournal().filter((e) => e.date === todayIso);
      setCounts({
        pending: today.filter((e) => e.outcome === 'pending').length,
        resolved: today.filter((e) => e.outcome !== 'pending').length
      });
    };
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, [todayIso]);

  if (!mounted) return null;
  const total = counts.pending + counts.resolved;
  if (total === 0) return null;

  return (
    <span className="ml-auto inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
      <span>Heute:</span>
      <span className="font-mono font-bold">{counts.pending}</span> offen
      {counts.resolved > 0 && (
        <>
          <span className="text-emerald-200/40">·</span>
          <span className="font-mono">{counts.resolved}</span> ausgewertet
        </>
      )}
    </span>
  );
}

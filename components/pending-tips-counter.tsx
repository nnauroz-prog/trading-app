'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal } from '@/lib/sport/tip-journal';

// Kleiner Hinweis: wie viele Tipps stecken noch in der Pending-Pipeline.
// Wird stumm, wenn nichts ansteht.
export function PendingTipsCounter() {
  const [pending, setPending] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      const log = loadTipJournal();
      setPending(log.filter((e) => e.outcome === 'pending').length);
    };
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, []);

  if (!mounted || pending === 0) return null;
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 text-[10.5px] text-slate-400">
      <span className="font-semibold text-slate-200">{pending}</span>{' '}
      {pending === 1 ? 'Tipp wartet' : 'Tipps warten'} auf Auflösung. Sobald die Spiele beendet sind und die Ergebnisse im Datenpool ankommen, werden sie automatisch gewertet.
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal } from '@/lib/sport/tip-journal';

// Kleines Badge auf dem Sport-Icon im Bottom-Nav, wenn Tipps offen sind.
export function SportNavBadge() {
  const [pending, setPending] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      setPending(loadTipJournal().filter((e) => e.outcome === 'pending').length);
    };
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, []);

  if (!mounted || pending === 0) return null;
  return (
    <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-emerald-500 px-1 text-[8px] font-bold text-emerald-950">
      {pending > 9 ? '9+' : pending}
    </span>
  );
}

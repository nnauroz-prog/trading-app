'use client';

import { useEffect, useState } from 'react';
import { WATCHLIST_CHANGED_EVENT, isWatched, toggleWatch } from '@/lib/watchlist';

export function WatchlistToggle({ coinId, symbol }: { coinId: string; symbol: string }) {
  const [watched, setWatched] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setWatched(isWatched(coinId));
    sync();
    setMounted(true);
    window.addEventListener(WATCHLIST_CHANGED_EVENT, sync);
    return () => window.removeEventListener(WATCHLIST_CHANGED_EVENT, sync);
  }, [coinId]);

  if (!mounted) return null;
  return (
    <button
      onClick={() => toggleWatch(coinId, symbol)}
      className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${watched ? 'border-amber-400/50 bg-amber-500/15 text-amber-200 hover:border-rose-400/50 hover:text-rose-200' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-amber-400/50 hover:text-amber-200'}`}
    >
      {watched ? '★ in Watchlist (klicken zum Entfernen)' : '☆ zur Watchlist'}
    </button>
  );
}

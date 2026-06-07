'use client';

import { useEffect, useState } from 'react';
import {
  AKTIEN_WATCHLIST_CHANGED_EVENT,
  isAktienWatched,
  toggleAktienWatch
} from '@/lib/aktien-watchlist';

export function AktienWatchlistToggle({ symbol, name, currentPrice }: { symbol: string; name: string; currentPrice?: number }) {
  const [watched, setWatched] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setWatched(isAktienWatched(symbol));
    sync();
    setMounted(true);
    window.addEventListener(AKTIEN_WATCHLIST_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AKTIEN_WATCHLIST_CHANGED_EVENT, sync);
  }, [symbol]);

  if (!mounted) return null;
  return (
    <button
      onClick={() => toggleAktienWatch(symbol, name, currentPrice)}
      className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${watched ? 'border-amber-400/50 bg-amber-500/15 text-amber-200 hover:border-rose-400/50 hover:text-rose-200' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-amber-400/50 hover:text-amber-200'}`}
    >
      {watched ? '★ in Watchlist (klicken zum Entfernen)' : '☆ zur Watchlist'}
    </button>
  );
}

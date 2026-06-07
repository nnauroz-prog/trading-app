'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AKTIEN_WATCHLIST_CHANGED_EVENT,
  AktienWatchlistItem,
  loadAktienWatchlist,
  removeAktienWatch
} from '@/lib/aktien-watchlist';

// Kompakte Aktien-Watchlist auf der Startseite. Verlinkt jeden Eintrag
// auf die Detail-Seite mit MA50/MA200/RSI/ATR/52W-Range/Performance.
// Preise werden bewusst NICHT in der Liste angezeigt — das würde 30 Yahoo-Quotes
// pro Render kosten. Wer aktuelle Werte will, klickt durch.
export function AktienWatchlistStrip() {
  const [items, setItems] = useState<AktienWatchlistItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setItems(loadAktienWatchlist());
    sync();
    setMounted(true);
    window.addEventListener(AKTIEN_WATCHLIST_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AKTIEN_WATCHLIST_CHANGED_EVENT, sync);
  }, []);

  if (!mounted || items.length === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Meine Aktien-Watchlist</h2>
        <Link href="/aktien/watchlist" className="text-[10px] text-sky-300 hover:text-sky-200">verwalten →</Link>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((w) => (
          <li key={w.symbol} className="group inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/40 pl-2 pr-1 py-1 text-[11px]">
            <Link
              href={`/aktien/${encodeURIComponent(w.symbol)}`}
              className="flex items-baseline gap-1.5 text-slate-100 hover:text-emerald-300"
            >
              <span className="font-semibold">{w.name}</span>
              <span className="font-mono text-[9.5px] text-slate-500 group-hover:text-emerald-400/70">{w.symbol}</span>
            </Link>
            <button
              onClick={(e) => { e.preventDefault(); removeAktienWatch(w.symbol); }}
              className="ml-0.5 px-1 text-[11px] text-slate-500 hover:text-rose-300"
              title="Aus Watchlist entfernen"
              aria-label={`${w.name} aus Watchlist entfernen`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AKTIEN_WATCHLIST_CHANGED_EVENT,
  type AktienWatchlistItem,
  loadAktienWatchlist,
  removeAktienWatch
} from '@/lib/aktien-watchlist';
import { fmtCurrency, fmtChange, type MarketQuote } from '@/lib/market/yahoo-quote';

interface Props {
  quotes: Array<MarketQuote | null>;
}

export function AktienWatchlistPageClient({ quotes }: Props) {
  const [items, setItems] = useState<AktienWatchlistItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setItems(loadAktienWatchlist());
    sync();
    setMounted(true);
    window.addEventListener(AKTIEN_WATCHLIST_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AKTIEN_WATCHLIST_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) {
    return <p className="terminal-panel p-5 text-sm text-slate-400" role="status">Deine Liste wird geladen …</p>;
  }

  if (items.length === 0) {
    return (
      <section className="terminal-panel space-y-4 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white">Du hast noch keine Aktien gespeichert.</h2>
        <p className="text-sm leading-relaxed text-slate-400">Entdecke Unternehmen und tippe auf „Merken“, wenn du ihre Kurse im Blick behalten möchtest.</p>
        <Link href="/aktien" className="terminal-button terminal-button-primary">Aktien entdecken →</Link>
      </section>
    );
  }

  const quoteMap = new Map(quotes.filter((quote): quote is MarketQuote => quote !== null).map((quote) => [quote.symbol, quote]));

  return (
    <section className="space-y-4" aria-label="Meine gespeicherten Aktien">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{items.length} {items.length === 1 ? 'Aktie' : 'Aktien'} gespeichert</p>
        <Link href="/aktien" className="text-sm text-cyan-200 hover:text-cyan-100">Weitere entdecken →</Link>
      </div>
      <ul className="space-y-3">
        {items.map((item) => {
          const quote = quoteMap.get(item.symbol);
          return (
            <li key={item.symbol} className="terminal-panel space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/aktien/${encodeURIComponent(item.symbol)}`} className="text-lg font-semibold text-white hover:text-cyan-200">{item.name}</Link>
                  <p className="mt-1 text-xs text-slate-500">Gespeichert am {new Date(item.addedAt).toLocaleDateString('de-DE')}</p>
                </div>
                {quote ? (
                  <div className="text-right">
                    <p className="text-lg font-semibold tabular-nums text-white">{fmtCurrency(quote.last, quote.currency)}</p>
                    <p className={`mt-1 text-sm tabular-nums ${quote.changePct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{fmtChange(quote.changePct)}</p>
                    <p className="mt-1 text-xs text-slate-500">{quote.source === 'stooq' ? 'seit Handelsstart' : 'zum letzten Börsenschluss'}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Preis gerade nicht verfügbar</p>
                )}
              </div>
              {quote && <p className="text-xs leading-relaxed text-slate-500">{quote.source === 'stooq' ? 'Stooq · abgefragt' : 'Yahoo Finance · Kursstand'}: {new Date(quote.ts).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr</p>}
              <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-3">
                <Link href={`/aktien/${encodeURIComponent(item.symbol)}`} className="text-sm text-cyan-200 hover:text-cyan-100">Kursverlauf ansehen →</Link>
                <button type="button" onClick={() => removeAktienWatch(item.symbol)} aria-label={`${item.name} entfernen`} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 transition hover:border-rose-400/50 hover:text-rose-300">Entfernen</button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { WATCHLIST_CHANGED_EVENT, WatchlistItem, loadWatchlist, removeFromWatchlist } from '@/lib/watchlist';

interface CandidateInfo {
  coinId: string;
  symbol?: string;
  passedCount: number;
  priceChangePct24h: number;
  structure: string;
  nearSupport: boolean;
  // Optional: Safety-Grade aus dem Krypto-Safety-Gate, falls bekannt.
  safetyGrade?: 'A' | 'B' | 'C' | 'D';
}

const GRADE_TONE: Record<string, string> = {
  A: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100',
  B: 'border-sky-400/40 bg-sky-500/10 text-sky-200',
  C: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  D: 'border-rose-500/50 bg-rose-500/15 text-rose-200'
};

// Compact home-page view of the user's watchlist. Cross-references the
// candidate list from the master signal so each watched coin shows its
// current setup strength.
export function WatchlistStrip({ candidates }: { candidates: CandidateInfo[] }) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setItems(loadWatchlist());
    sync();
    setMounted(true);
    window.addEventListener(WATCHLIST_CHANGED_EVENT, sync);
    return () => window.removeEventListener(WATCHLIST_CHANGED_EVENT, sync);
  }, []);

  if (!mounted || items.length === 0) return null;

  // Bug-Fix: Symbol-Fallback. Wenn coinId-Match scheitert (z. B. weil
  // Watchlist alte „bitcoin"-Form speichert, Candidates aber „BTC" nutzen),
  // matchen wir zusätzlich auf den Ticker — case-insensitive.
  const findCandidate = (w: WatchlistItem): CandidateInfo | undefined => {
    const direct = candidates.find((c) => c.coinId === w.coinId);
    if (direct) return direct;
    const wSym = w.symbol.toLowerCase();
    return candidates.find((c) => {
      if (c.symbol && c.symbol.toLowerCase() === wSym) return true;
      return c.coinId.toLowerCase() === wSym;
    });
  };

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Meine Watchlist</h2>
        <Link href="/watchlist" className="text-[10px] text-sky-300 hover:text-sky-200">verwalten →</Link>
      </div>
      <ul className="space-y-1">
        {items.map((w) => {
          const c = findCandidate(w);
          return (
            <li key={w.coinId} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
              <Link href={`/assets/${w.symbol.toLowerCase()}`} className="font-mono font-bold text-white hover:text-emerald-300">
                {w.symbol}
              </Link>
              {c ? (
                <>
                  <span className={`font-mono ${c.priceChangePct24h >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {c.priceChangePct24h >= 0 ? '+' : ''}{c.priceChangePct24h.toFixed(1)}%
                  </span>
                  {c.safetyGrade ? (
                    <span className={`rounded border px-1 py-0 text-[9.5px] font-bold uppercase tracking-wider ${GRADE_TONE[c.safetyGrade]}`}>
                      {c.safetyGrade}
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-slate-400" title={`${c.passedCount} von 12 Kriterien erfüllt`}>
                      {c.passedCount} Häkchen
                    </span>
                  )}
                  <span className={`text-[10px] uppercase ${c.structure === 'uptrend' ? 'text-emerald-400' : c.structure === 'downtrend' ? 'text-rose-400' : 'text-slate-500'}`}>
                    {c.structure === 'uptrend' ? '↗' : c.structure === 'downtrend' ? '↘' : '→'}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-slate-500">—</span>
                  <span className="text-[10px] text-slate-500" title="Heute kein Top-Setup — Coin trotzdem im Universum, nur ohne Konfluenz-Daten">kein Top-Setup heute</span>
                  <span />
                </>
              )}
              <button
                onClick={(e) => { e.preventDefault(); removeFromWatchlist(w.coinId); }}
                className="ml-1 text-[10px] text-slate-500 hover:text-rose-300"
                title="Aus Watchlist entfernen"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

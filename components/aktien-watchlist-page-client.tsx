'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AKTIEN_WATCHLIST_CHANGED_EVENT,
  AktienWatchlistItem,
  loadAktienWatchlist,
  removeAktienWatch
} from '@/lib/aktien-watchlist';
import type { StockSafetyEntry } from '@/lib/market/stock-safety-scan';

interface PerAsset {
  symbol: string;
  totalTrades: number;
  winRatePct: number | null;
  avgPnlPct: number;
  totalReturnPct: number;
  buyAndHoldReturnPct: number;
}

interface Props {
  scanEntries: StockSafetyEntry[];
  perAssetBacktests: PerAsset[];
}

const GRADE_TONE: Record<string, string> = {
  A: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100',
  B: 'border-sky-400/40 bg-sky-500/10 text-sky-200',
  C: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  D: 'border-rose-500/50 bg-rose-500/15 text-rose-200'
};

export function AktienWatchlistPageClient({ scanEntries, perAssetBacktests }: Props) {
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
    return (
      <p className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 text-sm text-slate-400">
        Lade Watchlist …
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 text-sm text-slate-400">
        Deine Aktien-Watchlist ist leer. Öffne eine Aktien-Detail-Seite (z. B. <Link href="/aktien/AAPL" className="text-emerald-300 hover:underline">/aktien/AAPL</Link>) und klick auf &bdquo;&#9734; zur Watchlist&ldquo;.
      </section>
    );
  }

  const scanMap = new Map(scanEntries.map((e) => [e.symbol, e]));
  const btMap = new Map(perAssetBacktests.map((b) => [b.symbol, b]));

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">{items.length} Aktie{items.length === 1 ? '' : 'n'} in der Watchlist</h2>
        <Link href="/aktien" className="text-[10px] text-sky-300 hover:text-sky-200">alle Aktien →</Link>
      </div>
      <ul className="space-y-2">
        {items.map((w) => {
          const scan = scanMap.get(w.symbol);
          const bt = btMap.get(w.symbol);
          return (
            <li key={w.symbol} className="space-y-1.5 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/aktien/${encodeURIComponent(w.symbol)}`} className="font-semibold text-slate-100 hover:text-emerald-300">
                    {w.name}
                  </Link>
                  <span className="ml-1.5 font-mono text-[10px] text-slate-500">{w.symbol}</span>
                </div>
                {scan ? (
                  <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${GRADE_TONE[scan.assessment.grade]}`}>
                    {scan.assessment.grade} · {scan.assessment.score}/100
                  </span>
                ) : (
                  <span className="shrink-0 rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">
                    Daten fehlen
                  </span>
                )}
              </div>
              {scan && (
                <p className="text-[11px] leading-snug text-slate-400">
                  {scan.assessment.verdict === 'KAUFEN' ? (
                    <span className="font-semibold text-emerald-300">✓ {scan.assessment.verdict}</span>
                  ) : scan.assessment.verdict === 'NICHT KAUFEN' ? (
                    <span className="font-semibold text-rose-300">✗ {scan.assessment.verdict}</span>
                  ) : (
                    <span className="font-semibold text-amber-300">{scan.assessment.verdict}</span>
                  )}
                  {' '}· {scan.assessment.passedHard}/{scan.assessment.totalHard} Kriterien erfüllt
                </p>
              )}
              {bt && bt.totalTrades > 0 && (
                <p className="text-[10.5px] leading-snug text-slate-500">
                  <span className="text-slate-400">Backtest 12M:</span>{' '}
                  {bt.totalTrades} Trades ·{' '}
                  <span className="font-mono text-slate-300">{bt.winRatePct ?? '—'} %</span> Treffer ·{' '}
                  Strategie <span className={`font-mono font-bold ${bt.totalReturnPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {bt.totalReturnPct >= 0 ? '+' : ''}{bt.totalReturnPct.toFixed(1)} %
                  </span>{' '}
                  vs. Buy-and-Hold <span className={`font-mono ${bt.buyAndHoldReturnPct >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                    {bt.buyAndHoldReturnPct >= 0 ? '+' : ''}{bt.buyAndHoldReturnPct.toFixed(1)} %
                  </span>
                </p>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9.5px] text-slate-500">hinzugefügt {new Date(w.addedAt).toLocaleDateString('de-DE')}</span>
                <button
                  onClick={() => removeAktienWatch(w.symbol)}
                  className="text-[10px] text-slate-500 transition hover:text-rose-300"
                >
                  × entfernen
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

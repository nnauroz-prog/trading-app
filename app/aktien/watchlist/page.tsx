// Aktien-Watchlist-Seite: zeigt für jede gespeicherte Aktie Live-Grade,
// Verdict (KAUFEN/BEOBACHTEN/NICHT KAUFEN) und Backtest-Performance.
// Watchlist liegt im localStorage des Clients, daher hybrid: Server liefert
// alle Daten, Client-Komponente filtert auf den lokalen Watchlist-Stand.

import Link from 'next/link';
import { getStockSafetyScan } from '@/lib/market/stock-safety-scan';
import { getStockSafetyBacktestSummary } from '@/lib/market/stock-safety-backtest-scan';
import { AktienWatchlistPageClient } from '@/components/aktien-watchlist-page-client';

export const dynamic = 'force-dynamic';
export const revalidate = 1800;

export default async function AktienWatchlistPage() {
  const [scan, backtest] = await Promise.all([
    getStockSafetyScan(),
    getStockSafetyBacktestSummary()
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 pb-20 md:p-6">
      <Link href="/aktien" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zur Aktien-Übersicht
      </Link>

      <header className="space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">⭐ Aktien</div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Meine Aktien-Watchlist</h1>
        <p className="text-sm text-slate-400">
          Pro Aktie Sicherheits-Grade live aus dem 8-Punkt-Gate plus historische Strategie-Performance gegen Buy-and-Hold.
          Watchlist liegt nur lokal in deinem Browser — kein Server, kein Account.
        </p>
      </header>

      <AktienWatchlistPageClient
        scanEntries={scan}
        perAssetBacktests={backtest.perAsset.map((a) => ({
          symbol: a.symbol,
          totalTrades: a.totalTrades,
          winRatePct: a.winRatePct,
          avgPnlPct: a.avgPnlPct,
          totalReturnPct: a.totalReturnPct,
          buyAndHoldReturnPct: a.buyAndHoldReturnPct
        }))}
      />

      <footer className="border-t border-slate-900 pt-4 text-[10px] leading-relaxed text-slate-600">
        Datenbasis: Yahoo Finance v8 Chart API. Backtest ohne Gebühren/Slippage — reale Trades wären etwas schlechter.
      </footer>
    </main>
  );
}

import Link from 'next/link';
import { getCommoditySafetyScan } from '@/lib/market/commodity-safety-scan';
import { getCommoditySafetyBacktestSummary } from '@/lib/market/commodity-safety-backtest-scan';
import { RohstoffWatchlistPageClient } from '@/components/rohstoff-watchlist-page-client';

export const dynamic = 'force-dynamic';
export const revalidate = 1800;

export default async function RohstoffWatchlistPage() {
  const [scan, backtest] = await Promise.all([
    getCommoditySafetyScan(),
    getCommoditySafetyBacktestSummary()
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 pb-20 md:p-6">
      <Link href="/rohstoffe" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zur Rohstoff-Übersicht
      </Link>

      <header className="space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">⭐ Rohstoffe</div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Meine Rohstoff-Watchlist</h1>
        <p className="text-sm text-slate-400">
          Pro Rohstoff Sicherheits-Grade live aus dem 8-Punkt-Gate plus historische Strategie-Performance gegen Buy-and-Hold.
          Watchlist liegt nur lokal in deinem Browser — kein Server, kein Account.
        </p>
      </header>

      <RohstoffWatchlistPageClient
        scanEntries={scan}
        perAssetBacktests={backtest.perAsset.map((a) => ({
          symbol: a.symbol,
          totalTrades: a.totalTrades,
          winRatePct: a.winRatePct,
          totalReturnPct: a.totalReturnPct,
          buyAndHoldReturnPct: a.buyAndHoldReturnPct
        }))}
      />

      <footer className="border-t border-slate-900 pt-4 text-[10px] leading-relaxed text-slate-600">
        Datenbasis: Yahoo Finance v8 Chart API (Continuous Front-Month Futures). Backtest ohne Gebühren/Slippage/Roll-Effekte.
      </footer>
    </main>
  );
}

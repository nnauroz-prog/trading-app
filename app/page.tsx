import Link from 'next/link';
import { runDailyAnalysis } from '@/lib/analysis/engine';
import { generateSignals } from '@/lib/analysis/signal-engine';
import { runBacktest } from '@/lib/analysis/backtest';
import { ReportCard } from '@/components/report-card';
import { HitRateTile } from '@/components/hit-rate-tile';
import { SignalBoard } from '@/components/signal-board';
import { BacktestSummary } from '@/components/backtest-summary';
import { AccountConfigBar } from '@/components/account-config-bar';
import { mockAssets } from '@/lib/data/mock';
import { getHitRates } from '@/lib/server/report-store';
import { getCurrentUser, isAuthConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [report, signalReport, backtestReport, hitRates, user] = await Promise.all([
    runDailyAnalysis(),
    generateSignals(),
    runBacktest(),
    getHitRates(),
    getCurrentUser()
  ]);
  const authActive = isAuthConfigured();
  const cryptoIds = new Set(mockAssets.filter((a) => a.category === 'crypto').map((a) => a.id));
  const stockIds = new Set(mockAssets.filter((a) => a.category === 'stock').map((a) => a.id));
  const crypto = report.recommendations.filter((r) => cryptoIds.has(r.assetId));
  const stocks = report.recommendations.filter((r) => stockIds.has(r.assetId));

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <header className="flex items-start justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            Signal Desk
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
            {report.date}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">{report.marketMood}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Link href="/history" className="rounded-md border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-slate-300 transition hover:border-slate-700 hover:bg-slate-800">
            History
          </Link>
          {authActive && user && (
            <form action="/logout" method="post">
              <button type="submit" className="rounded-md border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-slate-300 transition hover:border-slate-700 hover:bg-slate-800">
                Logout
              </button>
            </form>
          )}
        </div>
      </header>

      <AccountConfigBar />

      <SignalBoard report={signalReport} />

      <BacktestSummary report={backtestReport} />

      <section className="space-y-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Daily Outlook (Langfrist-Sicht)</h2>
          <p className="mt-1 text-xs text-slate-600">Tägliche Buy/Hold/Sell-Einschätzung. Ergänzt die Signale, ersetzt sie nicht.</p>
        </div>
        <HitRateTile summary={hitRates} />
        <div className="grid gap-4 md:grid-cols-2">
          <ReportCard title="Krypto" rows={crypto} />
          <ReportCard title="Aktien" rows={stocks} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Watchlist</h2>
        <div className="flex flex-wrap gap-2">
          {mockAssets.map((asset) => (
            <Link
              key={asset.id}
              href={`/assets/${asset.ticker.toLowerCase()}`}
              className="rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-300 transition hover:border-emerald-500/40 hover:bg-slate-800 hover:text-emerald-200"
            >
              {asset.ticker}
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-900 pt-4 text-[10px] text-slate-600">
        Analyse- und Entscheidungsunterstützungssystem. Keine Finanzberatung. Keine Erfolgs-Garantie. Vergangene Performance ist kein Indikator für zukünftige Ergebnisse.
      </footer>
    </main>
  );
}

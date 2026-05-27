import Link from 'next/link';
import { buildTopPlayReport } from '@/lib/analysis/top-play-engine';
import { buildEventFeed } from '@/lib/analysis/event-feed';
import { TickerBar } from '@/components/ticker-bar';
import { TopPlayCard, AlternatesList } from '@/components/top-play-card';
import { LiveFeed } from '@/components/live-feed';
import { AccountConfigBar } from '@/components/account-config-bar';
import { PaperTradesPanel } from '@/components/paper-trades-panel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const report = await buildTopPlayReport();
  const events = buildEventFeed(report);

  const latestPrices: Record<string, number | null> = {};
  for (const t of report.tickers) {
    const symbol = t.symbol.replace('USDT', '').toLowerCase();
    latestPrices[symbol] = t.price;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:space-y-6 md:p-6">
      <header className="flex items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            Trading Desk
          </div>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Link href="/ideas" className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300 transition hover:border-emerald-400/50 hover:bg-emerald-500/20">
            Idee analysieren
          </Link>
          <Link href="/history" className="rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-400 transition hover:border-slate-700 hover:text-slate-200">
            History
          </Link>
        </div>
      </header>

      <TickerBar tickers={report.tickers} />

      <AccountConfigBar />

      <TopPlayCard play={report.topPlay} />

      <LiveFeed events={events} />

      <AlternatesList alternates={report.alternates} />

      <PaperTradesPanel latestPrices={latestPrices} />

      <footer className="border-t border-slate-900 pt-4 text-[10px] leading-relaxed text-slate-600">
        Scant {report.tickers.length} Coins · {report.analyzedCount} deep-analyzed · {report.dataSource === 'binance' ? 'Live Binance Spot Data' : 'Engine offline'}
        <span className="ml-2 text-slate-700">·</span>
        <span className="ml-2">Keine Finanzberatung. Top-Play ist die aktuell beste Konfluenz im Universum, kein Versprechen. Stop-Loss respektieren. Vergangenheit ≠ Zukunft.</span>
      </footer>
    </main>
  );
}

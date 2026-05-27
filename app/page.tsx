import Link from 'next/link';
import { buildTopPlayReport } from '@/lib/analysis/top-play-engine';
import { buildEventFeed } from '@/lib/analysis/event-feed';
import { buildMasterSignal } from '@/lib/analysis/master-signal-engine';
import { TickerBar } from '@/components/ticker-bar';
import { TopPlayCard, AlternatesList } from '@/components/top-play-card';
import { LiveFeed } from '@/components/live-feed';
import { TodayTradeCard } from '@/components/today-trade-card';
import { HeuteAufpassen } from '@/components/heute-aufpassen';
import { AccountConfigBar } from '@/components/account-config-bar';
import { PaperTradesPanel } from '@/components/paper-trades-panel';
import { LiveClock } from '@/components/live-clock';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const [report, masterSignal] = await Promise.all([
    buildTopPlayReport(),
    buildMasterSignal()
  ]);
  const events = buildEventFeed(report);

  const latestPrices: Record<string, number | null> = {};
  for (const t of report.tickers) {
    const symbol = t.symbol.replace('USDT', '').toLowerCase();
    latestPrices[symbol] = t.price;
  }

  const tickerChanges = report.tickers.map((t) => t.priceChangePct);
  const negativeCount = tickerChanges.filter((c) => c < -2).length;
  const positiveCount = tickerChanges.filter((c) => c > 2).length;
  const totalCount = tickerChanges.length || 1;
  const negShare = negativeCount / totalCount;
  const posShare = positiveCount / totalCount;
  let marketMood: 'risk-on' | 'neutral' | 'risk-off' = 'neutral';
  if (negShare > 0.6) marketMood = 'risk-off';
  else if (posShare > 0.6) marketMood = 'risk-on';

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:space-y-6 md:p-6">
      <header className="flex items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            Trading Desk
          </div>
          <LiveClock />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Link href="/heatmap" className="rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">
            Markt
          </Link>
          <Link href="/ideas" className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300 transition hover:border-emerald-400/50 hover:bg-emerald-500/20">
            Idee
          </Link>
          <Link href="/positions" className="rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">
            Positionen
          </Link>
          <Link href="/warnings" className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-rose-300 transition hover:border-rose-400/50 hover:bg-rose-500/20">
            Warnung
          </Link>
          <Link href="/journal" className="rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">
            Journal
          </Link>
        </div>
      </header>

      <TickerBar tickers={report.tickers} />

      <AccountConfigBar />

      <TodayTradeCard report={masterSignal} />

      <HeuteAufpassen
        latestPrices={latestPrices}
        marketContext={{
          marketMood,
          marketRegime: masterSignal.kind === 'trade' ? masterSignal.marketRegime : masterSignal.marketRegime,
          todaysVerdict: masterSignal.kind === 'trade' ? 'trade' : 'no_trade'
        }}
      />

      <LiveFeed events={events} />

      <details className="rounded-xl border border-slate-800/80 bg-slate-900/40">
        <summary className="cursor-pointer p-4 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
          ▸ Alternative Setups + Tech-Confluence anzeigen
        </summary>
        <div className="space-y-4 p-4 pt-0">
          <TopPlayCard play={report.topPlay} marketMood={marketMood} />
        </div>
      </details>

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

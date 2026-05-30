import Link from 'next/link';
import { buildTopPlayReport } from '@/lib/analysis/top-play-engine';
import { buildEventFeed } from '@/lib/analysis/event-feed';
import { cookies } from 'next/headers';
import { buildMasterSignal } from '@/lib/analysis/master-signal-engine';
import { fetchFearGreed, fetchBtcDominance } from '@/lib/providers/sentiment-indicators';
import { fetchFundingRate } from '@/lib/providers/funding-rates';
import { computeHalvingCyclePosition } from '@/lib/cycles/halving-cycle';
import { TickerBar } from '@/components/ticker-bar';
import { TopPlayCard, AlternatesList } from '@/components/top-play-card';
import { LiveFeed } from '@/components/live-feed';
import { TodayTradeCard } from '@/components/today-trade-card';
import { CandidateList } from '@/components/candidate-list';
import { TodoBox } from '@/components/todo-box';
import { MarketBriefing } from '@/components/market-briefing';
import { SafetyCheck } from '@/components/safety-check';
import { ProofCard } from '@/components/proof-card';
import { NewsFeed } from '@/components/news-feed';
import { getBacktestSummary } from '@/lib/analysis/backtest-summary';
import { getCryptoNews } from '@/lib/news/news-agent';
import { AdvancedOnly } from '@/components/advanced-only';
import { ViewModeToggle } from '@/components/view-mode-toggle';
import { TradeModeToggle } from '@/components/trade-mode-toggle';
import { HeuteAufpassen } from '@/components/heute-aufpassen';
import { AccountConfigBar } from '@/components/account-config-bar';
import { PaperTradesPanel } from '@/components/paper-trades-panel';
import { LiveClock } from '@/components/live-clock';
import { MarketPulseTile } from '@/components/market-pulse-tile';
import { CyclesTile } from '@/components/cycles-tile';
import { DailyActionPlan } from '@/components/daily-action-plan';
import { OnboardingGuide } from '@/components/onboarding-guide';
import { AutoRefresh } from '@/components/auto-refresh';
import { SignalSummary } from '@/lib/action-plan';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const tradeMode = (await cookies()).get('trade-mode')?.value === 'daytrade' ? 'daytrade' : 'swing';
  const [report, masterSignal, fearGreed, btcDominance, fundingBtc, fundingEth, backtestSummary, newsItems] = await Promise.all([
    buildTopPlayReport(),
    buildMasterSignal(tradeMode),
    fetchFearGreed(),
    fetchBtcDominance(),
    fetchFundingRate('BTCUSDT'),
    fetchFundingRate('ETHUSDT'),
    getBacktestSummary(),
    getCryptoNews()
  ]);
  const events = buildEventFeed(report);
  const halving = computeHalvingCyclePosition();

  const tickerChangesAll = report.tickers.map((t) => t.priceChangePct);
  const negShareAll = tickerChangesAll.filter((c) => c < -2).length / (tickerChangesAll.length || 1);
  const posShareAll = tickerChangesAll.filter((c) => c > 2).length / (tickerChangesAll.length || 1);
  const moodForPlan: 'risk-on' | 'neutral' | 'risk-off' = negShareAll > 0.6 ? 'risk-off' : posShareAll > 0.6 ? 'risk-on' : 'neutral';
  const signalSummary: SignalSummary = masterSignal.kind === 'trade'
    ? {
        kind: 'trade',
        coinSymbol: masterSignal.coin.symbol,
        entry: masterSignal.entry,
        stopLoss: masterSignal.stopLoss,
        takeProfit1: masterSignal.takeProfit1,
        confidence: masterSignal.confidence,
        passedCount: masterSignal.passedCount,
        totalCount: masterSignal.totalCount,
        brokers: masterSignal.brokers,
        marketMood: moodForPlan,
        marketRegime: masterSignal.marketRegime
      }
    : {
        kind: 'no_trade',
        coinSymbol: masterSignal.bestCandidate?.coin.symbol ?? null,
        entry: masterSignal.bestCandidate?.entry ?? null,
        stopLoss: masterSignal.bestCandidate?.stopLoss ?? null,
        takeProfit1: masterSignal.bestCandidate?.takeProfit1 ?? null,
        confidence: masterSignal.bestCandidate?.confidence ?? null,
        passedCount: masterSignal.bestCandidate?.passedCount ?? null,
        totalCount: masterSignal.bestCandidate?.totalCount ?? null,
        brokers: masterSignal.bestCandidate?.brokers ?? [],
        marketMood: moodForPlan,
        marketRegime: masterSignal.marketRegime
      };

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
      <OnboardingGuide />
      <AutoRefresh intervalMs={20000} />
      <header className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              Trading Desk
            </div>
            <LiveClock />
          </div>
        </div>
        <nav className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link href="/ideas" className="shrink-0 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300 transition hover:border-emerald-400/50">Idee</Link>
          <Link href="/screener" className="shrink-0 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">Screener</Link>
          <Link href="/heatmap" className="shrink-0 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">Markt</Link>
          <Link href="/watchlist" className="shrink-0 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">Watchlist</Link>
          <Link href="/positions" className="shrink-0 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">Positionen</Link>
          <Link href="/warnings" className="shrink-0 rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-rose-300 transition hover:border-rose-400/50">Warnung</Link>
          <Link href="/journal" className="shrink-0 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">Journal</Link>
          <Link href="/dca" className="shrink-0 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">DCA</Link>
          <Link href="/backtest" className="shrink-0 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">Backtest</Link>
          <Link href="/performance" className="shrink-0 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">Performance</Link>
          <Link href="/strategie" className="shrink-0 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300 transition hover:border-emerald-400/50">Strategie</Link>
          <Link href="/sport" className="shrink-0 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">Sport</Link>
          <Link href="/settings" className="shrink-0 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">Settings</Link>
        </nav>
      </header>

      <div className="flex items-center justify-between gap-2">
        <TradeModeToggle />
        <span className="text-[10px] uppercase tracking-wider text-slate-500">
          {tradeMode === 'daytrade' ? 'Intraday · 5m/15m/1h' : 'Swing · 1h/4h/1d'}
        </span>
      </div>

      <TodoBox report={masterSignal} />

      <SafetyCheck report={masterSignal} backtest={backtestSummary} />

      <MarketBriefing report={masterSignal} />

      <NewsFeed items={newsItems} />

      <ProofCard summary={backtestSummary} />

      <AccountConfigBar />

      <div className="flex justify-end">
        <ViewModeToggle />
      </div>

      <AdvancedOnly>

        <TickerBar tickers={report.tickers} />

        <DailyActionPlan signal={signalSummary} />

        <TodayTradeCard report={masterSignal} />

        <CandidateList report={masterSignal} backtest={backtestSummary} />

        <HeuteAufpassen
          latestPrices={latestPrices}
          marketContext={{
            marketMood,
            marketRegime: masterSignal.kind === 'trade' ? masterSignal.marketRegime : masterSignal.marketRegime,
            todaysVerdict: masterSignal.kind === 'trade' ? 'trade' : 'no_trade'
          }}
        />

        <MarketPulseTile fearGreed={fearGreed} btcDominance={btcDominance} />

        <CyclesTile halving={halving} fundingBtc={fundingBtc} fundingEth={fundingEth} />

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
      </AdvancedOnly>

      <footer className="border-t border-slate-900 pt-4 text-[10px] leading-relaxed text-slate-600">
        Scant {report.tickers.length} Coins · {report.analyzedCount} deep-analyzed · {report.dataSource === 'binance' ? 'Live Binance Spot Data' : 'Engine offline'}
        <span className="ml-2 text-slate-700">·</span>
        <span className="ml-2">Keine Finanzberatung. Top-Play ist die aktuell beste Konfluenz im Universum, kein Versprechen. Stop-Loss respektieren. Vergangenheit ≠ Zukunft.</span>
        <span className="ml-2 text-slate-700">· Build {(process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev').slice(0, 7)}</span>
      </footer>
    </main>
  );
}

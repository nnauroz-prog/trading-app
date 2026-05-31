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
import { DailyBriefing } from '@/components/daily-briefing';
import { MarketBriefing } from '@/components/market-briefing';
import { AgentRecorder } from '@/components/agent-recorder';
import { FirmaStrip } from '@/components/firma-strip';
import { AkademieStrip } from '@/components/akademie-strip';
import { HeuteEntscheidung } from '@/components/heute-entscheidung';
import { evaluatePersonas } from '@/lib/agents/personas';
import { runSpaeher } from '@/lib/akademie/spaeher';
import { getLehrlingReport } from '@/lib/akademie/lehrling';
import { computeSetupSimilarity } from '@/lib/analysis/setup-similarity';
import { detectChaseSignals, detectOpportunitySignals, PriceContext } from '@/lib/analysis/chase-detector';
import { ChaseWarning } from '@/components/chase-warning';
import { listMacroEventsThisWeek } from '@/lib/calendar/macro-events';
import { computeEventWindow } from '@/lib/calendar/event-window';
import { WocheVoraus } from '@/components/woche-voraus';
import { buildIntelContext } from '@/lib/intel/context';
import { runAllEmployees } from '@/lib/intel/employees';
import { chefredakteurSynthesis } from '@/lib/intel/chefredakteur';
import { IntelStrip } from '@/components/intel-strip';
import { todayIsoBerlin } from '@/lib/agent-memory';
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
  const [report, masterSignal, fearGreed, btcDominance, fundingBtc, fundingEth, backtestSummary, newsItems, lehrlingReport] = await Promise.all([
    buildTopPlayReport(),
    buildMasterSignal(tradeMode),
    fetchFearGreed(),
    fetchBtcDominance(),
    fetchFundingRate('BTCUSDT'),
    fetchFundingRate('ETHUSDT'),
    getBacktestSummary(),
    getCryptoNews(),
    getLehrlingReport()
  ]);
  const events = buildEventFeed(report);
  const halving = computeHalvingCyclePosition();
  const spaeherReport = runSpaeher(newsItems);
  const upcomingMacroAll = listMacroEventsThisWeek();
  const eventWindow = computeEventWindow(upcomingMacroAll);
  const personas = evaluatePersonas(masterSignal, backtestSummary, spaeherReport, eventWindow);
  // Historical similarity for the headline coin (use the conservative firma's
  // pick if it BUYs, else the best-scoring candidate).
  const headlineFirma = personas.find((p) => p.verdict === 'BUY' && p.persona === 'conservative')
    ?? personas.find((p) => p.verdict === 'BUY')
    ?? personas.find((p) => p.target !== null);
  const setupSimilarity = computeSetupSimilarity(
    backtestSummary.safeTrades,
    headlineFirma?.target ? { coinId: headlineFirma.target.coinId, ticker: headlineFirma.target.symbol, passedCount: headlineFirma.target.passedCount } : null
  );
  // Chase / opportunity warnings: cross news sentiment with 24h price moves.
  const priceCtx: PriceContext[] = report.tickers.map((t) => ({
    symbol: t.symbol.replace('USDT', ''),
    priceChangePct24h: t.priceChangePct
  }));
  const chaseSignals = detectChaseSignals(spaeherReport.perCoin, priceCtx);
  const opportunitySignals = detectOpportunitySignals(spaeherReport.perCoin, priceCtx);
  const upcomingMacro = upcomingMacroAll;
  const todayIso = todayIsoBerlin();

  // Recherche-Firma: Chefredakteur-Lagebericht (für Strip + Confidence-Score)
  const intelCtx = buildIntelContext({
    masterSignal, backtest: backtestSummary, spaeher: spaeherReport,
    fearGreed: fearGreed?.value ?? null,
    fundingBtcAnnualizedPct: fundingBtc?.fundingRateAnnualizedPct ?? null,
    fundingEthAnnualizedPct: fundingEth?.fundingRateAnnualizedPct ?? null,
    btcDominancePct: btcDominance?.btcDominancePct ?? null,
    eventWindow,
    cycleLabel: halving?.phaseLabel ?? null,
    cycleProgressPct: halving?.cyclePct ?? null,
    firmaLog: []
  });
  const intelReports = runAllEmployees(intelCtx);
  const intelCeo = chefredakteurSynthesis(intelReports);

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
        <nav className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link href="/agent" className="shrink-0 rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-sky-300 transition hover:border-sky-400/50">Firmen</Link>
          <Link href="/intel" className="shrink-0 rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-sky-300 transition hover:border-sky-400/50">Recherche</Link>
          <Link href="/akademie" className="shrink-0 rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-sky-300 transition hover:border-sky-400/50">Akademie</Link>
          <Link href="/positions" className="shrink-0 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">Positionen</Link>
          <Link href="/gold" className="shrink-0 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-200 transition hover:border-amber-400/50">Gold</Link>
          <Link href="/sport" className="shrink-0 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">Sport</Link>
          <Link href="/settings" className="shrink-0 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">Mehr</Link>
        </nav>
      </header>

      <AgentRecorder report={masterSignal} backtest={backtestSummary} />

      <HeuteEntscheidung personas={personas} perCoinSentiment={spaeherReport.perCoin} setupSimilarity={setupSimilarity} eventWindow={eventWindow} intelSignal={intelCeo.netSignal} />

      <IntelStrip ceo={intelCeo} />

      <ChaseWarning chase={chaseSignals} opportunity={opportunitySignals} />

      <WocheVoraus events={upcomingMacro} today={todayIso} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TradeModeToggle />
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            {tradeMode === 'daytrade' ? 'Intraday' : 'Swing'}
          </span>
        </div>
        <ViewModeToggle />
      </div>

      <AdvancedOnly>
        <AccountConfigBar />

        <TodoBox report={masterSignal} />

        <FirmaStrip personas={personas} />

        <AkademieStrip spaeher={spaeherReport} lehrling={lehrlingReport} />

        <DailyBriefing report={masterSignal} backtest={backtestSummary} />

        <SafetyCheck report={masterSignal} backtest={backtestSummary} />

        <MarketBriefing report={masterSignal} />

        <NewsFeed items={newsItems} />

        <ProofCard summary={backtestSummary} />
      </AdvancedOnly>

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
        Keine Finanzberatung. Stop-Loss respektieren. Vergangenheit ≠ Zukunft.
        <span className="ml-2 text-slate-800">· Build {(process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev').slice(0, 7)}</span>
      </footer>
    </main>
  );
}

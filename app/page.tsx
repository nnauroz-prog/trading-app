import Link from 'next/link';
import { buildTopPlayReport } from '@/lib/analysis/top-play-engine';
import { buildEventFeed } from '@/lib/analysis/event-feed';
import { cookies } from 'next/headers';
import { getMasterSignal } from '@/lib/analysis/master-signal-engine';
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
import { FirmaStrip } from '@/components/firma-strip';
import { FirmaPnlCard } from '@/components/firma-pnl-card';
import { CoinOverridesStrip } from '@/components/coin-overrides-strip';
import { OverrideConflictBanner } from '@/components/override-conflict-banner';
import { UserOverrideAccuracyCard } from '@/components/user-override-accuracy-card';
import { vorstandMediation } from '@/lib/agents/vorstand';
import type { HistoryEntry } from '@/lib/agents/persona-history';
import { SetupTrend } from '@/components/setup-trend';
import { WatchlistStrip } from '@/components/watchlist-strip';
import { AktienWatchlistStrip } from '@/components/aktien-watchlist-strip';
import { RohstoffWatchlistStrip } from '@/components/rohstoff-watchlist-strip';
import { CrossAssetSafetyStats } from '@/components/cross-asset-safety-stats';
import { AssetQuickSearch } from '@/components/asset-quick-search';
import { STOCK_UNIVERSE } from '@/lib/market/stocks';
import { COMMODITY_UNIVERSE } from '@/lib/market/commodities';
import { evaluateStockPersonas } from '@/lib/agents/stock-personas';
import { evaluateCommodityPersonas } from '@/lib/agents/commodity-personas';
import { CrossAssetConservativeCard, type CrossAssetConservativeRow } from '@/components/cross-asset-conservative-card';
import { PersonaConsensusBanner } from '@/components/persona-consensus-banner';
import { CoinScoreTrend } from '@/components/coin-score-trend';
import { SportBriefingCard } from '@/components/sport-briefing-card';
import { getEmployeeBacktest } from '@/lib/sport/firma/employee-backtest-cache';
import { SportTodayBanner } from '@/components/sport-today-banner';
import { MarketQuickStats } from '@/components/market-quick-stats';
import { HeuteMachen, type AssetCardData } from '@/components/heute-machen';
import { ScorePredictionsStrip } from '@/components/score-predictions-strip';
import { scoreCandidateSafety } from '@/lib/analysis/safety-for-candidate';
import { getFootballFixtures } from '@/lib/sport/fetcher';
import { buildFirmaSynthesis } from '@/lib/sport/firma/synthesis';
import { bucketByDay } from '@/lib/sport/day-buckets';
import { DiffVsYesterday } from '@/components/diff-vs-yesterday';
import { TriggeredAlertsStrip } from '@/components/triggered-alerts-strip';
import { AssetClassRadar, AssetClassCard } from '@/components/asset-class-radar';
import { KapitalSchutz } from '@/components/kapital-schutz';
import { PnlSummary } from '@/components/pnl-summary';
import { buildCommandCenter } from '@/lib/command-center';
import { scoreCryptoCandidate } from '@/lib/opportunity-score';
import { AkademieStrip } from '@/components/akademie-strip';
import { AkademieLearningOverlay } from '@/components/akademie-learning-overlay';
import { HeuteEntscheidung } from '@/components/heute-entscheidung';
import { evaluatePersonas } from '@/lib/agents/personas';
import { evaluateTradeTier90 } from '@/lib/agents/trade-tier-90';
import { TradeTier90Card } from '@/components/trade-tier-90-card';
import { TradingTodayCard } from '@/components/trading-today-card';
import { WmCountdownBanner } from '@/components/wm-countdown-banner';
import { rankWmWinnerPicks } from '@/lib/sport/wm-winner-picks';
import { fetchWmWeatherByFixture } from '@/lib/sport/wm-live-weather-fetch';
import { reconcileWmSchedule, verifiedFixtureIds, mismatchedFixtureIds } from '@/lib/sport/wm-schedule-reconciler';
import { buildWmDayPlan } from '@/lib/sport/wm-day-plan';
import { WmDayPlanCard } from '@/components/sport/wm-day-plan-card';
import { WmPickResolver } from '@/components/sport/wm-pick-resolver';
import { WORLD_CUP_LEAGUE_IDS } from '@/lib/sport/leagues';
import { WmWinnerPicksWithLearning } from '@/components/sport/wm-winner-picks-with-learning';
import { WmLearningStatusCard } from '@/components/sport/wm-learning-status-card';
import { WmCalibrationCard } from '@/components/sport/wm-calibration-card';
import { WmIntegrityPill } from '@/components/sport/wm-integrity-pill';
import { evaluateIntegrityAction } from '@/lib/sport/wm-data-integrity-action';
import { WmBankrollCard } from '@/components/sport/wm-bankroll-card';
import { WmBankrollLedgerCard } from '@/components/sport/wm-bankroll-ledger-card';
import { WmComboPicksCard } from '@/components/sport/wm-combo-picks-card';
import { WmJetztCard } from '@/components/sport/wm-jetzt-card';
import { WmWeekPlanCard } from '@/components/sport/wm-week-plan-card';
import { buildWmWeekPlan } from '@/lib/sport/wm-week-plan';
import { WmPickExplainCard } from '@/components/sport/wm-pick-explain-card';
import { WmErsteSchritte } from '@/components/sport/wm-erste-schritte';
import { WmGlossarCard } from '@/components/sport/wm-glossar-card';
import { PlainHint } from '@/components/sport/plain-hint';
import { Tier90Resolver } from '@/components/tier-90-resolver';
import { Tier90HomeSummary } from '@/components/tier-90-home-summary';
import { AppOverviewStats } from '@/components/app-overview-stats';
import { WmBriefingCard } from '@/components/wm-briefing-card';
import { HomeWmProCard } from '@/components/home-wm-pro-card';
import { HomeSportStatus } from '@/components/home-sport-status';
import { MultiSportBriefing } from '@/components/multi-sport-briefing';
import { getBasketballFixtures } from '@/lib/sport/basketball-fetcher';
import { getTennisFixtures } from '@/lib/sport/tennis-fetcher';
import { getHockeyFixtures } from '@/lib/sport/multi-sport-fetcher';
import { runSpaeher } from '@/lib/akademie/spaeher';
import { getLehrlingReport } from '@/lib/akademie/lehrling';
import { computeSetupSimilarity } from '@/lib/analysis/setup-similarity';
import { detectChaseSignals, detectOpportunitySignals, PriceContext } from '@/lib/analysis/chase-detector';
import { ChaseWarning } from '@/components/chase-warning';
import { fetchBothTickerSources } from '@/lib/providers/binance-tickers';
import { checkCrossExchangePrices } from '@/lib/analysis/cross-exchange-check';
import { CrossExchangeWarning } from '@/components/cross-exchange-warning';
import { EhrlicheGrenzen } from '@/components/ehrliche-grenzen';
import { AllToolsIndex } from '@/components/all-tools-index';
import { MorningBriefingExport } from '@/components/morning-briefing-export';
import { listMacroEventsThisWeek } from '@/lib/calendar/macro-events';
import { computeEventWindow } from '@/lib/calendar/event-window';
import { WocheVoraus } from '@/components/woche-voraus';
import { buildIntelContext } from '@/lib/intel/context';
import { runAllEmployees } from '@/lib/intel/employees';
import { chefredakteurSynthesis } from '@/lib/intel/chefredakteur';
import { IntelStrip } from '@/components/intel-strip';
import { todayIsoBerlin } from '@/lib/agent-memory';
import { SafetyCheck } from '@/components/safety-check';
import { SafetyHistoryStrip } from '@/components/safety-history-strip';
import { LastSafeBuyCard } from '@/components/last-safe-buy-card';
import { ProofCard } from '@/components/proof-card';
import { NewsFeed } from '@/components/news-feed';
import { getBacktestSummary } from '@/lib/analysis/backtest-summary';
import { CryptoPrecisionDesk } from '@/components/crypto/crypto-precision-desk';
import { CryptoPrecisionCalibrationHydrator } from '@/components/crypto/crypto-precision-calibration-hydrator';
import { CryptoPrecisionOverrideBanner } from '@/components/crypto/crypto-precision-override-banner';
import { evaluateCryptoPrecisionPick } from '@/lib/analysis/crypto-precision-gate';
import { HomeLearningRecorders } from '@/components/home-learning-recorders';
import { getStockSafetyScan } from '@/lib/market/stock-safety-scan';
import { getCommoditySafetyScan } from '@/lib/market/commodity-safety-scan';
import { rankSafeFootballTips } from '@/lib/sport/safe-football-tips';
import { rankSafeWmTips } from '@/lib/sport/wm-safe-tips';
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
  const [report, masterSignal, fearGreed, btcDominance, fundingBtc, fundingEth, backtestSummary, newsItems, lehrlingReport, exchangeSources, sportLeagues, basketballLeagues, tennisLeagues, hockeyLeagues, stockSafetyScan, commoditySafetyScan, sportEmployeeStats] = await Promise.all([
    buildTopPlayReport(),
    getMasterSignal(tradeMode),
    fetchFearGreed(),
    fetchBtcDominance(),
    fetchFundingRate('BTCUSDT'),
    fetchFundingRate('ETHUSDT'),
    getBacktestSummary(),
    getCryptoNews(),
    getLehrlingReport(),
    fetchBothTickerSources(),
    getFootballFixtures(),
    getBasketballFixtures(),
    getTennisFixtures(),
    getHockeyFixtures(),
    getStockSafetyScan(),
    getCommoditySafetyScan(),
    getEmployeeBacktest()
  ]);
  const sportSynth = buildFirmaSynthesis(sportLeagues);
  const sportTodayCount = bucketByDay(sportLeagues.flatMap((lf) => lf.next)).today.length;
  const multiSportTodayIso = new Date().toISOString().slice(0, 10);
  const basketballTodayCount = basketballLeagues.reduce((s, l) => s + l.next.filter((f) => f.date === multiSportTodayIso).length, 0);
  const tennisTodayCount = tennisLeagues.reduce((s, l) => s + l.next.filter((f) => f.date === multiSportTodayIso).length, 0);
  const hockeyTodayCount = hockeyLeagues.reduce((s, l) => s + l.next.filter((f) => f.date === multiSportTodayIso).length, 0);

  // "Heute machen" — die EINE Empfehlung pro Asset-Klasse, ganz oben.
  const cryptoScored = masterSignal.candidates.map((c) => ({ c, safety: scoreCandidateSafety(c, masterSignal, backtestSummary) }));
  cryptoScored.sort((a, b) => b.safety.score - a.safety.score || b.c.passedCount - a.c.passedCount);
  const cryptoTop = cryptoScored[0] ?? null;

  const sportLead = sportSynth.highConfidencePicks[0] ?? sportSynth.dailyTopPick;

  // Sicherster Sport-Tipp quer durch Liga-Fußball + WM für die Sport-Karte.
  // Multi-Markt-Scan (Über 1,5, Doppelchance, BTTS, 1X2) — höchste
  // Modell-Wahrscheinlichkeit der nächsten 14 Tage gewinnt.
  const safeSportTodayIso = new Date().toISOString().slice(0, 10);
  // WM Sieger-Picks aus dem Profi-Tipper-Agent — strengste Auswahl der
  // App. Wenn fuer heute/morgen ein Pick durchkommt, hat er Prioritaet
  // vor dem Multi-Markt-safe-tip.
  const wmWinnerHorizonDays = 7;
  const wmWeatherByFixtureIdHome = await fetchWmWeatherByFixture({ todayIso: safeSportTodayIso, horizonDays: wmWinnerHorizonDays });
  // Schedule-Reconciler auch auf der Home — identisches Veto/Upgrade-
  // Verhalten wie auf /sport, damit beide Ansichten dieselben Picks zeigen.
  const wmExternalLeagueHome = sportLeagues.find((lf) => lf.league.id === '4429');
  const wmExternalFixturesHome = wmExternalLeagueHome
    ? [...wmExternalLeagueHome.next, ...wmExternalLeagueHome.last].map((f) => ({
        date: f.date, time: f.time ?? null, homeTeam: f.homeTeam, awayTeam: f.awayTeam
      }))
    : [];
  const wmReconcileHome = reconcileWmSchedule({
    external: wmExternalFixturesHome,
    fromIso: safeSportTodayIso,
    toIso: (() => { const d = new Date(`${safeSportTodayIso}T00:00:00`); d.setUTCDate(d.getUTCDate() + 14); return d.toISOString().slice(0, 10); })()
  });
  const wmWinnerPicksHome = rankWmWinnerPicks({
    todayIso: safeSportTodayIso,
    horizonDays: wmWinnerHorizonDays,
    weatherByFixtureId: wmWeatherByFixtureIdHome,
    verifiedFixtureIds: verifiedFixtureIds(wmReconcileHome),
    mismatchedFixtureIds: mismatchedFixtureIds(wmReconcileHome)
  });
  const wmWinnerLeadHome = wmWinnerPicksHome[0] ?? null;
  const safeWmTips = rankSafeWmTips({ todayIso: safeSportTodayIso, maxDays: 14, minProbability: 0.7, limit: 5 });
  const safeFootballTips = rankSafeFootballTips(sportLeagues, { todayIso: safeSportTodayIso, horizonDays: 14, minProbability: 0.7, limit: 5 });
  const safeSportLead = (() => {
    const wmBest = safeWmTips[0];
    const liBest = safeFootballTips[0];
    if (!wmBest && !liBest) return null;
    if (!wmBest) return { kind: 'liga' as const, tip: liBest! };
    if (!liBest) return { kind: 'wm' as const, tip: wmBest };
    return wmBest.market.probability >= liBest.market.probability
      ? { kind: 'wm' as const, tip: wmBest }
      : { kind: 'liga' as const, tip: liBest };
  })();
  const todayBerlin = sportSynth.weekAhead[0]?.date;
  const todaySportFixtures = todayBerlin === undefined ? [] : (sportSynth.weekAhead[0]?.fixtures ?? []);
  const sportExtraTips = todaySportFixtures
    .filter(({ fixture: f }) => f.prediction && (sportLead === null || sportLead === undefined || f.id !== sportLead.fixture.id))
    .slice(0, 4)
    .map(({ fixture: f }) => ({
      home: f.homeTeam,
      away: f.awayTeam,
      score: `${f.prediction!.likelyScore.home}:${f.prediction!.likelyScore.away}`,
      confidence: Math.round(f.prediction!.pickConfidence * 100)
    }));

  const heuteCards: AssetCardData[] = [
    cryptoTop && cryptoTop.safety.maxSafety
      ? {
          klass: 'krypto',
          emoji: '₿',
          label: 'Krypto',
          verdict: 'kaufen',
          headline: `${cryptoTop.c.symbol} kaufen`,
          detail: `Grade A · alle ${cryptoTop.safety.totalHard} Sicherheits-Kriterien erfüllt. Levels stehen direkt hier.`,
          target: `${cryptoTop.c.symbol}`,
          confidence: cryptoTop.safety.score,
          href: `/assets/${cryptoTop.c.symbol.toLowerCase()}`,
          levels: {
            entry: cryptoTop.c.entry,
            stopLoss: cryptoTop.c.stopLoss,
            takeProfit1: cryptoTop.c.takeProfit1,
            takeProfit2: cryptoTop.c.takeProfit2,
            stopDistancePct: cryptoTop.c.stopDistancePct
          }
        }
      : cryptoTop && cryptoTop.safety.grade === 'B'
      ? {
          klass: 'krypto',
          emoji: '₿',
          label: 'Krypto',
          verdict: 'halten',
          headline: `${cryptoTop.c.symbol} beobachten`,
          detail: `Grade B · ${cryptoTop.safety.passedHard}/${cryptoTop.safety.totalHard} Kriterien. Noch nicht sicher genug zum Einstieg.`,
          target: cryptoTop.c.symbol,
          confidence: cryptoTop.safety.score,
          href: `/assets/${cryptoTop.c.symbol.toLowerCase()}`
        }
      : {
          klass: 'krypto',
          emoji: '₿',
          label: 'Krypto',
          verdict: 'warten',
          headline: 'Heute nicht kaufen',
          detail: 'Kein Coin schafft die strengen Kriterien. Cash bleibt eine valide Position.',
          href: '/screener'
        },
    (() => {
      // Aktien-Karte aus dem Safety-Scan: nur wenn ALLE 8 Kriterien passen,
      // wird KAUFEN gezeigt. Sonst Grade-B als „beobachten" oder generischer
      // Hinweis. So spiegelt die Karte exakt das, was auf /aktien oben steht.
      const sortedA = stockSafetyScan
        .filter((e) => e.assessment.grade === 'A')
        .sort((a, b) => b.assessment.score - a.assessment.score);
      const topA = sortedA[0];
      if (topA) {
        return {
          klass: 'aktien',
          emoji: '📈',
          label: 'Aktien',
          verdict: 'kaufen',
          headline: `${topA.name} kaufen`,
          detail: `Grade A · alle ${topA.assessment.totalHard} Sicherheits-Kriterien erfüllt (MA-Stack, RSI, 52W-Position, Volumen, Momentum).`,
          target: topA.symbol,
          confidence: topA.assessment.score,
          href: `/aktien/${encodeURIComponent(topA.symbol)}`
        };
      }
      const topB = stockSafetyScan
        .filter((e) => e.assessment.grade === 'B')
        .sort((a, b) => b.assessment.score - a.assessment.score)[0];
      if (topB) {
        return {
          klass: 'aktien',
          emoji: '📈',
          label: 'Aktien',
          verdict: 'halten',
          headline: `${topB.name} beobachten`,
          detail: `Grade B · ${topB.assessment.passedHard}/${topB.assessment.totalHard} Kriterien. Noch nicht sicher genug zum Einstieg — eines fehlt.`,
          target: topB.symbol,
          confidence: topB.assessment.score,
          href: `/aktien/${encodeURIComponent(topB.symbol)}`
        };
      }
      return {
        klass: 'aktien',
        emoji: '📈',
        label: 'Aktien',
        verdict: 'warten',
        headline: 'Heute nicht kaufen',
        detail: 'Keine Aktie im Universum schafft heute die strengen Kriterien. Lieber abwarten.',
        href: '/aktien'
      };
    })(),
    (() => {
      // Rohstoff-Karte analog Aktien: Top-Grade-A aus dem Commodity-Scan.
      // Wenn nichts Grade A schafft → Gold-Default („defensiv halten") bleibt.
      const sortedA = commoditySafetyScan
        .filter((e) => e.assessment.grade === 'A')
        .sort((a, b) => b.assessment.score - a.assessment.score);
      const topA = sortedA[0];
      if (topA) {
        return {
          klass: 'gold',
          emoji: topA.emoji ?? '🛢️',
          label: 'Rohstoffe',
          verdict: 'kaufen',
          headline: `${topA.name} kaufen`,
          detail: `Grade A · alle ${topA.assessment.totalHard} Sicherheits-Kriterien erfüllt. ${topA.group}-Bereich.`,
          target: topA.symbol,
          confidence: topA.assessment.score,
          href: `/rohstoffe/${encodeURIComponent(topA.symbol)}`
        };
      }
      return {
        klass: 'gold',
        emoji: '🥇',
        label: 'Gold',
        verdict: 'halten',
        headline: 'Defensiv beibehalten',
        detail: 'Gold bleibt der Stabilitäts-Anker. Aktuell kein Rohstoff im Grade-A — Risiko-Streuung statt schneller Trade.',
        target: 'PAXG / XAUT',
        href: '/gold'
      };
    })(),
    // Sport-Karte: hoechste Prioritaet hat der WM-Sieger-Profi-Pick
    // (haerteste Filter-Schicht). Fallback in dieser Reihenfolge:
    // 1. wmWinnerLeadHome (Profi-Tipper-Agent + ELO + xG-Konfluenz)
    // 2. safeSportLead (Multi-Markt-Tipp ≥70 %)
    // 3. sportLead (klassischer Engine-Pick)
    wmWinnerLeadHome
      ? {
          klass: 'sport',
          emoji: '🏆',
          label: 'WM Sieger-Pick',
          verdict: 'tippen',
          headline: `${wmWinnerLeadHome.fixture.homeTeam} – ${wmWinnerLeadHome.fixture.awayTeam}`,
          detail: `→ ${wmWinnerLeadHome.winnerTeam} gewinnt · ${wmWinnerLeadHome.fixture.phase}${wmWinnerLeadHome.fixture.group ? ` ${wmWinnerLeadHome.fixture.group}` : ''}. ELO Δ ${wmWinnerLeadHome.eloDiff >= 0 ? '+' : ''}${wmWinnerLeadHome.eloDiff}, Profi-Conviction ${Math.round(wmWinnerLeadHome.proTipper.conviction * 100)} %.`,
          target: `${wmWinnerLeadHome.winnerTeam} gewinnt`,
          confidence: wmWinnerLeadHome.modelProbabilityPct,
          href: '/sport',
          extraTips: sportExtraTips
        }
      : safeSportLead
      ? {
          klass: 'sport',
          emoji: '⚽',
          label: 'Sport',
          verdict: 'tippen',
          headline: `${safeSportLead.tip.fixture.homeTeam} – ${safeSportLead.tip.fixture.awayTeam}`,
          detail: `→ ${safeSportLead.tip.market.market} · ${safeSportLead.kind === 'wm' ? 'WM' : (safeSportLead.tip as typeof safeFootballTips[number]).leagueName}. ${safeSportLead.tip.market.rationale}`,
          target: safeSportLead.tip.market.market,
          confidence: Math.round(safeSportLead.tip.market.probability * 100),
          href: safeSportLead.kind === 'wm' ? '/wm' : '/sport',
          extraTips: sportExtraTips
        }
      : sportLead
      ? {
          klass: 'sport',
          emoji: '⚽',
          label: 'Sport',
          verdict: 'tippen',
          headline: `${sportLead.fixture.homeTeam} – ${sportLead.fixture.awayTeam}`,
          detail: `Vorhersage: ${sportLead.likelyScore.home}:${sportLead.likelyScore.away} (${sportLead.pickPlain}). Liga: ${sportLead.leagueName}.`,
          target: `${sportLead.likelyScore.home}:${sportLead.likelyScore.away}`,
          confidence: Math.round(sportLead.confidence * 100),
          href: '/sport',
          extraTips: sportExtraTips
        }
      : {
          klass: 'sport',
          emoji: '⚽',
          label: 'Sport',
          verdict: 'warten',
          headline: 'Kein klarer Tipp',
          detail: 'In den eingebundenen Ligen läuft gerade zu wenig — schau morgen wieder rein.',
          href: '/sport'
        }
  ];
  const crossExchange = checkCrossExchangePrices(exchangeSources.binance, exchangeSources.bybit);
  const events = buildEventFeed(report);
  const halving = computeHalvingCyclePosition();
  const spaeherReport = runSpaeher(newsItems);
  const upcomingMacroAll = listMacroEventsThisWeek();
  const eventWindow = computeEventWindow(upcomingMacroAll);
  const personas = evaluatePersonas(masterSignal, backtestSummary, spaeherReport, eventWindow);
  // Lifted from JSX IIFE so other components (Recorder etc.) can reuse them.
  const stockVerdicts = evaluateStockPersonas(stockSafetyScan);
  const commodityVerdicts = evaluateCommodityPersonas(commoditySafetyScan);
  const tier90 = evaluateTradeTier90(personas);
  const tier90Showcase = personas.find((p) => p.verdict === 'BUY' && p.safety?.grade === 'A') ?? personas.find((p) => p.target) ?? null;
  const vorstandReport = vorstandMediation(personas);
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

  // Unified Opportunity-Scores for crypto candidates.
  const scoredCrypto = masterSignal.candidates.slice(0, 10).map((c) => {
    const userBroker = c.brokers.includes('Coinbase') || c.brokers.includes('Scalable Capital');
    return {
      candidate: c,
      score: scoreCryptoCandidate({
        passedCount: c.passedCount,
        totalCount: c.totalCount,
        structure: c.structure,
        nearSupport: c.nearSupport,
        rrTp1: c.rrTp1,
        quoteVolume: c.quoteVolume,
        priceChangePct24h: c.priceChangePct24h,
        marketMood: masterSignal.marketMood,
        userBrokerAvailable: userBroker,
        isOnWatchlist: false
      })
    };
  });
  const cryptoBest = scoredCrypto.length > 0
    ? scoredCrypto.reduce((a, b) => a.score.score > b.score.score ? a : b)
    : null;
  const cryptoTradeableCount = scoredCrypto.filter((s) => s.score.score >= 70).length;
  const cryptoStrongCount = scoredCrypto.filter((s) => s.score.score >= 80).length;

  const commandCenter = buildCommandCenter({
    marketMood: masterSignal.marketMood,
    cryptoBestScore: cryptoBest?.score.score ?? 0,
    stocksAvailable: true,         // Yahoo + Stooq Provider wired
    stocksBestScore: null,
    goldTrendOk: true,             // PAXG is part of the universe; treat as defensively-stable
    openPositionsCount: 0,         // client-side data, not server-known
    positionsNeedingAttention: 0,
    hasHighImpactEventWithin24h: !!eventWindow?.imminent
  });

  const radarCards: AssetClassCard[] = [
    {
      klass: 'crypto',
      label: 'Krypto',
      status: cryptoStrongCount > 0 ? 'stark' : cryptoTradeableCount > 0 ? 'neutral' : 'schwach',
      topCandidate: cryptoBest?.candidate.symbol ?? null,
      goodSetupsCount: cryptoTradeableCount,
      riskLevel: masterSignal.marketMood === 'risk-off' ? 'hoch' : 'mittel',
      action: cryptoStrongCount > 0
        ? 'Selektiv aktiv. Nur Setups mit Score ≥ 70 und klarem Stop.'
        : cryptoTradeableCount > 0
        ? 'Watchlist-Modus — auf bestätigten Einstieg warten.'
        : 'Heute kein sauberes Setup — Cash bleibt eine valide Position.',
      href: '/screener'
    },
    {
      klass: 'stocks',
      label: 'Aktien',
      status: 'neutral',
      topCandidate: null,
      goodSetupsCount: 0,
      riskLevel: 'mittel',
      action: 'Live-Quotes + 6-Punkt-Konfluenz-Setup-Scoring → Übersicht öffnen.',
      href: '/aktien',
      note: 'Top-Indizes + 29 Mega-Caps und DAX-Top via Yahoo + Stooq. Top-Setups, Tagesgewinner/-verlierer und Sektor-Übersicht direkt auf /aktien.'
    },
    {
      klass: 'gold',
      label: 'Gold',
      status: 'neutral',
      topCandidate: 'PAXG',
      goodSetupsCount: 0,
      riskLevel: 'niedrig',
      action: 'Defensiv stabil — eher Kapital-Erhalt als schnelle Gewinne.',
      href: '/gold'
    },
    {
      klass: 'cash',
      label: 'Cash',
      status: commandCenter.bestAssetClass === 'cash' ? 'stark' : 'neutral',
      topCandidate: null,
      goodSetupsCount: 0,
      riskLevel: 'niedrig',
      action: commandCenter.bestAssetClass === 'cash'
        ? 'Aktuell die beste Position — kein Setup über 70.'
        : 'Reserve für besseres Setup, jederzeit einsetzbar.',
      href: null
    }
  ];

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

  // Identische Logik wie moodForPlan — eine Berechnung reicht.
  const marketMood = moodForPlan;

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:space-y-6 md:p-6">
      <OnboardingGuide />
      <AutoRefresh intervalMs={20000} />
      <header className="space-y-3">
        <nav className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link href="/chancen" className="shrink-0 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300 transition hover:border-emerald-400/50">Chancen</Link>
          <Link href="/compare" className="shrink-0 rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-sky-300 transition hover:border-sky-400/50">Vergleich</Link>
          <Link href="/insights" className="shrink-0 rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-sky-300 transition hover:border-sky-400/50">Insights</Link>
          <Link href="/tools" className="shrink-0 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">Tools</Link>
          <Link href="/firmen" className="shrink-0 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300 transition hover:border-emerald-400/50">Firmen-Vergleich</Link>
          <Link href="/agent" className="shrink-0 rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-sky-300 transition hover:border-sky-400/50">Diskussion</Link>
          <Link href="/intel" className="shrink-0 rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-sky-300 transition hover:border-sky-400/50">Recherche</Link>
          <Link href="/news" className="shrink-0 rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-sky-300 transition hover:border-sky-400/50">News</Link>
          <Link href="/akademie" className="shrink-0 rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-sky-300 transition hover:border-sky-400/50">Akademie</Link>
          <Link href="/positions" className="shrink-0 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">Positionen</Link>
          <Link href="/gold" className="shrink-0 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-200 transition hover:border-amber-400/50">Gold</Link>
          <Link href="/sport" className="shrink-0 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">⚽ Sport</Link>
          <Link href="/basketball" className="shrink-0 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">🏀 Basketball</Link>
          <Link href="/tennis" className="shrink-0 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">🎾 Tennis</Link>
          <Link href="/eishockey" className="shrink-0 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">🏒 Eishockey</Link>
          <Link href="/handball" className="shrink-0 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">🤾 Handball</Link>
          <Link href="/wm" className="shrink-0 rounded-md border border-yellow-400/40 bg-yellow-500/10 px-2.5 py-1 text-yellow-300 transition hover:border-yellow-300">🏆 WM</Link>
          <Link href="/hilfe" className="shrink-0 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">Hilfe</Link>
          <Link href="/settings" className="shrink-0 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 transition hover:border-slate-700">Mehr</Link>
        </nav>
      </header>

      {/* WM-Countdown ganz oben — solange <30 Tage bis Start oder waehrend
          der laufenden WM. Versteckt sich automatisch danach. */}
      <WmCountdownBanner todayIso={todayIso} />

      {/* Daten-Integritaets-Agent — Live-Pille. Sichtbar nur wenn aktiv
          etwas blockiert oder warnt. Refresh alle 30 s. Reconciler-
          Mismatches (Quellen-Konflikte) zaehlen als Blocks mit. */}
      <WmIntegrityPill initial={evaluateIntegrityAction()} reconcilerMismatches={wmReconcileHome.mismatched} />

      {/* "Was passiert jetzt?" + Tagesplan (mit Klartext-Hinweis). */}
      {(() => {
        const plan = buildWmDayPlan({
          todayIso,
          picks: wmWinnerPicksHome,
          weatherByFixtureId: wmWeatherByFixtureIdHome,
          verifiedFixtureIds: verifiedFixtureIds(wmReconcileHome),
          mismatchedFixtureIds: mismatchedFixtureIds(wmReconcileHome)
        });
        return (
          <>
            <WmErsteSchritte />
            <WmJetztCard todayIso={todayIso} plan={plan} />
            <PlainHint id="day-plan" />
            <WmDayPlanCard plan={plan} />
            <WmWeekPlanCard plan={buildWmWeekPlan({ todayIso, horizonDays: 7, picks: wmWinnerPicksHome })} />
          </>
        );
      })()}

      {/* WM Sieger-Picks: nur sichtbar wenn fuer die naechsten 7 Tage
          mindestens ein Profi-Pick durch alle Filter kommt. WmWinner-
          PicksWithLearning rechnet die Picks mit den gelernten Faktor-
          Gewichten neu, sobald >=5 Picks resolved sind. */}
      {wmWinnerPicksHome.length > 0 && (
        <>
          <WmWinnerPicksWithLearning serverPicks={wmWinnerPicksHome} todayIso={todayIso} horizonDays={wmWinnerHorizonDays} />
          <WmPickExplainCard picks={wmWinnerPicksHome} />
          <PlainHint id="winner-picks" />
          <WmBankrollCard picks={wmWinnerPicksHome} />
          <PlainHint id="ledger" />
          <WmBankrollLedgerCard />
          <PlainHint id="combo" />
          <WmComboPicksCard picks={wmWinnerPicksHome} />
          <WmGlossarCard />
        </>
      )}

      {/* Headless Resolver: matcht WM-Final-Scores (extern + manuell) gegen
          pending Picks — auch fuer User die nur die Home oeffnen. */}
      <WmPickResolver
        externalFinished={sportLeagues
          .filter((lf) => WORLD_CUP_LEAGUE_IDS.includes(lf.league.id))
          .flatMap((lf) => lf.last
            .filter((f) => f.homeScore !== null && f.awayScore !== null)
            .map((f) => ({ homeTeam: f.homeTeam, awayTeam: f.awayTeam, homeScore: f.homeScore as number, awayScore: f.awayScore as number, date: f.date })))}
      />

      {/* Live-Lern-Stand: zeigt sich erst sobald 5+ Picks im Log sind. */}
      <WmLearningStatusCard />
      <WmCalibrationCard />

      <TradingTodayCard
        tier90={tier90}
        consensusPersona={tier90Showcase}
        conservative={personas.find((p) => p.persona === 'conservative') ?? null}
        balanced={personas.find((p) => p.persona === 'balanced') ?? null}
        aggressive={personas.find((p) => p.persona === 'aggressive') ?? null}
      />

      {(() => {
        // News-Verarbeitung im Hintergrund: Spaeher-Sentiment + Chase-Detektor
        // fliessen direkt ins Precision-Gate. Baerische News-Lage = Warnung
        // (verhindert FREIGABE), "News schon eingepreist" = hartes Veto.
        const sentimentBySymbol = new Map(spaeherReport.perCoin.map((s) => [s.coin.toUpperCase(), s]));
        const chaseSet = new Set(chaseSignals.filter((c) => c.kind === 'hot_news_already_run').map((c) => c.coin.toUpperCase()));
        const cryptoPrecisionPicks = cryptoScored.map((x) => {
          const edge = backtestSummary.perAssetEdge[x.c.coinId] ?? null;
          const sentiment = sentimentBySymbol.get(x.c.symbol.toUpperCase()) ?? null;
          return evaluateCryptoPrecisionPick({
            coinId: x.c.coinId,
            symbol: x.c.symbol,
            passedCount: x.c.passedCount,
            totalCount: x.c.totalCount,
            marketMood: masterSignal.marketMood,
            btcRegime: masterSignal.btcRegime,
            structure: x.c.structure,
            nearSupport: x.c.nearSupport,
            quoteVolume: x.c.quoteVolume,
            stopDistancePct: x.c.stopDistancePct,
            priceChangePct24h: x.c.priceChangePct24h,
            crowdCautious: masterSignal.crowd.cautious,
            confirmed: x.c.confirmed,
            backtestWinRatePct: edge?.winRatePct ?? null,
            backtestSampleSize: backtestSummary.trades ?? 0,
            safety: x.safety,
            newsTilt: sentiment?.tilt ?? null,
            newsNetScore: sentiment?.netScore ?? null,
            chaseWarning: chaseSet.has(x.c.symbol.toUpperCase())
          });
        });
        return (
          <>
            <CryptoPrecisionDesk picks={cryptoPrecisionPicks} cryptoStrongCount={cryptoStrongCount} />
            <CryptoPrecisionOverrideBanner
              picks={cryptoPrecisionPicks.map((p) => ({ coinId: p.coinId, symbol: p.symbol, verdict: p.verdict }))}
              latestPrices={latestPrices}
            />
          </>
        );
      })()}
      <CryptoPrecisionCalibrationHydrator latestPrices={latestPrices} />

      {(() => {
        const cryptoVerdicts = personas;
        const stockConservative = stockVerdicts.find((v) => v.persona === 'conservative');
        const commodityConservative = commodityVerdicts.find((v) => v.persona === 'conservative');
        const cryptoConservative = personas.find((p) => p.persona === 'conservative');
        const rows: CrossAssetConservativeRow[] = [
          {
            klass: 'krypto',
            label: 'Krypto',
            emoji: '₿',
            verdict: cryptoConservative?.verdict ?? 'WAIT',
            target: cryptoConservative?.target ? { symbol: cryptoConservative.target.symbol, name: cryptoConservative.target.symbol } : null,
            href: '/'
          },
          {
            klass: 'aktien',
            label: 'Aktien',
            emoji: '📈',
            verdict: stockConservative?.verdict ?? 'WARTEN',
            target: stockConservative?.target ? { symbol: stockConservative.target.symbol, name: stockConservative.target.name } : null,
            href: '/aktien'
          },
          {
            klass: 'rohstoffe',
            label: 'Rohstoffe',
            emoji: '🛢️',
            verdict: commodityConservative?.verdict ?? 'WARTEN',
            target: commodityConservative?.target ? { symbol: commodityConservative.target.symbol, name: commodityConservative.target.name } : null,
            href: '/rohstoffe'
          }
        ];
        return (
          <>
            <PersonaConsensusBanner verdicts={cryptoVerdicts.map((v) => ({ persona: v.persona, name: v.name, verdict: v.verdict }))} context="Krypto" />
            <CrossAssetConservativeCard rows={rows} />
          </>
        );
      })()}

      <HeuteMachen cards={heuteCards} />

      <AssetQuickSearch
        items={[
          ...STOCK_UNIVERSE.map((s) => ({ symbol: s.symbol, name: s.name, group: s.group, kind: 'aktie' as const })),
          ...COMMODITY_UNIVERSE.map((c) => ({ symbol: c.symbol, name: c.name, group: c.group, kind: 'rohstoff' as const }))
        ]}
      />

      <CrossAssetSafetyStats
        stocksGradeA={stockSafetyScan.filter((e) => e.assessment.grade === 'A').length}
        stocksTotal={stockSafetyScan.length}
        commoditiesGradeA={commoditySafetyScan.filter((e) => e.assessment.grade === 'A').length}
        commoditiesTotal={commoditySafetyScan.length}
        wmMaximalCount={safeWmTips.filter((t) => t.tier === 'maximal').length}
        footballMaximalCount={safeFootballTips.filter((t) => t.tier === 'maximal').length}
        cryptoGrade={cryptoTop ? cryptoTop.safety.grade : null}
        cryptoSymbol={cryptoTop ? cryptoTop.c.symbol : null}
      />

      <Link
        href="/daily"
        className="block rounded-2xl border border-emerald-400/60 bg-emerald-950/25 p-3 text-center text-[12px] font-semibold text-emerald-100 transition hover:bg-emerald-950/40"
      >
        🌅 Tagesentscheidung: Modus, Top-Chancen, Warnzone, Vorstand → /daily
      </Link>

      <Link
        href="/heute-sicher"
        className="block rounded-2xl border border-emerald-400/40 bg-emerald-950/15 p-3 text-center text-[12px] font-semibold text-emerald-200 transition hover:bg-emerald-950/30"
      >
        🛡️ Alle maximal-sicheren Setups heute → /heute-sicher
      </Link>

      <Link
        href="/agenten"
        className="block rounded-2xl border border-sky-400/40 bg-sky-950/15 p-3 text-center text-[12px] font-semibold text-sky-200 transition hover:bg-sky-950/30"
      >
        👥 Alle 15 Vorstands-Persönlichkeiten auf einen Blick → /agenten
      </Link>

      {tier90.qualified && (
        <TradeTier90Card result={tier90} showcaseVerdict={tier90Showcase} />
      )}

      <Tier90HomeSummary />

      <Tier90Resolver
        latestPrices={(() => {
          const upper: Record<string, number> = {};
          for (const t of report.tickers) {
            const symbol = t.symbol.replace('USDT', '').toUpperCase();
            if (Number.isFinite(t.price)) upper[symbol] = t.price;
          }
          return upper;
        })()}
      />

      <ScorePredictionsStrip synth={sportSynth} />

      <TriggeredAlertsStrip latestPrices={latestPrices} />

      {/* 2. Beste Chance heute — Detail-Tiefe nur wenn Konfidenz hoch genug.
          Der "Keine saubere Chance"-Fallback ist raus: das sagt der
          Precision Desk oben bereits klarer (Verdict + Blocker). */}
      {cryptoBest && cryptoBest.score.score >= 60 && (
        <HeuteEntscheidung personas={personas} perCoinSentiment={spaeherReport.perCoin} setupSimilarity={setupSimilarity} eventWindow={eventWindow} intelSignal={intelCeo.netSignal} />
      )}

      <SportTodayBanner leagues={sportLeagues} />

      <MarketQuickStats
        fearGreed={fearGreed?.value ?? null}
        btcDominancePct={btcDominance?.btcDominancePct ?? null}
        fundingBtcAnnualizedPct={fundingBtc?.fundingRateAnnualizedPct ?? null}
        fundingEthAnnualizedPct={fundingEth?.fundingRateAnnualizedPct ?? null}
      />

      <OverrideConflictBanner
        recommendedCoins={(() => {
          const set = new Set<string>();
          // Vorstand-Konsens
          if (vorstandReport.consensusCoin) set.add(vorstandReport.consensusCoin.toLowerCase());
          // Heute-machen KryptoCard
          if (cryptoTop?.c.symbol) set.add(cryptoTop.c.symbol.toLowerCase());
          // Jede kaufende Firma
          for (const p of personas) {
            if (p.verdict === 'BUY' && p.target?.symbol) set.add(p.target.symbol.toLowerCase());
          }
          return [...set];
        })()}
      />
      <CoinOverridesStrip />
      <UserOverrideAccuracyCard latestPrices={latestPrices} />
      <FirmaPnlCard latestPrices={latestPrices} />
      {/* Headless: jeder Home-Aufruf fuettert die Lern-Schleifen in
          localStorage. Konsolidiert in eine Komponente — Recorder rendern
          nichts sichtbares, vorher lagen sie einzeln auf Top-Level. */}
      {(() => {
        const historyEntries: HistoryEntry[] = [
          ...personas.map((v) => ({ dateIso: todayIso, klass: 'Krypto', personaId: v.persona, verdict: v.verdict, targetLabel: v.target?.symbol ?? null })),
          ...stockVerdicts.map((v) => ({ dateIso: todayIso, klass: 'Aktien', personaId: v.persona, verdict: v.verdict, targetLabel: v.target?.name ?? null })),
          ...commodityVerdicts.map((v) => ({ dateIso: todayIso, klass: 'Rohstoffe', personaId: v.persona, verdict: v.verdict, targetLabel: v.target?.name ?? null }))
        ];
        return (
          <HomeLearningRecorders
            personas={personas}
            masterSignal={masterSignal}
            backtest={backtestSummary}
            vorstandReport={vorstandReport}
            intelReports={intelReports}
            intelCeo={intelCeo}
            lehrlingReport={lehrlingReport}
            spaeherReport={spaeherReport}
            historyEntries={historyEntries}
            btcPrice={latestPrices['btc'] ?? null}
            todayIso={todayIso}
            coinScoreCandidates={masterSignal.candidates.map((c) => ({ coinId: c.coinId, symbol: c.symbol, passedCount: c.passedCount }))}
          />
        );
      })()}

      {/* 3. Kapital-Schutz */}
      <KapitalSchutz latestPrices={latestPrices} />

      <PnlSummary latestPrices={latestPrices} />

      {/* 4. Multi-Asset-Radar */}
      <AssetClassRadar cards={radarCards} />

      {/* 5. Watchlist + Diff vs Gestern */}
      <DiffVsYesterday />
      <WatchlistStrip candidates={cryptoScored.map((x) => ({
        coinId: x.c.coinId,
        symbol: x.c.symbol,
        passedCount: x.c.passedCount,
        priceChangePct24h: x.c.priceChangePct24h,
        structure: x.c.structure,
        nearSupport: x.c.nearSupport,
        safetyGrade: x.safety.grade
      }))} />
      <AktienWatchlistStrip
        grades={stockSafetyScan.map((e) => ({ symbol: e.symbol, grade: e.assessment.grade, score: e.assessment.score }))}
      />
      <RohstoffWatchlistStrip
        grades={commoditySafetyScan.map((e) => ({ symbol: e.symbol, grade: e.assessment.grade, score: e.assessment.score }))}
      />
      <CoinScoreTrend />

      <CrossExchangeWarning report={crossExchange} />

      {/* 6. Chefredakteur-Lagebericht + Pump/Panik + Makro */}
      <IntelStrip ceo={intelCeo} />
      <ChaseWarning chase={chaseSignals} opportunity={opportunitySignals} />
      <WocheVoraus events={upcomingMacro} today={todayIso} />

      <SportBriefingCard synth={sportSynth} todayFixtures={sportTodayCount} employeeStats={sportEmployeeStats} />

      <MultiSportBriefing
        fussballHeute={sportTodayCount}
        basketballHeute={basketballTodayCount}
        tennisHeute={tennisTodayCount}
        eishockeyHeute={hockeyTodayCount}
      />

      <WmBriefingCard />
      <HomeWmProCard todayIso={todayIso} />
      <HomeSportStatus />

      <AppOverviewStats
        todayFixtureCount={sportTodayCount}
        weekFixtureCount={sportSynth.totalFixturesNext7d}
        totalFirmenMitarbeiter={sportSynth.totalEmployees}
      />

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
        {/* Safety-Detail-Karten: redundant zum Precision Desk oben, daher
            nur noch im Advanced-Modus. Die Kriterien-Aufschluesselung bleibt
            fuer Power-User erhalten. */}
        <SafetyCheck report={masterSignal} backtest={backtestSummary} />
        <LastSafeBuyCard />
        <SafetyHistoryStrip />
        <ProofCard summary={backtestSummary} />

        <AccountConfigBar />

        <TodoBox report={masterSignal} />

        <FirmaStrip personas={personas} latestPrices={latestPrices} />

        <SetupTrend />

        <AkademieStrip spaeher={spaeherReport} lehrling={lehrlingReport} />
        <AkademieLearningOverlay />

        <DailyBriefing report={masterSignal} backtest={backtestSummary} />

        <MarketBriefing report={masterSignal} />

        <NewsFeed items={newsItems} />
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

      <MorningBriefingExport
        date={todayIso}
        firmasBuyingCount={personas.filter((p) => p.verdict === 'BUY').length}
        firmaBuyTargets={personas.filter((p) => p.verdict === 'BUY' && p.target).map((p) => ({ name: p.name, coin: p.target!.symbol }))}
        ceoLagebericht={intelCeo.lagebericht}
        ceoSignal={intelCeo.netSignal}
        topNews={spaeherReport.items.slice(0, 5).map((n) => ({ title: n.title, impact: n.impact, source: n.source }))}
        macroNext={eventWindow?.nextHighImpact && eventWindow.hoursUntilNextHighImpact !== null
          ? { title: eventWindow.nextHighImpact.title, hoursUntil: eventWindow.hoursUntilNextHighImpact }
          : null}
      />

      <EhrlicheGrenzen />

      <AllToolsIndex />

      <footer className="border-t border-slate-900 pt-4 text-[10px] leading-relaxed text-slate-600">
        Keine Finanzberatung. Stop-Loss respektieren. Vergangenheit ≠ Zukunft.
        <span className="ml-2 text-slate-800">· Build {(process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev').slice(0, 7)}</span>
      </footer>
    </main>
  );
}

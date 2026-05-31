import { IntelContext } from '@/lib/intel/types';
import { MasterSignalReport } from '@/lib/analysis/master-signal-engine';
import { BacktestSummary } from '@/lib/analysis/backtest-summary';
import { SpaeherReport } from '@/lib/akademie/spaeher';
import { EventWindowState } from '@/lib/calendar/event-window';
import { FirmaDecision } from '@/lib/firma-memory';

interface BuildContextInput {
  masterSignal: MasterSignalReport;
  backtest: BacktestSummary;
  spaeher: SpaeherReport | null;
  fearGreed: number | null;
  fundingBtcAnnualizedPct: number | null;
  fundingEthAnnualizedPct: number | null;
  btcDominancePct: number | null;
  eventWindow: EventWindowState | null;
  cycleLabel: string | null;
  cycleProgressPct: number | null;
  firmaLog: FirmaDecision[];
}

export function buildIntelContext(input: BuildContextInput): IntelContext {
  const m = input.masterSignal;
  const topCandidates = m.candidates.slice(0, 10).map((c) => ({
    symbol: c.symbol,
    coinId: c.coinId,
    passedCount: c.passedCount,
    priceChangePct24h: c.priceChangePct24h,
    quoteVolume: c.quoteVolume,
    relStrengthVsBtc: c.relStrengthVsBtc,
    structure: c.structure
  }));

  const newsBullish = input.spaeher?.items.filter((i) => i.impact === 'bullish').length ?? 0;
  const newsBearish = input.spaeher?.items.filter((i) => i.impact === 'bearish').length ?? 0;
  const topCoinSentiment = (input.spaeher?.perCoin ?? []).slice(0, 5).map((c) => ({
    coin: c.coin,
    tilt: c.tilt,
    bullishCount: c.bullishCount,
    bearishCount: c.bearishCount
  }));

  const recentBuyDays = input.firmaLog.filter((d) => d.verdict === 'BUY').length;
  const recentWaitDays = input.firmaLog.filter((d) => d.verdict === 'WAIT').length;

  return {
    fearGreed: input.fearGreed,
    fundingBtcPct: input.fundingBtcAnnualizedPct,
    fundingEthPct: input.fundingEthAnnualizedPct,
    btcDominancePct: input.btcDominancePct,
    marketMood: m.marketMood,
    btcRegime: m.btcRegime,
    topCandidates,
    newsTotal: input.spaeher?.items.length ?? 0,
    newsBullish,
    newsBearish,
    newsTopHeadline: input.spaeher?.topPick?.title ?? null,
    topCoinSentiment,
    backtestPeriodDays: input.backtest.periodDays,
    backtestSafeTrades: input.backtest.safeTier?.trades ?? 0,
    backtestSafeWinRatePct: input.backtest.safeTier?.winRatePct ?? null,
    backtestSafeNetReturnPct: input.backtest.safeTier?.netReturnPct ?? 0,
    nextHighImpactEvent: input.eventWindow?.nextHighImpact && input.eventWindow.hoursUntilNextHighImpact !== null
      ? { title: input.eventWindow.nextHighImpact.title, hoursUntil: input.eventWindow.hoursUntilNextHighImpact }
      : null,
    cycleLabel: input.cycleLabel,
    cycleProgressPct: input.cycleProgressPct,
    recentBuyDays,
    recentWaitDays
  };
}

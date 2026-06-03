import { MasterSignalReport, RankedCandidate } from '@/lib/analysis/master-signal-engine';
import { BacktestSummary } from '@/lib/analysis/backtest-summary';
import { SafetyAssessment, evaluateSafety } from '@/lib/analysis/safety-gate';

// Single source of truth for scoring a candidate against the safety gate. Used
// by SafetyCheck on the home page (which picks the best) and by AssetSafetyCard
// on the coin-detail page (which scores one specific coin).
export function scoreCandidateSafety(c: RankedCandidate, report: MasterSignalReport, backtest: BacktestSummary): SafetyAssessment {
  const userBrokerAvailable = c.brokers.includes('Coinbase') || c.brokers.includes('Scalable Capital');
  return evaluateSafety({
    passedCount: c.passedCount,
    marketMood: report.marketMood,
    btcRegime: report.btcRegime,
    isBtc: c.coinId === 'btc',
    structure: c.structure,
    nearSupport: c.nearSupport,
    crowdCautious: report.crowd.cautious,
    quoteVolume: c.quoteVolume,
    stopDistancePct: c.stopDistancePct,
    confirmed: c.confirmed,
    userBrokerAvailable,
    priceChangePct24h: c.priceChangePct24h,
    mode: report.mode,
    relStrengthVsBtc: c.relStrengthVsBtc,
    backtestEdge: backtest.perAssetEdge[c.coinId] ?? null
  });
}

import { AnalysisSignal, Recommendation, RecommendationAction } from '@/lib/types/domain';

const cryptoWeights = { trend: 0.25, volume: 0.15, momentum: 0.2, volatilityRisk: 0.15, macroContext: 0.1, sentiment: 0.15 };
const stockWeights = { trend: 0.2, fundamentals: 0.2, earningsGrowth: 0.15, macroContext: 0.15, sentiment: 0.15, volatilityRisk: 0.15 };

export function scoreCrypto(signal: AnalysisSignal): number {
  return Math.round(
    signal.trend * cryptoWeights.trend +
      signal.volume * cryptoWeights.volume +
      signal.momentum * cryptoWeights.momentum +
      signal.volatilityRisk * cryptoWeights.volatilityRisk +
      signal.macroContext * cryptoWeights.macroContext +
      signal.sentiment * cryptoWeights.sentiment
  );
}

export function scoreStock(signal: AnalysisSignal): number {
  return Math.round(
    signal.trend * stockWeights.trend +
      (signal.fundamentals ?? 50) * stockWeights.fundamentals +
      (signal.earningsGrowth ?? 50) * stockWeights.earningsGrowth +
      signal.macroContext * stockWeights.macroContext +
      signal.sentiment * stockWeights.sentiment +
      signal.volatilityRisk * stockWeights.volatilityRisk
  );
}

export function mapScoreToAction(score: number): RecommendationAction {
  if (score >= 80) return 'BUY';
  if (score >= 65) return 'WATCH';
  if (score >= 50) return 'HOLD';
  if (score >= 35) return 'AVOID';
  return 'SELL';
}

export function buildRecommendation(assetId: string, score: number, rationale: string): Recommendation {
  const action = mapScoreToAction(score);
  return {
    assetId,
    action,
    confidence: score,
    rationale,
    holdDuration: action === 'BUY' || action === 'WATCH' ? '2-8 Wochen' : '1-4 Wochen',
    riskLevel: score > 75 ? 'medium' : score > 50 ? 'medium' : 'high',
    stopLossIdea: '6-10% unter Einstieg oder letztem Swing-Low.',
    takeProfitZone: 'Teilgewinn bei +8-15%, Rest per Trailing Stop.',
    counterArguments: ['Makro-Schocks können Trend brechen.', 'News-Sentiment kann schnell drehen.']
  };
}

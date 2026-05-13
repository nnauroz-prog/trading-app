import { mockAssets } from '@/lib/data/mock';
import { buildRecommendation, scoreCrypto, scoreStock } from '@/lib/analysis/scoring';
import { AnalysisSignal } from '@/lib/types/domain';

export function runDailyAnalysis() {
  const recommendations = mockAssets.map((asset) => {
    const signal: AnalysisSignal = {
      trend: 70,
      volume: 64,
      momentum: asset.category === 'crypto' ? 72 : 60,
      volatilityRisk: asset.category === 'crypto' ? 58 : 66,
      macroContext: 61,
      sentiment: 63,
      fundamentals: asset.category === 'stock' ? 69 : undefined,
      earningsGrowth: asset.category === 'stock' ? 65 : undefined
    };

    const score = asset.category === 'crypto' ? scoreCrypto(signal) : scoreStock(signal);
    return buildRecommendation(asset.id, score, `${asset.ticker}: Trend+Momentum positiv, aber Risiko aktiv beachten.`);
  });

  return {
    date: new Date().toISOString().slice(0, 10),
    marketMood: 'Kurzfristig konstruktiv, selektiv überhitzt.',
    recommendations
  };
}

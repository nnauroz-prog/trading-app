import { mockAssets } from '@/lib/data/mock';
import { getSnapshots } from '@/lib/providers';
import { fetchSentimentScores } from '@/lib/providers/sentiment';
import { fetchStockMetrics, StockMetrics } from '@/lib/providers/finnhub';
import { fetchMacroContext } from '@/lib/providers/macro';
import { buildRecommendation, scoreCrypto, scoreStock } from '@/lib/analysis/scoring';
import { scoreEarningsGrowth, scoreFundamentals } from '@/lib/analysis/fundamentals';
import { AnalysisSignal, PriceSnapshot } from '@/lib/types/domain';

export interface DailyAnalysis {
  date: string;
  marketMood: string;
  snapshots: Record<string, PriceSnapshot>;
  recommendations: ReturnType<typeof buildRecommendation>[];
}

export async function runDailyAnalysis(): Promise<DailyAnalysis> {
  const [snapshots, sentimentScores, stockMetrics, macroScore] = await Promise.all([
    getSnapshots(),
    fetchSentimentScores(),
    fetchStockMetrics(),
    fetchMacroContext()
  ]);

  const macro = macroScore ?? 60;

  const recommendations = mockAssets.map((asset) => {
    const snapshot = snapshots[asset.id];
    const sentiment = sentimentScores?.[asset.id] ?? 60;
    const metrics = stockMetrics?.[asset.id];
    const signal = buildSignal(asset.category, snapshot, sentiment, metrics, macro);
    const score = asset.category === 'crypto' ? scoreCrypto(signal) : scoreStock(signal);
    const rationale = buildRationale(asset.ticker, snapshot, sentimentScores?.[asset.id], metrics);
    return buildRecommendation(asset.id, score, rationale);
  });

  return {
    date: new Date().toISOString().slice(0, 10),
    marketMood: 'Kurzfristig konstruktiv, selektiv überhitzt.',
    snapshots,
    recommendations
  };
}

function buildSignal(
  category: 'crypto' | 'stock' | 'etf',
  snapshot: PriceSnapshot | undefined,
  sentiment: number,
  metrics: StockMetrics | undefined,
  macroContext: number
): AnalysisSignal {
  const trend = snapshot ? scaleChange(snapshot.change30d, 30) : 60;
  const momentum = snapshot ? scaleChange(snapshot.change7d, 10) : 60;
  const dailyMove = snapshot ? Math.abs(snapshot.change24h) : 2;
  const volatilityRisk = clamp(40 + dailyMove * 6);

  const fundamentals = category === 'stock' ? (metrics ? scoreFundamentals(metrics) ?? 50 : 50) : undefined;
  const earningsGrowth = category === 'stock' ? (metrics ? scoreEarningsGrowth(metrics) ?? 50 : 50) : undefined;

  const volume = snapshot?.volumeRatio != null ? scoreVolumeRatio(snapshot.volumeRatio) : 60;

  return {
    trend,
    volume,
    momentum,
    volatilityRisk,
    macroContext,
    sentiment,
    fundamentals,
    earningsGrowth
  };
}

export function scoreVolumeRatio(ratio: number): number {
  if (ratio < 0.5) return 30;
  if (ratio < 0.8) return 45;
  if (ratio < 1.2) return 55;
  if (ratio < 1.8) return 65;
  if (ratio < 3) return 75;
  return 85;
}

function scaleChange(changePct: number, normalisingRange: number): number {
  const normalised = changePct / normalisingRange;
  return clamp(50 + normalised * 50);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function buildRationale(
  ticker: string,
  snapshot: PriceSnapshot | undefined,
  sentiment: number | undefined,
  metrics: StockMetrics | undefined
): string {
  if (!snapshot) return `${ticker}: Keine aktuellen Daten – Bewertung auf Default-Annahmen.`;
  const arrow30 = snapshot.change30d >= 0 ? '+' : '';
  const arrow7 = snapshot.change7d >= 0 ? '+' : '';
  const parts = [`${ticker}: 30d ${arrow30}${snapshot.change30d.toFixed(1)}%, 7d ${arrow7}${snapshot.change7d.toFixed(1)}%`];
  if (metrics?.pe !== undefined && metrics?.pe !== null) parts.push(`PE ${metrics.pe.toFixed(1)}`);
  if (metrics?.epsGrowthYoy !== undefined && metrics?.epsGrowthYoy !== null) parts.push(`EPS YoY ${metrics.epsGrowthYoy.toFixed(0)}%`);
  if (sentiment !== undefined) parts.push(`Sentiment ${sentiment}/100`);
  return parts.join(' · ') + '. Risiko aktiv beachten.';
}

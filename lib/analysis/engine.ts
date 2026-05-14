import { mockAssets } from '@/lib/data/mock';
import { getSnapshots } from '@/lib/providers';
import { fetchSentimentScores } from '@/lib/providers/sentiment';
import { buildRecommendation, scoreCrypto, scoreStock } from '@/lib/analysis/scoring';
import { AnalysisSignal, PriceSnapshot } from '@/lib/types/domain';

export interface DailyAnalysis {
  date: string;
  marketMood: string;
  snapshots: Record<string, PriceSnapshot>;
  recommendations: ReturnType<typeof buildRecommendation>[];
}

export async function runDailyAnalysis(): Promise<DailyAnalysis> {
  const [snapshots, sentimentScores] = await Promise.all([getSnapshots(), fetchSentimentScores()]);
  const recommendations = mockAssets.map((asset) => {
    const snapshot = snapshots[asset.id];
    const sentiment = sentimentScores?.[asset.id] ?? 60;
    const signal = buildSignal(asset.category, snapshot, sentiment);
    const score = asset.category === 'crypto' ? scoreCrypto(signal) : scoreStock(signal);
    const rationale = buildRationale(asset.ticker, snapshot, sentimentScores?.[asset.id]);
    return buildRecommendation(asset.id, score, rationale);
  });

  return {
    date: new Date().toISOString().slice(0, 10),
    marketMood: 'Kurzfristig konstruktiv, selektiv überhitzt.',
    snapshots,
    recommendations
  };
}

function buildSignal(category: 'crypto' | 'stock' | 'etf', snapshot: PriceSnapshot | undefined, sentiment: number): AnalysisSignal {
  const trend = snapshot ? scaleChange(snapshot.change30d, 30) : 60;
  const momentum = snapshot ? scaleChange(snapshot.change7d, 10) : 60;
  const dailyMove = snapshot ? Math.abs(snapshot.change24h) : 2;
  const volatilityRisk = clamp(40 + dailyMove * 6);

  return {
    trend,
    volume: 60,
    momentum,
    volatilityRisk,
    macroContext: 60,
    sentiment,
    fundamentals: category === 'stock' ? 65 : undefined,
    earningsGrowth: category === 'stock' ? 60 : undefined
  };
}

function scaleChange(changePct: number, normalisingRange: number): number {
  const normalised = changePct / normalisingRange;
  return clamp(50 + normalised * 50);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function buildRationale(ticker: string, snapshot: PriceSnapshot | undefined, sentiment: number | undefined): string {
  if (!snapshot) return `${ticker}: Keine aktuellen Daten – Bewertung auf Default-Annahmen.`;
  const arrow30 = snapshot.change30d >= 0 ? '+' : '';
  const arrow7 = snapshot.change7d >= 0 ? '+' : '';
  const sentimentPart = sentiment !== undefined ? ` Sentiment ${sentiment}/100.` : '';
  return `${ticker}: 30d ${arrow30}${snapshot.change30d.toFixed(1)}%, 7d ${arrow7}${snapshot.change7d.toFixed(1)}%.${sentimentPart} Risiko aktiv beachten.`;
}

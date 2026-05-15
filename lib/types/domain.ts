export type AssetCategory = 'crypto' | 'stock' | 'etf';
export type RecommendationAction = 'BUY' | 'HOLD' | 'SELL' | 'AVOID' | 'WATCH';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface Asset {
  id: string;
  name: string;
  ticker: string;
  category: AssetCategory;
  venueAvailability: string[];
}

export interface PriceSnapshot {
  assetId: string;
  price: number;
  change24h: number;
  change7d: number;
  change30d: number;
  volume: number;
  /** today's volume divided by recent average; null when no baseline is available. */
  volumeRatio?: number | null;
  source: 'mock' | 'coingecko' | 'finnhub' | 'yahoo';
}

export interface AnalysisSignal {
  trend: number;
  volume: number;
  momentum: number;
  /** 0-100, höher = riskanter. Wird im Score als Penalty (100 - volatilityRisk) verwendet. */
  volatilityRisk: number;
  macroContext: number;
  sentiment: number;
  fundamentals?: number;
  earningsGrowth?: number;
}

export interface Recommendation {
  assetId: string;
  action: RecommendationAction;
  confidence: number;
  rationale: string;
  holdDuration: string;
  riskLevel: RiskLevel;
  stopLossIdea: string;
  takeProfitZone: string;
  counterArguments: string[];
}

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TradeSignalType = 'LONG' | 'SHORT';

export interface TradeSignal {
  assetId: string;
  ticker: string;
  type: TradeSignalType;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskPct: number;
  rewardPct1: number;
  rewardPct2: number;
  riskRewardRatio: number;
  confidence: number;
  reasoning: string[];
  indicators: {
    rsi1h: number;
    macdState: 'bullish_cross' | 'bearish_cross' | 'bullish' | 'bearish' | 'neutral';
    trend4h: 'up' | 'down' | 'sideways';
    trend4hDistancePct: number;
    volumeRatio: number;
  };
  generatedAt: string;
}

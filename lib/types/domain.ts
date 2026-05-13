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
}

export interface AnalysisSignal {
  trend: number;
  volume: number;
  momentum: number;
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

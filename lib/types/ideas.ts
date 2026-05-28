export type Broker = 'Coinbase' | 'Scalable' | 'Trade Republic' | 'Bitpanda' | 'Unknown';

export type InstrumentType =
  | 'crypto'
  | 'stock'
  | 'optionsschein'
  | 'knockout'
  | 'certificate'
  | 'etf'
  | 'unknown';

export type RiskLevel =
  | 'Niedrigstes Risiko'
  | 'Niedriges Risiko'
  | 'Mittleres Risiko'
  | 'Hohes Risiko'
  | 'Sehr hohes Risiko'
  | 'Unbekanntes Risiko';

export type Moneyness = 'itm' | 'atm' | 'otm' | 'deep_otm' | 'unknown';

export type UserIntent =
  | 'will_buy'
  | 'considering'
  | 'similar_instrument_planned'
  | 'rejected'
  | 'none';

export type SignalDecision =
  | 'BUY_STRONG'
  | 'BUY_CAUTIOUS'
  | 'WATCH'
  | 'NO_TRADE'
  | 'SELL_OR_REDUCE'
  | 'AVOID';

export type UserRiskProfile = 'beginner' | 'intermediate' | 'speculative' | 'very_speculative';

export interface ParsedInstrument {
  broker: Broker;
  wkn?: string;
  isin?: string;
  ticker?: string;
  instrumentType: InstrumentType;
  riskLevelFromSource?: RiskLevel;
  strike?: number;
  expiry?: string;
  direction?: 'call' | 'put' | 'long' | 'short';
  userIntent: UserIntent;
  rawLine?: string;
}

export interface ExtractedLink {
  url: string;
  kind: 'analyst_rating' | 'news' | 'youtube' | 'related_idea' | 'past_purchase' | 'loss_warning' | 'telegram_private' | 'unknown';
  label?: string;
}

export interface ParsedTelegramIdea {
  title: string;
  underlying: string;
  underlyingType: InstrumentType;
  ideaType: InstrumentType;
  currentPriceMentioned: number | null;
  week52Low: number | null;
  week52High: number | null;
  brokers: Broker[];
  instruments: ParsedInstrument[];
  thesis: string[];
  links: ExtractedLink[];
  warningsMentioned: string[];
  targetPrice: number | null;
  holdDurationMentioned: string | null;
  rawText: string;
  parsedAt: string;
}

export interface MoneynessAnalysis {
  classification: Moneyness;
  distancePct: number;
  description: string;
}

export interface DerivativeAnalysis {
  instrument: ParsedInstrument;
  underlyingPrice: number;
  moneyness: MoneynessAnalysis;
  monthsToExpiry: number | null;
  daysToExpiry: number | null;
  riskClass: RiskLevel;
  beginnerSuitable: boolean;
  warnings: string[];
  recommendation: string;
  preferEquity: boolean;
  estimatedDelta: number | null;
  estimatedLeverage: number | null;
  approxBreakeven: number | null;
  breakevenMovePct: number | null;
  thetaUrgency: 'low' | 'moderate' | 'high' | 'critical';
}

export interface ValidationScoreBreakdown {
  thesisScore: number;
  technicalScore: number;
  riskRewardScore: number;
  instrumentQualityScore: number;
  marketContextScore: number;
  brokerAvailabilityScore: number;
  sourceQualityScore: number;
  userFitScore: number;
}

export interface IdeaValidation {
  totalScore: number;
  scoreBreakdown: ValidationScoreBreakdown;
  decision: SignalDecision;
  decisionLabel: string;
  reasoning: string[];
  warnings: string[];
  derivativeAnalysis: DerivativeAnalysis[];
  bestInstrumentForProfile: ParsedInstrument | null;
  brokerAvailable: boolean;
  brokerVerified: boolean;
  marketContextNote: string;
  unverifiedFlags: string[];
  generatedAt: string;
}

export interface IdeaRecord {
  id: string;
  parsed: ParsedTelegramIdea;
  validation: IdeaValidation;
  userProfile: UserRiskProfile;
  savedAt: string;
}

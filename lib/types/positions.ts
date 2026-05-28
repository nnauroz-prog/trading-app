import { Broker, InstrumentType, SignalDecision, UserRiskProfile } from './ideas';

export type PositionStatus = 'open' | 'closed_win' | 'closed_loss' | 'closed_breakeven' | 'reduced';

export interface Position {
  id: string;
  underlying: string;
  ticker?: string;
  wkn?: string;
  isin?: string;
  instrumentType: InstrumentType;
  broker: Broker;
  entryPrice: number;
  entryDate: number;
  positionSize: number;
  investmentQuote: number;
  currency: 'EUR' | 'USD';
  stopLossPlanned: number | null;
  takeProfitPlanned: number | null;
  thesis: string;
  status: PositionStatus;
  closeDate?: number;
  closePrice?: number;
  realizedPnl?: number;
  realizedPnlPct?: number;
  notes: string;
  linkedIdeaId?: string;
}

export type JournalOutcome = 'pending' | 'positive' | 'negative' | 'neutral';

export type FailureCategory =
  | 'wrong_thesis'
  | 'bad_timing'
  | 'ignored_stop'
  | 'no_stop'
  | 'fomo_entry'
  | 'risk_too_high'
  | 'market_changed'
  | 'wrong_product'
  | 'no_exit_plan'
  | 'overconfidence'
  | 'source_unreliable'
  | 'other';

export const FAILURE_CATEGORY_LABELS: Record<FailureCategory, string> = {
  wrong_thesis: 'These war falsch',
  bad_timing: 'Timing schlecht (zu früh/zu spät)',
  ignored_stop: 'Stop ignoriert / nicht ausgeführt',
  no_stop: 'Kein Stop gesetzt',
  fomo_entry: 'FOMO-Einstieg (nach Bewegung)',
  risk_too_high: 'Position zu groß für Risiko',
  market_changed: 'Marktphase hat sich gedreht',
  wrong_product: 'Falsches Instrument (z.B. OS statt Aktie)',
  no_exit_plan: 'Kein klarer Exit-Plan',
  overconfidence: 'Überschätzt — Setup war nicht so stark',
  source_unreliable: 'Source war unzuverlässig',
  other: 'Anderer Grund'
};

export interface IdeaJournalEntry {
  id: string;
  ideaId: string;
  underlying: string;
  ideaType: InstrumentType;
  parsedAt: string;
  source: string;
  appDecision: SignalDecision;
  appDecisionLabel: string;
  appScore: number;
  userProfile: UserRiskProfile;
  userAction: 'bought' | 'watched' | 'rejected' | 'pending';
  positionId?: string;
  outcome1d?: JournalOutcome;
  outcome3d?: JournalOutcome;
  outcome7d?: JournalOutcome;
  outcome30d?: JournalOutcome;
  outcomeNote?: string;
  failureCategory?: FailureCategory;
  lessonLearned?: string;
  preventionRule?: string;
  savedAt: number;
}

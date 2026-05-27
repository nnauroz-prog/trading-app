import { Broker, InstrumentType, ParsedTelegramIdea, ParsedInstrument } from '@/lib/types/ideas';

export interface PositionPrefill {
  underlying: string;
  ticker?: string;
  wkn?: string;
  instrumentType: InstrumentType;
  broker: Broker;
  entryPrice: number;
  stopLossPlanned: number | null;
  takeProfitPlanned: number | null;
  thesis: string;
  source: 'idea_analysis';
  ideaId?: string;
}

const STORAGE_KEY = 'trading-app.position-prefill';

export function buildPrefillFromIdea(parsed: ParsedTelegramIdea, instrument: ParsedInstrument | null): PositionPrefill {
  const inst = instrument ?? parsed.instruments[0];
  return {
    underlying: parsed.underlying,
    ticker: parsed.underlyingType === 'crypto' ? parsed.underlying : undefined,
    wkn: inst?.wkn,
    instrumentType: inst?.instrumentType ?? parsed.ideaType,
    broker: inst?.broker ?? parsed.brokers[0] ?? 'Unknown',
    entryPrice: parsed.currentPriceMentioned ?? 0,
    stopLossPlanned: parsed.week52Low ?? null,
    takeProfitPlanned: parsed.targetPrice ?? null,
    thesis: parsed.thesis.slice(0, 3).join(' · ') || parsed.title,
    source: 'idea_analysis'
  };
}

export function savePrefill(prefill: PositionPrefill): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(prefill));
}

export function loadPrefill(): PositionPrefill | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PositionPrefill;
  } catch {
    return null;
  }
}

export function clearPrefill(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

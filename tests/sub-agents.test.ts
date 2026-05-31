import { describe, expect, it } from 'vitest';
import { analystVote, scoutVote, riskVote } from '@/lib/agents/sub-agents';
import { MasterSignalReport, RankedCandidate } from '@/lib/analysis/master-signal-engine';

function makeReport(overrides: Partial<MasterSignalReport> = {}): MasterSignalReport {
  const base: MasterSignalReport = {
    kind: 'no_trade',
    bestCandidate: null,
    marketRegime: 'sideways',
    btcRegime: 'sideways',
    marketStructure: 'range',
    crowd: { state: 'neutral', cautious: false, detail: 'Neutral.' },
    marketMood: 'neutral',
    reasons: [],
    mode: 'swing',
    candidates: [],
    generatedAt: new Date().toISOString()
  };
  return { ...base, ...overrides } as MasterSignalReport;
}

function makeCandidate(overrides: Partial<RankedCandidate> = {}): RankedCandidate {
  return {
    symbol: 'ETH',
    coinId: 'eth',
    passedCount: 10,
    totalCount: 12,
    confidence: 0.8,
    entry: 3000,
    stopLoss: 2900,
    takeProfit1: 3200,
    takeProfit2: 3500,
    stopDistancePct: 3,
    rrTp1: 2,
    tier: 'strong',
    oneLineReason: '',
    brokers: ['Coinbase', 'Scalable Capital'],
    quoteVolume: 200_000_000,
    structure: 'uptrend',
    positionInRange: 0.3,
    nearSupport: true,
    confirmed: true,
    relStrengthVsBtc: 1,
    priceChangePct24h: 3,
    ...overrides
  };
}

describe('analystVote', () => {
  it('POSITIV when risk-on and bitcoin bullish', () => {
    const r = analystVote(makeReport({ marketMood: 'risk-on', btcRegime: 'bull' }));
    expect(r.vote).toBe('POSITIV');
    expect(r.voteTone).toBe('good');
  });
  it('NEGATIV when market is risk-off', () => {
    const r = analystVote(makeReport({ marketMood: 'risk-off' }));
    expect(r.vote).toBe('NEGATIV');
    expect(r.voteTone).toBe('bad');
  });
  it('NEGATIV when crowd is cautious (extreme greed)', () => {
    const r = analystVote(makeReport({ crowd: { state: 'greed', cautious: true, detail: 'Extreme Gier.' } }));
    expect(r.vote).toBe('NEGATIV');
  });
  it('NEUTRAL when nothing stands out', () => {
    const r = analystVote(makeReport());
    expect(r.vote).toBe('NEUTRAL');
  });
});

describe('scoutVote', () => {
  it('SCHWACH when no candidate', () => {
    const r = scoutVote(null);
    expect(r.vote).toBe('SCHWACH');
    expect(r.voteTone).toBe('bad');
  });
  it('STARK when passedCount ≥ 9 + uptrend + nearSupport', () => {
    const r = scoutVote(makeCandidate());
    expect(r.vote).toBe('STARK');
  });
  it('MITTEL for moderate confluence', () => {
    const r = scoutVote(makeCandidate({ passedCount: 7, nearSupport: false }));
    expect(r.vote).toBe('MITTEL');
  });
  it('SCHWACH for low confluence', () => {
    const r = scoutVote(makeCandidate({ passedCount: 5 }));
    expect(r.vote).toBe('SCHWACH');
  });
});

describe('riskVote', () => {
  it('VETO without candidate', () => {
    const r = riskVote(null);
    expect(r.vote).toBe('VETO');
  });
  it('OK when everything is clean', () => {
    const r = riskVote(makeCandidate());
    expect(r.vote).toBe('OK');
  });
  it('VETO when stop is too tight', () => {
    const r = riskVote(makeCandidate({ stopDistancePct: 0.5 }));
    expect(r.vote).toBe('VETO');
  });
  it('VETO when liquidity is too low', () => {
    const r = riskVote(makeCandidate({ quoteVolume: 10_000_000 }));
    expect(r.vote).toBe('VETO');
  });
  it('VETO when broker is unavailable', () => {
    const r = riskVote(makeCandidate({ brokers: ['Binance'] }));
    expect(r.vote).toBe('VETO');
  });
  it('VETO on pump (> 15% in 24h)', () => {
    const r = riskVote(makeCandidate({ priceChangePct24h: 20 }));
    expect(r.vote).toBe('VETO');
  });
  it('VETO when not confirmed across multiple candles', () => {
    const r = riskVote(makeCandidate({ confirmed: false }));
    expect(r.vote).toBe('VETO');
  });
});

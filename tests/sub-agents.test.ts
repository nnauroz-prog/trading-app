import { describe, expect, it } from 'vitest';
import { analystVote, scoutVote, riskVote, newsVote } from '@/lib/agents/sub-agents';
import { MasterSignalReport, RankedCandidate } from '@/lib/analysis/master-signal-engine';
import { CoinSentiment, ScoredNews, SpaeherReport } from '@/lib/akademie/spaeher';

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

function makeSpaeher(perCoin: CoinSentiment[]): SpaeherReport {
  const items: ScoredNews[] = perCoin.length > 0
    ? [{ id: 'x', title: 'x', link: 'https://x', source: 'BTC-ECHO', publishedAt: Date.now(), description: null, score: 50, impact: 'neutral', mentionedCoins: perCoin.map((c) => c.coin), reasons: [] }]
    : [];
  return { items, topPick: items[0] ?? null, summary: '', perCoin };
}

describe('newsVote', () => {
  it('KEINE_DATEN without target', () => {
    const r = newsVote(null, makeSpaeher([]));
    expect(r.vote).toBe('KEINE_DATEN');
  });
  it('KEINE_DATEN when Späher is empty', () => {
    const r = newsVote(makeCandidate(), null);
    expect(r.vote).toBe('KEINE_DATEN');
  });
  it('POSITIV when target coin tilt is bullish', () => {
    const r = newsVote(makeCandidate({ symbol: 'ETH' }), makeSpaeher([
      { coin: 'ETH', bullishCount: 3, bearishCount: 0, neutralCount: 0, netScore: 120, tilt: 'bullisch', topItem: null }
    ]));
    expect(r.vote).toBe('POSITIV');
    expect(r.voteTone).toBe('good');
  });
  it('NEGATIV when target coin tilt is bearish', () => {
    const r = newsVote(makeCandidate({ symbol: 'ETH' }), makeSpaeher([
      { coin: 'ETH', bullishCount: 0, bearishCount: 3, neutralCount: 0, netScore: -120, tilt: 'bärisch', topItem: null }
    ]));
    expect(r.vote).toBe('NEGATIV');
    expect(r.voteTone).toBe('bad');
  });
  it('NEUTRAL when coin not mentioned in news', () => {
    const r = newsVote(makeCandidate({ symbol: 'SOL' }), makeSpaeher([
      { coin: 'BTC', bullishCount: 2, bearishCount: 0, neutralCount: 0, netScore: 80, tilt: 'bullisch', topItem: null }
    ]));
    expect(r.vote).toBe('NEUTRAL');
  });
});

import { positionManagerVote, liquiditySpecialistVote, backtestAuditVote } from '@/lib/agents/sub-agents';
import { SetupSimilarity } from '@/lib/analysis/setup-similarity';

describe('positionManagerVote', () => {
  it('KEINE_POSITION without target', () => {
    expect(positionManagerVote(null, 'conservative').vote).toBe('KEINE_POSITION');
  });
  it('konservativ targets 1% risk for clean stops', () => {
    const r = positionManagerVote(makeCandidate({ stopDistancePct: 3 }), 'conservative');
    expect(r.suggestedAccountRiskPct).toBe(1);
    expect(r.vote).toBe('NORMAL');
  });
  it('aggressiv targets higher risk', () => {
    const r = positionManagerVote(makeCandidate({ stopDistancePct: 3 }), 'aggressive');
    expect(r.suggestedAccountRiskPct).toBeGreaterThanOrEqual(3);
  });
  it('aggressiv goes bigger on max-confluence', () => {
    const r = positionManagerVote(makeCandidate({ passedCount: 11, stopDistancePct: 3 }), 'aggressive');
    expect(r.suggestedAccountRiskPct).toBeGreaterThanOrEqual(4);
  });
  it('all firmas reduce on very wide stop', () => {
    const r = positionManagerVote(makeCandidate({ stopDistancePct: 7 }), 'balanced');
    expect(r.suggestedAccountRiskPct).toBeLessThanOrEqual(1.5);
  });
});

describe('liquiditySpecialistVote', () => {
  it('TIEF for very deep markets', () => {
    expect(liquiditySpecialistVote(makeCandidate({ quoteVolume: 600_000_000 }), 'conservative').vote).toBe('TIEF');
  });
  it('OK at konservativ minimum', () => {
    expect(liquiditySpecialistVote(makeCandidate({ quoteVolume: 250_000_000 }), 'conservative').vote).toBe('OK');
  });
  it('DUENN for konservativ at 100M but OK for aggressiv', () => {
    const c = makeCandidate({ quoteVolume: 100_000_000 });
    expect(liquiditySpecialistVote(c, 'conservative').vote).toBe('DUENN');
    expect(liquiditySpecialistVote(c, 'aggressive').vote).toBe('TIEF');
  });
  it('DUENN for all firmas at very low volume', () => {
    const c = makeCandidate({ quoteVolume: 5_000_000 });
    expect(liquiditySpecialistVote(c, 'aggressive').vote).toBe('DUENN');
  });
});

function sim(over: Partial<SetupSimilarity> = {}): SetupSimilarity {
  return {
    coinId: 'eth', ticker: 'ETH', currentConfluence: 9,
    matchCount: 12, tp1Hits: 8, slHits: 4, timeouts: 0,
    hitRatePct: 67, avgWinPct: 2.5, avgLossPct: -1.5, expectancyPct: 1.2,
    sampleSize: 'good', oneLineVerdict: '',
    ...over
  };
}

describe('backtestAuditVote', () => {
  it('KEINE_DATEN without target', () => {
    expect(backtestAuditVote(null, sim()).vote).toBe('KEINE_DATEN');
  });
  it('KEINE_DATEN without similarity', () => {
    expect(backtestAuditVote(makeCandidate(), null).vote).toBe('KEINE_DATEN');
  });
  it('KEINE_DATEN for small sample', () => {
    expect(backtestAuditVote(makeCandidate(), sim({ sampleSize: 'small', matchCount: 3 })).vote).toBe('KEINE_DATEN');
  });
  it('BESTÄTIGT for hit rate ≥ 60%', () => {
    expect(backtestAuditVote(makeCandidate(), sim({ hitRatePct: 70 })).vote).toBe('BESTÄTIGT');
  });
  it('GEMISCHT for hit rate 45-59%', () => {
    expect(backtestAuditVote(makeCandidate(), sim({ hitRatePct: 50 })).vote).toBe('GEMISCHT');
  });
  it('WIDERSPRUCH for hit rate < 45%', () => {
    expect(backtestAuditVote(makeCandidate(), sim({ hitRatePct: 30 })).vote).toBe('WIDERSPRUCH');
  });
});

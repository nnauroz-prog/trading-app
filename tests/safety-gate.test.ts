import { describe, expect, it } from 'vitest';
import { SafetyInput, evaluateSafety, MIN_QUOTE_VOLUME } from '@/lib/analysis/safety-gate';

// A setup that passes every hard criterion.
function safeInput(overrides: Partial<SafetyInput> = {}): SafetyInput {
  return {
    passedCount: 10,
    marketMood: 'neutral',
    btcRegime: 'bull',
    isBtc: false,
    structure: 'uptrend',
    nearSupport: true,
    crowdCautious: false,
    quoteVolume: MIN_QUOTE_VOLUME * 2,
    stopDistancePct: 3,
    confirmed: true,
    userBrokerAvailable: true,
    backtestEdge: null,
    ...overrides
  };
}

describe('evaluateSafety', () => {
  it('all hard criteria pass -> maxSafety, score 100, grade A', () => {
    const a = evaluateSafety(safeInput());
    expect(a.maxSafety).toBe(true);
    expect(a.score).toBe(100);
    expect(a.grade).toBe('A');
    expect(a.passedHard).toBe(a.totalHard);
  });

  it.each<[string, Partial<SafetyInput>]>([
    ['low confluence', { passedCount: 8 }],
    ['risk-off', { marketMood: 'risk-off' }],
    ['btc bear', { btcRegime: 'bear' }],
    ['downtrend', { structure: 'downtrend' }],
    ['not near support', { nearSupport: false }],
    ['crowd cautious', { crowdCautious: true }],
    ['illiquid', { quoteVolume: MIN_QUOTE_VOLUME - 1 }],
    ['stop too tight', { stopDistancePct: 0.5 }],
    ['stop too wide', { stopDistancePct: 7 }],
    ['not confirmed', { confirmed: false }],
    ['not on user broker', { userBrokerAvailable: false }]
  ])('a single failing criterion (%s) flips maxSafety off', (_label, override) => {
    const a = evaluateSafety(safeInput(override));
    expect(a.maxSafety).toBe(false);
    expect(a.grade).not.toBe('A');
  });

  it('Bitcoin itself is not blocked by a bearish BTC regime', () => {
    const a = evaluateSafety(safeInput({ isBtc: true, btcRegime: 'bear' }));
    expect(a.maxSafety).toBe(true);
  });

  it('stop-band boundaries 1.0 and 6.0 are inclusive', () => {
    expect(evaluateSafety(safeInput({ stopDistancePct: 1 })).maxSafety).toBe(true);
    expect(evaluateSafety(safeInput({ stopDistancePct: 6 })).maxSafety).toBe(true);
  });

  it('backtest edge shifts score but never flips maxSafety', () => {
    const withEdge = evaluateSafety(safeInput({ passedCount: 8, backtestEdge: { winRatePct: 60, expectancyPct: 1 } }));
    const noEdge = evaluateSafety(safeInput({ passedCount: 8, backtestEdge: null }));
    // 8/12 fails confluence-9 -> not maxSafety in both cases
    expect(withEdge.maxSafety).toBe(false);
    expect(noEdge.maxSafety).toBe(false);
    // a positive edge adds points
    expect(withEdge.score).toBeGreaterThan(noEdge.score);
    // adding an edge to an all-pass setup keeps maxSafety and caps at 100
    const allPassEdge = evaluateSafety(safeInput({ backtestEdge: { winRatePct: 70, expectancyPct: 2 } }));
    expect(allPassEdge.maxSafety).toBe(true);
    expect(allPassEdge.score).toBe(100);
  });

  it('always carries a residual-risk note (never claims guaranteed safety)', () => {
    expect(evaluateSafety(safeInput()).residualRiskNote.length).toBeGreaterThan(0);
  });
});

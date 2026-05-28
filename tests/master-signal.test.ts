import { describe, expect, it } from 'vitest';
import {
  MAX_HOLD_HOURS,
  MIN_PASSED_FOR_TRADE,
  MasterSignalReport,
  TradeRecommendation,
  buildChecks,
  candidateStanding,
  describeSignalAction,
  shouldEmitTrade,
  tierForConfluence
} from '@/lib/analysis/master-signal-engine';
import { Candle } from '@/lib/types/domain';

function makeTrade(symbol: string, passed: number): TradeRecommendation {
  return {
    kind: 'trade',
    coin: { symbol } as TradeRecommendation['coin'],
    ticker: {} as TradeRecommendation['ticker'],
    type: 'LONG',
    entry: 100, stopLoss: 95, takeProfit1: 110, takeProfit2: 120,
    stopDistancePct: 5, rrTp1: 2, rrTp2: 4, atr1h: 3,
    confidence: 80, checks: [], passedCount: passed, totalCount: 12,
    oneLineReason: 'test', brokers: ['X'], marketRegime: 'bull',
    btcRegime: 'bull',
    candidates: [],
    generatedAt: '2026-01-01T00:00:00Z'
  };
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function genCandles(count: number, startPrice: number, trendPerBar: number, step: number, volume = 1000): Candle[] {
  const out: Candle[] = [];
  let price = startPrice;
  for (let i = 0; i < count; i++) {
    const open = price;
    const close = price + trendPerBar;
    const high = Math.max(open, close) + Math.abs(trendPerBar) * 0.3 + 0.5;
    const low = Math.min(open, close) - Math.abs(trendPerBar) * 0.3 - 0.5;
    out.push({ openTime: i * step, open, high, low, close, volume });
    price = close;
  }
  return out;
}

describe('buildChecks — structure', () => {
  const c1h = genCandles(100, 100, 0.2, HOUR);
  const c4h = genCandles(80, 100, 0.5, 4 * HOUR);
  const c1d = genCandles(250, 50, 0.4, DAY);
  const result = buildChecks(c1h, c4h, c1d);

  it('always returns exactly 12 checks', () => {
    expect(result.checks.length).toBe(12);
  });
  it('entry equals last 1h close', () => {
    expect(result.entry).toBeCloseTo(c1h[c1h.length - 1].close, 5);
  });
  it('atr is positive', () => {
    expect(result.atr1h).toBeGreaterThan(0);
  });
});

describe('buildChecks — uptrend vs downtrend', () => {
  // 1h ends ~150; 4h rises gently so its EMA50 stays well below the 1h entry.
  const upC1h = genCandles(100, 100, 0.5, HOUR);
  const upC4h = genCandles(80, 100, 0.3, 4 * HOUR);
  const upC1d = genCandles(250, 40, 0.5, DAY);
  const up = buildChecks(upC1h, upC4h, upC1d);

  const downC1h = genCandles(100, 150, -0.5, HOUR);
  const downC4h = genCandles(80, 150, -0.3, 4 * HOUR);
  const downC1d = genCandles(250, 200, -0.5, DAY);
  const down = buildChecks(downC1h, downC4h, downC1d);

  it('classifies steady uptrend as bull regime', () => {
    expect(up.marketRegime).toBe('bull');
  });
  it('classifies steady downtrend as bear regime', () => {
    expect(down.marketRegime).toBe('bear');
  });
  it('uptrend passes more confluences than downtrend', () => {
    const upPassed = up.checks.filter((c) => c.passed).length;
    const downPassed = down.checks.filter((c) => c.passed).length;
    expect(upPassed).toBeGreaterThan(downPassed);
  });
  it('downtrend fails the daily-trend check', () => {
    const dailyTrend = down.checks.find((c) => c.id === 'trend_1d');
    expect(dailyTrend?.passed).toBe(false);
  });
  it('uptrend passes the 4h-trend check', () => {
    const trend4h = up.checks.find((c) => c.id === 'trend_4h');
    expect(trend4h?.passed).toBe(true);
  });
});

describe('buildChecks — volume spike detection', () => {
  it('detects a volume spike on the latest bar', () => {
    const c1h = genCandles(100, 100, 0.1, HOUR, 1000);
    c1h[c1h.length - 1].volume = 5000; // 5x spike
    const c4h = genCandles(80, 100, 0.2, 4 * HOUR);
    const c1d = genCandles(250, 80, 0.2, DAY);
    const result = buildChecks(c1h, c4h, c1d);
    const volCheck = result.checks.find((c) => c.id === 'volume_spike');
    expect(volCheck?.passed).toBe(true);
  });
});

describe('describeSignalAction', () => {
  it('says BUY_NOW with a hold horizon when a trade fires', () => {
    const a = describeSignalAction(makeTrade('SOL', 9));
    expect(a.verdict).toBe('BUY_NOW');
    expect(a.headline).toContain('SOL');
    expect(a.headline.toLowerCase()).toContain('jetzt');
    expect(a.horizonText).toContain(String(MAX_HOLD_HOURS));
  });

  it('says WAIT and names how many confluences are missing', () => {
    const report: MasterSignalReport = {
      kind: 'no_trade',
      bestCandidate: makeTrade('BTC', 5),
      marketRegime: 'sideways',
      btcRegime: 'sideways',
      marketMood: 'neutral',
      reasons: ['nur 5/12'],
      candidates: [],
      generatedAt: '2026-01-01T00:00:00Z'
    };
    const a = describeSignalAction(report);
    expect(a.verdict).toBe('WAIT');
    expect(a.headline).toContain('BTC');
    // needs MIN_PASSED_FOR_TRADE - 5 more
    expect(a.detail).toContain(String(MIN_PASSED_FOR_TRADE - 5));
    expect(a.horizonText).toBeNull();
  });

  it('falls back to NO_SETUP when there is no candidate', () => {
    const report: MasterSignalReport = {
      kind: 'no_trade',
      bestCandidate: null,
      marketRegime: 'bear',
      btcRegime: 'bear',
      marketMood: 'risk-off',
      reasons: ['Markt schwach'],
      candidates: [],
      generatedAt: '2026-01-01T00:00:00Z'
    };
    const a = describeSignalAction(report);
    expect(a.verdict).toBe('NO_SETUP');
    expect(a.detail).toContain('Markt schwach');
  });
});

describe('tierForConfluence', () => {
  it('grades 9+ as strong, 7-8 as standard, 5-6 as weak, below as null', () => {
    expect(tierForConfluence(10)).toBe('strong');
    expect(tierForConfluence(9)).toBe('strong');
    expect(tierForConfluence(8)).toBe('standard');
    expect(tierForConfluence(7)).toBe('standard');
    expect(tierForConfluence(6)).toBe('weak');
    expect(tierForConfluence(5)).toBe('weak');
    expect(tierForConfluence(4)).toBeNull();
  });
});

describe('shouldEmitTrade', () => {
  const base = { threshold: 7, isBtc: false, marketMood: 'neutral' as const, btcRegime: 'bull' as const };

  it('blocks below the confluence threshold', () => {
    expect(shouldEmitTrade({ ...base, passedCount: 6 })).toEqual({ emit: false, blockedReason: 'confluence' });
  });

  it('emits a clean setup in a healthy market', () => {
    expect(shouldEmitTrade({ ...base, passedCount: 8 })).toEqual({ emit: true, blockedReason: null });
  });

  it('blocks an ordinary setup when the market is risk-off, but lets a very strong one through', () => {
    expect(shouldEmitTrade({ ...base, passedCount: 8, marketMood: 'risk-off' }).blockedReason).toBe('risk-off');
    expect(shouldEmitTrade({ ...base, passedCount: 9, marketMood: 'risk-off' }).emit).toBe(true);
  });

  it('blocks alts when Bitcoin is bearish unless the setup is exceptional', () => {
    expect(shouldEmitTrade({ ...base, passedCount: 8, btcRegime: 'bear' }).blockedReason).toBe('btc-bear');
    expect(shouldEmitTrade({ ...base, passedCount: 10, btcRegime: 'bear' }).emit).toBe(true);
  });

  it('does not block Bitcoin itself on a bearish BTC regime', () => {
    expect(shouldEmitTrade({ ...base, passedCount: 8, isBtc: true, btcRegime: 'bear' }).emit).toBe(true);
  });
});

describe('candidateStanding', () => {
  it('is actionable only at/above the chosen threshold', () => {
    expect(candidateStanding(7, 7).actionable).toBe(true);
    expect(candidateStanding(6, 7).actionable).toBe(false);
    // lowering the threshold makes a 6/12 actionable (but still flagged elsewhere)
    expect(candidateStanding(6, 5).actionable).toBe(true);
  });
  it('labels sub-threshold candidates as speculative', () => {
    expect(candidateStanding(5, 7).label.toLowerCase()).toContain('spekulativ');
  });
});

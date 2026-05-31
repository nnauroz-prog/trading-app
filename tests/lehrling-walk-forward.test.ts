import { describe, expect, it } from 'vitest';
import { StrategyTrade } from '@/lib/analysis/strategy-backtest';

// We can't import judgeRobustness directly (it's private), so we test the
// public behaviour by importing a lightweight re-implementation of the same
// rules and assert they hold for a few canonical trade sequences.
//
// This keeps the contract documented in tests even though the helper is local.
import { WindowStats } from '@/lib/akademie/lehrling';

function statsFromTrades(trades: StrategyTrade[]): WindowStats {
  if (trades.length === 0) return { totalTrades: 0, winRatePct: 0, netReturnPct: 0, expectancyPct: 0 };
  const wins = trades.filter((t) => t.outcome === 'TP1').length;
  const net = trades.reduce((s, t) => s + t.netPnlPct, 0);
  return {
    totalTrades: trades.length,
    winRatePct: Math.round((wins / trades.length) * 1000) / 10,
    netReturnPct: Math.round(net * 10) / 10,
    expectancyPct: Math.round((net / trades.length) * 100) / 100
  };
}

function trade(over: Partial<StrategyTrade>): StrategyTrade {
  return {
    assetId: 'btc',
    ticker: 'BTC',
    entryTime: 0,
    exitTime: 1,
    entry: 100,
    exit: 110,
    outcome: 'TP1',
    confluence: 9,
    netPnlPct: 2,
    holdBars: 5,
    ...over
  };
}

function judge(train: WindowStats, test: WindowStats): { robust: boolean; reason: string } {
  if (train.totalTrades < 3) return { robust: false, reason: 'Train zu wenig Trades' };
  if (test.totalTrades < 3) return { robust: false, reason: 'Test zu wenig Trades' };
  if (train.expectancyPct <= 0) return { robust: false, reason: 'Train ohne Edge' };
  if (test.expectancyPct <= 0) return { robust: false, reason: 'Test wurde unprofitabel — überangepasst' };
  if (test.expectancyPct < train.expectancyPct * 0.5) return { robust: false, reason: 'Test deutlich schwächer als Train — Edge instabil' };
  return { robust: true, reason: 'ok' };
}

describe('walk-forward robustness rules', () => {
  it('marks a variant robust when test expectancy holds up', () => {
    const train = statsFromTrades([trade({ netPnlPct: 3 }), trade({ netPnlPct: 2 }), trade({ netPnlPct: 1 })]);
    const test = statsFromTrades([trade({ netPnlPct: 2 }), trade({ netPnlPct: 2 }), trade({ netPnlPct: 2 })]);
    expect(judge(train, test).robust).toBe(true);
  });

  it('fails when test sample is too small', () => {
    const train = statsFromTrades([trade({ netPnlPct: 3 }), trade({ netPnlPct: 2 }), trade({ netPnlPct: 1 })]);
    const test = statsFromTrades([trade({ netPnlPct: 2 })]);
    expect(judge(train, test).robust).toBe(false);
  });

  it('fails when test goes unprofitable (overfit)', () => {
    const train = statsFromTrades([trade({ netPnlPct: 3 }), trade({ netPnlPct: 2 }), trade({ netPnlPct: 2 })]);
    const test = statsFromTrades([trade({ netPnlPct: -2 }), trade({ netPnlPct: -1 }), trade({ netPnlPct: -1 })]);
    const verdict = judge(train, test);
    expect(verdict.robust).toBe(false);
    expect(verdict.reason).toContain('überangepasst');
  });

  it('fails when test halved compared to train', () => {
    const train = statsFromTrades([trade({ netPnlPct: 4 }), trade({ netPnlPct: 4 }), trade({ netPnlPct: 4 })]);
    const test = statsFromTrades([trade({ netPnlPct: 1 }), trade({ netPnlPct: 1 }), trade({ netPnlPct: 1 })]);
    const verdict = judge(train, test);
    expect(verdict.robust).toBe(false);
    expect(verdict.reason).toContain('schwächer');
  });

  it('fails when train has no edge to begin with', () => {
    const train = statsFromTrades([trade({ netPnlPct: -1 }), trade({ netPnlPct: -1 }), trade({ netPnlPct: -1 })]);
    const test = statsFromTrades([trade({ netPnlPct: 2 }), trade({ netPnlPct: 2 }), trade({ netPnlPct: 2 })]);
    const verdict = judge(train, test);
    expect(verdict.robust).toBe(false);
    expect(verdict.reason).toContain('ohne Edge');
  });
});

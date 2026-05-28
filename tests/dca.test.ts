import { describe, expect, it } from 'vitest';
import { computeDcaStats, DcaPlan } from '@/lib/dca';

function planWithExecutions(prices: number[], amount = 100): DcaPlan {
  return {
    id: 'plan1',
    assetId: 'btc',
    symbol: 'BTC',
    amountPerBuy: amount,
    frequency: 'weekly',
    currency: 'EUR',
    startedAt: Date.now(),
    executions: prices.map((price, i) => ({
      id: `e${i}`,
      date: Date.now() + i * 1000,
      amountInvested: amount,
      price,
      coinsBought: amount / price
    }))
  };
}

describe('computeDcaStats', () => {
  it('computes average cost basis correctly', () => {
    // Buy 100€ at 100 → 1 coin; 100€ at 50 → 2 coins. Total 200€, 3 coins.
    const plan = planWithExecutions([100, 50]);
    const stats = computeDcaStats(plan, 80);
    expect(stats.totalInvested).toBe(200);
    expect(stats.totalCoins).toBeCloseTo(3, 5);
    expect(stats.avgCostBasis).toBeCloseTo(66.67, 1);
  });

  it('computes unrealized PnL at current price', () => {
    const plan = planWithExecutions([100, 50]);
    // 3 coins * 80 = 240, invested 200 → +40
    const stats = computeDcaStats(plan, 80);
    expect(stats.currentValue).toBeCloseTo(240, 5);
    expect(stats.unrealizedPnl).toBeCloseTo(40, 5);
    expect(stats.unrealizedPnlPct).toBeCloseTo(20, 1);
  });

  it('shows DCA beat lump-sum when price fell then recovered', () => {
    // First buy at 100, second at 50, now 80.
    // DCA: 3 coins → 240. Lump-sum at 100: 2 coins → 160. DCA wins by 80.
    const plan = planWithExecutions([100, 50]);
    const stats = computeDcaStats(plan, 80);
    expect(stats.vsLumpSum).toBeCloseTo(80, 5);
  });

  it('handles empty plan', () => {
    const plan = planWithExecutions([]);
    const stats = computeDcaStats(plan, 80);
    expect(stats.totalInvested).toBe(0);
    expect(stats.avgCostBasis).toBeNull();
    expect(stats.currentValue).toBeNull();
  });

  it('handles no current price', () => {
    const plan = planWithExecutions([100, 50]);
    const stats = computeDcaStats(plan, null);
    expect(stats.currentValue).toBeNull();
    expect(stats.unrealizedPnl).toBeNull();
  });
});

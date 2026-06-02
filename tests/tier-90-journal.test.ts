import { describe, expect, it } from 'vitest';
import { resolveTier90Pick, summariseTier90, type Tier90JournalEntry } from '@/lib/agents/tier-90-journal';

function pick(coin: string, entry: number, stop: number, tp: number): Tier90JournalEntry {
  return {
    date: '2026-06-01',
    recordedAt: 1,
    coinSymbol: coin,
    entry,
    stopLoss: stop,
    takeProfit1: tp,
    outcome: 'pending'
  };
}

describe('resolveTier90Pick', () => {
  it('marks stop_hit when low touches stop', () => {
    const r = resolveTier90Pick(pick('BTC', 100, 95, 110), 105, 94);
    expect(r.outcome).toBe('stop_hit');
  });

  it('marks tp_hit when high reaches take-profit', () => {
    const r = resolveTier90Pick(pick('BTC', 100, 95, 110), 112, 99);
    expect(r.outcome).toBe('tp_hit');
  });

  it('stays pending when price stays in range', () => {
    const r = resolveTier90Pick(pick('BTC', 100, 95, 110), 108, 96);
    expect(r.outcome).toBe('pending');
  });

  it('returns the entry unchanged if already resolved', () => {
    const resolved: Tier90JournalEntry = { ...pick('BTC', 100, 95, 110), outcome: 'tp_hit' };
    const r = resolveTier90Pick(resolved, 120, 80);
    expect(r.outcome).toBe('tp_hit');
  });
});

describe('summariseTier90', () => {
  it('computes a hit-rate from resolved picks only', () => {
    const log: Tier90JournalEntry[] = [
      { ...pick('A', 100, 95, 110), outcome: 'tp_hit' },
      { ...pick('B', 200, 190, 220), outcome: 'tp_hit' },
      { ...pick('C', 300, 285, 330), outcome: 'stop_hit' },
      { ...pick('D', 400, 380, 440), outcome: 'pending' }
    ];
    const s = summariseTier90(log);
    expect(s.total).toBe(4);
    expect(s.pending).toBe(1);
    expect(s.hitRatePct).toBeCloseTo(66.7, 0);
  });
});

import { describe, expect, it } from 'vitest';
import { computeTier90Streak } from '@/lib/agents/tier-90-streak';
import type { Tier90JournalEntry } from '@/lib/agents/tier-90-journal';

function entry(outcome: Tier90JournalEntry['outcome'], at: number): Tier90JournalEntry {
  return {
    date: '2026-06-01', recordedAt: at, coinSymbol: 'BTC',
    entry: 100, stopLoss: 95, takeProfit1: 110, outcome
  };
}

describe('computeTier90Streak', () => {
  it('returns zero for empty log', () => {
    const s = computeTier90Streak([]);
    expect(s.current).toBe(0);
    expect(s.bestWinStreak).toBe(0);
  });

  it('counts the current run as positive when last picks were wins', () => {
    const log = [
      entry('stop_hit', 1),
      entry('tp_hit', 2),
      entry('tp_hit', 3),
      entry('tp_hit', 4)
    ];
    const s = computeTier90Streak(log);
    expect(s.current).toBe(3);
    expect(s.bestWinStreak).toBe(3);
  });

  it('counts current run as negative when last picks were losses', () => {
    const log = [entry('tp_hit', 1), entry('stop_hit', 2), entry('stop_hit', 3)];
    const s = computeTier90Streak(log);
    expect(s.current).toBe(-2);
    expect(s.worstLossStreak).toBe(2);
  });

  it('ignores pending picks', () => {
    const log = [entry('tp_hit', 1), entry('tp_hit', 2), entry('pending', 3)];
    const s = computeTier90Streak(log);
    expect(s.current).toBe(2);
    expect(s.bestWinStreak).toBe(2);
  });
});

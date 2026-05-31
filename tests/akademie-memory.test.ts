import { describe, expect, it } from 'vitest';
import { AkademieSnapshot, lehrlingStability, spaeherTrend } from '@/lib/akademie/memory';

function snap(over: Partial<AkademieSnapshot>): AkademieSnapshot {
  return {
    date: '2026-05-01',
    recordedAt: Date.now(),
    bestVariantId: 'c7-s1.5-t2.5-h72',
    bestParams: { minConfluence: 7, stopAtrMult: 1.5, tp1AtrMult: 2.5, maxHoldBars: 72 },
    bestNetReturnPct: 5,
    bestWinRatePct: 60,
    bestTotalTrades: 12,
    baselineId: 'c7-s1.5-t2.5-h72',
    baselineNetReturnPct: 5,
    newsBullish: 2,
    newsBearish: 1,
    newsNeutral: 5,
    newsTopTitle: null,
    newsTopScore: null,
    newsTopImpact: null,
    ...over
  };
}

describe('lehrlingStability', () => {
  it('empty log returns zero stats', () => {
    const s = lehrlingStability([]);
    expect(s.daysStable).toBe(0);
    expect(s.totalSwitches).toBe(0);
    expect(s.currentBestId).toBeNull();
  });

  it('counts consecutive recent stability', () => {
    const log: AkademieSnapshot[] = [
      snap({ date: '2026-05-01', bestVariantId: 'A' }),
      snap({ date: '2026-05-02', bestVariantId: 'B' }),
      snap({ date: '2026-05-03', bestVariantId: 'B' }),
      snap({ date: '2026-05-04', bestVariantId: 'B' })
    ];
    const s = lehrlingStability(log);
    expect(s.currentBestId).toBe('B');
    expect(s.daysStable).toBe(3);
    expect(s.totalSwitches).toBe(1);
  });

  it('best ever uses max net return', () => {
    const log: AkademieSnapshot[] = [
      snap({ date: '2026-05-01', bestNetReturnPct: 3 }),
      snap({ date: '2026-05-02', bestNetReturnPct: 11.5 }),
      snap({ date: '2026-05-03', bestNetReturnPct: 7 })
    ];
    const s = lehrlingStability(log);
    expect(s.bestEverNetReturnPct).toBe(11.5);
  });
});

describe('spaeherTrend', () => {
  it('empty log returns neutral', () => {
    const t = spaeherTrend([]);
    expect(t.totalDays).toBe(0);
    expect(t.bias).toBe('neutral');
    expect(t.recentShift).toBeNull();
  });

  it('detects bullish bias', () => {
    const log: AkademieSnapshot[] = [
      snap({ newsBullish: 5, newsBearish: 1 }),
      snap({ date: '2026-05-02', newsBullish: 4, newsBearish: 1 })
    ];
    expect(spaeherTrend(log).bias).toBe('bullisch');
  });

  it('flags a recent shift to more bullish', () => {
    const log: AkademieSnapshot[] = [
      snap({ date: '2026-05-01', newsBullish: 1, newsBearish: 3 }),
      snap({ date: '2026-05-02', newsBullish: 1, newsBearish: 3 }),
      snap({ date: '2026-05-03', newsBullish: 1, newsBearish: 3 }),
      snap({ date: '2026-05-04', newsBullish: 5, newsBearish: 1 }),
      snap({ date: '2026-05-05', newsBullish: 5, newsBearish: 1 }),
      snap({ date: '2026-05-06', newsBullish: 5, newsBearish: 1 })
    ];
    expect(spaeherTrend(log).recentShift).toBe('stärker bullisch');
  });
});

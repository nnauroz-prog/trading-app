import { describe, expect, it } from 'vitest';
import { mergeScores, summariseCoinTrend, type CoinScoreRecord } from '@/lib/coin-score-history';

describe('coin-score-history', () => {
  it('inserts a new coin record', () => {
    const out = mergeScores([], '2026-06-01', [{ coinId: 'btc', symbol: 'BTC', passedCount: 7 }]);
    expect(out).toHaveLength(1);
    expect(out[0].coinId).toBe('btc');
    expect(out[0].history).toEqual([{ date: '2026-06-01', passedCount: 7 }]);
  });

  it('appends a new day to an existing coin', () => {
    const existing: CoinScoreRecord[] = [
      { coinId: 'btc', symbol: 'BTC', history: [{ date: '2026-05-31', passedCount: 5 }] }
    ];
    const out = mergeScores(existing, '2026-06-01', [{ coinId: 'btc', symbol: 'BTC', passedCount: 8 }]);
    expect(out[0].history).toEqual([
      { date: '2026-05-31', passedCount: 5 },
      { date: '2026-06-01', passedCount: 8 }
    ]);
  });

  it('overwrites a same-day entry instead of duplicating it', () => {
    const existing: CoinScoreRecord[] = [
      { coinId: 'btc', symbol: 'BTC', history: [{ date: '2026-06-01', passedCount: 6 }] }
    ];
    const out = mergeScores(existing, '2026-06-01', [{ coinId: 'btc', symbol: 'BTC', passedCount: 9 }]);
    expect(out[0].history).toEqual([{ date: '2026-06-01', passedCount: 9 }]);
  });

  it('sorts history by date even when entries arrive out of order', () => {
    const existing: CoinScoreRecord[] = [
      { coinId: 'eth', symbol: 'ETH', history: [{ date: '2026-06-03', passedCount: 4 }] }
    ];
    const out = mergeScores(existing, '2026-06-01', [{ coinId: 'eth', symbol: 'ETH', passedCount: 7 }]);
    expect(out[0].history.map((h) => h.date)).toEqual(['2026-06-01', '2026-06-03']);
  });

  it('caps history per coin', () => {
    const long = Array.from({ length: 70 }, (_, i) => ({
      date: `2026-04-${String(i + 1).padStart(2, '0')}`,
      passedCount: i % 12
    }));
    const existing: CoinScoreRecord[] = [{ coinId: 'sol', symbol: 'SOL', history: long }];
    const out = mergeScores(existing, '2026-06-01', [{ coinId: 'sol', symbol: 'SOL', passedCount: 11 }]);
    expect(out[0].history.length).toBeLessThanOrEqual(60);
    expect(out[0].history[out[0].history.length - 1].passedCount).toBe(11);
  });

  it('summarise reports latest and 7d delta', () => {
    const days = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-05-${String(20 + i).padStart(2, '0')}`,
      passedCount: i + 2
    }));
    const trend = summariseCoinTrend([{ coinId: 'btc', symbol: 'BTC', history: days }], 'btc');
    expect(trend?.latest).toBe(11);
    expect(trend?.delta7d).toBe(7);
  });

  it('summarise returns null when coin is missing', () => {
    expect(summariseCoinTrend([], 'unknown')).toBeNull();
  });
});

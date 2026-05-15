import { describe, expect, it } from 'vitest';
import { scoreVix } from '@/lib/providers/macro';

describe('scoreVix', () => {
  it.each([
    [10, 70],
    [14.9, 70],
    [15, 60],
    [19, 60],
    [22, 50],
    [27, 40],
    [35, 30],
    [55, 20]
  ])('VIX %f -> %i', (vix, expected) => {
    expect(scoreVix(vix)).toBe(expected);
  });

  it('is monotone non-increasing in VIX', () => {
    const vixes = [5, 14, 18, 22, 28, 35, 50, 80];
    const scores = vixes.map(scoreVix);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });
});

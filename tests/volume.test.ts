import { describe, expect, it } from 'vitest';
import { scoreVolumeRatio } from '@/lib/analysis/engine';

describe('scoreVolumeRatio', () => {
  it.each([
    [0.2, 30],
    [0.6, 45],
    [1.0, 55],
    [1.5, 65],
    [2.5, 75],
    [5, 85]
  ])('maps ratio %f to score %i', (ratio, expected) => {
    expect(scoreVolumeRatio(ratio)).toBe(expected);
  });

  it('is monotone non-decreasing', () => {
    const ratios = [0.1, 0.5, 0.8, 1.2, 1.8, 3, 10];
    const scores = ratios.map(scoreVolumeRatio);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    }
  });
});

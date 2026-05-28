import { describe, expect, it } from 'vitest';
import { assessCrowd } from '@/lib/analysis/crowd';

describe('assessCrowd', () => {
  it('is neutral when fear & greed is unknown', () => {
    expect(assessCrowd(null, 100).state).toBe('neutral');
    expect(assessCrowd(null, 100).cautious).toBe(false);
  });

  it('flags extreme greed as cautious', () => {
    const a = assessCrowd(85, 5);
    expect(a.state).toBe('greed');
    expect(a.cautious).toBe(true);
  });

  it('flags moderate greed with crowded longs as cautious', () => {
    expect(assessCrowd(72, 40).cautious).toBe(true);
    // same greed but cheap funding -> not yet cautious
    expect(assessCrowd(72, 5).cautious).toBe(false);
  });

  it('treats extreme fear as an opportunity, never cautious', () => {
    const a = assessCrowd(15, 0);
    expect(a.state).toBe('fear');
    expect(a.cautious).toBe(false);
  });

  it('is neutral in the middle of the range', () => {
    expect(assessCrowd(50, 10).state).toBe('neutral');
  });
});

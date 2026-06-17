import { describe, it, expect } from 'vitest';
import { buildPositionPlans } from '@/lib/optionsscheine/position-sizer';
import { suggestOptionsscheine } from '@/lib/optionsscheine/suggest';

describe('buildPositionPlans', () => {
  const sample = suggestOptionsscheine({
    underlyingName: 'Apple',
    underlyingPrice: 295.96,
    direction: 'call',
    assetClass: 'aktie'
  })[1]; // mittel

  it('liefert drei Standard-Budgets 100/300/1000', () => {
    const plans = buildPositionPlans(sample);
    expect(plans.map((p) => p.budget)).toEqual([100, 300, 1000]);
  });

  it('count * estimatedScheinepreis ist hoechstens budget', () => {
    const plans = buildPositionPlans(sample);
    for (const p of plans) {
      expect(p.count * p.estimatedScheinepreis).toBeLessThanOrEqual(p.budget + 0.0001);
    }
  });

  it('count steigt mit Budget', () => {
    const plans = buildPositionPlans(sample);
    expect(plans[1].count).toBeGreaterThanOrEqual(plans[0].count);
    expect(plans[2].count).toBeGreaterThanOrEqual(plans[1].count);
  });

  it('maxLoss = actualSpent', () => {
    const plans = buildPositionPlans(sample);
    for (const p of plans) {
      expect(p.maxLoss).toBeCloseTo(p.actualSpent, 5);
    }
  });

  it('Upside +20 ist doppelt so hoch wie +10', () => {
    const plans = buildPositionPlans(sample);
    for (const p of plans) {
      if (p.upsideAt10 > 0) {
        expect(p.upsideAt20 / p.upsideAt10).toBeCloseTo(2, 2);
      }
    }
  });

  it('akzeptiert eigene Budgets', () => {
    const plans = buildPositionPlans(sample, [50, 500]);
    expect(plans).toHaveLength(2);
    expect(plans.map((p) => p.budget)).toEqual([50, 500]);
  });
});

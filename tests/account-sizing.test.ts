import { describe, expect, it } from 'vitest';
import { computeSizing, DEFAULT_RISK_LIMITS } from '@/lib/account-config';

describe('computeSizing', () => {
  it('risks exactly max-risk-% of capital at stop', () => {
    const config = { accountSize: 10000, maxRiskPct: 1, currency: 'EUR' as const, riskLimits: DEFAULT_RISK_LIMITS, minConfluence: 7, advancedMode: false };
    const sizing = computeSizing(config, 100, 98, 104, 110);
    expect(sizing).not.toBeNull();
    // 1% of 10000 = 100 € risk; stop distance = 2 → 50 units
    expect(sizing!.riskAmount).toBeCloseTo(100, 5);
    expect(sizing!.positionSizeCoins).toBeCloseTo(50, 5);
    expect(sizing!.positionSizeQuote).toBeCloseTo(5000, 5);
  });

  it('reward scales with R:R', () => {
    const config = { accountSize: 10000, maxRiskPct: 1, currency: 'EUR' as const, riskLimits: DEFAULT_RISK_LIMITS, minConfluence: 7, advancedMode: false };
    const sizing = computeSizing(config, 100, 98, 104, 110);
    // TP1 +4 per unit * 50 units = 200
    expect(sizing!.reward1Amount).toBeCloseTo(200, 5);
    // TP2 +10 per unit * 50 = 500
    expect(sizing!.reward2Amount).toBeCloseTo(500, 5);
  });

  it('returns null when capital is zero', () => {
    const config = { accountSize: 0, maxRiskPct: 1, currency: 'EUR' as const, riskLimits: DEFAULT_RISK_LIMITS, minConfluence: 7, advancedMode: false };
    expect(computeSizing(config, 100, 98, 104, 110)).toBeNull();
  });

  it('returns null when stop is above entry (invalid long)', () => {
    const config = { accountSize: 10000, maxRiskPct: 1, currency: 'EUR' as const, riskLimits: DEFAULT_RISK_LIMITS, minConfluence: 7, advancedMode: false };
    expect(computeSizing(config, 100, 102, 104, 110)).toBeNull();
  });
});

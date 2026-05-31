import { describe, expect, it } from 'vitest';
import { buildCommandCenter, CommandCenterInput } from '@/lib/command-center';

function base(over: Partial<CommandCenterInput> = {}): CommandCenterInput {
  return {
    marketMood: 'neutral',
    cryptoBestScore: 50,
    stocksAvailable: false,
    stocksBestScore: null,
    goldTrendOk: true,
    openPositionsCount: 0,
    positionsNeedingAttention: 0,
    hasHighImpactEventWithin24h: false,
    ...over
  };
}

describe('buildCommandCenter', () => {
  it('recommends aktiv handeln on strong crypto', () => {
    const r = buildCommandCenter(base({ cryptoBestScore: 80, marketMood: 'risk-on' }));
    expect(r.decision).toBe('aktiv_handeln');
    expect(r.bestAssetClass).toBe('crypto');
  });

  it('recommends nur Watchlist on watchable crypto', () => {
    const r = buildCommandCenter(base({ cryptoBestScore: 65 }));
    expect(r.decision).toBe('nur_watchlist');
  });

  it('recommends cash schützen on risk-off + no strong setup', () => {
    // Gold is still defensively-stable in risk-off, so it can keep the asset
    // pick — but the decision should be "cash_schuetzen" because no setup
    // is strong enough to act.
    const r = buildCommandCenter(base({ marketMood: 'risk-off', cryptoBestScore: 30, goldTrendOk: false }));
    expect(r.decision).toBe('cash_schuetzen');
    expect(r.bestAssetClass).toBe('cash');
  });

  it('recommends cash schützen before a high-impact event', () => {
    const r = buildCommandCenter(base({ cryptoBestScore: 70, hasHighImpactEventWithin24h: true }));
    expect(r.decision).toBe('cash_schuetzen');
  });

  it('escalates "Positionen managen" when positions need attention', () => {
    const r = buildCommandCenter(base({ openPositionsCount: 3, positionsNeedingAttention: 1 }));
    expect(r.decision).toBe('positionen_managen');
  });

  it('falls back to gold when nothing else has signals but gold is stable', () => {
    const r = buildCommandCenter(base({ cryptoBestScore: 50, goldTrendOk: true }));
    expect(r.bestAssetClass).toBe('gold');
  });
});

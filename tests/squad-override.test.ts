import { describe, expect, it } from 'vitest';
import { applySquadAdjustment, recomputePoissonProbs, type SquadOverride } from '@/lib/sport/squad-override';

function override(home: SquadOverride['homeFactors'], away: SquadOverride['awayFactors'] = []): SquadOverride {
  return {
    fixtureId: 'fx-test',
    homeFactors: home,
    awayFactors: away,
    updatedAt: 0
  };
}

describe('applySquadAdjustment', () => {
  it('null override → alle Multiplier 1, leere Faktoren', () => {
    const adj = applySquadAdjustment(null);
    expect(adj.homeLambdaMul).toBe(1);
    expect(adj.awayLambdaMul).toBe(1);
    expect(adj.factors).toEqual([]);
    expect(adj.totalFactors).toBe(0);
  });

  it('Heim-Topscorer-Ausfall → eigene lambda runter, gegnerische unveraendert', () => {
    const adj = applySquadAdjustment(override(['top-scorer-out']));
    expect(adj.homeLambdaMul).toBeCloseTo(0.90, 2);
    expect(adj.awayLambdaMul).toBe(1);
    expect(adj.factors[0]).toContain('Heim');
    expect(adj.totalFactors).toBe(1);
  });

  it('Heim-Torwart fehlt → Gegner-lambda hoch', () => {
    const adj = applySquadAdjustment(override(['goalkeeper-out']));
    expect(adj.homeLambdaMul).toBe(1);
    expect(adj.awayLambdaMul).toBeCloseTo(1.15, 2);
  });

  it('Auswaerts-Innenverteidiger fehlt → Heim-lambda hoch (Heim trifft Gegner besser)', () => {
    const adj = applySquadAdjustment(override([], ['center-back-out']));
    expect(adj.homeLambdaMul).toBeCloseTo(1.10, 2);
    expect(adj.awayLambdaMul).toBe(1);
  });

  it('Mehrere Faktoren stapeln multiplikativ', () => {
    const adj = applySquadAdjustment(override(['top-scorer-out', 'multiple-starters-out']));
    // 0.90 × 0.92 = 0.828, awayLambdaMul = 1 × 1.05 = 1.05
    expect(adj.homeLambdaMul).toBeCloseTo(0.828, 2);
    expect(adj.awayLambdaMul).toBeCloseTo(1.05, 2);
    expect(adj.totalFactors).toBe(2);
    expect(adj.factors).toHaveLength(2);
  });

  it('Heim voll fokussiert + Auswaerts Rotation → Heim stark hoch', () => {
    const adj = applySquadAdjustment(override(['fully-focused'], ['rotation-mode']));
    expect(adj.homeLambdaMul).toBeCloseTo(1.05, 2);
    expect(adj.awayLambdaMul).toBeCloseTo(0.92, 2);
  });

  it('Cap auf ±25 %: extreme Kombinationen werden geclamped', () => {
    // Theoretisch: Heim hat alle 6 schlechten Faktoren → unter 0.75
    const adj = applySquadAdjustment(override([
      'top-scorer-out', 'goalkeeper-out', 'center-back-out',
      'multiple-starters-out', 'rotation-mode'
    ]));
    expect(adj.homeLambdaMul).toBeGreaterThanOrEqual(0.75);
    expect(adj.awayLambdaMul).toBeLessThanOrEqual(1.25);
  });

  it('Unbekannter Faktor wird ignoriert (Forward-Compat)', () => {
    // @ts-expect-error Test mit invalidem Faktor-String
    const adj = applySquadAdjustment(override(['no-such-factor']));
    expect(adj.homeLambdaMul).toBe(1);
    expect(adj.awayLambdaMul).toBe(1);
  });
});

describe('recomputePoissonProbs', () => {
  it('Symmetrische Lambdas → Heim ≈ Auswaerts, Remis ≠ 0', () => {
    const r = recomputePoissonProbs(1.3, 1.3);
    expect(r.pHome).toBeCloseTo(r.pAway, 1);
    expect(r.pDraw).toBeGreaterThan(0);
    expect(r.pHome + r.pDraw + r.pAway).toBeCloseTo(1.0, 3);
  });

  it('Hoehe Heim-Lambda → Heim-Wahrscheinlichkeit steigt', () => {
    const equal = recomputePoissonProbs(1.5, 1.5);
    const tilt = recomputePoissonProbs(2.5, 1.0);
    expect(tilt.pHome).toBeGreaterThan(equal.pHome);
    expect(tilt.likelyScore.home).toBeGreaterThanOrEqual(tilt.likelyScore.away);
  });

  it('Lambdas <= 0 produzieren keine NaN-Wahrscheinlichkeiten', () => {
    const r = recomputePoissonProbs(0.1, 0.1);
    expect(Number.isFinite(r.pHome)).toBe(true);
    expect(Number.isFinite(r.pDraw)).toBe(true);
    expect(Number.isFinite(r.pAway)).toBe(true);
    expect(r.pHome + r.pDraw + r.pAway).toBeCloseTo(1.0, 3);
  });
});

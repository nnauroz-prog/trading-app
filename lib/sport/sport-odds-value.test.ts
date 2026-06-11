import { describe, expect, it } from 'vitest';
import {
  decimalOddsToImpliedProbability,
  calculateValueEdge,
  calculateExpectedValue,
  classifyValueSignal,
  applyOddsRiskAdjustment,
  priorityRank,
  type SportOddsValueInput
} from '@/lib/sport/sport-odds-value';

function baseInput(over: Partial<SportOddsValueInput> = {}): SportOddsValueInput {
  return {
    modelProbability: 0.7,
    displayProbability: 0.68,
    decimalOdds: 1.8,
    marketType: '1X2',
    dataConfidence: 90,
    qualityScore: 85,
    marketStability: 'STRONG',
    modelDisagreement: 'LOW',
    calibrationLabel: 'KALIBRIERT',
    baseVerdict: 'FREIGABE',
    hasOfficialFixture: true,
    isTbdTeam: false,
    isPairingVerified: true,
    sourceCompleteness: 90,
    hasHardBlocker: false,
    riskMode: 'BALANCED',
    ...over
  };
}

describe('decimalOddsToImpliedProbability', () => {
  it('Quote 2.0 -> 0.5', () => {
    expect(decimalOddsToImpliedProbability(2.0)).toBe(0.5);
  });
  it('Quote 1.5 -> 0.6667 etwa', () => {
    const p = decimalOddsToImpliedProbability(1.5);
    expect(p).toBeCloseTo(0.6667, 3);
  });
  it('Quote <= 1 oder ungueltig -> 0', () => {
    expect(decimalOddsToImpliedProbability(1)).toBe(0);
    expect(decimalOddsToImpliedProbability(0.5)).toBe(0);
    expect(decimalOddsToImpliedProbability(NaN)).toBe(0);
  });
});

describe('calculateValueEdge', () => {
  it('Edge in Prozentpunkten', () => {
    expect(calculateValueEdge(0.6, 0.5)).toBe(10);
    expect(calculateValueEdge(0.45, 0.5)).toBe(-5);
  });
});

describe('calculateExpectedValue', () => {
  it('Model 60 % und Quote 2.0 -> +0.2', () => {
    expect(calculateExpectedValue(0.6, 2.0)).toBeCloseTo(0.2, 3);
  });
  it('Quote ungueltig -> 0', () => {
    expect(calculateExpectedValue(0.6, 1)).toBe(0);
  });
});

describe('classifyValueSignal', () => {
  it('VALUE bei positiver Edge >= 5 ppt und guter Datenlage', () => {
    const c = classifyValueSignal(baseInput({ modelProbability: 0.6, decimalOdds: 2.0 }));
    expect(c.valueLabel).toBe('VALUE');
    expect(c.valueEdge).toBe(10);
  });

  it('NO_VALUE wenn Modell unter implizierter Quote', () => {
    const c = classifyValueSignal(baseInput({ modelProbability: 0.45, decimalOdds: 2.0 }));
    expect(c.valueLabel).toBe('NO_VALUE');
  });

  it('FAIR bei kleiner Edge im Band -3..+5', () => {
    const c = classifyValueSignal(baseInput({ modelProbability: 0.52, decimalOdds: 2.0 }));
    expect(c.valueLabel).toBe('FAIR');
  });

  it('DANGEROUS bei hoher Quote und schwacher Datenlage', () => {
    const c = classifyValueSignal(baseInput({
      modelProbability: 0.60,
      decimalOdds: 2.5,
      dataConfidence: 60,
      qualityScore: 50
    }));
    expect(c.valueLabel).toBe('DANGEROUS');
    expect(c.oddsWarning).toContain('Vorsicht');
  });

  it('DANGEROUS auch wenn Kalibrierung UEBERSCHAETZT', () => {
    const c = classifyValueSignal(baseInput({
      modelProbability: 0.60,
      decimalOdds: 2.5,
      calibrationLabel: 'UEBERSCHAETZT'
    }));
    expect(c.valueLabel).toBe('DANGEROUS');
  });

  it('NO_QUOTE wenn keine Quote vorhanden', () => {
    const c = classifyValueSignal(baseInput({ decimalOdds: null }));
    expect(c.valueLabel).toBe('NO_QUOTE');
    expect(c.impliedProbability).toBeNull();
  });

  it('NO_QUOTE bei ungueltiger Quote <= 1', () => {
    const c = classifyValueSignal(baseInput({ decimalOdds: 1.0 }));
    expect(c.valueLabel).toBe('NO_QUOTE');
  });

  it('VALUE blockiert wenn marketStability WEAK', () => {
    const c = classifyValueSignal(baseInput({
      modelProbability: 0.6,
      decimalOdds: 2.0,
      marketStability: 'WEAK',
      dataConfidence: 90,
      qualityScore: 90
    }));
    // marketStability WEAK -> DANGEROUS (looksAttractive + dangerousMarket)
    expect(c.valueLabel).toBe('DANGEROUS');
  });

  it('VALUE blockiert wenn hardBlocker aktiv (kein DANGEROUS — Daten gut)', () => {
    const input = baseInput({
      modelProbability: 0.6,
      decimalOdds: 2.0,
      hasHardBlocker: true
    });
    const c = classifyValueSignal(input);
    // Edge > 5, aber hardBlocker greift in valueOk-Pruefung
    // -> faellt zu NO_VALUE / FAIR? edge=10 ppt, faellt aus FAIR-Band
    // -> NO_VALUE wenn model <= implied, sonst rutscht in NO_VALUE
    // weil valueOk false und kein dangerousData/Market.
    // Spezifikation: VALUE darf nicht erscheinen.
    expect(c.valueLabel).not.toBe('VALUE');
  });
});

describe('applyOddsRiskAdjustment - VALUE/FAIR/NO_VALUE Flow', () => {
  it('VALUE + FREIGABE -> adjustedSignal FREIGABE', () => {
    const o = applyOddsRiskAdjustment(baseInput({ modelProbability: 0.6, decimalOdds: 2.0 }));
    expect(o.valueLabel).toBe('VALUE');
    expect(o.adjustedSignal).toBe('FREIGABE');
  });

  it('DANGEROUS daempft FREIGABE auf BEOBACHTEN', () => {
    const o = applyOddsRiskAdjustment(baseInput({
      modelProbability: 0.6,
      decimalOdds: 2.5,
      dataConfidence: 60,
      qualityScore: 50
    }));
    expect(o.valueLabel).toBe('DANGEROUS');
    expect(o.adjustedSignal).toBe('BEOBACHTEN');
  });

  it('Keine Fake-Quote: NO_QUOTE bleibt NO_QUOTE und FREIGABE bleibt FREIGABE', () => {
    const o = applyOddsRiskAdjustment(baseInput({ decimalOdds: null }));
    expect(o.valueLabel).toBe('NO_QUOTE');
    expect(o.impliedProbability).toBeNull();
    expect(o.valueEdge).toBeNull();
    expect(o.adjustedSignal).toBe('FREIGABE');
  });
});

describe('applyOddsRiskAdjustment - HIGH_RISK Modus', () => {
  function highRiskInput(over: Partial<SportOddsValueInput> = {}): SportOddsValueInput {
    return baseInput({
      baseVerdict: 'NICHT_VERWENDEN',
      riskMode: 'HIGH_RISK',
      modelProbability: 0.62,
      decimalOdds: 2.6,
      dataConfidence: 70,
      qualityScore: 65,
      sourceCompleteness: 70,
      ...over
    });
  }

  it('HIGH_RISK erscheint bei verifizierter Paarung + Edge >= 7 ppt', () => {
    const o = applyOddsRiskAdjustment(highRiskInput());
    expect(o.adjustedSignal).toBe('HIGH_RISK');
    expect(o.valueEdge).toBeGreaterThanOrEqual(7);
  });

  it('HIGH_RISK blockiert bei TBD-Team', () => {
    const o = applyOddsRiskAdjustment(highRiskInput({ isTbdTeam: true }));
    expect(o.adjustedSignal).toBe('NICHT_VERWENDEN');
    expect(o.blockers.join(' ')).toContain('TBD');
  });

  it('HIGH_RISK blockiert bei unverifizierter Paarung', () => {
    const o = applyOddsRiskAdjustment(highRiskInput({ isPairingVerified: false }));
    expect(o.adjustedSignal).toBe('NICHT_VERWENDEN');
    expect(o.blockers.join(' ')).toContain('Paarung');
  });

  it('HIGH_RISK blockiert wenn keine Quote vorhanden', () => {
    const o = applyOddsRiskAdjustment(highRiskInput({ decimalOdds: null }));
    expect(o.adjustedSignal).toBe('NICHT_VERWENDEN');
    expect(o.blockers.join(' ')).toContain('Quote');
  });

  it('HIGH_RISK blockiert wenn Fixture nicht offiziell', () => {
    const o = applyOddsRiskAdjustment(highRiskInput({ hasOfficialFixture: false }));
    expect(o.adjustedSignal).toBe('NICHT_VERWENDEN');
  });

  it('HIGH_RISK blockiert bei sourceCompleteness < 65', () => {
    const o = applyOddsRiskAdjustment(highRiskInput({ sourceCompleteness: 50 }));
    expect(o.adjustedSignal).toBe('NICHT_VERWENDEN');
  });

  it('HIGH_RISK blockiert bei marketStability WEAK', () => {
    const o = applyOddsRiskAdjustment(highRiskInput({ marketStability: 'WEAK' }));
    expect(o.adjustedSignal).toBe('NICHT_VERWENDEN');
  });

  it('HIGH_RISK blockiert bei modelDisagreement HIGH', () => {
    const o = applyOddsRiskAdjustment(highRiskInput({ modelDisagreement: 'HIGH' }));
    expect(o.adjustedSignal).toBe('NICHT_VERWENDEN');
  });

  it('HIGH RISK wird nie als FREIGABE angezeigt', () => {
    const o = applyOddsRiskAdjustment(highRiskInput());
    expect(o.adjustedSignal).not.toBe('FREIGABE');
  });

  it('BALANCED Mode zeigt keine HIGH_RISK-Picks (NICHT_VERWENDEN bleibt)', () => {
    const o = applyOddsRiskAdjustment(highRiskInput({ riskMode: 'BALANCED' }));
    expect(o.adjustedSignal).toBe('NICHT_VERWENDEN');
  });

  it('PRECISION Mode zeigt keine HIGH_RISK-Picks (NICHT_VERWENDEN bleibt)', () => {
    const o = applyOddsRiskAdjustment(highRiskInput({ riskMode: 'PRECISION' }));
    expect(o.adjustedSignal).toBe('NICHT_VERWENDEN');
  });
});

describe('priorityRank — Reihenfolge laut Master-Prompt', () => {
  function out(over: Partial<ReturnType<typeof applyOddsRiskAdjustment>> = {}) {
    return {
      impliedProbability: null,
      valueEdge: null,
      expectedValue: null,
      valueLabel: 'NO_QUOTE' as const,
      oddsWarning: null,
      adjustedSignal: 'FREIGABE' as const,
      reasons: [],
      blockers: [],
      ...over
    };
  }
  it('FREIGABE+VALUE rank 1', () => expect(priorityRank(out({ adjustedSignal: 'FREIGABE', valueLabel: 'VALUE' }))).toBe(1));
  it('FREIGABE ohne Quote rank 2', () => expect(priorityRank(out({ adjustedSignal: 'FREIGABE', valueLabel: 'NO_QUOTE' }))).toBe(2));
  it('BEOBACHTEN+VALUE rank 3', () => expect(priorityRank(out({ adjustedSignal: 'BEOBACHTEN', valueLabel: 'VALUE' }))).toBe(3));
  it('HIGH_RISK+VALUE rank 4', () => expect(priorityRank(out({ adjustedSignal: 'HIGH_RISK', valueLabel: 'VALUE' }))).toBe(4));
  it('BEOBACHTEN ohne Quote rank 5', () => expect(priorityRank(out({ adjustedSignal: 'BEOBACHTEN', valueLabel: 'NO_QUOTE' }))).toBe(5));
  it('NICHT_VERWENDEN rank 6', () => expect(priorityRank(out({ adjustedSignal: 'NICHT_VERWENDEN' }))).toBe(6));

  it('HIGH RISK steht nie ueber FREIGABE in der Sortierung', () => {
    const freigabeOhneQuote = priorityRank(out({ adjustedSignal: 'FREIGABE', valueLabel: 'NO_QUOTE' }));
    const highRiskMitValue = priorityRank(out({ adjustedSignal: 'HIGH_RISK', valueLabel: 'VALUE' }));
    expect(freigabeOhneQuote).toBeLessThan(highRiskMitValue);
  });
});

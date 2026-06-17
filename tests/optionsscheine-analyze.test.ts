import { describe, it, expect } from 'vitest';
import { analyzeOptionsscheinInput } from '@/lib/optionsscheine/analyze';
import { buildScenarios } from '@/lib/optionsscheine/scenarios';

describe('analyzeOptionsscheinInput', () => {
  it('liefert null bei ungueltigen Pflichtfeldern', () => {
    expect(analyzeOptionsscheinInput({ underlyingName: '', underlyingPrice: 100, strike: 100, direction: 'call' })).toBeNull();
    expect(analyzeOptionsscheinInput({ underlyingName: 'X', underlyingPrice: 0, strike: 100, direction: 'call' })).toBeNull();
    expect(analyzeOptionsscheinInput({ underlyingName: 'X', underlyingPrice: 100, strike: 0, direction: 'call' })).toBeNull();
  });

  it('Call ATM mit 12 Monaten ist Mittleres Risiko', () => {
    const a = analyzeOptionsscheinInput({
      underlyingName: 'SAP',
      underlyingPrice: 200,
      strike: 200,
      direction: 'call',
      expiryIso: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    });
    expect(a).not.toBeNull();
    expect(a!.moneyness.classification).toBe('atm');
    expect(a!.estimatedDelta).toBeGreaterThan(0.3);
    expect(a!.estimatedDelta).toBeLessThan(0.7);
    expect(['Mittleres Risiko', 'Hohes Risiko']).toContain(a!.riskClass);
  });

  it('Call deep OTM mit kurzer Laufzeit ist sehr riskant', () => {
    const inTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const a = analyzeOptionsscheinInput({
      underlyingName: 'DAX',
      underlyingPrice: 18000,
      strike: 24000,
      direction: 'call',
      expiryIso: inTwoWeeks
    });
    expect(a).not.toBeNull();
    expect(a!.moneyness.classification).toBe('deep_otm');
    expect(a!.riskClass).toBe('Sehr hohes Risiko');
    expect(a!.thetaUrgency).toBe('critical');
  });

  it('Put ITM mit 18 Monaten Restlaufzeit ist defensiver', () => {
    const inEighteenMonths = new Date(Date.now() + 540 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const a = analyzeOptionsscheinInput({
      underlyingName: 'Tesla',
      underlyingPrice: 200,
      strike: 250,
      direction: 'put',
      expiryIso: inEighteenMonths
    });
    expect(a).not.toBeNull();
    expect(a!.moneyness.classification).toBe('itm');
    expect(['Niedriges Risiko', 'Mittleres Risiko']).toContain(a!.riskClass);
  });

  it('Knock-Out-Marker erzeugt explizite Totalverlust-Warnung', () => {
    const a = analyzeOptionsscheinInput({
      underlyingName: 'DAX',
      underlyingPrice: 18000,
      strike: 16000,
      direction: 'call',
      expiryIso: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      knockOut: true
    });
    expect(a).not.toBeNull();
    expect(a!.warnings.some((w) => w.toLowerCase().includes('knock-out'))).toBe(true);
  });

  it('Markt-Premium und Ratio aktivieren effectiveLeverage', () => {
    const a = analyzeOptionsscheinInput({
      underlyingName: 'SAP',
      underlyingPrice: 200,
      strike: 200,
      direction: 'call',
      expiryIso: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      premiumQuoted: 2,
      ratio: 10
    });
    expect(a).not.toBeNull();
    expect(a!.effectiveLeverage).not.toBeNull();
    expect(a!.effectiveLeverage!).toBeGreaterThan(1);
    expect(a!.ratio).toBe(10);
    expect(a!.premiumQuoted).toBe(2);
  });
});

describe('buildScenarios', () => {
  const baseInput = {
    underlyingPrice: 100,
    strike: 100,
    direction: 'call' as const,
    expiryIso: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    ratio: 1,
    premiumQuoted: null
  };

  it('liefert sieben Szenarien fuer -20/-10/-5/0/+5/+10/+20', () => {
    const rows = buildScenarios(baseInput);
    expect(rows.map((r) => r.underlyingDeltaPct)).toEqual([-20, -10, -5, 0, 5, 10, 20]);
  });

  it('Call-Premium steigt monoton mit Underlying-Preis', () => {
    const rows = buildScenarios(baseInput);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].approxPremium).toBeGreaterThanOrEqual(rows[i - 1].approxPremium);
    }
  });

  it('Put-Premium faellt monoton mit Underlying-Preis', () => {
    const rows = buildScenarios({ ...baseInput, direction: 'put' });
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].approxPremium).toBeLessThanOrEqual(rows[i - 1].approxPremium);
    }
  });

  it('Intrinsischer Wert wird durch ratio geteilt', () => {
    const rows = buildScenarios({ ...baseInput, underlyingPrice: 200, strike: 100, ratio: 10 });
    const zero = rows.find((r) => r.underlyingDeltaPct === 0)!;
    expect(zero.intrinsic).toBeCloseTo((200 - 100) / 10, 2);
  });

  it('premiumDeltaPct ist null wenn kein Markt-Premium', () => {
    const rows = buildScenarios(baseInput);
    expect(rows.every((r) => r.premiumDeltaPct === null)).toBe(true);
  });

  it('premiumDeltaPct ist 0 fuer den 0%-Szenario, wenn Markt-Premium gesetzt', () => {
    const rows = buildScenarios({ ...baseInput, premiumQuoted: 5 });
    const zero = rows.find((r) => r.underlyingDeltaPct === 0)!;
    expect(zero.premiumDeltaPct).toBeCloseTo(0, 5);
  });

  it('liefert leere Liste bei ungueltigen Eingaben', () => {
    expect(buildScenarios({ ...baseInput, underlyingPrice: 0 })).toEqual([]);
    expect(buildScenarios({ ...baseInput, strike: -1 })).toEqual([]);
  });
});

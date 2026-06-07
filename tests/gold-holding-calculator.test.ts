import { describe, expect, it } from 'vitest';
import {
  calculateGoldHoldingPerformance,
  toGrams,
  pureGoldGramsFor,
  gramsToOunces,
  GRAMS_PER_TROY_OUNCE,
  type GoldHoldingInput,
  type MarketContext
} from '@/lib/gold/gold-holding-calculator';

function neutralContext(over: Partial<MarketContext> = {}): MarketContext {
  return {
    ma50: 1900, ma200: 1850, rsi: 50, atr: 25,
    performance30d: 0, performance90d: 0,
    fiftyTwoWeekPosition: 50,
    priceAboveMa50: true, priceAboveMa200: true, ma50AboveMa200: true,
    ...over
  };
}

function baseInput(over: Partial<GoldHoldingInput> = {}): GoldHoldingInput {
  return {
    purchaseDate: '2024-06-09',
    amount: 100,
    amountUnit: 'gram',
    purityPromille: 999,
    purchasePriceMode: 'auto',
    purchasePrice: undefined,
    fees: undefined,
    sellSpreadPct: undefined,
    currentGoldPricePerOz: 2400,
    historicalGoldPricePerOz: 2000,
    currentDate: '2026-06-09',
    marketContext: neutralContext(),
    ...over
  };
}

describe('Unit-Konvertierung', () => {
  it('1. Gramm zu Feinunze: 31.1034768 Gramm = 1 Feinunze (Feingold 999.99…)', () => {
    expect(gramsToOunces(GRAMS_PER_TROY_OUNCE)).toBeCloseTo(1, 6);
  });

  it('2. Unze zu Gramm: 1 Feinunze = 31.1034768 Gramm', () => {
    expect(toGrams(1, 'ounce')).toBeCloseTo(GRAMS_PER_TROY_OUNCE, 6);
  });

  it('3. Kilogramm zu Gramm: 2 kg = 2000 g', () => {
    expect(toGrams(2, 'kilogram')).toBe(2000);
  });
});

describe('Legierung — Feingoldmenge', () => {
  it('4. Legierung 999: 100 g brutto → 99.9 g Feingold', () => {
    expect(pureGoldGramsFor(100, 999)).toBeCloseTo(99.9, 6);
  });

  it('5. Legierung 750: 100 g brutto → 75 g Feingold', () => {
    expect(pureGoldGramsFor(100, 750)).toBe(75);
  });

  it('6. Legierung 585: 100 g brutto → 58.5 g Feingold', () => {
    expect(pureGoldGramsFor(100, 585)).toBe(58.5);
  });
});

describe('Kaufpreis-Auflösung', () => {
  it('7. Auto: nutzt historischen Goldpreis', () => {
    const r = calculateGoldHoldingPerformance(baseInput({
      purchasePriceMode: 'auto',
      historicalGoldPricePerOz: 2000
    }));
    expect(r.purchasePricePerOz).toBeCloseTo(2000, 6);
    // 100 g brutto × 999/1000 = 99.9 g pur ≈ 3.2118 oz × $2000 = $6423.69
    expect(r.purchaseValue).toBeCloseTo(99.9 / GRAMS_PER_TROY_OUNCE * 2000, 4);
  });

  it('8. Manuell gesamt: Gesamtsumme USD', () => {
    const r = calculateGoldHoldingPerformance(baseInput({
      purchasePriceMode: 'total',
      purchasePrice: 6000
    }));
    expect(r.purchaseValue).toBe(6000);
    // purchasePricePerOz = 6000 / pureOunces
    const expectedPerOz = 6000 / (99.9 / GRAMS_PER_TROY_OUNCE);
    expect(r.purchasePricePerOz).toBeCloseTo(expectedPerOz, 4);
  });

  it('9. Manuell pro Gramm: 60 $/g × 100 g = 6000 $', () => {
    const r = calculateGoldHoldingPerformance(baseInput({
      purchasePriceMode: 'per-gram',
      purchasePrice: 60
    }));
    expect(r.purchaseValue).toBeCloseTo(6000, 6);
  });

  it('10. Manuell pro Unze: 2000 $/oz × pureOunces', () => {
    const r = calculateGoldHoldingPerformance(baseInput({
      purchasePriceMode: 'per-ounce',
      purchasePrice: 2000
    }));
    expect(r.purchasePricePerOz).toBe(2000);
    const expectedValue = 2000 * (99.9 / GRAMS_PER_TROY_OUNCE);
    expect(r.purchaseValue).toBeCloseTo(expectedValue, 4);
  });
});

describe('Performance', () => {
  it('11. Gewinnberechnung: Kauf 2000, Heute 2400 → +20 %', () => {
    const r = calculateGoldHoldingPerformance(baseInput({
      purchasePriceMode: 'auto',
      historicalGoldPricePerOz: 2000,
      currentGoldPricePerOz: 2400
    }));
    expect(r.percentPnL).toBeCloseTo(20, 4);
    expect(r.absolutePnL).toBeGreaterThan(0);
  });

  it('12. Verlustberechnung: Kauf 2400, Heute 2000 → ~−16.67 %', () => {
    const r = calculateGoldHoldingPerformance(baseInput({
      purchasePriceMode: 'auto',
      historicalGoldPricePerOz: 2400,
      currentGoldPricePerOz: 2000
    }));
    expect(r.percentPnL).toBeCloseTo(-16.6667, 3);
    expect(r.absolutePnL).toBeLessThan(0);
  });

  it('13. Spread-Abzug: 3 % Spread reduziert Verkaufserlös um 3 %', () => {
    const r = calculateGoldHoldingPerformance(baseInput({
      sellSpreadPct: 3,
      currentGoldPricePerOz: 2000,
      historicalGoldPricePerOz: 2000
    }));
    expect(r.currentValue).not.toBeNull();
    expect(r.estimatedSellValueAfterSpread).toBeCloseTo(r.currentValue! * 0.97, 6);
  });

  it('14. Gebühren werden auf den Einstand draufgerechnet', () => {
    const r = calculateGoldHoldingPerformance(baseInput({
      purchasePriceMode: 'total',
      purchasePrice: 6000,
      fees: 50
    }));
    expect(r.purchaseValue).toBe(6050);
    // Break-Even pro Unze steigt entsprechend.
    const expectedBreakEven = 6050 / (99.9 / GRAMS_PER_TROY_OUNCE);
    expect(r.breakEvenPricePerOz).toBeCloseTo(expectedBreakEven, 4);
  });

  it('15. Annualisierte Rendite: 20 % über 730 Tage ≈ 9.54 % p.a.', () => {
    const r = calculateGoldHoldingPerformance(baseInput({
      purchaseDate: '2024-06-09',
      currentDate: '2026-06-09',
      purchasePriceMode: 'auto',
      historicalGoldPricePerOz: 2000,
      currentGoldPricePerOz: 2400
    }));
    expect(r.holdingDays).toBe(730);
    expect(r.annualizedReturn).not.toBeNull();
    expect(r.annualizedReturn!).toBeCloseTo(9.5445, 2);
  });

  it('16. Break-even-Preis = Einstandswert / Feingold-Unzen', () => {
    const r = calculateGoldHoldingPerformance(baseInput({
      purchasePriceMode: 'total',
      purchasePrice: 6000
    }));
    const expectedBreakEven = 6000 / (99.9 / GRAMS_PER_TROY_OUNCE);
    expect(r.breakEvenPricePerOz).toBeCloseTo(expectedBreakEven, 4);
  });
});

describe('Verdict-Engine', () => {
  it('17. NACHKAUFEN: klares Aufwärts-Setup', () => {
    const r = calculateGoldHoldingPerformance(baseInput({
      marketContext: neutralContext({
        rsi: 55,
        performance30d: 4,
        performance90d: 8,
        fiftyTwoWeekPosition: 70,
        priceAboveMa50: true,
        priceAboveMa200: true,
        ma50AboveMa200: true
      })
    }));
    expect(r.verdict).toBe('NACHKAUFEN');
    expect(r.verdictReasons.length).toBeGreaterThanOrEqual(3);
  });

  it('18. HALTEN: über MA200, kein klares Verkaufssignal', () => {
    const r = calculateGoldHoldingPerformance(baseInput({
      marketContext: neutralContext({
        rsi: 68,
        performance30d: 15,
        performance90d: 22,
        fiftyTwoWeekPosition: 88,
        priceAboveMa50: true,
        priceAboveMa200: true,
        ma50AboveMa200: true
      })
    }));
    expect(r.verdict).toBe('HALTEN');
  });

  it('19. VERKAUFEN: struktureller Bruch + schwaches Momentum', () => {
    const r = calculateGoldHoldingPerformance(baseInput({
      marketContext: neutralContext({
        rsi: 35,
        performance30d: -5,
        performance90d: -8,
        fiftyTwoWeekPosition: 25,
        priceAboveMa50: false,
        priceAboveMa200: false,
        ma50AboveMa200: false
      })
    }));
    expect(r.verdict).toBe('VERKAUFEN');
  });

  it('19b. VERKAUFEN: starker Gewinn + Überhitzung', () => {
    const r = calculateGoldHoldingPerformance(baseInput({
      purchasePriceMode: 'auto',
      historicalGoldPricePerOz: 1800,
      currentGoldPricePerOz: 2400,
      marketContext: neutralContext({
        rsi: 78,
        fiftyTwoWeekPosition: 95,
        priceAboveMa50: true, priceAboveMa200: true, ma50AboveMa200: true
      })
    }));
    expect(r.verdict).toBe('VERKAUFEN');
  });

  it('20. BEOBACHTEN: gemischte Signale (zwischen MA50 und MA200)', () => {
    const r = calculateGoldHoldingPerformance(baseInput({
      marketContext: neutralContext({
        rsi: 50,
        performance30d: 0,
        performance90d: 0,
        fiftyTwoWeekPosition: 50,
        priceAboveMa50: false,
        priceAboveMa200: true,
        ma50AboveMa200: false
      })
    }));
    expect(r.verdict).toBe('BEOBACHTEN');
  });
});

describe('Daten-Verfügbarkeit', () => {
  it('21. Fehlende historische Daten + Auto-Mode → Empty-State-Warning + purchaseValue null', () => {
    const r = calculateGoldHoldingPerformance(baseInput({
      purchasePriceMode: 'auto',
      historicalGoldPricePerOz: null
    }));
    expect(r.purchasePricePerOz).toBeNull();
    expect(r.purchaseValue).toBeNull();
    expect(r.percentPnL).toBeNull();
    expect(r.warnings.some((w) => w.includes('Historische Daten unvollständig'))).toBe(true);
    expect(r.hasCompleteData).toBe(false);
  });

  it('22. Keine Fake-Werte bei fehlenden Daten: currentValue null wenn currentGoldPricePerOz null ist', () => {
    const r = calculateGoldHoldingPerformance(baseInput({
      currentGoldPricePerOz: null
    }));
    expect(r.currentValue).toBeNull();
    expect(r.absolutePnL).toBeNull();
    expect(r.percentPnL).toBeNull();
    expect(r.estimatedSellValueAfterSpread).toBeNull();
    expect(r.hasCompleteData).toBe(false);
  });
});

describe('Warnungs-Badges', () => {
  it('Überkauft wird angezeigt wenn RSI > 70', () => {
    const r = calculateGoldHoldingPerformance(baseInput({
      marketContext: neutralContext({ rsi: 75 })
    }));
    expect(r.warnings).toContain('Überkauft (RSI über 70)');
  });

  it('Steuerstatus prüfen ist immer enthalten', () => {
    const r = calculateGoldHoldingPerformance(baseInput());
    expect(r.warnings).toContain('Steuerstatus prüfen');
  });

  it('Verkauf nach Spread prüfen ab Spread ≥ 3 %', () => {
    const r = calculateGoldHoldingPerformance(baseInput({ sellSpreadPct: 3.5 }));
    expect(r.warnings).toContain('Verkauf nach Spread prüfen');
  });
});

describe('Edge Cases', () => {
  it('Haltedauer 0 Tage → annualizedReturn null', () => {
    const r = calculateGoldHoldingPerformance(baseInput({
      purchaseDate: '2026-06-09',
      currentDate: '2026-06-09'
    }));
    expect(r.holdingDays).toBe(0);
    expect(r.annualizedReturn).toBeNull();
  });

  it('Pure-Gold-Berechnung respektiert Einheit (Unzen)', () => {
    const r = calculateGoldHoldingPerformance(baseInput({
      amount: 1,
      amountUnit: 'ounce',
      purityPromille: 999
    }));
    expect(r.grossAmountGrams).toBeCloseTo(GRAMS_PER_TROY_OUNCE, 6);
    expect(r.pureGoldOunces).toBeCloseTo(0.999, 4);
  });

  it('Pure-Gold-Berechnung respektiert Einheit (Kilogramm)', () => {
    const r = calculateGoldHoldingPerformance(baseInput({
      amount: 1,
      amountUnit: 'kilogram',
      purityPromille: 999
    }));
    expect(r.grossAmountGrams).toBe(1000);
    expect(r.pureGoldGrams).toBeCloseTo(999, 6);
  });
});

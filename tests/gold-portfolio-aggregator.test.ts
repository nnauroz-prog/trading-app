import { describe, expect, it } from 'vitest';
import {
  aggregateGoldPortfolio,
  GRAMS_PER_TROY_OUNCE,
  type PortfolioHoldingInput
} from '@/lib/gold/gold-portfolio-aggregator';
import type { MarketContext } from '@/lib/gold/gold-holding-calculator';

function ctx(): MarketContext {
  return {
    ma50: 1900, ma200: 1850, rsi: 50, atr: 25,
    performance30d: 0, performance90d: 0,
    fiftyTwoWeekPosition: 50,
    priceAboveMa50: true, priceAboveMa200: true, ma50AboveMa200: true
  };
}

function holding(over: Partial<PortfolioHoldingInput> = {}): PortfolioHoldingInput {
  return {
    id: 'h-1',
    label: 'Test-Position',
    purchaseDate: '2024-06-09',
    amount: 100,
    amountUnit: 'gram',
    purityPromille: 999,
    purchasePriceMode: 'auto',
    historicalGoldPricePerOz: 2000,
    ...over
  };
}

describe('aggregateGoldPortfolio', () => {
  it('leere Liste → alles 0, totalPercentPnL null', () => {
    const s = aggregateGoldPortfolio([], 2400, '2026-06-09', ctx());
    expect(s.positions).toEqual([]);
    expect(s.totalPureGoldGrams).toBe(0);
    expect(s.totalPureGoldOunces).toBe(0);
    expect(s.totalPurchaseValue).toBe(0);
    expect(s.totalCurrentValue).toBe(0);
    expect(s.totalAbsolutePnL).toBe(0);
    expect(s.totalPercentPnL).toBeNull();
    expect(s.blendedCostPerOz).toBeNull();
    expect(s.taxFreeCount).toBe(0);
    expect(s.incompleteCount).toBe(0);
  });

  it('summiert Feingoldmenge über Positionen', () => {
    const inputs = [
      holding({ id: 'a', amount: 100, purityPromille: 999 }), // 99.9 g pur
      holding({ id: 'b', amount: 200, purityPromille: 750 })  // 150 g pur
    ];
    const s = aggregateGoldPortfolio(inputs, 2400, '2026-06-09', ctx());
    expect(s.totalPureGoldGrams).toBeCloseTo(249.9, 3);
    expect(s.totalPureGoldOunces).toBeCloseTo(249.9 / GRAMS_PER_TROY_OUNCE, 4);
  });

  it('Gesamt-PnL: Kauf 2000 → heute 2400 = +20 % auf alle Positionen mit gleicher Story', () => {
    const inputs = [
      holding({ id: 'a' }),
      holding({ id: 'b' })
    ];
    const s = aggregateGoldPortfolio(inputs, 2400, '2026-06-09', ctx());
    expect(s.totalPercentPnL).not.toBeNull();
    expect(s.totalPercentPnL!).toBeCloseTo(20, 2);
  });

  it('Blended Cost berücksichtigt unzen-gewichtete Kostenbasis', () => {
    // Position A: 100 g pur, gekauft zu 2000 $/oz
    // Position B: 200 g pur, gekauft zu 2200 $/oz
    // → gewichteter Mittelwert = (100 × 2000 + 200 × 2200) / 300 = 2133.33
    const inputs: PortfolioHoldingInput[] = [
      { ...holding({ id: 'a' }), historicalGoldPricePerOz: 2000 },
      { ...holding({ id: 'b', amount: 200 }), historicalGoldPricePerOz: 2200 }
    ];
    const s = aggregateGoldPortfolio(inputs, 2400, '2026-06-09', ctx());
    // Beide Positionen sind 999/1000 reines Feingold, also weight wie 99.9 vs 199.8 g.
    const aOz = 99.9 / GRAMS_PER_TROY_OUNCE;
    const bOz = 199.8 / GRAMS_PER_TROY_OUNCE;
    const expectedBlended = (aOz * 2000 + bOz * 2200) / (aOz + bOz);
    expect(s.blendedCostPerOz).not.toBeNull();
    expect(s.blendedCostPerOz!).toBeCloseTo(expectedBlended, 2);
  });

  it('Positionen ohne historischen Preis im Auto-Mode → incomplete, fließen NICHT in Summen', () => {
    const inputs: PortfolioHoldingInput[] = [
      { ...holding({ id: 'a' }), historicalGoldPricePerOz: 2000 },
      { ...holding({ id: 'b', amount: 200 }), historicalGoldPricePerOz: null }
    ];
    const s = aggregateGoldPortfolio(inputs, 2400, '2026-06-09', ctx());
    expect(s.incompleteCount).toBe(1);
    expect(s.totalPurchaseValue).toBeGreaterThan(0);
    // Aber TotalPureGoldGrams enthält alle (für die UI: was hast du physisch?).
    expect(s.totalPureGoldGrams).toBeCloseTo(99.9 + 199.8, 3);
  });

  it('Steuer-Status pro Position wird berechnet', () => {
    const inputs: PortfolioHoldingInput[] = [
      { ...holding({ id: 'a', purchaseDate: '2024-01-01' }) }, // > 1 Jahr
      { ...holding({ id: 'b', purchaseDate: '2026-01-01' }) }  // < 1 Jahr
    ];
    const s = aggregateGoldPortfolio(inputs, 2400, '2026-06-09', ctx());
    expect(s.taxFreeCount).toBe(1);
    expect(s.positions.find((p) => p.input.id === 'a')!.taxStatus.isTaxFree).toBe(true);
    expect(s.positions.find((p) => p.input.id === 'b')!.taxStatus.isTaxFree).toBe(false);
  });

  it('Keine Fake-Werte: fehlt aktueller Goldpreis → currentValue null pro Position', () => {
    const s = aggregateGoldPortfolio([holding()], null, '2026-06-09', ctx());
    expect(s.positions[0].currentValue).toBeNull();
    expect(s.positions[0].hasCompleteData).toBe(false);
    expect(s.totalCurrentValue).toBe(0);
  });

  it('Manueller Kaufpreis ohne historischen Preis → trotzdem komplett', () => {
    const inputs: PortfolioHoldingInput[] = [
      { ...holding({ id: 'a' }), purchasePriceMode: 'per-ounce', purchasePrice: 2000, historicalGoldPricePerOz: null }
    ];
    const s = aggregateGoldPortfolio(inputs, 2400, '2026-06-09', ctx());
    expect(s.incompleteCount).toBe(0);
    expect(s.positions[0].hasCompleteData).toBe(true);
  });
});

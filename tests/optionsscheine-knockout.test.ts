import { describe, it, expect } from 'vitest';
import { suggestKnockOuts } from '@/lib/optionsscheine/suggest-knockout';

describe('suggestKnockOuts', () => {
  it('liefert drei KO-Vorschlaege bei gueltigem Input', () => {
    const s = suggestKnockOuts({
      underlyingName: 'Apple',
      underlyingPrice: 295.96,
      direction: 'call',
      assetClass: 'aktie'
    });
    expect(s).toHaveLength(3);
    expect(s.map((x) => x.risk)).toEqual(['niedrig', 'mittel', 'hoch']);
  });

  it('Long-KO: Schwelle liegt UNTER dem aktuellen Kurs', () => {
    const s = suggestKnockOuts({
      underlyingName: 'SAP',
      underlyingPrice: 200,
      direction: 'call',
      assetClass: 'aktie'
    });
    for (const x of s) {
      expect(x.knockOutLevel).toBeLessThan(200);
    }
  });

  it('Short-KO (Put): Schwelle liegt UEBER dem aktuellen Kurs', () => {
    const s = suggestKnockOuts({
      underlyingName: 'SAP',
      underlyingPrice: 200,
      direction: 'put',
      assetClass: 'aktie'
    });
    for (const x of s) {
      expect(x.knockOutLevel).toBeGreaterThan(200);
    }
  });

  it('Puffer entspricht 5 / 10 / 20 % vom Kurs', () => {
    const s = suggestKnockOuts({
      underlyingName: 'SAP',
      underlyingPrice: 200,
      direction: 'call',
      assetClass: 'aktie'
    });
    const low = s.find((x) => x.risk === 'niedrig')!;
    const mid = s.find((x) => x.risk === 'mittel')!;
    const high = s.find((x) => x.risk === 'hoch')!;
    expect(low.bufferPct).toBeCloseTo(20, 0);
    expect(mid.bufferPct).toBeCloseTo(10, 0);
    expect(high.bufferPct).toBeCloseTo(5, 0);
    // Hebel-Reihenfolge
    expect(high.estimatedLeverage).toBeGreaterThan(mid.estimatedLeverage);
    expect(mid.estimatedLeverage).toBeGreaterThan(low.estimatedLeverage);
  });

  it('Knock-Out-Analysis enthaelt die Totalverlust-Warnung', () => {
    const s = suggestKnockOuts({
      underlyingName: 'Apple',
      underlyingPrice: 295.96,
      direction: 'call',
      assetClass: 'aktie'
    });
    for (const x of s) {
      const hasKO = x.analysis.warnings.some((w) => w.toLowerCase().includes('knock-out'));
      expect(hasKO).toBe(true);
    }
  });

  it('Krypto-Schwellen werden auf groessere Schritte gerundet', () => {
    const s = suggestKnockOuts({
      underlyingName: 'BTC',
      underlyingPrice: 70000,
      direction: 'call',
      assetClass: 'krypto'
    });
    // 70000 * 0.95 = 66500 -> auf 100er = 66500
    expect(s.find((x) => x.risk === 'hoch')!.knockOutLevel).toBe(66500);
    // 70000 * 0.80 = 56000 -> auf 100er = 56000
    expect(s.find((x) => x.risk === 'niedrig')!.knockOutLevel).toBe(56000);
  });

  it('liefert leere Liste bei ungueltigen Eingaben', () => {
    expect(suggestKnockOuts({ underlyingName: '', underlyingPrice: 100 })).toEqual([]);
    expect(suggestKnockOuts({ underlyingName: 'X', underlyingPrice: 0 })).toEqual([]);
  });
});

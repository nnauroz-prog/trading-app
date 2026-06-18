import { describe, it, expect } from 'vitest';
import { suggestHedge } from '@/lib/optionsscheine/suggest-hedge';

describe('suggestHedge', () => {
  it('liefert null bei ungueltigen Eingaben', () => {
    expect(suggestHedge({ underlyingName: '', underlyingPrice: 100 })).toBeNull();
    expect(suggestHedge({ underlyingName: 'X', underlyingPrice: 0 })).toBeNull();
    expect(suggestHedge({ underlyingName: 'X', underlyingPrice: 100, stopLossPct: 10 })).toBeNull(); // positiv -> ungueltig
  });

  it('Default-Hedge: -10 % Schutz, 6 Monate, Put-Strike unter Kurs', () => {
    const h = suggestHedge({ underlyingName: 'SAP', underlyingPrice: 200, assetClass: 'aktie' });
    expect(h).not.toBeNull();
    expect(h!.protectionStartPct).toBe(-10);
    expect(h!.monthsToExpiry).toBe(6);
    expect(h!.strike).toBeLessThan(200);
    expect(h!.strike).toBeGreaterThan(170);
  });

  it('Konservativer Hedge: -5 % schuetzt frueher, kostet aber mehr', () => {
    const wide = suggestHedge({ underlyingName: 'SAP', underlyingPrice: 200, stopLossPct: -5 });
    const tight = suggestHedge({ underlyingName: 'SAP', underlyingPrice: 200, stopLossPct: -15 });
    expect(wide).not.toBeNull();
    expect(tight).not.toBeNull();
    expect(wide!.costPctOfPosition).toBeGreaterThan(tight!.costPctOfPosition);
  });

  it('Hoehere sigma -> teurere Versicherung', () => {
    const calm = suggestHedge({ underlyingName: 'SAP', underlyingPrice: 200, sigma: 0.15 });
    const wild = suggestHedge({ underlyingName: 'SAP', underlyingPrice: 200, sigma: 0.60 });
    expect(calm).not.toBeNull();
    expect(wild).not.toBeNull();
    expect(wild!.costPctOfPosition).toBeGreaterThan(calm!.costPctOfPosition);
  });

  it('Hedge-Analyse hat direction=put und Knock-Out=false', () => {
    const h = suggestHedge({ underlyingName: 'AAPL', underlyingPrice: 295.96 });
    expect(h).not.toBeNull();
    expect(h!.analysis.instrument.direction).toBe('put');
    expect(h!.analysis.instrument.instrumentType).toBe('optionsschein');
  });

  it('Krypto-Hedge: 100:1-Ratio, Strike auf Krypto-Schritte gerundet', () => {
    const h = suggestHedge({ underlyingName: 'BTC', underlyingPrice: 70000, assetClass: 'krypto' });
    expect(h).not.toBeNull();
    expect(h!.analysis.ratio).toBe(100);
    // 70000 * 0.90 = 63000 -> bleibt 63000 (1000er-Rasterung)
    expect(h!.strike).toBe(63000);
  });

  it('Kostprozent ist plausibel — typischer 6-Monats-10 %-OTM-Put kostet 1-25 % der Position', () => {
    const h = suggestHedge({ underlyingName: 'SAP', underlyingPrice: 200, sigma: 0.30 });
    expect(h).not.toBeNull();
    expect(h!.costPctOfPosition).toBeGreaterThan(0.5);
    expect(h!.costPctOfPosition).toBeLessThan(25);
  });

  it('Laufzeit konfigurierbar', () => {
    const short = suggestHedge({ underlyingName: 'SAP', underlyingPrice: 200, monthsToExpiry: 3 });
    const long = suggestHedge({ underlyingName: 'SAP', underlyingPrice: 200, monthsToExpiry: 12 });
    expect(short!.monthsToExpiry).toBe(3);
    expect(long!.monthsToExpiry).toBe(12);
    expect(long!.costPctOfPosition).toBeGreaterThan(short!.costPctOfPosition);
  });
});

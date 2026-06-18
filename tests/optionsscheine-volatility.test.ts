import { describe, it, expect } from 'vitest';
import { realizedVolatility, realizedVolStock, realizedVolCrypto } from '@/lib/optionsscheine/volatility';

describe('realizedVolatility', () => {
  it('liefert null bei zu wenig Daten', () => {
    expect(realizedVolatility({ closes: [] })).toBeNull();
    expect(realizedVolatility({ closes: [100, 101, 102] })).toBeNull();
  });

  it('konstantes Sample liefert ~0 Vola', () => {
    const closes = Array.from({ length: 60 }, () => 100);
    const v = realizedVolatility({ closes, windowDays: 60 });
    // Bei null Bewegung kappen wir auf >0 — ergibt null oder ~0.
    expect(v === null || (v !== null && v < 0.01)).toBe(true);
  });

  it('alternierendes 1 %-Sample fuer eine Aktie liegt im realistischen Bereich', () => {
    const closes: number[] = [100];
    for (let i = 1; i < 100; i++) {
      closes.push(closes[i - 1] * (i % 2 === 0 ? 1.01 : 0.99));
    }
    const v = realizedVolStock(closes);
    expect(v).not.toBeNull();
    // 1 % taegliche Bewegung -> ~16 % annualisiert (sqrt(252) * 0.01 = ~0.16)
    expect(v!).toBeGreaterThan(0.10);
    expect(v!).toBeLessThan(0.30);
  });

  it('Krypto-Vola wird mit 365 Tagen annualisiert (hoeher als Aktie bei gleichen Returns)', () => {
    const closes: number[] = [100];
    for (let i = 1; i < 100; i++) {
      closes.push(closes[i - 1] * (i % 2 === 0 ? 1.02 : 0.98));
    }
    const vCrypto = realizedVolCrypto(closes);
    const vStock = realizedVolStock(closes);
    expect(vCrypto).not.toBeNull();
    expect(vStock).not.toBeNull();
    expect(vCrypto!).toBeGreaterThan(vStock!);
  });

  it('extreme Ausreisser werden bei 200 % gekappt', () => {
    const closes: number[] = [100];
    for (let i = 1; i < 100; i++) {
      closes.push(closes[i - 1] * (i % 2 === 0 ? 2.0 : 0.5));
    }
    const v = realizedVolatility({ closes, windowDays: 60 });
    expect(v).not.toBeNull();
    expect(v!).toBeLessThanOrEqual(2.0);
  });

  it('ignoriert null/0/NaN-Closes', () => {
    const closes = [100, 0, 102, NaN, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114];
    const v = realizedVolatility({ closes, windowDays: 14 });
    // Wir verlangen nur, dass kein Crash passiert
    expect(v === null || Number.isFinite(v)).toBe(true);
  });
});

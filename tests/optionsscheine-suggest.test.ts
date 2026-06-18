import { describe, it, expect } from 'vitest';
import { suggestOptionsscheine } from '@/lib/optionsscheine/suggest';

describe('suggestOptionsscheine', () => {
  it('liefert drei Vorschlaege fuer Calls auf eine Aktie', () => {
    const s = suggestOptionsscheine({
      underlyingName: 'Apple',
      underlyingPrice: 295.96,
      direction: 'call',
      assetClass: 'aktie'
    });
    expect(s).toHaveLength(3);
    expect(s.map((x) => x.risk)).toEqual(['niedrig', 'mittel', 'hoch']);
  });

  it('liefert leere Liste fuer ungueltige Eingaben', () => {
    expect(suggestOptionsscheine({ underlyingName: '', underlyingPrice: 100 })).toEqual([]);
    expect(suggestOptionsscheine({ underlyingName: 'X', underlyingPrice: 0 })).toEqual([]);
    expect(suggestOptionsscheine({ underlyingName: 'X', underlyingPrice: -10 })).toEqual([]);
  });

  it('Niedriges-Risiko-Call ist tief im Geld, langlaufend', () => {
    const s = suggestOptionsscheine({
      underlyingName: 'SAP',
      underlyingPrice: 200,
      direction: 'call',
      assetClass: 'aktie'
    });
    const low = s.find((x) => x.risk === 'niedrig')!;
    expect(low.strike).toBeLessThan(200);   // ITM
    expect(low.monthsToExpiry).toBe(18);
    expect(low.analysis.moneyness.classification).toBe('itm');
  });

  it('Hohes-Risiko-Call ist aus dem Geld, kurzlaufend', () => {
    const s = suggestOptionsscheine({
      underlyingName: 'SAP',
      underlyingPrice: 200,
      direction: 'call',
      assetClass: 'aktie'
    });
    const high = s.find((x) => x.risk === 'hoch')!;
    expect(high.strike).toBeGreaterThan(200);   // OTM
    expect(high.monthsToExpiry).toBe(3);
    expect(['otm', 'deep_otm']).toContain(high.analysis.moneyness.classification);
    expect(['Hohes Risiko', 'Sehr hohes Risiko']).toContain(high.analysis.riskClass);
  });

  it('Mittleres-Risiko-Call ist nahe ATM mit ~9 Monaten', () => {
    const s = suggestOptionsscheine({
      underlyingName: 'SAP',
      underlyingPrice: 200,
      direction: 'call',
      assetClass: 'aktie'
    });
    const mid = s.find((x) => x.risk === 'mittel')!;
    expect(Math.abs(mid.strike - 200)).toBeLessThan(10);
    expect(mid.monthsToExpiry).toBe(9);
  });

  it('Strike wird auf sinnvolle Aktien-Schritte gerundet', () => {
    const s = suggestOptionsscheine({
      underlyingName: 'AAPL',
      underlyingPrice: 295.96,
      direction: 'call',
      assetClass: 'aktie'
    });
    // 295.96 * 0.85 = 251.566 -> auf 5er gerundet = 250
    expect(s.find((x) => x.risk === 'niedrig')!.strike).toBe(250);
    // 295.96 -> auf 5er gerundet = 295
    expect(s.find((x) => x.risk === 'mittel')!.strike).toBe(295);
    // 295.96 * 1.20 = 355.152 -> auf 5er gerundet = 355
    expect(s.find((x) => x.risk === 'hoch')!.strike).toBe(355);
  });

  it('Krypto-Strikes werden auf groessere Schritte gerundet', () => {
    const s = suggestOptionsscheine({
      underlyingName: 'BTC',
      underlyingPrice: 70000,
      direction: 'call',
      assetClass: 'krypto'
    });
    // 70000 * 0.85 = 59500 -> auf 1000er = 60000
    expect(s.find((x) => x.risk === 'niedrig')!.strike).toBe(60000);
    // 70000 * 1.20 = 84000 -> auf 1000er = 84000
    expect(s.find((x) => x.risk === 'hoch')!.strike).toBe(84000);
  });

  it('Put-Suggestion invertiert die Moneyness-Logik', () => {
    const s = suggestOptionsscheine({
      underlyingName: 'SAP',
      underlyingPrice: 200,
      direction: 'put',
      assetClass: 'aktie'
    });
    // Put ITM heisst Strike UEBER dem Kurs
    const low = s.find((x) => x.risk === 'niedrig')!;
    expect(low.strike).toBeGreaterThan(200);
    expect(low.analysis.moneyness.classification).toBe('itm');
    const high = s.find((x) => x.risk === 'hoch')!;
    expect(high.strike).toBeLessThan(200);
    expect(['otm', 'deep_otm']).toContain(high.analysis.moneyness.classification);
  });

  it('Verfallsdatum liegt in der Zukunft', () => {
    const today = new Date('2026-06-16T00:00:00Z');
    const s = suggestOptionsscheine({
      underlyingName: 'AAPL',
      underlyingPrice: 295.96,
      direction: 'call',
      assetClass: 'aktie',
      today
    });
    for (const x of s) {
      expect(x.expiryIso > today.toISOString().slice(0, 10)).toBe(true);
    }
  });

  it('Risiko-Klassen im Analyzer entsprechen den Suggest-Stufen', () => {
    const s = suggestOptionsscheine({
      underlyingName: 'AAPL',
      underlyingPrice: 295.96,
      direction: 'call',
      assetClass: 'aktie'
    });
    const low = s.find((x) => x.risk === 'niedrig')!.analysis.riskClass;
    const high = s.find((x) => x.risk === 'hoch')!.analysis.riskClass;
    // Niedrig-Risiko-Vorschlag laeuft ITM mit langer Laufzeit -> max. Mittel.
    expect(['Niedrigstes Risiko', 'Niedriges Risiko', 'Mittleres Risiko']).toContain(low);
    // Hoch-Risiko-Vorschlag laeuft OTM mit kurzer Laufzeit -> mind. Hoch.
    expect(['Hohes Risiko', 'Sehr hohes Risiko']).toContain(high);
  });

  it('sigma fliesst in die Analyse ein und wird in sigmaUsed zurueckgegeben', () => {
    const sLow = suggestOptionsscheine({
      underlyingName: 'AAPL', underlyingPrice: 200, direction: 'call', assetClass: 'aktie', sigma: 0.15
    });
    const sHigh = suggestOptionsscheine({
      underlyingName: 'AAPL', underlyingPrice: 200, direction: 'call', assetClass: 'aktie', sigma: 0.55
    });
    expect(sLow[0].analysis.sigmaUsed).toBeCloseTo(0.15, 5);
    expect(sHigh[0].analysis.sigmaUsed).toBeCloseTo(0.55, 5);
  });

  it('hoehere sigma fuehrt zu hoeherem Modell-Premium (Break-even-Move groesser)', () => {
    const sLow = suggestOptionsscheine({
      underlyingName: 'AAPL', underlyingPrice: 200, direction: 'call', assetClass: 'aktie', sigma: 0.15
    }).find((x) => x.risk === 'mittel')!;
    const sHigh = suggestOptionsscheine({
      underlyingName: 'AAPL', underlyingPrice: 200, direction: 'call', assetClass: 'aktie', sigma: 0.55
    }).find((x) => x.risk === 'mittel')!;
    // Hoehere Vola -> teurerer ATM-Schein -> Break-even-Move groesser
    expect(Math.abs(sHigh.analysis.breakevenMovePct ?? 0)).toBeGreaterThan(Math.abs(sLow.analysis.breakevenMovePct ?? 0));
  });

  it('Default ist 0.30, wenn keine sigma uebergeben wird', () => {
    const s = suggestOptionsscheine({
      underlyingName: 'AAPL', underlyingPrice: 200, direction: 'call', assetClass: 'aktie'
    });
    expect(s[0].analysis.sigmaUsed).toBeCloseTo(0.30, 5);
  });

  it('ungueltige sigma (NaN, negativ, sehr gross) faellt auf Default zurueck', () => {
    const sNeg = suggestOptionsscheine({
      underlyingName: 'AAPL', underlyingPrice: 200, direction: 'call', assetClass: 'aktie', sigma: -0.2
    });
    const sLarge = suggestOptionsscheine({
      underlyingName: 'AAPL', underlyingPrice: 200, direction: 'call', assetClass: 'aktie', sigma: 5
    });
    expect(sNeg[0].analysis.sigmaUsed).toBeCloseTo(0.30, 5);
    expect(sLarge[0].analysis.sigmaUsed).toBeCloseTo(0.30, 5);
  });

  it('Hoch-Risiko hat den kuerzesten Kapitaleinsatz (niedrigster Break-even-Move-Betrag)', () => {
    const s = suggestOptionsscheine({
      underlyingName: 'AAPL',
      underlyingPrice: 295.96,
      direction: 'call',
      assetClass: 'aktie'
    });
    // Konkreter Vergleich: hoch-Risiko-Schein ist OTM mit kurzer
    // Laufzeit -> Break-even verlangt eine deutlich groessere
    // Bewegung als der niedrig-Risiko-Schein.
    const low = s.find((x) => x.risk === 'niedrig')!.analysis.breakevenMovePct!;
    const high = s.find((x) => x.risk === 'hoch')!.analysis.breakevenMovePct!;
    expect(Math.abs(high)).toBeGreaterThan(Math.abs(low));
  });
});

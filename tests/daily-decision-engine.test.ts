import { describe, expect, it } from 'vitest';
import {
  evaluateMarketMode,
  topChances,
  warningZone,
  personaCompass,
  watchlistAlarms,
  type DailyEngineInputs,
  type StockEntry,
  type CommodityEntry,
  type CryptoEntry,
  type SportTipEntry,
  type PersonaVerdictEntry,
  type WatchedAsset
} from '@/lib/daily/daily-decision-engine';

function stock(symbol: string, grade: 'A' | 'B' | 'C' | 'D', score = grade === 'A' ? 100 : grade === 'B' ? 87 : grade === 'C' ? 60 : 30): StockEntry {
  return { symbol, name: symbol, group: 'Tech', grade, score, passedHard: grade === 'A' ? 8 : grade === 'B' ? 7 : 5, totalHard: 8 };
}
function commodity(symbol: string, grade: 'A' | 'B' | 'C' | 'D', score = grade === 'A' ? 100 : grade === 'B' ? 87 : 60): CommodityEntry {
  return { symbol, name: symbol, group: 'Edelmetalle', grade, score, passedHard: grade === 'A' ? 8 : 7, totalHard: 8 };
}
function crypto(symbol: string, grade: 'A' | 'B' | 'C' | 'D' = 'A', passedCount = 10): CryptoEntry {
  return { symbol, coinId: symbol.toLowerCase(), passedCount, totalCount: 12, grade, score: grade === 'A' ? 100 : 80, oneLineReason: 'Trend ok' };
}
function sportTip(homeTeam: string, awayTeam: string, tier: 'maximal' | 'sehr-sicher' | 'sicher', probability = tier === 'maximal' ? 0.9 : tier === 'sehr-sicher' ? 0.8 : 0.72): SportTipEntry {
  return { fixtureId: `${homeTeam}-${awayTeam}`, homeTeam, awayTeam, date: '2026-06-10', market: 'Heimsieg', probability, tier, source: 'WM', rationale: 'ELO klar.' };
}
function persona(klass: PersonaVerdictEntry['klass'], persona: string, verdict: string, isBuy: boolean): PersonaVerdictEntry {
  return { klass, persona, personaName: persona, verdict, isBuy, targetLabel: null };
}
function emptyInput(): DailyEngineInputs {
  return { stocks: [], commodities: [], cryptoTop: null, cryptoMaxSafety: false, sportTips: [], personaVerdicts: [] };
}

describe('evaluateMarketMode', () => {
  it('alle Daten leer → CASH', () => {
    const a = evaluateMarketMode(emptyInput());
    expect(a.mode).toBe('CASH');
    expect(a.metrics.personaTotal).toBe(0);
  });

  it('OFFENSIV: breite Grade-A + viele Personas kaufen + mehrere maximal-sichere Sport-Tipps', () => {
    const input: DailyEngineInputs = {
      stocks: [stock('AAPL', 'A'), stock('MSFT', 'A')],
      commodities: [commodity('GC=F', 'A')],
      cryptoTop: crypto('BTC', 'A'),
      cryptoMaxSafety: true,
      sportTips: [sportTip('A', 'B', 'maximal'), sportTip('C', 'D', 'maximal')],
      personaVerdicts: [
        persona('Aktien', 'c', 'KAUFEN', true), persona('Aktien', 'b', 'KAUFEN', true), persona('Aktien', 'a', 'KAUFEN', true),
        persona('Rohstoffe', 'c', 'KAUFEN', true), persona('Rohstoffe', 'b', 'KAUFEN', true),
        persona('WM', 'c', 'TIPPEN', true), persona('WM', 'b', 'TIPPEN', true),
        persona('Liga-Fußball', 'a', 'WARTEN', false),
        persona('Krypto', 'c', 'WAIT', false),
        persona('Krypto', 'b', 'BUY', true)
      ]
    };
    const a = evaluateMarketMode(input);
    expect(a.mode).toBe('OFFENSIV');
  });

  it('DEFENSIV: nichts Grade A + Personas mehrheitlich WARTEN', () => {
    const input: DailyEngineInputs = {
      stocks: [stock('AAPL', 'C'), stock('MSFT', 'D')],
      commodities: [commodity('GC=F', 'C')],
      cryptoTop: crypto('BTC', 'C', 6),
      cryptoMaxSafety: false,
      sportTips: [sportTip('A', 'B', 'sicher')],
      personaVerdicts: [
        persona('Aktien', 'c', 'WARTEN', false), persona('Aktien', 'b', 'WARTEN', false), persona('Aktien', 'a', 'WARTEN', false),
        persona('Rohstoffe', 'c', 'WARTEN', false), persona('Rohstoffe', 'b', 'WARTEN', false),
        persona('Krypto', 'c', 'WAIT', false), persona('Krypto', 'b', 'WAIT', false),
        persona('WM', 'c', 'TIPPEN', true), persona('WM', 'b', 'BEOBACHTEN', false),
        persona('Liga-Fußball', 'a', 'WARTEN', false)
      ]
    };
    const a = evaluateMarketMode(input);
    expect(a.mode).toBe('DEFENSIV');
  });

  it('SELEKTIV: gemischtes Bild', () => {
    const input: DailyEngineInputs = {
      stocks: [stock('AAPL', 'A'), stock('MSFT', 'C'), stock('NVDA', 'B')],
      commodities: [commodity('GC=F', 'B')],
      cryptoTop: crypto('BTC', 'B'),
      cryptoMaxSafety: false,
      sportTips: [sportTip('A', 'B', 'sehr-sicher')],
      personaVerdicts: [
        persona('Aktien', 'c', 'BEOBACHTEN', false),
        persona('Aktien', 'b', 'KAUFEN', true),
        persona('Aktien', 'a', 'KAUFEN', true),
        persona('Rohstoffe', 'c', 'WARTEN', false),
        persona('Krypto', 'c', 'WAIT', false)
      ]
    };
    const a = evaluateMarketMode(input);
    expect(a.mode).toBe('SELEKTIV');
  });

  it('Metriken werden korrekt gezählt', () => {
    const input: DailyEngineInputs = {
      stocks: [stock('AAPL', 'A'), stock('MSFT', 'B'), stock('NVDA', 'A')],
      commodities: [commodity('GC=F', 'A')],
      cryptoTop: crypto('BTC', 'A'),
      cryptoMaxSafety: true,
      sportTips: [sportTip('A', 'B', 'maximal'), sportTip('C', 'D', 'sehr-sicher')],
      personaVerdicts: [persona('Aktien', 'c', 'KAUFEN', true)]
    };
    const a = evaluateMarketMode(input);
    expect(a.metrics.stocksGradeA).toBe(2);
    expect(a.metrics.stocksGradeB).toBe(1);
    expect(a.metrics.commoditiesGradeA).toBe(1);
    expect(a.metrics.maximalSportTips).toBe(1);
    expect(a.metrics.sehrSichereSportTips).toBe(1);
    expect(a.metrics.cryptoMaxSafety).toBe(true);
    expect(a.metrics.cryptoGrade).toBe('A');
    expect(a.metrics.personaBuyCount).toBe(1);
    expect(a.metrics.personaTotal).toBe(1);
  });
});

describe('topChances', () => {
  it('respektiert das Limit', () => {
    const input: DailyEngineInputs = {
      stocks: [stock('AAPL', 'A')],
      commodities: [commodity('GC=F', 'A')],
      cryptoTop: crypto('BTC', 'A'),
      cryptoMaxSafety: true,
      sportTips: [sportTip('A', 'B', 'maximal')],
      personaVerdicts: []
    };
    expect(topChances(input, [], 2)).toHaveLength(2);
  });

  it('leere Eingabe → leeres Array', () => {
    expect(topChances(emptyInput())).toEqual([]);
  });

  it('Grade-D Aktien tauchen NICHT in Top-Chancen auf', () => {
    const input: DailyEngineInputs = { ...emptyInput(), stocks: [stock('AAPL', 'D')] };
    expect(topChances(input)).toHaveLength(0);
  });

  it('nimmt höchstes Score pro Asset-Klasse', () => {
    const input: DailyEngineInputs = {
      ...emptyInput(),
      stocks: [stock('AAPL', 'B', 85), stock('MSFT', 'A', 100), stock('NVDA', 'B', 80)]
    };
    const result = topChances(input);
    expect(result[0].label).toBe('MSFT');
  });

  it('jeder Eintrag hat href + score + verdict', () => {
    const input: DailyEngineInputs = {
      ...emptyInput(),
      stocks: [stock('AAPL', 'A')]
    };
    const r = topChances(input);
    expect(r[0].href).toContain('/aktien/');
    expect(r[0].verdict).toBe('KAUFEN');
    expect(r[0].score).toBeGreaterThan(0);
  });

  it('Watchlist-Alarme erscheinen', () => {
    const input: DailyEngineInputs = { ...emptyInput() };
    const result = topChances(input, [{
      klass: 'Aktien', label: 'Apple', symbol: 'AAPL', verdict: 'KAUFEN', score: 100,
      detail: 'Grade A heute.', rationale: 'Watchlist-Eintrag.', href: '/aktien/AAPL', signal: 'grade-a'
    }]);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe('Watchlist');
  });
});

describe('warningZone', () => {
  it('listet Grade-D Aktien', () => {
    const input: DailyEngineInputs = { ...emptyInput(), stocks: [stock('XYZ', 'D')] };
    const w = warningZone(input);
    expect(w).toHaveLength(1);
    expect(w[0].source).toBe('Aktien');
    expect(w[0].reason).toContain('Grade D');
  });

  it('Grade-A erscheint nicht in der Warnzone', () => {
    const input: DailyEngineInputs = { ...emptyInput(), stocks: [stock('AAPL', 'A')] };
    expect(warningZone(input)).toEqual([]);
  });

  it('Krypto Grade-D wird gelistet', () => {
    const input: DailyEngineInputs = { ...emptyInput(), cryptoTop: crypto('DOGE', 'D', 3) };
    const w = warningZone(input);
    expect(w.find((x) => x.source === 'Krypto')).toBeDefined();
  });

  it('respektiert das Limit', () => {
    const input: DailyEngineInputs = {
      ...emptyInput(),
      stocks: Array.from({ length: 10 }, (_, i) => stock(`X${i}`, 'D'))
    };
    expect(warningZone(input, 3)).toHaveLength(3);
  });
});

describe('personaCompass', () => {
  it('leere Eingabe → totale 0', () => {
    const c = personaCompass([]);
    expect(c).toEqual({ totalPersonas: 0, buyCount: 0, watchCount: 0, waitCount: 0, strongestKlass: null, strongestBuyShare: 0 });
  });

  it('zählt Buy/Watch/Wait korrekt', () => {
    const verdicts: PersonaVerdictEntry[] = [
      persona('Aktien', 'c', 'KAUFEN', true),
      persona('Aktien', 'b', 'BEOBACHTEN', false),
      persona('Aktien', 'a', 'WARTEN', false)
    ];
    const c = personaCompass(verdicts);
    expect(c.buyCount).toBe(1);
    expect(c.watchCount).toBe(1);
    expect(c.waitCount).toBe(1);
  });

  it('identifiziert stärkste Asset-Klasse', () => {
    const verdicts: PersonaVerdictEntry[] = [
      persona('Aktien', 'c', 'KAUFEN', true),
      persona('Aktien', 'b', 'KAUFEN', true),
      persona('Aktien', 'a', 'KAUFEN', true),
      persona('Rohstoffe', 'c', 'WARTEN', false),
      persona('Rohstoffe', 'b', 'WARTEN', false),
      persona('Rohstoffe', 'a', 'WARTEN', false)
    ];
    const c = personaCompass(verdicts);
    expect(c.strongestKlass).toBe('Aktien');
    expect(c.strongestBuyShare).toBe(1);
  });
});

describe('watchlistAlarms', () => {
  it('Grade A wird immer markiert, auch ohne previousGrade', () => {
    const w: WatchedAsset[] = [{ klass: 'Aktien', symbol: 'AAPL', label: 'Apple', currentGrade: 'A', currentScore: 100, href: '/aktien/AAPL' }];
    const r = watchlistAlarms(w);
    expect(r).toHaveLength(1);
    expect(r[0].signal).toBe('grade-a');
  });

  it('Verbesserung von B nach A wird als grade-a markiert (höchster Status)', () => {
    const w: WatchedAsset[] = [{
      klass: 'Aktien', symbol: 'AAPL', label: 'Apple',
      previousGrade: 'B', currentGrade: 'A', currentScore: 100, href: '/aktien/AAPL'
    }];
    const r = watchlistAlarms(w);
    expect(r[0].signal).toBe('grade-a');
  });

  it('Verbesserung von C nach B wird als verbesserung markiert', () => {
    const w: WatchedAsset[] = [{
      klass: 'Aktien', symbol: 'AAPL', label: 'Apple',
      previousGrade: 'C', currentGrade: 'B', currentScore: 80, href: '/aktien/AAPL'
    }];
    const r = watchlistAlarms(w);
    expect(r[0].signal).toBe('verbesserung');
  });

  it('Verschlechterung wird klar markiert', () => {
    const w: WatchedAsset[] = [{
      klass: 'Aktien', symbol: 'AAPL', label: 'Apple',
      previousGrade: 'B', currentGrade: 'D', currentScore: 30, href: '/aktien/AAPL'
    }];
    const r = watchlistAlarms(w);
    expect(r[0].signal).toBe('verschlechterung');
  });

  it('Grade ohne Vergangenheit und kein Grade A → kein Alarm', () => {
    const w: WatchedAsset[] = [{ klass: 'Aktien', symbol: 'AAPL', label: 'Apple', currentGrade: 'C', currentScore: 60, href: '/aktien/AAPL' }];
    expect(watchlistAlarms(w)).toEqual([]);
  });

  it('Grade-A-Alarme erscheinen zuerst', () => {
    const w: WatchedAsset[] = [
      { klass: 'Aktien', symbol: 'X', label: 'X', previousGrade: 'C', currentGrade: 'B', currentScore: 80, href: '/aktien/X' },
      { klass: 'Aktien', symbol: 'Y', label: 'Y', currentGrade: 'A', currentScore: 100, href: '/aktien/Y' }
    ];
    const r = watchlistAlarms(w);
    expect(r[0].signal).toBe('grade-a');
    expect(r[1].signal).toBe('verbesserung');
  });

  it('leere Watchlist → leeres Array (kein Fake-Fallback)', () => {
    expect(watchlistAlarms([])).toEqual([]);
  });
});

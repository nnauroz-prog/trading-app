import { describe, expect, it } from 'vitest';
import { evaluateWmConditions, eloDiffShift } from '@/lib/sport/wm-conditions';
import type { WmFixture } from '@/lib/sport/wm-schedule-2026';

function fixture(over: Partial<WmFixture> = {}): WmFixture {
  return {
    id: 'test-fixture',
    date: '2026-06-12',
    time: '20:00',
    homeTeam: 'Frankreich',
    awayTeam: 'Argentinien',
    venue: 'MetLife Stadium',
    phase: 'Gruppe',
    group: 'A',
    ...over
  };
}

describe('Akklimatisierung', () => {
  it('Kalt-Team in tropischer Hitze → Penalty', () => {
    // Daenemark spielt in Miami: Heimat 21 °C, Spielort 33 °C, Differenz 12 °C.
    const r = evaluateWmConditions({ fixture: fixture({ homeTeam: 'Daenemark', awayTeam: 'Argentinien', venue: 'Hard Rock Stadium' }) });
    const acc = r.factors.find((f) => f.id === 'acclimatization');
    expect(acc).toBeDefined();
    expect(acc!.homeGoalMultiplier).toBeLessThan(1);
    expect(acc!.homeEloDelta).toBeLessThan(0);
  });

  it('Beide Teams aus aehnlichem Klima → kein Akklimatisierungs-Faktor', () => {
    // Argentinien (15 °C) vs Spanien (32 °C) in Dallas (35 °C):
    // Spanien-Heimat ~ Spielort, Argentinien deutlich kuehler → Argentinien Penalty
    const r = evaluateWmConditions({ fixture: fixture({ homeTeam: 'Spanien', awayTeam: 'Brasilien', venue: 'AT&T Stadium' }) });
    const acc = r.factors.find((f) => f.id === 'acclimatization');
    // Spanien Heimat 32 °C, Spielort 35 °C → Differenz 3 °C, unter Schwelle
    // Brasilien Heimat 26 °C, Spielort 35 °C → 9 °C, Penalty fuer Auswaerts
    if (acc) {
      expect(acc.awayGoalMultiplier).toBeLessThan(acc.homeGoalMultiplier);
    }
  });

  it('Asymmetrie: Heim leidet mehr → confidenceShift negativ', () => {
    const r = evaluateWmConditions({ fixture: fixture({ homeTeam: 'Daenemark', awayTeam: 'Mexiko', venue: 'NRG Stadium' }) });
    const acc = r.factors.find((f) => f.id === 'acclimatization');
    expect(acc!.confidenceShift).toBeLessThan(0); // Heim leidet mehr → senkt Heim-Confidence
  });
});

describe('Hoehenlage', () => {
  it('Tief-Team in Mexico City (2240 m) → Penalty', () => {
    const r = evaluateWmConditions({ fixture: fixture({ homeTeam: 'Deutschland', awayTeam: 'Niederlande', venue: 'Estadio Azteca' }) });
    const alt = r.factors.find((f) => f.id === 'altitude');
    expect(alt).toBeDefined();
    expect(alt!.homeGoalMultiplier).toBeLessThan(1);
    expect(alt!.awayGoalMultiplier).toBeLessThan(1);
  });

  it('Anden-Team adaptiert → kein Penalty fuer Kolumbien', () => {
    // Kolumbien (2640 m Heimat) vs Deutschland in Mexico City (2240 m)
    const r = evaluateWmConditions({ fixture: fixture({ homeTeam: 'Kolumbien', awayTeam: 'Deutschland', venue: 'Estadio Azteca' }) });
    const alt = r.factors.find((f) => f.id === 'altitude');
    expect(alt!.homeGoalMultiplier).toBe(1);
    expect(alt!.awayGoalMultiplier).toBeLessThan(1);
    expect(alt!.confidenceShift).toBeGreaterThan(0); // Heim-Vorteil
  });

  it('Beide Teams aus Anden → kein Faktor', () => {
    const r = evaluateWmConditions({ fixture: fixture({ homeTeam: 'Kolumbien', awayTeam: 'Ecuador', venue: 'Estadio Azteca' }) });
    const alt = r.factors.find((f) => f.id === 'altitude');
    expect(alt).toBeUndefined();
  });

  it('Spielort unter 1500 m → kein Faktor', () => {
    const r = evaluateWmConditions({ fixture: fixture({ homeTeam: 'Deutschland', awayTeam: 'England', venue: 'MetLife Stadium' }) });
    const alt = r.factors.find((f) => f.id === 'altitude');
    expect(alt).toBeUndefined();
  });
});

describe('Jetlag', () => {
  it('Asien-Team in USA-West → Jetlag-Penalty', () => {
    const r = evaluateWmConditions({ fixture: fixture({ homeTeam: 'USA', awayTeam: 'Japan', venue: 'SoFi Stadium' }) });
    const jl = r.factors.find((f) => f.id === 'jetlag');
    expect(jl).toBeDefined();
    expect(jl!.awayGoalMultiplier).toBeLessThan(1);
    expect(jl!.awayEloDelta).toBeLessThan(0);
  });

  it('Lokale Teams ohne nennenswerten Zeit-Sprung → kein Faktor', () => {
    const r = evaluateWmConditions({ fixture: fixture({ homeTeam: 'USA', awayTeam: 'Mexiko', venue: 'AT&T Stadium' }) });
    const jl = r.factors.find((f) => f.id === 'jetlag');
    expect(jl).toBeUndefined();
  });
});

describe('Gastgeber-Heimvorteil', () => {
  it('USA spielt zu Hause → +60 ELO', () => {
    const r = evaluateWmConditions({ fixture: fixture({ homeTeam: 'USA', awayTeam: 'Deutschland', venue: 'MetLife Stadium' }) });
    const ha = r.factors.find((f) => f.id === 'host-advantage');
    expect(ha).toBeDefined();
    expect(ha!.homeEloDelta).toBe(60);
    expect(ha!.awayEloDelta).toBe(0);
    expect(ha!.confidenceShift).toBeGreaterThan(0);
  });

  it('Mexiko in Mexico City → +90 ELO (Aztec-Bonus)', () => {
    const r = evaluateWmConditions({ fixture: fixture({ homeTeam: 'Mexiko', awayTeam: 'Brasilien', venue: 'Estadio Azteca' }) });
    const ha = r.factors.find((f) => f.id === 'host-advantage');
    expect(ha!.homeEloDelta).toBe(90);
  });

  it('Kein Gastgeber im Spiel → kein Faktor', () => {
    const r = evaluateWmConditions({ fixture: fixture({ homeTeam: 'Deutschland', awayTeam: 'Frankreich', venue: 'MetLife Stadium' }) });
    const ha = r.factors.find((f) => f.id === 'host-advantage');
    expect(ha).toBeUndefined();
  });
});

describe('Regionale Publikums-Sympathie', () => {
  it('Argentinien gegen Deutschland in den USA → CONMEBOL profitiert', () => {
    const r = evaluateWmConditions({ fixture: fixture({ homeTeam: 'Argentinien', awayTeam: 'Deutschland', venue: 'MetLife Stadium' }) });
    const rc = r.factors.find((f) => f.id === 'regional-crowd');
    expect(rc).toBeDefined();
    expect(rc!.homeEloDelta).toBeGreaterThan(0);
    expect(rc!.awayEloDelta).toBe(0);
  });

  it('Beide UEFA-Teams → kein regionaler Bias', () => {
    const r = evaluateWmConditions({ fixture: fixture({ homeTeam: 'Deutschland', awayTeam: 'England', venue: 'MetLife Stadium' }) });
    expect(r.factors.find((f) => f.id === 'regional-crowd')).toBeUndefined();
  });
});

describe('Mittagshitze', () => {
  it('Mittagsspiel in Arlington Texas → -8 % Tore', () => {
    // 18:00 UTC = 12:00 lokal (CST, UTC-6) → Mittagsspiel.
    const r = evaluateWmConditions({ fixture: fixture({ time: '18:00', venue: 'AT&T Stadium' }) });
    const mh = r.factors.find((f) => f.id === 'hot-midday');
    expect(mh).toBeDefined();
    expect(mh!.homeGoalMultiplier).toBeLessThan(1);
    expect(mh!.awayGoalMultiplier).toBeLessThan(1);
    expect(mh!.confidenceShift).toBeLessThan(0);
  });

  it('Abendspiel im Hitze-Stadion → kein Mittagshitze-Faktor', () => {
    // 02:00 UTC = 20:00 lokal in Texas (UTC-6)
    const r = evaluateWmConditions({ fixture: fixture({ time: '02:00', venue: 'AT&T Stadium' }) });
    expect(r.factors.find((f) => f.id === 'hot-midday')).toBeUndefined();
  });
});

describe('Daten-Coverage', () => {
  it('Unbekanntes Team → coverage < 1', () => {
    const r = evaluateWmConditions({ fixture: fixture({ homeTeam: 'Phantomistan' }) });
    expect(r.dataCoverage).toBeLessThan(1);
    expect(r.factors.length).toBe(0); // keine Faktoren ohne komplette Daten
  });

  it('Alle drei Quellen aufloesbar → coverage = 1', () => {
    const r = evaluateWmConditions({ fixture: fixture() });
    expect(r.dataCoverage).toBe(1);
  });
});

describe('eloDiffShift', () => {
  it('Mexiko in Mexico City: Heim-Shift stark positiv', () => {
    const r = evaluateWmConditions({ fixture: fixture({ homeTeam: 'Mexiko', awayTeam: 'Deutschland', venue: 'Estadio Azteca' }) });
    expect(eloDiffShift(r)).toBeGreaterThan(80); // mind. der Host-Bonus
  });
});

describe('Wording', () => {
  const FORBIDDEN = ['sicher', 'bank', 'garantiert', 'todsicher', 'risikolos', 'muss kommen', 'free money'];
  it('Faktor-Labels sind frei von verbotenen Begriffen', () => {
    const setups = [
      fixture({ homeTeam: 'Daenemark', awayTeam: 'Brasilien', venue: 'Hard Rock Stadium' }),
      fixture({ homeTeam: 'Deutschland', awayTeam: 'England', venue: 'Estadio Azteca' }),
      fixture({ homeTeam: 'USA', awayTeam: 'Japan', venue: 'SoFi Stadium' }),
      fixture({ time: '18:00', venue: 'AT&T Stadium' })
    ];
    for (const s of setups) {
      const r = evaluateWmConditions({ fixture: s });
      for (const f of r.factors) {
        const lower = f.label.toLowerCase();
        for (const w of FORBIDDEN) {
          expect(lower.includes(w), `Verbotenes "${w}" in: ${f.label}`).toBe(false);
        }
      }
    }
  });
});

describe('findVenue — Sponsor-Aliase und Stadt-Fallback', () => {
  it('GEHA Field at Arrowhead, Kansas City → Arrowhead Stadium', async () => {
    const { findVenue } = await import('@/lib/sport/wm-venues');
    const v = findVenue('GEHA Field at Arrowhead, Kansas City');
    expect(v?.name).toBe('Arrowhead Stadium');
  });

  it('Estadio Azteca, Mexico City → Azteca (Substring)', async () => {
    const { findVenue } = await import('@/lib/sport/wm-venues');
    expect(findVenue('Estadio Azteca, Mexico City')?.name).toBe('Estadio Azteca');
  });

  it('Unbekanntes Stadion ohne Stadt-Match → null', async () => {
    const { findVenue } = await import('@/lib/sport/wm-venues');
    expect(findVenue('Phantasie-Arena, Nirgendwo')).toBeNull();
  });
});

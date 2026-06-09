import { describe, expect, it } from 'vitest';
import { computeHeadToHead, computeH2hModifier } from '@/lib/sport/h2h';
import type { Fixture } from '@/lib/sport/fetcher';

function past(home: string, away: string, hs: number, as_: number, date: string): Fixture {
  return {
    id: `${home}-${away}-${date}`, homeTeam: home, awayTeam: away,
    league: 'L', date, time: null, venue: null,
    homeScore: hs, awayScore: as_, status: 'finished'
  };
}

describe('computeHeadToHead — venue & recency Aufschluesselung', () => {
  it('atHomeVenue zaehlt nur Duelle, in denen das KOMMENDE Heim-Team auch damals daheim war', () => {
    // Kommendes Spiel: Bayern (zuhause) vs Dortmund.
    // Vergangen: 4 Begegnungen, je 2 mal Heim/Auswaerts.
    const finished: Fixture[] = [
      past('Bayern', 'Dortmund', 3, 1, '2025-04-01'),     // Bayern daheim, gewonnen
      past('Dortmund', 'Bayern', 1, 2, '2025-04-15'),     // Bayern auswaerts, gewonnen
      past('Bayern', 'Dortmund', 2, 0, '2025-09-01'),     // Bayern daheim, gewonnen
      past('Dortmund', 'Bayern', 3, 0, '2025-09-15')      // Bayern auswaerts, verloren
    ];
    const h2h = computeHeadToHead('Bayern', 'Dortmund', finished);
    expect(h2h.meetings).toBe(4);
    // Gesamt: 3W/0D/1L aus Bayern-Sicht
    expect(h2h.winsForHome).toBe(3);
    expect(h2h.winsForAway).toBe(1);
    // Heim-Venue: nur die zwei Spiele in Muenchen
    expect(h2h.atHomeVenue.meetings).toBe(2);
    expect(h2h.atHomeVenue.winsForHome).toBe(2);
    expect(h2h.atHomeVenue.winsForAway).toBe(0);
  });

  it('recent5 enthaelt maximal die 5 neuesten Duelle, neueste zuerst gezaehlt', () => {
    const finished: Fixture[] = [];
    for (let i = 1; i <= 8; i++) {
      finished.push(past('Bayern', 'Dortmund', i % 2 === 0 ? 3 : 0, 1, `2025-${String(i).padStart(2, '0')}-01`));
    }
    const h2h = computeHeadToHead('Bayern', 'Dortmund', finished);
    expect(h2h.meetings).toBe(8);
    expect(h2h.recent5.meetings).toBe(5);
  });
});

describe('computeH2hModifier', () => {
  function emptyMod() { return { meetings: 0, winsForHome: 0, draws: 0, winsForAway: 0, goalsForHome: 0, goalsForAway: 0 }; }

  it('< 3 Heim-Begegnungen → neutral', () => {
    const mod = computeH2hModifier({
      homeTeam: 'A', awayTeam: 'B', meetings: 2, winsForHome: 2, draws: 0, winsForAway: 0,
      goalsForHome: 4, goalsForAway: 0, lastMeeting: null,
      atHomeVenue: { meetings: 2, winsForHome: 2, draws: 0, winsForAway: 0, goalsForHome: 4, goalsForAway: 0 },
      recent5: emptyMod()
    });
    expect(mod.homeMultiplier).toBe(1);
    expect(mod.awayMultiplier).toBe(1);
  });

  it('Heim dominiert venue-spezifisch (≥ 70 % Punkte) → homeMul hoch, awayMul runter', () => {
    const mod = computeH2hModifier({
      homeTeam: 'A', awayTeam: 'B', meetings: 6, winsForHome: 5, draws: 1, winsForAway: 0,
      goalsForHome: 15, goalsForAway: 3, lastMeeting: null,
      atHomeVenue: { meetings: 5, winsForHome: 4, draws: 1, winsForAway: 0, goalsForHome: 12, goalsForAway: 2 },
      recent5: emptyMod()
    });
    expect(mod.homeMultiplier).toBeGreaterThan(1);
    expect(mod.awayMultiplier).toBeLessThan(1);
    expect(mod.factors.some((f) => f.includes('Heimvorteil'))).toBe(true);
  });

  it('Heim ist Angstgegner zuhause (≤ 25 % Punkte) → homeMul runter', () => {
    const mod = computeH2hModifier({
      homeTeam: 'A', awayTeam: 'B', meetings: 5, winsForHome: 0, draws: 1, winsForAway: 4,
      goalsForHome: 3, goalsForAway: 10, lastMeeting: null,
      atHomeVenue: { meetings: 4, winsForHome: 0, draws: 0, winsForAway: 4, goalsForHome: 2, goalsForAway: 8 },
      recent5: emptyMod()
    });
    expect(mod.homeMultiplier).toBeLessThan(1);
    expect(mod.awayMultiplier).toBeGreaterThan(1);
    expect(mod.factors.some((f) => f.includes('Heim-Schwaeche'))).toBe(true);
  });

  it('Recent-Trend pro Heim ergibt zusaetzlichen Schub (kombinierbar)', () => {
    const mod = computeH2hModifier({
      homeTeam: 'A', awayTeam: 'B', meetings: 5, winsForHome: 4, draws: 1, winsForAway: 0,
      goalsForHome: 10, goalsForAway: 2, lastMeeting: null,
      atHomeVenue: { meetings: 3, winsForHome: 3, draws: 0, winsForAway: 0, goalsForHome: 6, goalsForAway: 1 },
      recent5: { meetings: 5, winsForHome: 4, draws: 1, winsForAway: 0, goalsForHome: 10, goalsForAway: 2 }
    });
    // venue ×1.1 × recent ×1.05 = 1.155, clamp greift → 1.15
    expect(mod.homeMultiplier).toBeCloseTo(1.15, 2);
    expect(mod.factors.length).toBeGreaterThanOrEqual(2);
  });

  it('Multiplier sind hart geclamped auf ±15 %', () => {
    const mod = computeH2hModifier({
      homeTeam: 'A', awayTeam: 'B', meetings: 10, winsForHome: 10, draws: 0, winsForAway: 0,
      goalsForHome: 30, goalsForAway: 0, lastMeeting: null,
      atHomeVenue: { meetings: 10, winsForHome: 10, draws: 0, winsForAway: 0, goalsForHome: 30, goalsForAway: 0 },
      recent5: { meetings: 5, winsForHome: 5, draws: 0, winsForAway: 0, goalsForHome: 15, goalsForAway: 0 }
    });
    expect(mod.homeMultiplier).toBeLessThanOrEqual(1.15);
    expect(mod.awayMultiplier).toBeGreaterThanOrEqual(0.85);
  });

  it('Keine relevanten Signale → neutral mit leerer Begruendungsliste', () => {
    const mod = computeH2hModifier({
      homeTeam: 'A', awayTeam: 'B', meetings: 4, winsForHome: 2, draws: 0, winsForAway: 2,
      goalsForHome: 5, goalsForAway: 5, lastMeeting: null,
      atHomeVenue: { meetings: 3, winsForHome: 1, draws: 1, winsForAway: 1, goalsForHome: 3, goalsForAway: 3 },
      recent5: { meetings: 4, winsForHome: 2, draws: 0, winsForAway: 2, goalsForHome: 5, goalsForAway: 5 }
    });
    expect(mod.homeMultiplier).toBe(1);
    expect(mod.awayMultiplier).toBe(1);
    expect(mod.factors).toEqual([]);
  });
});

// Spielplan-Invarianten: pruefen strukturelle Eigenschaften des
// statischen WM-Spielplans, die durch unsere Daten-Korrekturen jetzt
// erfuellt sein muessen. Bricht eine Welle die Struktur, faellt CI.

import { describe, expect, it } from 'vitest';
import { WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';
import { findTeamOrigin } from '@/lib/sport/wm-team-origins';

const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

describe('Spielplan-Struktur (12 Gruppen je 6 Spiele)', () => {
  for (const g of GROUP_LETTERS) {
    it(`Gruppe ${g} hat genau 6 Gruppenspiele`, () => {
      const games = WM_2026_FIXTURES.filter((f) => f.group === g && f.phase === 'Gruppe');
      expect(games.length).toBe(6);
    });
  }

  it('Insgesamt 72 Gruppenspiele', () => {
    const all = WM_2026_FIXTURES.filter((f) => f.phase === 'Gruppe');
    expect(all.length).toBe(72);
  });

  it('Pro Gruppe spielt jedes Paar genau einmal', () => {
    for (const g of GROUP_LETTERS) {
      const games = WM_2026_FIXTURES.filter((f) => f.group === g && f.phase === 'Gruppe');
      const pairs = new Set<string>();
      for (const f of games) {
        const key = [f.homeTeam, f.awayTeam].sort().join(' vs ');
        expect(pairs.has(key)).toBe(false);
        pairs.add(key);
      }
      // 4 Teams choose 2 = 6 Paare
      expect(pairs.size).toBe(6);
    }
  });
});

describe('Spielplan-Konsistenz', () => {
  it('Alle Fixture-IDs sind eindeutig', () => {
    const ids = WM_2026_FIXTURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Kein Spiel nach dem Finale (19.07.2026)', () => {
    for (const f of WM_2026_FIXTURES) {
      expect(f.date <= '2026-07-19').toBe(true);
    }
  });

  it('Erstes Spiel ist die Eroeffnung am 11.06.2026', () => {
    const earliest = [...WM_2026_FIXTURES].sort((a, b) => a.date.localeCompare(b.date))[0];
    expect(earliest.date).toBe('2026-06-11');
    expect(earliest.id).toBe('wm-1');
  });

  it('Letztes Spiel ist das Finale', () => {
    const latest = [...WM_2026_FIXTURES].sort((a, b) => b.date.localeCompare(a.date))[0];
    expect(latest.id).toBe('wm-final');
    expect(latest.phase).toBe('Finale');
  });

  it('Kein Team spielt zweimal am selben Tag (Gruppen)', () => {
    const teamDays = new Map<string, Set<string>>();
    for (const f of WM_2026_FIXTURES) {
      if (f.phase !== 'Gruppe') continue;
      for (const team of [f.homeTeam, f.awayTeam]) {
        if (!teamDays.has(team)) teamDays.set(team, new Set());
        const days = teamDays.get(team)!;
        if (days.has(f.date)) {
          throw new Error(`Team "${team}" spielt zweimal am ${f.date} (Fixture ${f.id})`);
        }
        days.add(f.date);
      }
    }
  });

  it('Jedes Gruppen-Team hat genau 3 Spiele', () => {
    const teamGames = new Map<string, number>();
    for (const f of WM_2026_FIXTURES) {
      if (f.phase !== 'Gruppe') continue;
      teamGames.set(f.homeTeam, (teamGames.get(f.homeTeam) ?? 0) + 1);
      teamGames.set(f.awayTeam, (teamGames.get(f.awayTeam) ?? 0) + 1);
    }
    for (const [team, count] of teamGames) {
      expect.soft(count, `Team ${team}`).toBe(3);
    }
  });

  it('Jedes Fixture-Team ist in wm-team-origins gepflegt', () => {
    const missing: string[] = [];
    const seen = new Set<string>();
    for (const f of WM_2026_FIXTURES) {
      if (f.phase !== 'Gruppe') continue;
      for (const t of [f.homeTeam, f.awayTeam]) {
        if (seen.has(t)) continue;
        seen.add(t);
        if (!findTeamOrigin(t)) missing.push(t);
      }
    }
    if (missing.length > 0) {
      throw new Error(`Teams ohne Origin-Eintrag: ${missing.join(', ')}`);
    }
  });

  it('MD3 jedes Paares ist am gleichen Datum (parallele Anstoesse)', () => {
    // Pro Gruppe: die 2 letzten Datums-Eintraege muessen das gleiche
    // Datum haben (MD3 = letzter Spieltag).
    for (const g of GROUP_LETTERS) {
      const games = WM_2026_FIXTURES.filter((f) => f.group === g && f.phase === 'Gruppe');
      const sortedDates = [...new Set(games.map((f) => f.date))].sort();
      const lastDate = sortedDates[sortedDates.length - 1];
      const lastDateGames = games.filter((f) => f.date === lastDate);
      // MD3 hat 2 Spiele
      expect.soft(lastDateGames.length, `Gruppe ${g} MD3 am ${lastDate}`).toBe(2);
      // Beide MD3-Spiele haben dieselbe Anstoss-Zeit (UTC)
      const times = new Set(lastDateGames.map((f) => f.time));
      expect.soft(times.size, `Gruppe ${g} MD3 parallele Zeit`).toBe(1);
    }
  });
});

describe('KO-Phase Konsistenz', () => {
  it('Anzahl pro Phase', () => {
    const phases = ['Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Spiel um Platz 3', 'Finale'] as const;
    const counts = Object.fromEntries(
      phases.map((p) => [p, WM_2026_FIXTURES.filter((f) => f.phase === p).length])
    );
    // Aktueller statischer Schedule hat 4 R16 + 4 QF + 2 HF + 1 + 1.
    // Restliche AF/VF werden via Virtual-R16 im Forecast erganzt.
    expect.soft(counts.Achtelfinale, 'Statische R16').toBeGreaterThanOrEqual(4);
    expect.soft(counts.Viertelfinale, 'Statische QF').toBe(4);
    expect.soft(counts.Halbfinale, 'HF').toBe(2);
    expect.soft(counts['Spiel um Platz 3'], 'Platz 3').toBe(1);
    expect.soft(counts.Finale, 'Finale').toBe(1);
  });

  it('Jedes KO-Fixture hat einen Platzhalter-Team-String', () => {
    const placeholderRe = /^(Sieger|Verlierer|Zweiter|Erster|Drittplatzierter|Bester)\b/;
    for (const f of WM_2026_FIXTURES) {
      if (f.phase === 'Gruppe') continue;
      expect.soft(placeholderRe.test(f.homeTeam), `${f.id} homeTeam`).toBe(true);
      expect.soft(placeholderRe.test(f.awayTeam), `${f.id} awayTeam`).toBe(true);
    }
  });

  it('Venues sind ausgefuellt', () => {
    for (const f of WM_2026_FIXTURES) {
      expect.soft(f.venue.length, `${f.id} venue`).toBeGreaterThan(3);
    }
  });
});

describe('Venue-Normalisierung', () => {
  it('Levi\'s Stadium ist konsistent geschrieben (ASCII-Apostroph)', () => {
    const leviUses = WM_2026_FIXTURES.filter((f) => f.venue.includes('Levi'));
    expect(leviUses.length).toBeGreaterThan(2);
    for (const f of leviUses) {
      // Curly apostroph U+2019 verboten — muss ASCII-Apostroph U+0027 sein.
      expect.soft(f.venue.includes('’'), `${f.id}: curly apostroph in "${f.venue}"`).toBe(false);
      expect(f.venue).toContain("Levi's Stadium");
    }
  });

  it('MetLife Stadium ist konsistent geschrieben', () => {
    const metlife = WM_2026_FIXTURES.filter((f) => f.venue.includes('MetLife'));
    expect(metlife.length).toBeGreaterThan(2);
    const variants = new Set(metlife.map((f) => f.venue));
    expect(variants.size).toBe(1);
  });
});

function _typecheck(_f: WmFixture): void {
  // Nur ein Hilfs-Import um WmFixture nicht ungenutzt zu haben.
}
void _typecheck;

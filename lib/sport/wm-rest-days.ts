// Erholungstage-Faktor.
//
// Pro WM-Spiel berechnen wir fuer beide Teams die Pause seit dem
// letzten Pflichtspiel. Quelle: WM-Schedule selbst — wenn ein Team
// alle 3 Tage spielt und der Gegner 5 Tage frei hatte, ist die
// asymmetrische Belastung ein klarer Faktor.
//
// Schwellen (sportwissenschaftlich orientiert, Quelle: Fatigue-Studien
// bei Profi-Fussballern, WM 2018/2022 Kompakt-Spielplan-Auswertungen):
//   - < 3 Tage Pause:   -4 % Tor-Multiplier (akute Restmuedigkeit)
//   - 3-4 Tage Pause:    neutral (Standard-WM-Rhythmus)
//   - 5-7 Tage Pause:    neutral bis leicht positiv (gut erholt)
//   - > 9 Tage Pause:   -2 % Tor-Multiplier (Spielrhythmus verloren)
//   - Differenz beider Teams >= 2 Tage zugunsten des Gegners erzeugt
//     einen ELO-Shift (~25 ELO pro Tag Differenz, gedeckelt bei 50).
//
// Reine Funktion, kein I/O.

import { WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';

export interface RestDaysInfo {
  homeRestDays: number | null;     // null = kein vorheriges Spiel in der WM
  awayRestDays: number | null;
  // Symmetrische ELO-Shift: positiv = Heim hat mehr Pause als Gegner
  homeEloDelta: number;
  awayEloDelta: number;
  // Tor-Multiplier — beidseitig wirkend bei extremen Werten.
  homeGoalMultiplier: number;
  awayGoalMultiplier: number;
  confidenceShift: number;
  label: string;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / (24 * 60 * 60 * 1000));
}

// Findet das vorherige Spiel eines Teams in der WM relativ zu einem
// gegebenen Fixture-Datum. null wenn das aktuelle Spiel das erste ist.
function previousMatch(team: string, currentDate: string, schedule: WmFixture[]): WmFixture | null {
  const all = schedule.filter((f) => (f.homeTeam === team || f.awayTeam === team) && f.date < currentDate);
  if (all.length === 0) return null;
  all.sort((a, b) => b.date.localeCompare(a.date));
  return all[0];
}

function multiplierForRest(days: number): number {
  if (days < 3) return 0.96;
  if (days > 9) return 0.98;
  return 1.0;
}

function eloShiftForRest(days: number): number {
  // Akute Muedigkeit unter 3 Tagen: bis -25 ELO. Sonst neutral.
  if (days >= 3) return 0;
  return -25 * (3 - days);
}

export interface BuildRestInput {
  fixture: WmFixture;
  schedule?: WmFixture[]; // Default: WM_2026_FIXTURES
}

export function evaluateRestDays(input: BuildRestInput): RestDaysInfo {
  const schedule = input.schedule ?? WM_2026_FIXTURES;
  const homePrev = previousMatch(input.fixture.homeTeam, input.fixture.date, schedule);
  const awayPrev = previousMatch(input.fixture.awayTeam, input.fixture.date, schedule);

  const homeRest = homePrev ? daysBetween(homePrev.date, input.fixture.date) : null;
  const awayRest = awayPrev ? daysBetween(awayPrev.date, input.fixture.date) : null;

  let homeEloDelta = 0;
  let awayEloDelta = 0;
  let homeMultiplier = 1.0;
  let awayMultiplier = 1.0;
  let confidenceShift = 0;
  const parts: string[] = [];

  if (homeRest !== null) {
    homeMultiplier = multiplierForRest(homeRest);
    homeEloDelta += eloShiftForRest(homeRest);
    if (homeRest < 3) parts.push(`${input.fixture.homeTeam} nur ${homeRest} Tage Pause`);
    else if (homeRest > 9) parts.push(`${input.fixture.homeTeam} ${homeRest} Tage Spielrhythmus weg`);
  }
  if (awayRest !== null) {
    awayMultiplier = multiplierForRest(awayRest);
    awayEloDelta += eloShiftForRest(awayRest);
    if (awayRest < 3) parts.push(`${input.fixture.awayTeam} nur ${awayRest} Tage Pause`);
    else if (awayRest > 9) parts.push(`${input.fixture.awayTeam} ${awayRest} Tage Spielrhythmus weg`);
  }

  // Asymmetrie: wenn ein Team >= 2 Tage mehr Pause hatte als der Gegner,
  // erzeugt das einen Vorteil. Gedeckelt bei 50 ELO.
  if (homeRest !== null && awayRest !== null) {
    const diff = homeRest - awayRest;
    if (Math.abs(diff) >= 2) {
      const shift = Math.max(-50, Math.min(50, diff * 12));
      if (shift > 0) {
        homeEloDelta += shift;
        confidenceShift += 10;
        parts.push(`Heim hat ${diff} Tag(e) mehr Pause`);
      } else {
        awayEloDelta += -shift;
        confidenceShift -= 10;
        parts.push(`Auswaerts hat ${-diff} Tag(e) mehr Pause`);
      }
    }
  }

  const label = parts.length > 0
    ? `Erholungstage: ${parts.join(' · ')}`
    : 'Erholungstage: Standard-Rhythmus auf beiden Seiten.';

  return {
    homeRestDays: homeRest,
    awayRestDays: awayRest,
    homeEloDelta,
    awayEloDelta,
    homeGoalMultiplier: homeMultiplier,
    awayGoalMultiplier: awayMultiplier,
    confidenceShift,
    label
  };
}

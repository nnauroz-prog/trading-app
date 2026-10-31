import { describe, expect, it } from 'vitest';
import { tennisTournamentForecast } from '@/lib/sport/game-prediction-tennis';

const type = { slug: 'mens-singles' };
const player = (id: string, homeAway: 'home' | 'away', games: number[] = [], winner?: boolean) => ({
  id, homeAway, athlete: { displayName: id }, winner,
  linescores: games.map(value => ({ value, winner: value > 4 }))
});
const target = {
  id: 'target', date: '2026-10-31T14:00Z', type,
  status: { type: { name: 'STATUS_SCHEDULED', state: 'pre' } },
  competitors: [player('A', 'home'), player('B', 'away')], format: { regulation: { periods: 5 } }
};
function match(id: string, athlete: string, won: boolean, date = '2026-10-30T12:00Z') {
  return { id, date, type, status: { type: { name: 'STATUS_FINAL', state: 'post' } },
    competitors: [player(athlete, 'home', won ? [6, 6] : [3, 3], won), player(`opponent-${id}`, 'away', won ? [3, 3] : [6, 6], !won)] };
}
const history = [match('a1', 'A', true), match('a2', 'A', true), match('a3', 'A', true),
  match('b1', 'B', true), match('b2', 'B', false), match('b3', 'B', false)];
const event = (competitions: unknown[] = history) => ({ major: false, groupings: [{ competitions: [...competitions, target] }] });

describe('source-based tennis tournament forecast', () => {
  it('uses real prior sets and the analytic best-of-three terminal distribution', () => {
    const result = tennisTournamentForecast(event(), target)!;
    expect(result.homeEvidence).toEqual({ matches: 3, setsWon: 6, setsLost: 0 });
    expect(result.awayEvidence).toEqual({ matches: 3, setsWon: 2, setsLost: 4 });
    // Smoothed rates7/8 and3/8 yield log5 set chance35/38.
    const p = 35 / 38;
    expect(result.forecast).toMatchObject({ home: 2, away: 0, probabilities: { draw: 0 } });
    expect(result.forecast.probability).toBeCloseTo(p ** 2, 12);
    expect(result.forecast.probabilities.home).toBeCloseTo(p ** 2 + 2 * p ** 2 * (1 - p), 12);
    expect(result.forecast.probabilities.home + result.forecast.probabilities.away).toBeCloseTo(1, 12);
    expect(result.assumptions.join(' ')).toMatch(/nicht anhand früherer Prognosen geprüft/);
  });

  it('keeps equal evidence symmetric without pretending an exact result is likely', () => {
    const equal = history.map((entry, index) => index > 2 ? match(entry.id, 'B', true) : entry);
    const result = tennisTournamentForecast(event(equal), target)!;
    expect(result.forecast.probabilities).toEqual({ home: 0.5, draw: 0, away: 0.5 });
    expect(result.forecast.probability).toBe(0.25);
  });

  it('keeps player evidence aligned when the provider lists away before home', () => {
    const reversed = { ...target, competitors: [player('A', 'away'), player('B', 'home')] };
    const result = tennisTournamentForecast({ competitions: [...history, reversed] }, reversed)!;
    expect(result.homeEvidence.setsWon).toBe(2);
    expect(result.awayEvidence.setsWon).toBe(6);
    expect(result.forecast).toMatchObject({ home: 0, away: 2 });
    expect(result.forecast.probabilities.away).toBeGreaterThan(result.forecast.probabilities.home);
  });

  it('deduplicates provider repetitions and excludes future results, other draws and retirements', () => {
    const contamination = [history[0], match('future', 'A', false, '2026-11-01T12:00Z'),
      { ...match('double', 'A', false), type: { slug: 'mens-doubles' } },
      { ...match('retired', 'A', false), status: { type: { name: 'STATUS_RETIRED', state: 'post' } } }];
    const result = tennisTournamentForecast({ ...event([...history, ...contamination]), competitions: [history[0]] }, target)!;
    expect(result.homeEvidence).toEqual({ matches: 3, setsWon: 6, setsLost: 0 });
    expect(tennisTournamentForecast(event(history.slice(1)), target)).toBeNull();
    expect(tennisTournamentForecast(event(), target, Date.parse('2026-10-30T11:00Z'))).toBeNull();
  });

  it('declines missing source matches, live matches, doubles and uncertain men’s majors', () => {
    expect(tennisTournamentForecast({ competitions: history }, target)).toBeNull();
    expect(tennisTournamentForecast(event(), { ...target, status: { type: { state: 'in' } } })).toBeNull();
    expect(tennisTournamentForecast(event(), { ...target, type: { slug: 'mens-doubles' } })).toBeNull();
    expect(tennisTournamentForecast({ ...event(), major: true }, target)).toBeNull();
  });

  it('declines observed best-of-five finals and ignores incomplete or inconsistent set data', () => {
    const fiveSet = { ...match('five', 'A', true), competitors: [player('A', 'home', [6, 6, 6], true), player('C', 'away', [3, 3, 3], false)] };
    expect(tennisTournamentForecast(event([...history, fiveSet]), target)).toBeNull();
    const incomplete = { ...match('a3', 'A', true), competitors: [player('A', 'home', [6, 2], true), player('C', 'away', [3, 1], false)] };
    expect(tennisTournamentForecast(event([...history.slice(0, 2), incomplete, ...history.slice(3)]), target)).toBeNull();
  });
});

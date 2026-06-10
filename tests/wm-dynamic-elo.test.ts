import { describe, expect, it } from 'vitest';
import { applyResultsToElo, summarizeEloDeltas } from '@/lib/sport/wm-dynamic-elo';
import { findTeamStrength } from '@/lib/sport/wm-team-strength';
import { WM_2026_FIXTURES } from '@/lib/sport/wm-schedule-2026';

describe('applyResultsToElo', () => {
  it('Leere Resultate → leere Map', () => {
    const r = applyResultsToElo([]);
    expect(Object.keys(r.values).length).toBe(0);
  });

  it('Underdog gewinnt → bekommt deutlich positives Delta', () => {
    // Wir nehmen das erste WM-Spiel — egal welches Team, Hauptsache
    // der Underdog gewinnt 3:0.
    const fix = WM_2026_FIXTURES[0];
    const startHome = findTeamStrength(fix.homeTeam)?.elo ?? 1500;
    const startAway = findTeamStrength(fix.awayTeam)?.elo ?? 1500;
    const isHomeFavorite = startHome > startAway;
    const score = isHomeFavorite ? { home: 0, away: 3 } : { home: 3, away: 0 };
    const r = applyResultsToElo([{ fixtureId: fix.id, homeScore: score.home, awayScore: score.away }]);
    const winnerTeam = isHomeFavorite ? fix.awayTeam : fix.homeTeam;
    expect(r.values[winnerTeam]).toBeGreaterThan(isHomeFavorite ? startAway : startHome);
    expect(r.games[fix.homeTeam]).toBe(1);
    expect(r.games[fix.awayTeam]).toBe(1);
  });

  it('Remis verschiebt ELO nur leicht', () => {
    const fix = WM_2026_FIXTURES[0];
    const startHome = findTeamStrength(fix.homeTeam)?.elo ?? 1500;
    const r = applyResultsToElo([{ fixtureId: fix.id, homeScore: 1, awayScore: 1 }]);
    expect(Math.abs(r.values[fix.homeTeam] - startHome)).toBeLessThanOrEqual(30);
  });

  it('Mehrere Spiele werden chronologisch verkettet', () => {
    const r = applyResultsToElo([
      { fixtureId: WM_2026_FIXTURES[0].id, homeScore: 2, awayScore: 0 },
      { fixtureId: WM_2026_FIXTURES[1].id, homeScore: 0, awayScore: 0 }
    ]);
    expect(Object.keys(r.values).length).toBeGreaterThan(0);
  });
});

describe('summarizeEloDeltas', () => {
  it('Liefert Deltas relativ zum Basis-ELO', () => {
    const fix = WM_2026_FIXTURES[0];
    const r = applyResultsToElo([{ fixtureId: fix.id, homeScore: 3, awayScore: 0 }]);
    const deltas = summarizeEloDeltas(r);
    expect(deltas.length).toBeGreaterThan(0);
    for (const d of deltas) {
      expect(d.newElo - d.startElo).toBe(d.delta);
    }
  });

  it('Sortiert nach Betrag des Deltas', () => {
    const r = applyResultsToElo([{ fixtureId: WM_2026_FIXTURES[0].id, homeScore: 4, awayScore: 0 }]);
    const deltas = summarizeEloDeltas(r);
    for (let i = 1; i < deltas.length; i++) {
      expect(Math.abs(deltas[i].delta)).toBeLessThanOrEqual(Math.abs(deltas[i - 1].delta));
    }
  });
});

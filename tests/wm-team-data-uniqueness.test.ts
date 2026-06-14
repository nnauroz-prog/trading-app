// Lint-Tests gegen Datenbasis-Duplikate.
//
// Findet z.B. die wm-team-strength.ts-Duplikate, die in Welle 33001
// entdeckt wurden (Norwegen 1805/1860, DR Kongo 1640/1735 etc.).
// findTeamStrength verwendet First-Match — Duplikate machen die
// spaeteren Updates zu dead code, ohne dass es im Build oder Lauf
// auffaellt.

import { describe, expect, it } from 'vitest';
import { WM_2026_TEAMS } from '@/lib/sport/wm-team-strength';
import { WM_TEAM_ORIGINS } from '@/lib/sport/wm-team-origins';

describe('wm-team-strength — Eindeutige Team-Eintraege', () => {
  it('Kein Team taucht zweimal mit demselben name auf', () => {
    const names = WM_2026_TEAMS.map((t) => t.name);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupes.length > 0) {
      throw new Error(`Doppelte Team-Eintraege: ${[...new Set(dupes)].join(', ')}`);
    }
  });

  it('Kein Alias kollidiert mit einem anderen Team-Namen', () => {
    const nameSet = new Set(WM_2026_TEAMS.map((t) => t.name.toLowerCase()));
    const collisions: string[] = [];
    for (const t of WM_2026_TEAMS) {
      for (const a of t.aliases ?? []) {
        const aLow = a.toLowerCase();
        // Alias darf nicht gleich einem anderen Team-Namen sein
        const other = WM_2026_TEAMS.find((x) => x.name.toLowerCase() === aLow && x.name !== t.name);
        if (other) collisions.push(`${t.name}.alias "${a}" -> ${other.name}`);
      }
    }
    expect(collisions, collisions.join('; ')).toEqual([]);
  });

  it('ELO-Werte liegen im plausiblen Bereich [1300, 2300]', () => {
    for (const t of WM_2026_TEAMS) {
      expect.soft(t.elo, `${t.name} elo`).toBeGreaterThanOrEqual(1300);
      expect.soft(t.elo, `${t.name} elo`).toBeLessThanOrEqual(2300);
    }
  });

  it('Offensive und Defensive in [40, 95]', () => {
    for (const t of WM_2026_TEAMS) {
      expect.soft(t.offensive, `${t.name} off`).toBeGreaterThanOrEqual(40);
      expect.soft(t.offensive, `${t.name} off`).toBeLessThanOrEqual(95);
      expect.soft(t.defensive, `${t.name} def`).toBeGreaterThanOrEqual(40);
      expect.soft(t.defensive, `${t.name} def`).toBeLessThanOrEqual(95);
    }
  });

  it('formIndex in [-6, 8] — realistisches Hot-/Cold-Fenster', () => {
    for (const t of WM_2026_TEAMS) {
      expect.soft(t.formIndex, `${t.name} form`).toBeGreaterThanOrEqual(-6);
      expect.soft(t.formIndex, `${t.name} form`).toBeLessThanOrEqual(8);
    }
  });
});

describe('wm-team-origins — Eindeutige Eintraege', () => {
  it('Kein Team taucht zweimal mit demselben team-Feld auf', () => {
    const names = WM_TEAM_ORIGINS.map((t) => t.team);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dupes, `Duplikate: ${dupes.join(', ')}`).toEqual([]);
  });

  it('Koordinaten plausibel (Lat in [-90,90], Lon in [-180,180])', () => {
    for (const t of WM_TEAM_ORIGINS) {
      expect.soft(t.lat, `${t.team} lat`).toBeGreaterThanOrEqual(-90);
      expect.soft(t.lat, `${t.team} lat`).toBeLessThanOrEqual(90);
      expect.soft(t.lon, `${t.team} lon`).toBeGreaterThanOrEqual(-180);
      expect.soft(t.lon, `${t.team} lon`).toBeLessThanOrEqual(180);
    }
  });

  it('Hoehenlage in [-50, 4500] Meter (kein Toter-See-Bug, keine Mt.Everest-Trainings)', () => {
    for (const t of WM_TEAM_ORIGINS) {
      expect.soft(t.altitudeM, `${t.team} alt`).toBeGreaterThanOrEqual(-50);
      expect.soft(t.altitudeM, `${t.team} alt`).toBeLessThanOrEqual(4500);
    }
  });

  it('UTC-Offset in [-12, 14]', () => {
    for (const t of WM_TEAM_ORIGINS) {
      expect.soft(t.utcOffsetHrs, `${t.team} utc`).toBeGreaterThanOrEqual(-12);
      expect.soft(t.utcOffsetHrs, `${t.team} utc`).toBeLessThanOrEqual(14);
    }
  });
});

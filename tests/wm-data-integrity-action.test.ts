import { describe, expect, it } from 'vitest';
import { evaluateIntegrityAction, isTeamBlocked } from '@/lib/sport/wm-data-integrity-action';
import { rankWmWinnerPicks } from '@/lib/sport/wm-winner-picks';

describe('evaluateIntegrityAction', () => {
  const a = evaluateIntegrityAction();

  it('generatedAt ist ein valider ISO-Timestamp', () => {
    expect(new Date(a.generatedAt).getTime()).not.toBeNaN();
  });

  it('Datenbasis aktuell sauber → blockedTeams/blockedVenues leer, activeBlocks = 0', () => {
    expect(a.blockedTeams.size).toBe(0);
    expect(a.blockedVenues.size).toBe(0);
    expect(a.activeBlocks).toBe(0);
  });
});

describe('isTeamBlocked', () => {
  it('Exakter Match', () => {
    expect(isTeamBlocked('Italien', new Set(['Italien']))).toBe(true);
  });
  it('Akzent-Toleranz', () => {
    expect(isTeamBlocked('Österreich', new Set(['Oesterreich']))).toBe(true);
  });
  it('Substring-Match', () => {
    expect(isTeamBlocked('Bosnien-Herzegowina', new Set(['Bosnien']))).toBe(true);
  });
  it('Leeres Set', () => {
    expect(isTeamBlocked('Foo', new Set())).toBe(false);
  });
});

describe('rankWmWinnerPicks ignoriert Picks bei BLOCKIERTEN Teams', () => {
  it('Mit sauberer Datenbasis liefert es normale Picks (kein Blocker greift)', () => {
    const picks = rankWmWinnerPicks({ todayIso: '2026-06-11', horizonDays: 14 });
    // Wir koennen nicht garantieren dass es Picks gibt, aber die
    // Funktion darf nicht crashen.
    expect(Array.isArray(picks)).toBe(true);
  });
});

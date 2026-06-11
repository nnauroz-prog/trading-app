import { describe, expect, it } from 'vitest';
import { buildWmMorgenVorschau } from '@/lib/sport/wm-morgen-vorschau';
import type { WmFixture } from '@/lib/sport/wm-schedule-2026';
import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

const schedule: WmFixture[] = [
  { id: 'a', date: '2026-06-12', time: '19:00', homeTeam: 'Spanien', awayTeam: 'Kap Verde', venue: 'Atlanta', phase: 'Gruppe', group: 'H' },
  { id: 'b', date: '2026-06-12', time: '22:00', homeTeam: 'Portugal', awayTeam: 'DR Kongo', venue: 'Houston', phase: 'Gruppe', group: 'K' },
  { id: 'c', date: '2026-06-13', time: '17:00', homeTeam: 'Deutschland', awayTeam: 'Elfenbeinkueste', venue: 'Toronto', phase: 'Gruppe', group: 'E' }
];

function pick(fix: WmFixture, over: Partial<WmWinnerPick> = {}): WmWinnerPick {
  const base: WmWinnerPick = {
    fixture: fix,
    prediction: {} as never,
    winnerTeam: fix.homeTeam,
    winnerSide: 'home',
    modelProbabilityPct: 72,
    eloDiff: 200,
    daysUntilMatch: 1,
    proTipper: {} as never,
    conditions: {} as never,
    tier: 'modell-favorit',
    reasons: [],
    riskNotes: []
  };
  return { ...base, ...over };
}

describe('buildWmMorgenVorschau', () => {
  it('Spielfreier Morgen -> headline spielfrei', () => {
    const v = buildWmMorgenVorschau([], '2026-06-13', schedule);
    expect(v.fixturesTotal).toBe(0);
    expect(v.headline).toContain('spielfrei');
  });

  it('Morgen mit Spielen aber ohne Picks', () => {
    const v = buildWmMorgenVorschau([], '2026-06-11', schedule);
    expect(v.dateIso).toBe('2026-06-12');
    expect(v.fixturesTotal).toBe(2);
    expect(v.picks.length).toBe(0);
    expect(v.headline).toContain('2 Spiele');
    expect(v.headline).toContain('0 Tipps');
  });

  it('Picks fuer morgen werden aufgenommen', () => {
    const v = buildWmMorgenVorschau([pick(schedule[0])], '2026-06-11', schedule);
    expect(v.picks.length).toBe(1);
    expect(v.picks[0].winnerTeam).toBe('Spanien');
    expect(v.picks[0].opponentTeam).toBe('Kap Verde');
    expect(v.headline).toContain('1 Tipp');
  });

  it('Picks anderer Tage werden ignoriert', () => {
    const v = buildWmMorgenVorschau([pick(schedule[2])], '2026-06-11', schedule);
    expect(v.picks.length).toBe(0);
  });

  it('Picks nach Anstosszeit sortiert', () => {
    const v = buildWmMorgenVorschau([pick(schedule[1]), pick(schedule[0])], '2026-06-11', schedule);
    expect(v.picks[0].time).toBe('19:00');
    expect(v.picks[1].time).toBe('22:00');
  });

  it('Auswaerts-Pick zeigt Gegner korrekt', () => {
    const v = buildWmMorgenVorschau([
      pick(schedule[0], { winnerSide: 'away', winnerTeam: 'Kap Verde' })
    ], '2026-06-11', schedule);
    expect(v.picks[0].opponentTeam).toBe('Spanien');
  });

  it('Singular bei einem Spiel', () => {
    const single: WmFixture[] = [schedule[2]];
    const v = buildWmMorgenVorschau([], '2026-06-12', single);
    expect(v.headline).toContain('1 Spiel ·');
  });
});

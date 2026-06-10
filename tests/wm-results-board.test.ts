import { describe, expect, it } from 'vitest';
import { buildWmResultBoard } from '@/lib/sport/wm-results-board';
import type { WmFixture } from '@/lib/sport/wm-schedule-2026';

const schedule: WmFixture[] = [
  { id: 'a', date: '2026-06-12', time: '19:00', homeTeam: 'Spanien', awayTeam: 'Kap Verde', venue: 'Atlanta', phase: 'Gruppe', group: 'H' },
  { id: 'b', date: '2026-06-13', time: '20:00', homeTeam: 'Portugal', awayTeam: 'DR Kongo', venue: 'Houston', phase: 'Gruppe', group: 'K' },
  { id: 'c', date: '2026-06-14', time: '21:00', homeTeam: 'Deutschland', awayTeam: 'Elfenbeinkueste', venue: 'Toronto', phase: 'Gruppe', group: 'E' },
  { id: 'd', date: '2026-06-20', time: '21:00', homeTeam: 'Frankreich', awayTeam: 'Argentinien', venue: 'New York', phase: 'Gruppe', group: 'A' } // ausserhalb Fenster
];

describe('buildWmResultBoard', () => {
  it('Liefert nur Spiele mit Final-Score im Fenster', () => {
    const board = buildWmResultBoard({
      todayIso: '2026-06-15',
      schedule,
      finished: [
        { fixtureId: 'a', homeScore: 2, awayScore: 1 },
        { fixtureId: 'd', homeScore: 1, awayScore: 1 } // ausserhalb
      ]
    });
    expect(board.totalGames).toBe(1);
    expect(board.rows[0].fixtureId).toBe('a');
  });

  it('Headline enthaelt Endergebnis', () => {
    const board = buildWmResultBoard({
      todayIso: '2026-06-15',
      schedule,
      finished: [{ fixtureId: 'a', homeScore: 2, awayScore: 1 }]
    });
    expect(board.rows[0].headline).toBe('Spanien 2:1 Kap Verde');
  });

  it('Status home/away/remis korrekt', () => {
    const board = buildWmResultBoard({
      todayIso: '2026-06-15',
      schedule,
      finished: [
        { fixtureId: 'a', homeScore: 2, awayScore: 1 },
        { fixtureId: 'b', homeScore: 0, awayScore: 1 },
        { fixtureId: 'c', homeScore: 1, awayScore: 1 }
      ]
    });
    const a = board.rows.find((r) => r.fixtureId === 'a')!;
    const b = board.rows.find((r) => r.fixtureId === 'b')!;
    const c = board.rows.find((r) => r.fixtureId === 'c')!;
    expect(a.status).toBe('home');
    expect(b.status).toBe('away');
    expect(c.status).toBe('remis');
  });

  it('Treffer wird erkannt', () => {
    const board = buildWmResultBoard({
      todayIso: '2026-06-15',
      schedule,
      finished: [{ fixtureId: 'a', homeScore: 2, awayScore: 1 }],
      picks: [{ fixtureId: 'a', pickedSide: 'home' }]
    });
    expect(board.rows[0].pickStatus).toBe('treffer');
    expect(board.rows[0].pickLabel).toBe('Tipp: Spanien — Treffer');
    expect(board.totalHits).toBe(1);
  });

  it('Fehl wird erkannt', () => {
    const board = buildWmResultBoard({
      todayIso: '2026-06-15',
      schedule,
      finished: [{ fixtureId: 'a', homeScore: 2, awayScore: 1 }],
      picks: [{ fixtureId: 'a', pickedSide: 'away' }]
    });
    expect(board.rows[0].pickStatus).toBe('fehl');
    expect(board.totalMiss).toBe(1);
  });

  it('Remis = push fuer Sieger-Pick', () => {
    const board = buildWmResultBoard({
      todayIso: '2026-06-15',
      schedule,
      finished: [{ fixtureId: 'c', homeScore: 1, awayScore: 1 }],
      picks: [{ fixtureId: 'c', pickedSide: 'home' }]
    });
    expect(board.rows[0].pickStatus).toBe('remis-push');
    expect(board.totalPush).toBe(1);
  });

  it('Ohne Pick: kein-tipp', () => {
    const board = buildWmResultBoard({
      todayIso: '2026-06-15',
      schedule,
      finished: [{ fixtureId: 'a', homeScore: 2, awayScore: 1 }]
    });
    expect(board.rows[0].pickStatus).toBe('kein-tipp');
    expect(board.totalWithoutPick).toBe(1);
  });

  it('lookbackDays anpassbar', () => {
    const board = buildWmResultBoard({
      todayIso: '2026-06-15',
      lookbackDays: 1, // nur 14./15.
      schedule,
      finished: [
        { fixtureId: 'a', homeScore: 2, awayScore: 1 }, // 12.06 — drausssen
        { fixtureId: 'c', homeScore: 1, awayScore: 1 }  // 14.06 — drin
      ]
    });
    expect(board.totalGames).toBe(1);
    expect(board.rows[0].fixtureId).toBe('c');
  });

  it('Sortiert neueste zuerst', () => {
    const board = buildWmResultBoard({
      todayIso: '2026-06-15',
      schedule,
      finished: [
        { fixtureId: 'a', homeScore: 2, awayScore: 1 },
        { fixtureId: 'c', homeScore: 1, awayScore: 1 }
      ]
    });
    expect(board.rows[0].fixtureId).toBe('c'); // 14.06.
    expect(board.rows[1].fixtureId).toBe('a'); // 12.06.
  });
});

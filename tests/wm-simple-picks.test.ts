import { describe, expect, it } from 'vitest';
import { buildWmSimplePicks } from '@/lib/sport/wm-simple-picks';
import type { WmFixture } from '@/lib/sport/wm-schedule-2026';

const schedule: WmFixture[] = [
  { id: 'wm-late', date: '2026-06-15', time: '21:00', homeTeam: 'Spanien', awayTeam: 'Kap Verde', venue: 'Atlanta', phase: 'Gruppe', group: 'H' },
  { id: 'wm-early', date: '2026-06-11', time: '21:00', homeTeam: 'Mexiko', awayTeam: 'Suedafrika', venue: 'Mexico City', phase: 'Gruppe', group: 'A' },
  { id: 'wm-tbd', date: '2026-07-04', time: '21:00', homeTeam: 'Sieger A1', awayTeam: 'Zweiter B2', venue: 'Atlanta', phase: 'Achtelfinale' }
];

describe('buildWmSimplePicks', () => {
  it('Chronologisch sortiert (frueheres Datum zuerst)', () => {
    const picks = buildWmSimplePicks({ schedule });
    expect(picks[0].fixtureId).toBe('wm-early');
    expect(picks[1].fixtureId).toBe('wm-late');
    expect(picks[2].fixtureId).toBe('wm-tbd');
  });

  it('Bei gleichem Datum entscheidet die Anstosszeit', () => {
    const sameDay: WmFixture[] = [
      { id: 'b', date: '2026-06-11', time: '23:00', homeTeam: 'Spanien', awayTeam: 'Kap Verde', venue: 'Atlanta', phase: 'Gruppe', group: 'H' },
      { id: 'a', date: '2026-06-11', time: '19:00', homeTeam: 'Mexiko', awayTeam: 'Suedafrika', venue: 'Mexico City', phase: 'Gruppe', group: 'A' }
    ];
    const picks = buildWmSimplePicks({ schedule: sameDay });
    expect(picks[0].fixtureId).toBe('a');
    expect(picks[1].fixtureId).toBe('b');
  });

  it('Jeder Pick liefert genau eine Sieger/Verlierer-Aussage oder Remis/TBD', () => {
    const picks = buildWmSimplePicks({ schedule });
    for (const p of picks) {
      const isWinnerLoser = p.winnerTeam !== null && p.loserTeam !== null;
      const isRemis = p.status === 'remis';
      const isTbd = p.status === 'tbd';
      expect(isWinnerLoser || isRemis || isTbd).toBe(true);
    }
  });

  it('TBD-Paarung -> status tbd, kein Sieger/Verlierer', () => {
    const picks = buildWmSimplePicks({ schedule });
    const tbd = picks.find((p) => p.fixtureId === 'wm-tbd')!;
    expect(tbd.status).toBe('tbd');
    expect(tbd.winnerTeam).toBeNull();
    expect(tbd.loserTeam).toBeNull();
    expect(tbd.label).toContain('offen');
  });

  it('Klarer Favorit (Spanien gegen Kap Verde) ist klar oder knapp', () => {
    const picks = buildWmSimplePicks({ schedule });
    const sp = picks.find((p) => p.fixtureId === 'wm-late')!;
    expect(['klar', 'knapp']).toContain(sp.status);
    expect(sp.winnerTeam).toBe('Spanien');
    expect(sp.loserTeam).toBe('Kap Verde');
  });

  it('Label enthaelt Sieger und Verlierer', () => {
    const picks = buildWmSimplePicks({ schedule });
    const sp = picks.find((p) => p.fixtureId === 'wm-late')!;
    expect(sp.label).toContain('Spanien');
    expect(sp.label).toContain('Kap Verde');
  });

  it('Erkennt verschiedene TBD-Praefixe (Sieger/Zweiter/Erster/...)', () => {
    const tbdVariants: WmFixture[] = [
      { id: '1', date: '2026-07-04', time: '21:00', homeTeam: 'Sieger A', awayTeam: 'Brasilien', venue: '', phase: 'Achtelfinale' },
      { id: '2', date: '2026-07-04', time: '21:00', homeTeam: 'Brasilien', awayTeam: 'Zweiter B', venue: '', phase: 'Achtelfinale' },
      { id: '3', date: '2026-07-04', time: '21:00', homeTeam: 'Gewinner Spiel 49', awayTeam: 'Brasilien', venue: '', phase: 'Achtelfinale' }
    ];
    const picks = buildWmSimplePicks({ schedule: tbdVariants });
    expect(picks.every((p) => p.status === 'tbd')).toBe(true);
  });

  it('Default-Schedule liefert mindestens 30 Fixtures aus WM_2026_FIXTURES', () => {
    const picks = buildWmSimplePicks();
    expect(picks.length).toBeGreaterThanOrEqual(30);
  });
});

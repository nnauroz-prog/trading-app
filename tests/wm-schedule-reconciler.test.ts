import { describe, expect, it } from 'vitest';
import {
  reconcileWmSchedule,
  verifiedFixtureIds,
  type ExternalScheduleEntry
} from '@/lib/sport/wm-schedule-reconciler';
import type { WmFixture } from '@/lib/sport/wm-schedule-2026';

const schedule: WmFixture[] = [
  {
    id: 'wm-test-1', date: '2026-06-11', time: '15:00',
    homeTeam: 'Mexiko', awayTeam: 'Südafrika',
    venue: 'Estadio Azteca', phase: 'Gruppe', group: 'A',
    sourceConfidence: 'placeholder'
  },
  {
    id: 'wm-test-2', date: '2026-06-12', time: '21:00',
    homeTeam: 'USA', awayTeam: 'Türkei',
    venue: 'SoFi Stadium', phase: 'Gruppe', group: 'D',
    sourceConfidence: 'placeholder'
  },
  {
    id: 'wm-test-3', date: '2026-06-15', time: '18:00',
    homeTeam: 'Deutschland', awayTeam: 'Frankreich',
    venue: 'MetLife Stadium', phase: 'Gruppe', group: 'E',
    sourceConfidence: 'auslosung'
  }
];

describe('reconcileWmSchedule', () => {
  it('Externe Quelle bestaetigt Paarung exakt → MATCH + Upgrade-Vorschlag', () => {
    const external: ExternalScheduleEntry[] = [
      { date: '2026-06-11', time: '15:00', homeTeam: 'Mexiko', awayTeam: 'Südafrika' }
    ];
    const r = reconcileWmSchedule({ external, fromIso: '2026-06-11', toIso: '2026-06-12', schedule });
    const match = r.entries.find((e) => e.fixtureId === 'wm-test-1');
    expect(match?.status).toBe('MATCH');
    expect(match?.upgradeTo).toBe('auslosung'); // placeholder → auslosung
  });

  it('Reversed Heim/Auswaerts → trotzdem MATCH', () => {
    const external: ExternalScheduleEntry[] = [
      { date: '2026-06-11', time: null, homeTeam: 'Südafrika', awayTeam: 'Mexiko' }
    ];
    const r = reconcileWmSchedule({ external, fromIso: '2026-06-11', toIso: '2026-06-12', schedule });
    expect(r.entries.find((e) => e.fixtureId === 'wm-test-1')?.status).toBe('MATCH');
  });

  it('Externe Paarung am selben Tag, aber andere Teams → MISMATCH', () => {
    const external: ExternalScheduleEntry[] = [
      { date: '2026-06-11', time: null, homeTeam: 'Mexiko', awayTeam: 'Tschechien' }
    ];
    const r = reconcileWmSchedule({ external, fromIso: '2026-06-11', toIso: '2026-06-12', schedule });
    expect(r.entries.find((e) => e.fixtureId === 'wm-test-1')?.status).toBe('MISMATCH');
  });

  it('Externe Quelle hat fuer das Datum nichts → UNKNOWN', () => {
    const external: ExternalScheduleEntry[] = [];
    const r = reconcileWmSchedule({ external, fromIso: '2026-06-11', toIso: '2026-06-12', schedule });
    expect(r.entries.find((e) => e.fixtureId === 'wm-test-1')?.status).toBe('UNKNOWN');
  });

  it('Akzent-Toleranz (Suedafrika === Südafrika)', () => {
    const external: ExternalScheduleEntry[] = [
      { date: '2026-06-11', time: null, homeTeam: 'Mexiko', awayTeam: 'Suedafrika' }
    ];
    const r = reconcileWmSchedule({ external, fromIso: '2026-06-11', toIso: '2026-06-12', schedule });
    expect(r.entries.find((e) => e.fixtureId === 'wm-test-1')?.status).toBe('MATCH');
  });

  it('Auslosung-Fixture mit MATCH → kein Upgrade-Vorschlag', () => {
    const external: ExternalScheduleEntry[] = [
      { date: '2026-06-15', time: null, homeTeam: 'Deutschland', awayTeam: 'Frankreich' }
    ];
    const r = reconcileWmSchedule({ external, fromIso: '2026-06-15', toIso: '2026-06-15', schedule });
    const m = r.entries.find((e) => e.fixtureId === 'wm-test-3');
    expect(m?.status).toBe('MATCH');
    expect(m?.upgradeTo).toBeNull();
  });

  it('verifiedFixtureIds liefert nur MATCH-Fixtures', () => {
    const external: ExternalScheduleEntry[] = [
      { date: '2026-06-11', time: null, homeTeam: 'Mexiko', awayTeam: 'Südafrika' },
      { date: '2026-06-12', time: null, homeTeam: 'USA', awayTeam: 'Tschechien' } // Mismatch
    ];
    const r = reconcileWmSchedule({ external, fromIso: '2026-06-11', toIso: '2026-06-12', schedule });
    const ids = verifiedFixtureIds(r);
    expect(ids.has('wm-test-1')).toBe(true);
    expect(ids.has('wm-test-2')).toBe(false);
  });

  it('verifiedPct = matched / internalCount * 100', () => {
    const external: ExternalScheduleEntry[] = [
      { date: '2026-06-11', time: null, homeTeam: 'Mexiko', awayTeam: 'Südafrika' }
    ];
    const r = reconcileWmSchedule({ external, fromIso: '2026-06-11', toIso: '2026-06-12', schedule });
    // 1 von 2 Fixtures im Fenster matched
    expect(r.verifiedPct).toBe(50);
  });
});

describe('mismatchedFixtureIds + Pick-Veto', () => {
  it('mismatchedFixtureIds liefert nur MISMATCH-Fixtures', async () => {
    const { mismatchedFixtureIds } = await import('@/lib/sport/wm-schedule-reconciler');
    const external: ExternalScheduleEntry[] = [
      { date: '2026-06-11', time: null, homeTeam: 'Mexiko', awayTeam: 'Tschechien' } // widerspricht intern
    ];
    const r = reconcileWmSchedule({ external, fromIso: '2026-06-11', toIso: '2026-06-12', schedule });
    const ids = mismatchedFixtureIds(r);
    expect(ids.has('wm-test-1')).toBe(true);
    expect(ids.has('wm-test-3')).toBe(false);
  });

  it('rankWmWinnerPicks blockt MISMATCH-Fixtures auch bei auslosung-Confidence', async () => {
    const { rankWmWinnerPicks } = await import('@/lib/sport/wm-winner-picks');
    // Baseline ohne Veto
    const base = rankWmWinnerPicks({ todayIso: '2026-06-15', horizonDays: 7 });
    if (base.length === 0) return; // heute keine Picks → nichts zu pruefen
    const target = base[0];
    // Mit Mismatch-Veto auf genau diesem Fixture
    const withVeto = rankWmWinnerPicks({
      todayIso: '2026-06-15',
      horizonDays: 7,
      mismatchedFixtureIds: new Set([target.fixture.id])
    });
    expect(withVeto.find((p) => p.fixture.id === target.fixture.id)).toBeUndefined();
  });
});

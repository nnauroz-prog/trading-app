import { describe, expect, it } from 'vitest';
import { buildWmDayPlan } from '@/lib/sport/wm-day-plan';
import type { WmFixture } from '@/lib/sport/wm-schedule-2026';
import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

const schedule: WmFixture[] = [
  { id: 'd1', date: '2026-06-15', time: '19:00', homeTeam: 'Frankreich', awayTeam: 'Senegal', venue: 'MetLife Stadium', phase: 'Gruppe', group: 'E' },
  { id: 'd2', date: '2026-06-15', time: '16:00', homeTeam: 'Sieger Gruppe A', awayTeam: 'Polen', venue: 'TBD', phase: 'Achtelfinale' },
  { id: 'd3', date: '2026-06-15', time: '22:00', homeTeam: 'Mexiko', awayTeam: 'Südafrika', venue: 'Estadio Azteca', phase: 'Gruppe', group: 'A', sourceConfidence: 'placeholder' },
  { id: 'd4', date: '2026-06-16', time: '19:00', homeTeam: 'England', awayTeam: 'Wales', venue: 'BMO Field', phase: 'Gruppe', group: 'F' }
];

function pick(fixture: WmFixture): WmWinnerPick {
  return {
    fixture,
    prediction: {} as never,
    winnerTeam: fixture.homeTeam,
    winnerSide: 'home',
    modelProbabilityPct: 72,
    eloDiff: 150,
    daysUntilMatch: 0,
    proTipper: { status: 'OK', reason: '', conviction: 1 },
    conditions: {} as never,
    tier: 'modell-favorit',
    reasons: [],
    riskNotes: []
  };
}

describe('buildWmDayPlan', () => {
  it('Nur Spiele des angefragten Tages', () => {
    const plan = buildWmDayPlan({ todayIso: '2026-06-15', picks: [], schedule });
    expect(plan.rows.length).toBe(3);
    expect(plan.rows.find((r) => r.fixture.id === 'd4')).toBeUndefined();
  });

  it('Pick-Status wenn Fixture in picks enthalten', () => {
    const plan = buildWmDayPlan({ todayIso: '2026-06-15', picks: [pick(schedule[0])], schedule });
    const row = plan.rows.find((r) => r.fixture.id === 'd1');
    expect(row?.status).toBe('pick');
    expect(row?.pick).not.toBeNull();
    expect(plan.pickCount).toBe(1);
  });

  it('TBD-Slot → blocked-tbd', () => {
    const plan = buildWmDayPlan({ todayIso: '2026-06-15', picks: [], schedule });
    expect(plan.rows.find((r) => r.fixture.id === 'd2')?.status).toBe('blocked-tbd');
  });

  it('Placeholder ohne Verifizierung → blocked-placeholder', () => {
    const plan = buildWmDayPlan({ todayIso: '2026-06-15', picks: [], schedule });
    expect(plan.rows.find((r) => r.fixture.id === 'd3')?.status).toBe('blocked-placeholder');
  });

  it('Placeholder MIT Verifizierung → kein-pick-filter (nicht mehr placeholder-geblockt)', () => {
    const plan = buildWmDayPlan({
      todayIso: '2026-06-15', picks: [], schedule,
      verifiedFixtureIds: new Set(['d3'])
    });
    expect(plan.rows.find((r) => r.fixture.id === 'd3')?.status).toBe('kein-pick-filter');
  });

  it('Mismatch → blocked-mismatch (Prioritaet vor placeholder)', () => {
    const plan = buildWmDayPlan({
      todayIso: '2026-06-15', picks: [], schedule,
      mismatchedFixtureIds: new Set(['d3'])
    });
    expect(plan.rows.find((r) => r.fixture.id === 'd3')?.status).toBe('blocked-mismatch');
  });

  it('Anstosszeit wird nach Europe/Berlin konvertiert (19:00 UTC = 21:00 Berlin im Sommer)', () => {
    const plan = buildWmDayPlan({ todayIso: '2026-06-15', picks: [], schedule });
    const row = plan.rows.find((r) => r.fixture.id === 'd1');
    expect(row?.kickoffBerlin).toBe('21:00');
  });

  it('Picks werden zuerst sortiert', () => {
    const plan = buildWmDayPlan({ todayIso: '2026-06-15', picks: [pick(schedule[0])], schedule });
    expect(plan.rows[0].status).toBe('pick');
  });

  it('Wetter-Note bei auffaelligem Wetter', () => {
    const plan = buildWmDayPlan({
      todayIso: '2026-06-15', picks: [], schedule,
      weatherByFixtureId: {
        d1: { matchTimeUtc: 0, windKmh: 35, precipMm: 0, temperatureC: 22, forecastHourIso: '2026-06-15T19:00' }
      }
    });
    const row = plan.rows.find((r) => r.fixture.id === 'd1');
    expect(row?.weatherNote).toContain('Wind');
  });

  it('Leerer Tag → leere rows', () => {
    const plan = buildWmDayPlan({ todayIso: '2026-06-20', picks: [], schedule });
    expect(plan.rows.length).toBe(0);
  });
});

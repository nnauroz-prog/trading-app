import { describe, expect, it } from 'vitest';
import { buildWmWeekPlan } from '@/lib/sport/wm-week-plan';
import type { WmFixture } from '@/lib/sport/wm-schedule-2026';
import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

const schedule: WmFixture[] = [
  { id: 'a', date: '2026-06-15', time: '19:00', homeTeam: 'Spanien', awayTeam: 'Kap Verde', venue: 'Atlanta', phase: 'Gruppe', group: 'H' },
  { id: 'b', date: '2026-06-15', time: '22:00', homeTeam: 'Sieger Gruppe A', awayTeam: 'Zweiter Gruppe B', venue: '', phase: 'Achtelfinale' },
  { id: 'c', date: '2026-06-17', time: '17:00', homeTeam: 'Portugal', awayTeam: 'DR Kongo', venue: 'Houston', phase: 'Gruppe', group: 'K' },
  { id: 'd', date: '2026-06-20', time: '20:00', homeTeam: 'Deutschland', awayTeam: 'Elfenbeinkueste', venue: 'Toronto', phase: 'Gruppe', group: 'E' }
];

function pick(fix: WmFixture, prob = 75, tier: 'hoechste-konfluenz' | 'modell-favorit' = 'modell-favorit'): WmWinnerPick {
  return {
    fixture: fix,
    prediction: {} as never,
    winnerTeam: fix.homeTeam,
    winnerSide: 'home',
    modelProbabilityPct: prob,
    eloDiff: 100,
    daysUntilMatch: 1,
    proTipper: {} as never,
    conditions: {} as never,
    tier,
    reasons: [],
    riskNotes: []
  };
}

describe('buildWmWeekPlan', () => {
  it('Liefert 7 Tage ab todayIso', () => {
    const plan = buildWmWeekPlan({ todayIso: '2026-06-15', picks: [], schedule });
    expect(plan.days.length).toBe(7);
    expect(plan.days[0].dateIso).toBe('2026-06-15');
    expect(plan.days[6].dateIso).toBe('2026-06-21');
  });

  it('Pick wird dem korrekten Tag zugeordnet', () => {
    const plan = buildWmWeekPlan({ todayIso: '2026-06-15', picks: [pick(schedule[0])], schedule });
    const tag = plan.days.find((d) => d.dateIso === '2026-06-15')!;
    expect(tag.pickCount).toBe(1);
    expect(tag.picks[0].winnerTeam).toBe('Spanien');
  });

  it('Spielfreie Tage haben fixturesTotal 0', () => {
    const plan = buildWmWeekPlan({ todayIso: '2026-06-15', picks: [], schedule });
    const tag = plan.days.find((d) => d.dateIso === '2026-06-16')!;
    expect(tag.fixturesTotal).toBe(0);
  });

  it('TBD-Fixtures zaehlen als blocked', () => {
    const plan = buildWmWeekPlan({ todayIso: '2026-06-15', picks: [], schedule });
    const tag = plan.days.find((d) => d.dateIso === '2026-06-15')!;
    expect(tag.fixturesBlocked).toBe(1); // wm-b mit "Sieger Gruppe A"
  });

  it('totalPicks summiert ueber alle Tage', () => {
    const plan = buildWmWeekPlan({
      todayIso: '2026-06-15',
      picks: [pick(schedule[0]), pick(schedule[2]), pick(schedule[3])],
      schedule
    });
    expect(plan.totalPicks).toBe(3);
  });

  it('horizonDays anpassbar', () => {
    const plan = buildWmWeekPlan({ todayIso: '2026-06-15', horizonDays: 3, picks: [], schedule });
    expect(plan.days.length).toBe(3);
    expect(plan.toIso).toBe('2026-06-17');
  });

  it('Picks ausserhalb des Fensters werden nicht gezaehlt', () => {
    const plan = buildWmWeekPlan({
      todayIso: '2026-06-15',
      horizonDays: 2,
      picks: [pick(schedule[3])], // 20.06., ausserhalb 2-Tage-Fenster
      schedule
    });
    expect(plan.totalPicks).toBe(0);
  });

  it('Tier-Tag korrekt durchgereicht', () => {
    const plan = buildWmWeekPlan({
      todayIso: '2026-06-15',
      picks: [pick(schedule[0], 85, 'hoechste-konfluenz')],
      schedule
    });
    expect(plan.days[0].picks[0].tier).toBe('hoechste-konfluenz');
  });

  it('Weekday-Label deutsch', () => {
    const plan = buildWmWeekPlan({ todayIso: '2026-06-15', picks: [], schedule });
    // 15. Juni 2026 ist Montag
    expect(plan.days[0].weekdayLabel.toLowerCase()).toContain('mo');
  });
});

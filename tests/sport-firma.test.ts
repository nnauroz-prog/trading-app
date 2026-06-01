import { describe, expect, it } from 'vitest';
import type { Fixture, LeagueFixtures, UpcomingFixture } from '@/lib/sport/fetcher';
import { computeTeamForms, scoutFindings } from '@/lib/sport/firma/scouts';
import { buildWeekAhead } from '@/lib/sport/firma/week-ahead';
import { SPORT_FIRMA_SIZE, SPORT_FIRMA, countByDepartment } from '@/lib/sport/firma/roster';
import { buildFirmaSynthesis } from '@/lib/sport/firma/synthesis';

function finished(home: string, away: string, hs: number, as: number, date = '2026-05-25'): Fixture {
  return {
    id: `${home}-${away}-${date}`,
    homeTeam: home,
    awayTeam: away,
    league: 'L1',
    date,
    time: '15:30',
    venue: null,
    homeScore: hs,
    awayScore: as,
    status: 'finished'
  };
}

function upcoming(home: string, away: string, date: string, time: string | null = '20:00'): UpcomingFixture {
  return {
    id: `${home}-${away}-${date}-${time ?? 'n'}`,
    homeTeam: home,
    awayTeam: away,
    league: 'L1',
    date,
    time,
    venue: null,
    homeScore: null,
    awayScore: null,
    status: 'upcoming',
    prediction: null,
    probabilities: null,
    tips: null
  };
}

function league(name: string, past: Fixture[], next: UpcomingFixture[] = []): LeagueFixtures {
  return { league: { id: name, name, country: 'X' }, next, last: past };
}

describe('SPORT_FIRMA roster', () => {
  it('has exactly 100 employees', () => {
    expect(SPORT_FIRMA_SIZE).toBe(100);
    expect(SPORT_FIRMA).toHaveLength(100);
  });

  it('every employee has a unique id', () => {
    const ids = new Set(SPORT_FIRMA.map((e) => e.id));
    expect(ids.size).toBe(SPORT_FIRMA.length);
  });

  it('departments sum to 100', () => {
    const counts = countByDepartment();
    const sum = Object.values(counts).reduce((s, n) => s + n, 0);
    expect(sum).toBe(100);
  });

  it('has at least one chef and at least one league scout', () => {
    const counts = countByDepartment();
    expect(counts.chef).toBeGreaterThan(0);
    expect(counts.league_scout).toBeGreaterThan(0);
  });
});

describe('computeTeamForms', () => {
  it('produces a form row per team with correct W/D/L tally', () => {
    const past = [
      finished('A', 'B', 2, 0),
      finished('C', 'A', 1, 3, '2026-05-26'),
      finished('A', 'D', 0, 0, '2026-05-27')
    ];
    const forms = computeTeamForms([league('L1', past)]);
    const a = forms.find((f) => f.team === 'A');
    expect(a).toBeDefined();
    expect(a!.wins).toBe(2);
    expect(a!.draws).toBe(1);
    expect(a!.losses).toBe(0);
    expect(a!.points).toBe(7);
    expect(a!.goalsFor).toBe(5);
    expect(a!.goalsAgainst).toBe(1);
  });
});

describe('scoutFindings', () => {
  it('flags a team on a 3-win streak as dangerous', () => {
    const past = [
      finished('Hot', 'X', 2, 0, '2026-05-20'),
      finished('Y', 'Hot', 0, 3, '2026-05-22'),
      finished('Hot', 'Z', 4, 1, '2026-05-24')
    ];
    const forms = computeTeamForms([league('L1', past)]);
    const findings = scoutFindings(forms);
    const danger = findings.find((f) => f.kind === 'dangerous' && f.team === 'Hot');
    expect(danger).toBeDefined();
  });

  it('flags a team with ≥2.5 goals/match as goal-machine', () => {
    const past = [
      finished('Goals', 'X', 4, 1, '2026-05-20'),
      finished('Y', 'Goals', 1, 3, '2026-05-22'),
      finished('Goals', 'Z', 3, 0, '2026-05-24')
    ];
    const forms = computeTeamForms([league('L1', past)]);
    const findings = scoutFindings(forms);
    expect(findings.some((f) => f.kind === 'goal_machine' && f.team === 'Goals')).toBe(true);
  });
});

describe('buildWeekAhead', () => {
  it('buckets fixtures across days within the 7-day horizon', () => {
    const today = '2026-06-01';
    const next: UpcomingFixture[] = [
      upcoming('A', 'B', '2026-06-01', '15:30'),
      upcoming('C', 'D', '2026-06-03', '20:00'),
      upcoming('E', 'F', '2026-06-12', '20:00') // außerhalb 7-Tage-Fenster
    ];
    const days = buildWeekAhead([league('L1', [], next)], today);
    expect(days.map((d) => d.date)).toEqual(['2026-06-01', '2026-06-03']);
    expect(days[0].fixtures).toHaveLength(1);
  });

  it('drops past fixtures', () => {
    const today = '2026-06-01';
    const next: UpcomingFixture[] = [upcoming('A', 'B', '2026-05-30', '15:30')];
    const days = buildWeekAhead([league('L1', [], next)], today);
    expect(days).toHaveLength(0);
  });
});

describe('buildFirmaSynthesis', () => {
  it('returns 100 employees and a non-empty chef statement', () => {
    const past = [finished('A', 'B', 2, 0)];
    const synth = buildFirmaSynthesis([league('L1', past)], '2026-06-01');
    expect(synth.totalEmployees).toBe(100);
    expect(synth.chefStatement.length).toBeGreaterThan(0);
    expect(synth.honesty.length).toBeGreaterThan(0);
  });

  it('includes a high-confidence pick when a prediction crosses the threshold', () => {
    const fx = upcoming('Strong', 'Weak', '2026-06-02', '20:00');
    fx.prediction = {
      lambdaHome: 2.1,
      lambdaAway: 0.6,
      pHome: 0.72,
      pDraw: 0.18,
      pAway: 0.10,
      likelyScore: { home: 2, away: 0 },
      homeGames: 5,
      awayGames: 5,
      pickSide: 'home',
      pickConfidence: 0.72,
      pickLabel: 'klar',
      pickPlain: 'Heimsieg',
      homeForm: { results: [], goalsFor: 0, goalsAgainst: 0 },
      awayForm: { results: [], goalsFor: 0, goalsAgainst: 0 }
    };
    const synth = buildFirmaSynthesis([league('L1', [], [fx])], '2026-06-01');
    expect(synth.highConfidencePicks.length).toBeGreaterThan(0);
    expect(synth.highConfidencePicks[0].confidence).toBeCloseTo(0.72, 2);
  });
});

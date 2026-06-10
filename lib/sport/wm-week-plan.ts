// 7-Tage-Vorschau der WM. Pro Tag: Spielanzahl + Pick-Anzahl + die
// Tipps in Kurzform. Damit sieht der User auf einen Blick wann sich
// das Reinschauen lohnt.

import { WM_2026_FIXTURES, effectiveConfidence, type WmFixture } from '@/lib/sport/wm-schedule-2026';
import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

export interface WeekPlanPickLite {
  winnerTeam: string;
  opponentTeam: string;
  modelProbabilityPct: number;
  tier: 'hoechste-konfluenz' | 'modell-favorit';
}

export interface WeekPlanDay {
  dateIso: string;
  weekdayLabel: string; // "Mo", "Di", ...
  fixturesTotal: number;
  fixturesBlocked: number; // TBD/placeholder
  pickCount: number;
  picks: WeekPlanPickLite[];
}

export interface WmWeekPlan {
  fromIso: string;
  toIso: string;
  days: WeekPlanDay[];
  totalPicks: number;
}

function isPlaceholder(team: string): boolean {
  return team.includes('TBD') || /^(Sieger|Verlierer|Zweiter|Erster)\s/i.test(team.trim());
}

function fmtWeekday(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', timeZone: 'Europe/Berlin' });
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

interface BuildOptions {
  todayIso: string;
  horizonDays?: number; // Default 7
  picks: WmWinnerPick[];
  schedule?: WmFixture[];
}

export function buildWmWeekPlan(opts: BuildOptions): WmWeekPlan {
  const { todayIso, horizonDays = 7, picks } = opts;
  const schedule = opts.schedule ?? WM_2026_FIXTURES;
  const picksByDate = new Map<string, WmWinnerPick[]>();
  for (const p of picks) {
    if (!picksByDate.has(p.fixture.date)) picksByDate.set(p.fixture.date, []);
    picksByDate.get(p.fixture.date)!.push(p);
  }

  const days: WeekPlanDay[] = [];
  for (let i = 0; i < horizonDays; i++) {
    const dateIso = addDays(todayIso, i);
    const todaysFixtures = schedule.filter((f) => f.date === dateIso);
    const blocked = todaysFixtures.filter((f) =>
      isPlaceholder(f.homeTeam) ||
      isPlaceholder(f.awayTeam) ||
      effectiveConfidence(f) === 'placeholder'
    ).length;
    const dayPicks = (picksByDate.get(dateIso) ?? []).map<WeekPlanPickLite>((p) => ({
      winnerTeam: p.winnerTeam,
      opponentTeam: p.winnerSide === 'home' ? p.fixture.awayTeam : p.fixture.homeTeam,
      modelProbabilityPct: p.modelProbabilityPct,
      tier: p.tier
    }));
    days.push({
      dateIso,
      weekdayLabel: fmtWeekday(dateIso),
      fixturesTotal: todaysFixtures.length,
      fixturesBlocked: blocked,
      pickCount: dayPicks.length,
      picks: dayPicks
    });
  }
  return {
    fromIso: todayIso,
    toIso: addDays(todayIso, horizonDays - 1),
    days,
    totalPicks: days.reduce((s, d) => s + d.pickCount, 0)
  };
}

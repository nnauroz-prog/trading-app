import type { LeagueFixtures, UpcomingFixture } from '@/lib/sport/fetcher';
import { fixtureBerlinDate } from '@/lib/sport/day-buckets';
import { todayIsoBerlin } from '@/lib/agent-memory';

export interface WeekAheadDay {
  date: string;
  weekday: string;
  fixtures: { fixture: UpcomingFixture; leagueName: string }[];
}

const WEEKDAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

// Buckets all upcoming fixtures from all leagues into the next 7 days
// (Europe/Berlin), starting today. Days without matches are dropped.
export function buildWeekAhead(leagues: LeagueFixtures[], todayIso: string = todayIsoBerlin()): WeekAheadDay[] {
  const flat: { fixture: UpcomingFixture; leagueName: string }[] = [];
  for (const lf of leagues) {
    for (const f of lf.next) flat.push({ fixture: f, leagueName: lf.league.name });
  }

  const horizon = addDays(todayIso, 45);
  const byDate = new Map<string, { fixture: UpcomingFixture; leagueName: string }[]>();
  for (const entry of flat) {
    const berlinDate = fixtureBerlinDate(entry.fixture.date, entry.fixture.time);
    if (berlinDate < todayIso || berlinDate >= horizon) continue;
    if (!byDate.has(berlinDate)) byDate.set(berlinDate, []);
    byDate.get(berlinDate)!.push(entry);
  }

  const result: WeekAheadDay[] = [];
  for (const [date, fixtures] of byDate.entries()) {
    fixtures.sort((a, b) => (a.fixture.time ?? '99:99').localeCompare(b.fixture.time ?? '99:99'));
    result.push({ date, weekday: weekdayOf(date), fixtures });
  }
  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function weekdayOf(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  // Berlin-Wochentag — Mittagsanker reicht, weil DST nie über 12:00 wechselt.
  const localString = d.toLocaleString('en-US', { timeZone: 'Europe/Berlin' });
  const localDate = new Date(localString);
  return WEEKDAYS_DE[localDate.getDay()] ?? '';
}

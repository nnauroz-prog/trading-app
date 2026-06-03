import { todayIsoBerlin } from '@/lib/agent-memory';
import type { UpcomingFixture } from '@/lib/sport/fetcher';

// Converts a fixture's UTC date + HH:MM to the matching Berlin date (YYYY-MM-DD).
// Football kickoffs late at night can roll over a day depending on DST, so we
// resolve via Intl rather than naive arithmetic.
export function fixtureBerlinDate(date: string, time: string | null): string {
  const iso = time ? `${date}T${time}:00Z` : `${date}T12:00:00Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return date;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const m = parts.find((p) => p.type === 'month')?.value ?? '00';
  const day = parts.find((p) => p.type === 'day')?.value ?? '00';
  return `${y}-${m}-${day}`;
}

export interface DayBuckets {
  todayIso: string;
  tomorrowIso: string;
  today: UpcomingFixture[];
  tomorrow: UpcomingFixture[];
  laterFirstDate: string | null;
  laterFirst: UpcomingFixture[];
}

export function bucketByDay(fixtures: UpcomingFixture[], todayIso: string = todayIsoBerlin()): DayBuckets {
  const today: UpcomingFixture[] = [];
  const tomorrow: UpcomingFixture[] = [];
  const later: UpcomingFixture[] = [];
  const tomorrowIso = addDays(todayIso, 1);

  for (const f of fixtures) {
    const berlinDate = fixtureBerlinDate(f.date, f.time);
    if (berlinDate < todayIso) continue;
    if (berlinDate === todayIso) today.push(f);
    else if (berlinDate === tomorrowIso) tomorrow.push(f);
    else later.push(f);
  }

  later.sort((a, b) => fixtureBerlinDate(a.date, a.time).localeCompare(fixtureBerlinDate(b.date, b.time)));
  today.sort(byKickoff);
  tomorrow.sort(byKickoff);

  const laterFirstDate = later.length > 0 ? fixtureBerlinDate(later[0].date, later[0].time) : null;
  const laterFirst = laterFirstDate ? later.filter((f) => fixtureBerlinDate(f.date, f.time) === laterFirstDate) : [];

  return { todayIso, tomorrowIso, today, tomorrow, laterFirstDate, laterFirst };
}

function byKickoff(a: UpcomingFixture, b: UpcomingFixture): number {
  const ta = a.time ?? '99:99';
  const tb = b.time ?? '99:99';
  return ta.localeCompare(tb);
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

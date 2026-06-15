import { unstable_cache } from 'next/cache';
import { HOCKEY_LEAGUES, HANDBALL_LEAGUES, League } from '@/lib/sport/leagues';

// Wiederverwendbares Schema für jeden generischen Sport. Aktuell konkret für
// Hockey instanziiert — kann später für Handball, Baseball, American Football
// gleichermaßen aufgerufen werden.

export interface GenericFixture {
  id: string;
  league: string;
  date: string;
  time: string | null;
  venue: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: 'upcoming' | 'finished';
}

export interface GenericLeagueFixtures {
  league: League;
  next: GenericFixture[];
  last: GenericFixture[];
}

interface ApiEvent {
  idEvent?: string;
  strHomeTeam?: string;
  strAwayTeam?: string;
  strLeague?: string;
  dateEvent?: string;
  strTime?: string;
  strVenue?: string;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
}

function normalize(e: ApiEvent, status: 'upcoming' | 'finished'): GenericFixture | null {
  if (!e.idEvent || !e.strHomeTeam || !e.strAwayTeam || !e.dateEvent) return null;
  // Score-Parsing mit NaN-Schutz: TheSportsDB-Werte können „?"/„-" sein.
  const homeNum = Number(e.intHomeScore);
  const home = e.intHomeScore != null && e.intHomeScore !== '' && Number.isFinite(homeNum) ? homeNum : null;
  const awayNum = Number(e.intAwayScore);
  const away = e.intAwayScore != null && e.intAwayScore !== '' && Number.isFinite(awayNum) ? awayNum : null;
  return {
    id: e.idEvent, homeTeam: e.strHomeTeam, awayTeam: e.strAwayTeam,
    league: e.strLeague ?? '', date: e.dateEvent,
    time: e.strTime ? e.strTime.slice(0, 5) : null,
    venue: e.strVenue ?? null, homeScore: home, awayScore: away, status
  };
}

async function fetchEvents(leagueId: string, kind: 'next' | 'past'): Promise<GenericFixture[]> {
  const url = `https://www.thesportsdb.com/api/v1/json/3/events${kind}league.php?id=${leagueId}`;
  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { events?: ApiEvent[] | null };
    return (data.events ?? [])
      .map((e) => normalize(e, kind === 'next' ? 'upcoming' : 'finished'))
      .filter((f): f is GenericFixture => f !== null);
  } catch {
    return [];
  }
}

async function computeHockey(): Promise<GenericLeagueFixtures[]> {
  const todayIso = new Date().toISOString().slice(0, 10);
  return Promise.all(
    HOCKEY_LEAGUES.map(async (league) => {
      const [next, past] = await Promise.all([fetchEvents(league.id, 'next'), fetchEvents(league.id, 'past')]);
      const future = next.filter((f) => f.date >= todayIso);
      future.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
      return { league, next: future, last: past };
    })
  );
}

export const getHockeyFixtures = unstable_cache(computeHockey, ['hockey-fixtures-v1'], { revalidate: 600 });

async function computeHandball(): Promise<GenericLeagueFixtures[]> {
  const todayIso = new Date().toISOString().slice(0, 10);
  return Promise.all(
    HANDBALL_LEAGUES.map(async (league) => {
      const [next, past] = await Promise.all([fetchEvents(league.id, 'next'), fetchEvents(league.id, 'past')]);
      const future = next.filter((f) => f.date >= todayIso);
      future.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
      return { league, next: future, last: past };
    })
  );
}

export const getHandballFixtures = unstable_cache(computeHandball, ['handball-fixtures-v1'], { revalidate: 600 });

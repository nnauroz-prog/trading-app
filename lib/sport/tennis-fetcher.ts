import { unstable_cache } from 'next/cache';
import { thesportsdbBase } from '@/lib/sport/sportsdb-config';
import { TENNIS_LEAGUES, League } from '@/lib/sport/leagues';

export interface TennisFixture {
  id: string;
  league: string;
  date: string;
  time: string | null;
  venue: string | null;
  homeTeam: string; // Spieler 1
  awayTeam: string; // Spieler 2
  homeScore: number | null;
  awayScore: number | null;
  status: 'upcoming' | 'finished';
}

export interface TennisLeagueFixtures {
  league: League;
  next: TennisFixture[];
  last: TennisFixture[];
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

function normalize(e: ApiEvent, status: 'upcoming' | 'finished'): TennisFixture | null {
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

async function fetchEvents(leagueId: string, kind: 'next' | 'past'): Promise<TennisFixture[]> {
  const url = `${thesportsdbBase()}/events${kind}league.php?id=${leagueId}`;
  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { events?: ApiEvent[] | null };
    return (data.events ?? [])
      .map((e) => normalize(e, kind === 'next' ? 'upcoming' : 'finished'))
      .filter((f): f is TennisFixture => f !== null);
  } catch {
    return [];
  }
}

async function compute(): Promise<TennisLeagueFixtures[]> {
  const todayIso = new Date().toISOString().slice(0, 10);
  return Promise.all(
    TENNIS_LEAGUES.map(async (league) => {
      const [next, past] = await Promise.all([fetchEvents(league.id, 'next'), fetchEvents(league.id, 'past')]);
      const future = next.filter((f) => f.date >= todayIso);
      future.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
      return { league, next: future, last: past };
    })
  );
}

export const getTennisFixtures = unstable_cache(compute, ['tennis-fixtures-v1'], { revalidate: 600 });

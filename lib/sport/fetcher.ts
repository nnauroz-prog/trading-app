import { unstable_cache } from 'next/cache';
import { FOOTBALL_LEAGUES, League } from '@/lib/sport/leagues';
import { MatchPrediction, predictMatch } from '@/lib/sport/predictor';
import { FootballProbabilityModel, computeFootballProbabilities } from '@/lib/sport/probabilities';
import { AllTips, generateTips } from '@/lib/sport/tip-selection';

export interface Fixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string; // ISO yyyy-mm-dd
  time: string | null; // HH:MM (UTC) or null
  venue: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: 'upcoming' | 'finished';
}

export interface UpcomingFixture extends Fixture {
  prediction: MatchPrediction | null;
  probabilities: FootballProbabilityModel | null;
  tips: AllTips | null;
}

export interface LeagueFixtures {
  league: League;
  next: UpcomingFixture[];
  last: Fixture[];
}

interface ApiEvent {
  idEvent?: string;
  strEvent?: string;
  strHomeTeam?: string;
  strAwayTeam?: string;
  strLeague?: string;
  dateEvent?: string;
  strTime?: string;
  strVenue?: string;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
}

function normalize(e: ApiEvent, status: 'upcoming' | 'finished'): Fixture | null {
  if (!e.idEvent || !e.strHomeTeam || !e.strAwayTeam || !e.dateEvent) return null;
  const home = e.intHomeScore != null && e.intHomeScore !== '' ? Number(e.intHomeScore) : null;
  const away = e.intAwayScore != null && e.intAwayScore !== '' ? Number(e.intAwayScore) : null;
  return {
    id: e.idEvent,
    homeTeam: e.strHomeTeam,
    awayTeam: e.strAwayTeam,
    league: e.strLeague ?? '',
    date: e.dateEvent,
    time: e.strTime ? e.strTime.slice(0, 5) : null,
    venue: e.strVenue ?? null,
    homeScore: home,
    awayScore: away,
    status
  };
}

async function fetchEvents(leagueId: string, kind: 'next' | 'past'): Promise<Fixture[]> {
  const url = `https://www.thesportsdb.com/api/v1/json/3/events${kind}league.php?id=${leagueId}`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { events?: ApiEvent[] | null };
    const events = data.events ?? [];
    return events
      .map((e) => normalize(e, kind === 'next' ? 'upcoming' : 'finished'))
      .filter((f): f is Fixture => f !== null);
  } catch {
    return [];
  }
}

async function compute(): Promise<LeagueFixtures[]> {
  const results = await Promise.all(
    FOOTBALL_LEAGUES.map(async (league) => {
      const [next, past] = await Promise.all([fetchEvents(league.id, 'next'), fetchEvents(league.id, 'past')]);
      const upcoming: UpcomingFixture[] = next.slice(0, 8).map((f) => {
        const probabilities = computeFootballProbabilities(f.homeTeam, f.awayTeam, past);
        const tips = probabilities ? generateTips(probabilities, f.homeTeam, f.awayTeam) : null;
        return {
          ...f,
          prediction: predictMatch(f.homeTeam, f.awayTeam, past),
          probabilities,
          tips
        };
      });
      return {
        league,
        next: upcoming,
        last: past.slice(0, 8)
      };
    })
  );
  return results;
}

// Fixtures don't change minute-to-minute; cache for an hour.
// Bumped cache key to v2: response schema gained probability + tip fields.
export const getFootballFixtures = unstable_cache(compute, ['football-fixtures-v2'], { revalidate: 3600 });

import { unstable_cache } from 'next/cache';
import { FOOTBALL_LEAGUES, League } from '@/lib/sport/leagues';
import { MatchPrediction, predictMatch } from '@/lib/sport/predictor';
import { lookupStadium } from '@/lib/sport/stadium-coords';
import { fetchWeatherSnapshot } from '@/lib/providers/open-meteo';
import { scoreWeatherImpact } from '@/lib/sport/weather-impact';
import { computeHeadToHead } from '@/lib/sport/h2h';
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
  // Schiedsrichter, falls TheSportsDB ihn liefert. Spaerlich besetzt —
  // typischerweise Top-5-Ligen + bei naher Anstoss-Zeit. Optional, damit
  // bestehende Test-Fixtures + andere Sportarten nicht alle muessen.
  referee?: string | null;
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
  strReferee?: string;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
}

// Erkennt offensichtlich nicht-Fußball-Spiele anhand des Team-Namens —
// TheSportsDB teilt manche Liga-IDs zwischen Sportarten (z. B. 4477 / 4380).
// „Basketball", „KK " (Košarkaški Klub), „BC " (Basketball Club), „Hockey",
// „Volleyball", „IceHockey", „Eishockey" → kein Fußball.
const NON_FOOTBALL_HINTS = [
  ' basketball', ' hockey', ' volleyball', ' baseball', ' rugby',
  ' eishockey', ' hb (', ' handball'
];
const NON_FOOTBALL_PREFIXES = ['KK ', 'BC ', 'ZKK ', 'CSKA ', 'PBC '];

// NHL-Team-Blacklist. TheSportsDB-ID 4380 (NHL) kollidiert historisch
// mit „Russian Premier Liga". Selbst wenn beide Liga-IDs entwirrt sind,
// können vereinzelte Crossover-Antworten durchkommen. Die NHL-Teams
// haben charakteristische Namen ohne Sport-Präfix — also explizit
// per Liste filtern.
const NHL_TEAMS = new Set([
  'anaheim ducks', 'arizona coyotes', 'boston bruins', 'buffalo sabres',
  'calgary flames', 'carolina hurricanes', 'chicago blackhawks',
  'colorado avalanche', 'columbus blue jackets', 'dallas stars',
  'detroit red wings', 'edmonton oilers', 'florida panthers',
  'los angeles kings', 'minnesota wild', 'montreal canadiens',
  'nashville predators', 'new jersey devils', 'new york islanders',
  'new york rangers', 'ottawa senators', 'philadelphia flyers',
  'pittsburgh penguins', 'san jose sharks', 'seattle kraken',
  'st. louis blues', 'st louis blues', 'tampa bay lightning',
  'toronto maple leafs', 'utah hockey club', 'vancouver canucks',
  'vegas golden knights', 'washington capitals', 'winnipeg jets'
]);

// MLB-Team-Blacklist (Baseball). Auch hier vereinzelte Crossover möglich.
const MLB_KEYWORDS = ['yankees', 'red sox', 'dodgers', 'mets', 'cubs', 'astros', 'braves'];

function looksLikeFootball(home: string, away: string): boolean {
  const h = home.toLowerCase();
  const a = away.toLowerCase();
  if (NHL_TEAMS.has(h) || NHL_TEAMS.has(a)) return false;
  for (const kw of MLB_KEYWORDS) {
    if (h.includes(kw) || a.includes(kw)) return false;
  }
  for (const hint of NON_FOOTBALL_HINTS) {
    if (h.includes(hint) || a.includes(hint)) return false;
  }
  for (const pre of NON_FOOTBALL_PREFIXES) {
    if (home.startsWith(pre) || away.startsWith(pre)) return false;
  }
  return true;
}

function normalize(e: ApiEvent, status: 'upcoming' | 'finished'): Fixture | null {
  if (!e.idEvent || !e.strHomeTeam || !e.strAwayTeam || !e.dateEvent) return null;
  if (!looksLikeFootball(e.strHomeTeam, e.strAwayTeam)) return null;
  // Score-Parsing mit NaN-Schutz: TheSportsDB-Werte können „?"/„-" sein.
  const homeNum = Number(e.intHomeScore);
  const home = e.intHomeScore != null && e.intHomeScore !== '' && Number.isFinite(homeNum) ? homeNum : null;
  const awayNum = Number(e.intAwayScore);
  const away = e.intAwayScore != null && e.intAwayScore !== '' && Number.isFinite(awayNum) ? awayNum : null;
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
    status,
    referee: e.strReferee && e.strReferee.trim().length > 0 ? e.strReferee.trim() : null
  };
}

async function fetchEvents(leagueId: string, kind: 'next' | 'past'): Promise<Fixture[]> {
  const url = `https://www.thesportsdb.com/api/v1/json/3/events${kind}league.php?id=${leagueId}`;
  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
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

// Volle Saison einer Liga: ein einziger Call zieht alle Begegnungen einer
// Spielzeit. Cache 24 h, weil Vergangenheits-Daten sich nicht ändern. So füttern
// wir das Modell mit hunderten statt nur den letzten 15 Spielen.
async function fetchSeasonEvents(leagueId: string, season: string): Promise<Fixture[]> {
  const url = `https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=${leagueId}&s=${season}`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { events?: ApiEvent[] | null };
    const events = data.events ?? [];
    return events
      .map((e) => normalize(e, 'finished'))
      .filter((f): f is Fixture => f !== null)
      // Nur tatsächlich gespielte Begegnungen mit Endstand zählen für die Form-Statistik.
      .filter((f) => f.homeScore !== null && f.awayScore !== null);
  } catch {
    return [];
  }
}

// Drei zurückliegende Saisons abdecken, damit wir auch bei Sommerpause
// massig Vergangenheitsdaten haben. Format: "YYYY-YYYY".
function recentSeasonTags(now: Date = new Date()): string[] {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  // Bis Juni gehört das aktuelle Spieljahr noch zur Vor-Saison.
  const currentSeasonStart = month >= 7 ? year : year - 1;
  return [
    `${currentSeasonStart}-${currentSeasonStart + 1}`,
    `${currentSeasonStart - 1}-${currentSeasonStart}`,
    `${currentSeasonStart - 2}-${currentSeasonStart - 1}`
  ];
}

// Dedupliziert nach Event-ID — Saisons können sich überlappen, wenn TheSportsDB
// Test-Daten anders einsortiert.
function mergeFixtures(...lists: Fixture[][]): Fixture[] {
  const seen = new Map<string, Fixture>();
  for (const list of lists) for (const f of list) seen.set(f.id, f);
  return Array.from(seen.values());
}

async function compute(): Promise<LeagueFixtures[]> {
  const seasons = recentSeasonTags();
  const todayIso = new Date().toISOString().slice(0, 10);
  const results = await Promise.all(
    FOOTBALL_LEAGUES.map(async (league) => {
      // Parallel: anstehende Spiele + letzte 15 Tage + drei letzte Saisons.
      const [nextRaw, pastRaw, ...seasonalLists] = await Promise.all([
        fetchEvents(league.id, 'next'),
        fetchEvents(league.id, 'past'),
        ...seasons.map((s) => fetchSeasonEvents(league.id, s))
      ]);
      // STRIKTE Datums-Sortierung: TheSportsDB schiebt manchmal zukünftige
      // Quali-/Test-Spiele in den "past"-Endpoint mit pseudo-Ergebnissen.
      // Wir vertrauen NUR dem Datum: alles ab heute = upcoming, alles
      // vorher = finished.
      const everyEvent = mergeFixtures(nextRaw, pastRaw, ...seasonalLists);
      const future = everyEvent.filter((f) => f.date >= todayIso);
      const finishedPool = everyEvent.filter((f) => f.date < todayIso && f.homeScore !== null && f.awayScore !== null);

      // Sortiert die zukünftigen nach Datum aufsteigend (frühestes zuerst).
      future.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));

      // Wetter parallel ziehen — nur fuer Spiele in den naechsten 7 Tagen
      // (laenger ist Forecast nicht zuverlaessig) UND nur wenn wir die
      // Heim-Stadion-Koordinaten kennen. Pro Heim-Stadion wird einmal pro
      // 30 Minuten abgefragt (unstable_cache).
      const horizonMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const weatherFor = new Map<string, ReturnType<typeof scoreWeatherImpact>>();
      const inWindow = future.slice(0, 50).filter((f) => {
        if (!f.time) return false;
        const matchMs = new Date(`${f.date}T${f.time}:00Z`).getTime();
        return Number.isFinite(matchMs) && matchMs >= Date.now() && matchMs <= horizonMs;
      });
      await Promise.all(inWindow.map(async (f) => {
        const stadium = lookupStadium(f.homeTeam);
        if (!stadium || !f.time) return;
        const matchMs = new Date(`${f.date}T${f.time}:00Z`).getTime();
        const snap = await fetchWeatherSnapshot(stadium.lat, stadium.lon, matchMs);
        if (snap) weatherFor.set(f.id, scoreWeatherImpact(snap));
      }));

      const upcoming: UpcomingFixture[] = future.slice(0, 50).map((f) => {
        const weather = weatherFor.get(f.id);
        // H2H einmal berechnen, dann an predictor + probabilities BEIDE
        // weitergeben — damit sehen Tipp-Ranker und UI-Prognose dasselbe.
        const h2h = computeHeadToHead(f.homeTeam, f.awayTeam, finishedPool);
        const probabilities = computeFootballProbabilities(f.homeTeam, f.awayTeam, finishedPool, weather, h2h, f.referee);
        const tips = probabilities ? generateTips(probabilities, f.homeTeam, f.awayTeam) : null;
        return {
          ...f,
          status: 'upcoming',
          homeScore: null, // explizit löschen, falls TheSportsDB-Phantomwerte da waren
          awayScore: null,
          prediction: predictMatch(f.homeTeam, f.awayTeam, finishedPool, weather, h2h, f.referee),
          probabilities,
          tips
        };
      });
      // Vergangenheit: die neuesten zuerst.
      const sortedPast = finishedPool.slice().sort((a, b) => b.date.localeCompare(a.date));
      return {
        league,
        next: upcoming,
        last: sortedPast.slice(0, 200)
      };
    })
  );
  return results;
}

// Live-Daten: alle 10 Minuten frischer Pull. Vergangenheit (Saisonalcalls
// einzeln gecacht in fetchSeasonEvents) wird intern 24 h gehalten.
// v4-Cache-Key, weil sich das Schema durch Saison-Aggregation verändert.
export const getFootballFixtures = unstable_cache(compute, ['football-fixtures-v6-date-strict'], { revalidate: 600 });

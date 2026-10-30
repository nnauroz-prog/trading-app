export const LIVE_SPORTS = {
  football: { label: 'Fußball', feeds: ['soccer/ger.1', 'soccer/eng.1', 'soccer/esp.1', 'soccer/ita.1', 'soccer/fra.1', 'soccer/uefa.champions', 'soccer/fifa.world'] },
  basketball: { label: 'Basketball', feeds: ['basketball/nba'] },
  hockey: { label: 'Eishockey', feeds: ['hockey/nhl'] },
  tennis: { label: 'Tennis', feeds: ['tennis/atp', 'tennis/wta'] }
} as const;
export type LiveSport = keyof typeof LIVE_SPORTS;
export interface LiveGame {
  id: string;
  league: string;
  startsAt: string;
  home: string;
  away: string;
  homeScore: string | null;
  awayScore: string | null;
  state: 'pre' | 'in' | 'post';
  detail: string;
  scoreUnit?: 'Sätze';
  scoreDetail?: string;
}
export interface LiveScoreboard {
  sport: LiveSport;
  date: string;
  games: LiveGame[];
  fetchedAt: string | null;
  failedFeeds: number;
  totalFeeds: number;
}

type Row = Record<string, unknown>;
const row = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const str = (value: unknown): string => typeof value === 'string' ? value : '';
function score(value: unknown): string | null {
  const raw = typeof value === 'object' ? row(value).displayValue : value;
  if ((typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) || (typeof raw === 'number' && Number.isFinite(raw))) return String(raw);
  return null;
}

// ESPN can return multiple competitions per tennis event, so do not use only [0].
export function parseLiveScoreboard(payload: unknown, feed: string): LiveGame[] {
  const data = row(payload);
  if (!Array.isArray(data.events)) throw new Error('invalid_provider_response');
  const league = str(row(list(data.leagues)[0]).name) || feed;
  return data.events.flatMap(rawEvent => {
    const event = row(rawEvent);
    const competitions = [...list(event.competitions), ...list(event.groupings).flatMap(group => list(row(group).competitions))];
    return competitions.flatMap(rawCompetition => {
      const competition = row(rawCompetition);
      const competitors = list(competition.competitors).map(row);
      const home = competitors.find(c => c.homeAway === 'home') ?? competitors[0];
      const away = competitors.find(c => c.homeAway === 'away') ?? competitors[1];
      if (!home || !away) return [];
      const name = (c: Row) => str(row(c.team).displayName) || str(row(c.athlete).displayName);
      const status = Object.keys(row(competition.status)).length ? row(competition.status) : row(event.status);
      const type = row(status.type);
      const state = type.state;
      const startsAt = str(competition.date) || str(event.date);
      const id = str(competition.id) || str(event.id);
      if (!id || !name(home) || !name(away) || !Number.isFinite(Date.parse(startsAt)) || !['pre', 'in', 'post'].includes(str(state))) return [];
      const tennis = feed.startsWith('tennis/');
      const homeSets = list(home.linescores).map(row);
      const awaySets = list(away.linescores).map(row);
      const hasSets = tennis && homeSets.length > 0 && homeSets.length === awaySets.length;
      const setsWon = (sets: Row[]) => String(sets.filter(set => set.winner === true).length);
      const scoreDetail = hasSets ? homeSets.map((set, i) => `${score(set.value) ?? '–'}:${score(awaySets[i].value) ?? '–'}`).join(' · ') : undefined;
      return [{ id: `${feed}:${id}`, league: tennis ? `${league} · ${str(event.name)}` : league, startsAt, home: name(home), away: name(away),
        homeScore: state === 'pre' ? null : score(home.score) ?? (hasSets ? setsWon(homeSets) : null),
        awayScore: state === 'pre' ? null : score(away.score) ?? (hasSets ? setsWon(awaySets) : null),
        state: state as LiveGame['state'], detail: str(type.shortDetail) || str(type.detail),
        ...(tennis ? { scoreUnit: 'Sätze' as const, scoreDetail } : {}) }];
    });
  });
}

const berlinDate = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date).replaceAll('-', '');

export async function getLiveScoreboard(sport: LiveSport, now = new Date()): Promise<LiveScoreboard> {
  const date = berlinDate(now);
  // US feeds index schedules by US calendar day; include the preceding day
  // and filter actual start times in Berlin after parsing. Tennis feeds can
  // include a whole tournament instead of a single day.
  const previousDate = berlinDate(new Date(now.getTime() - 24 * 60 * 60_000));
  const feeds = LIVE_SPORTS[sport].feeds;
  const results = await Promise.allSettled(feeds.map(async feed => {
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${feed}/scoreboard?dates=${previousDate}-${date}&limit=100`, {
      cache: 'no-store', signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error('provider_unavailable');
    return parseLiveScoreboard(await response.json(), feed);
  }));
  const games = new Map<string, LiveGame>();
  for (const result of results) if (result.status === 'fulfilled') for (const game of result.value) {
    if (game.state === 'in' || berlinDate(new Date(game.startsAt)) === date) games.set(game.id, game);
  }
  const failedFeeds = results.filter(r => r.status === 'rejected').length;
  const order = { in: 0, pre: 1, post: 2 };
  return { sport, date, games: [...games.values()].sort((a, b) => order[a.state] - order[b.state] || a.startsAt.localeCompare(b.startsAt)),
    fetchedAt: failedFeeds < feeds.length ? new Date().toISOString() : null, failedFeeds, totalFeeds: feeds.length };
}

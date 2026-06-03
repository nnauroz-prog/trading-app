export interface TeamWatchEntry {
  team: string;
  league: string;
  note?: string;
  addedAt: number;
}

const STORAGE_KEY = 'trading-app.sport-team-watchlist-v1';
export const TEAM_WATCHLIST_CHANGED_EVENT = 'trading-app:sport-team-watchlist-changed';

export function loadTeamWatchlist(): TeamWatchEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((w): w is TeamWatchEntry => typeof w === 'object' && w !== null && typeof w.team === 'string');
  } catch {
    return [];
  }
}

function save(items: TeamWatchEntry[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(TEAM_WATCHLIST_CHANGED_EVENT));
}

export function isTeamWatched(team: string, league: string): boolean {
  return loadTeamWatchlist().some((w) => w.team === team && w.league === league);
}

export function toggleTeamWatch(team: string, league: string): boolean {
  const items = loadTeamWatchlist();
  const idx = items.findIndex((w) => w.team === team && w.league === league);
  if (idx >= 0) {
    save(items.filter((w) => !(w.team === team && w.league === league)));
    return false;
  }
  save([...items, { team, league, addedAt: Date.now() }]);
  return true;
}

export function setTeamNote(team: string, league: string, note: string): void {
  const items = loadTeamWatchlist();
  const idx = items.findIndex((w) => w.team === team && w.league === league);
  if (idx < 0) return;
  items[idx] = { ...items[idx], note };
  save(items);
}

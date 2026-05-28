export interface WatchlistItem {
  coinId: string;
  symbol: string;
  addedAt: number;
  note?: string;
}

const STORAGE_KEY = 'trading-app.watchlist';
export const WATCHLIST_CHANGED_EVENT = 'trading-app:watchlist-changed';

export function loadWatchlist(): WatchlistItem[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((w): w is WatchlistItem => typeof w === 'object' && w !== null && typeof w.coinId === 'string');
  } catch {
    return [];
  }
}

function save(items: WatchlistItem[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(WATCHLIST_CHANGED_EVENT));
}

export function isWatched(coinId: string): boolean {
  return loadWatchlist().some((w) => w.coinId === coinId);
}

export function toggleWatch(coinId: string, symbol: string): boolean {
  const items = loadWatchlist();
  const idx = items.findIndex((w) => w.coinId === coinId);
  if (idx >= 0) {
    save(items.filter((w) => w.coinId !== coinId));
    return false;
  }
  save([...items, { coinId, symbol, addedAt: Date.now() }]);
  return true;
}

export function removeFromWatchlist(coinId: string): void {
  save(loadWatchlist().filter((w) => w.coinId !== coinId));
}

export function setWatchNote(coinId: string, note: string): void {
  const items = loadWatchlist();
  const idx = items.findIndex((w) => w.coinId === coinId);
  if (idx < 0) return;
  items[idx] = { ...items[idx], note };
  save(items);
}

// Rohstoff-Watchlist analog zur Aktien-Watchlist. Komplett lokal in
// localStorage, kein Server, kein Account.

export interface RohstoffWatchlistItem {
  symbol: string;
  name: string;
  addedAt: number;
  note?: string;
}

const STORAGE_KEY = 'trading-app.rohstoff-watchlist-v1';
export const ROHSTOFF_WATCHLIST_CHANGED_EVENT = 'trading-app:rohstoff-watchlist-changed';

export function loadRohstoffWatchlist(): RohstoffWatchlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is RohstoffWatchlistItem =>
      typeof e?.symbol === 'string' && typeof e?.name === 'string' && typeof e?.addedAt === 'number'
    );
  } catch {
    return [];
  }
}

function save(items: RohstoffWatchlistItem[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
  window.dispatchEvent(new CustomEvent(ROHSTOFF_WATCHLIST_CHANGED_EVENT));
}

export function isRohstoffWatched(symbol: string): boolean {
  return loadRohstoffWatchlist().some((w) => w.symbol === symbol);
}

export function toggleRohstoffWatch(symbol: string, name: string): boolean {
  const list = loadRohstoffWatchlist();
  const existing = list.findIndex((w) => w.symbol === symbol);
  if (existing >= 0) {
    save(list.filter((_, i) => i !== existing));
    return false;
  }
  save([...list, { symbol, name, addedAt: Date.now() }]);
  return true;
}

export function removeRohstoffWatch(symbol: string): void {
  save(loadRohstoffWatchlist().filter((w) => w.symbol !== symbol));
}

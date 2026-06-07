// Aktien-Watchlist analog zur Krypto-Watchlist. Komplett lokal in
// localStorage, kein Server, kein Account.

export interface AktienWatchlistItem {
  symbol: string;       // Yahoo-Symbol (AAPL, SAP.DE, …)
  name: string;
  addedAt: number;
  note?: string;
}

const STORAGE_KEY = 'trading-app.aktien-watchlist-v1';
export const AKTIEN_WATCHLIST_CHANGED_EVENT = 'trading-app:aktien-watchlist-changed';

export function loadAktienWatchlist(): AktienWatchlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is AktienWatchlistItem =>
      typeof e?.symbol === 'string' && typeof e?.name === 'string' && typeof e?.addedAt === 'number'
    );
  } catch {
    return [];
  }
}

function save(items: AktienWatchlistItem[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
  window.dispatchEvent(new CustomEvent(AKTIEN_WATCHLIST_CHANGED_EVENT));
}

export function isAktienWatched(symbol: string): boolean {
  return loadAktienWatchlist().some((w) => w.symbol === symbol);
}

export function toggleAktienWatch(symbol: string, name: string): boolean {
  const list = loadAktienWatchlist();
  const existing = list.findIndex((w) => w.symbol === symbol);
  if (existing >= 0) {
    save(list.filter((_, i) => i !== existing));
    return false;
  }
  save([...list, { symbol, name, addedAt: Date.now() }]);
  return true;
}

export function removeAktienWatch(symbol: string): void {
  save(loadAktienWatchlist().filter((w) => w.symbol !== symbol));
}

// Lokale Optionsscheine-Watchlist — analog zur Aktien- und Rohstoff-
// Watchlist. Komplett in localStorage, kein Server, kein Account.

export interface OptionsscheineWatchlistItem {
  id: string;                    // uuid-like
  underlyingName: string;
  underlyingPrice: number;       // Snapshot beim Add
  strike: number;
  direction: 'call' | 'put';
  wkn?: string;
  isin?: string;
  expiryIso?: string;
  knockOut?: boolean;
  premiumQuoted?: number;
  ratio?: number;
  note?: string;
  addedAt: number;
}

const STORAGE_KEY = 'trading-app.optionsscheine-watchlist-v1';
export const OPTIONSSCHEINE_WATCHLIST_CHANGED_EVENT = 'trading-app:optionsscheine-watchlist-changed';

function isValid(e: unknown): e is OptionsscheineWatchlistItem {
  if (!e || typeof e !== 'object') return false;
  const o = e as Record<string, unknown>;
  return typeof o.id === 'string'
    && typeof o.underlyingName === 'string'
    && typeof o.underlyingPrice === 'number'
    && typeof o.strike === 'number'
    && (o.direction === 'call' || o.direction === 'put')
    && typeof o.addedAt === 'number';
}

export function loadOptionsscheineWatchlist(): OptionsscheineWatchlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValid);
  } catch {
    return [];
  }
}

function persist(items: OptionsscheineWatchlistItem[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 200)));
  window.dispatchEvent(new CustomEvent(OPTIONSSCHEINE_WATCHLIST_CHANGED_EVENT));
}

function genId(): string {
  return `os-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addOptionsscheinToWatchlist(item: Omit<OptionsscheineWatchlistItem, 'id' | 'addedAt'>): OptionsscheineWatchlistItem {
  const items = loadOptionsscheineWatchlist();
  const created: OptionsscheineWatchlistItem = {
    ...item,
    id: genId(),
    addedAt: Date.now()
  };
  persist([created, ...items]);
  return created;
}

export function removeOptionsscheinFromWatchlist(id: string): void {
  const items = loadOptionsscheineWatchlist().filter((x) => x.id !== id);
  persist(items);
}

export function updateOptionsscheinNote(id: string, note: string): void {
  const items = loadOptionsscheineWatchlist().map((x) =>
    x.id === id ? { ...x, note: note.trim() || undefined } : x
  );
  persist(items);
}

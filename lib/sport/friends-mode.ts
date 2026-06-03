// Friends-Mode: bis zu 3 zusätzliche lokale Mit-Tipper, jeder mit eigenem
// Namen und eigenem Snapshot der Trefferquote. Daten bleiben rein lokal —
// kein Sync, keine Backend-Integration. Mit dem Stand-aktualisieren-Knopf
// schreibt der User für jeden Freund manuell den aktuellen Stand fort.

const STORAGE_KEY = 'trading-app.friends-mode-v1';
export const FRIENDS_CHANGED_EVENT = 'trading-app:friends-changed';
export const MAX_FRIENDS = 3;
const MIN_NAME = 2;
const MAX_NAME = 32;

export interface FriendEntry {
  id: string;
  name: string;
  wins: number;
  decisive: number;
  note?: string;
  updatedAt: number;
}

export function loadFriends(): FriendEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is FriendEntry => {
      return typeof e?.id === 'string' && typeof e?.name === 'string' && typeof e?.wins === 'number' && typeof e?.decisive === 'number';
    });
  } catch {
    return [];
  }
}

function save(list: FriendEntry[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_FRIENDS)));
  window.dispatchEvent(new CustomEvent(FRIENDS_CHANGED_EVENT));
}

export function addFriend(name: string, wins: number, decisive: number, note?: string): FriendEntry | null {
  const trimmed = name.trim().slice(0, MAX_NAME);
  if (trimmed.length < MIN_NAME) return null;
  if (!Number.isFinite(wins) || wins < 0) return null;
  if (!Number.isFinite(decisive) || decisive < wins) return null;
  const list = loadFriends();
  if (list.length >= MAX_FRIENDS) return null;
  const entry: FriendEntry = {
    id: `f-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: trimmed,
    wins: Math.round(wins),
    decisive: Math.round(decisive),
    note: note?.trim().slice(0, 80) || undefined,
    updatedAt: Date.now()
  };
  list.push(entry);
  save(list);
  return entry;
}

export function updateFriend(id: string, wins: number, decisive: number, note?: string): boolean {
  if (!Number.isFinite(wins) || wins < 0) return false;
  if (!Number.isFinite(decisive) || decisive < wins) return false;
  const list = loadFriends();
  const idx = list.findIndex((f) => f.id === id);
  if (idx === -1) return false;
  list[idx] = {
    ...list[idx],
    wins: Math.round(wins),
    decisive: Math.round(decisive),
    note: note?.trim().slice(0, 80) || undefined,
    updatedAt: Date.now()
  };
  save(list);
  return true;
}

export function removeFriend(id: string): void {
  save(loadFriends().filter((f) => f.id !== id));
}

export function hitRatePct(f: Pick<FriendEntry, 'wins' | 'decisive'>): number | null {
  return f.decisive > 0 ? Math.round((f.wins / f.decisive) * 100) : null;
}

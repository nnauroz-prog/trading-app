import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addFriend, hitRatePct, loadFriends, MAX_FRIENDS, removeFriend, updateFriend } from '@/lib/sport/friends-mode';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) { return this.store.get(key) ?? null; }
  setItem(key: string, value: string) { this.store.set(key, value); }
  removeItem(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
}

beforeEach(() => {
  const w = globalThis as unknown as { window: { localStorage: MemoryStorage; addEventListener: () => void; dispatchEvent: () => void } };
  w.window = {
    localStorage: new MemoryStorage(),
    addEventListener: () => {},
    dispatchEvent: () => {}
  };
});

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
});

describe('addFriend', () => {
  it('legt einen neuen Freund an', () => {
    const f = addFriend('Tom', 5, 10);
    expect(f).not.toBe(null);
    expect(f!.name).toBe('Tom');
    expect(loadFriends().length).toBe(1);
  });

  it('lehnt zu kurzen Namen ab', () => {
    expect(addFriend('A', 1, 1)).toBe(null);
    expect(loadFriends().length).toBe(0);
  });

  it('lehnt negative Wins ab', () => {
    expect(addFriend('Tom', -1, 5)).toBe(null);
  });

  it('lehnt wins > decisive ab', () => {
    expect(addFriend('Tom', 10, 5)).toBe(null);
  });

  it(`erlaubt maximal ${MAX_FRIENDS} Freunde`, () => {
    for (let i = 0; i < MAX_FRIENDS; i++) addFriend(`Friend${i}`, 0, 0);
    expect(addFriend('Overflow', 0, 0)).toBe(null);
    expect(loadFriends().length).toBe(MAX_FRIENDS);
  });
});

describe('updateFriend', () => {
  it('aktualisiert wins und decisive', () => {
    const f = addFriend('Tom', 5, 10)!;
    expect(updateFriend(f.id, 7, 12)).toBe(true);
    const updated = loadFriends()[0];
    expect(updated.wins).toBe(7);
    expect(updated.decisive).toBe(12);
  });

  it('liefert false bei unbekannter ID', () => {
    expect(updateFriend('no-such-id', 1, 1)).toBe(false);
  });
});

describe('removeFriend', () => {
  it('löscht den Freund', () => {
    const f = addFriend('Tom', 5, 10)!;
    removeFriend(f.id);
    expect(loadFriends().length).toBe(0);
  });
});

describe('hitRatePct', () => {
  it('rechnet Quote korrekt', () => {
    expect(hitRatePct({ wins: 3, decisive: 5 })).toBe(60);
  });

  it('liefert null bei decisive 0', () => {
    expect(hitRatePct({ wins: 0, decisive: 0 })).toBe(null);
  });
});

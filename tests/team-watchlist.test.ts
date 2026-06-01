import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isTeamWatched, loadTeamWatchlist, setTeamNote, toggleTeamWatch } from '@/lib/sport/team-watchlist';

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

describe('team-watchlist', () => {
  it('starts empty', () => {
    expect(loadTeamWatchlist()).toEqual([]);
  });

  it('toggleTeamWatch adds and then removes a team', () => {
    expect(toggleTeamWatch('Bayern', 'Bundesliga')).toBe(true);
    expect(isTeamWatched('Bayern', 'Bundesliga')).toBe(true);
    expect(toggleTeamWatch('Bayern', 'Bundesliga')).toBe(false);
    expect(isTeamWatched('Bayern', 'Bundesliga')).toBe(false);
  });

  it('keeps unrelated entries when removing one team', () => {
    toggleTeamWatch('Bayern', 'Bundesliga');
    toggleTeamWatch('Arsenal', 'Premier League');
    toggleTeamWatch('Bayern', 'Bundesliga');
    const remaining = loadTeamWatchlist();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].team).toBe('Arsenal');
  });

  it('setTeamNote stores a note on an existing entry only', () => {
    toggleTeamWatch('Bayern', 'Bundesliga');
    setTeamNote('Bayern', 'Bundesliga', 'Verletzungssorgen');
    expect(loadTeamWatchlist()[0].note).toBe('Verletzungssorgen');
    setTeamNote('Phantom', 'Bundesliga', 'wird ignoriert');
    expect(loadTeamWatchlist()).toHaveLength(1);
  });
});

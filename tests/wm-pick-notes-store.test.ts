import { describe, expect, it, beforeEach, vi } from 'vitest';

interface MemoryStore {
  [key: string]: string;
}

function setupWindow() {
  const store: MemoryStore = {};
  const dispatched: string[] = [];
  (globalThis as unknown as { window: object }).window = {
    localStorage: {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; }
    },
    dispatchEvent: (ev: { type: string }) => { dispatched.push(ev.type); return true; }
  };
  (globalThis as unknown as { CustomEvent: typeof CustomEvent }).CustomEvent = class {
    type: string;
    constructor(type: string) { this.type = type; }
  } as unknown as typeof CustomEvent;
  return { store, dispatched };
}

beforeEach(() => {
  vi.resetModules();
  setupWindow();
});

describe('wm-pick-notes-store', () => {
  it('loadPickNote liefert leeren String wenn nichts gespeichert', async () => {
    const mod = await import('@/lib/sport/wm-pick-notes-store');
    expect(mod.loadPickNote('wm-1-home')).toBe('');
  });

  it('savePickNote persistiert und feuert Event', async () => {
    const ctx = setupWindow();
    const mod = await import('@/lib/sport/wm-pick-notes-store');
    mod.savePickNote('wm-1-home', 'gutes Gefuehl');
    expect(mod.loadPickNote('wm-1-home')).toBe('gutes Gefuehl');
    expect(ctx.dispatched).toContain(mod.WM_PICK_NOTES_CHANGED_EVENT);
  });

  it('Leere Notiz loescht den Eintrag', async () => {
    setupWindow();
    const mod = await import('@/lib/sport/wm-pick-notes-store');
    mod.savePickNote('wm-1-home', 'erst was');
    mod.savePickNote('wm-1-home', '   ');
    expect(mod.loadAllPickNotes()['wm-1-home']).toBeUndefined();
  });

  it('Lange Notiz wird auf MAX_NOTE_LENGTH gekuerzt', async () => {
    setupWindow();
    const mod = await import('@/lib/sport/wm-pick-notes-store');
    const long = 'x'.repeat(500);
    mod.savePickNote('wm-1-home', long);
    expect(mod.loadPickNote('wm-1-home').length).toBe(mod.MAX_NOTE_LENGTH);
  });

  it('Whitespace wird getrimmt', async () => {
    setupWindow();
    const mod = await import('@/lib/sport/wm-pick-notes-store');
    mod.savePickNote('wm-1-home', '  Notiz mit Rand   ');
    expect(mod.loadPickNote('wm-1-home')).toBe('Notiz mit Rand');
  });

  it('loadAllPickNotes liefert alle vorhandenen Notizen', async () => {
    setupWindow();
    const mod = await import('@/lib/sport/wm-pick-notes-store');
    mod.savePickNote('wm-1-home', 'a');
    mod.savePickNote('wm-2-away', 'b');
    const all = mod.loadAllPickNotes();
    expect(Object.keys(all).sort()).toEqual(['wm-1-home', 'wm-2-away']);
  });

  it('clearPickNote loescht gezielt', async () => {
    setupWindow();
    const mod = await import('@/lib/sport/wm-pick-notes-store');
    mod.savePickNote('wm-1-home', 'a');
    mod.savePickNote('wm-2-away', 'b');
    mod.clearPickNote('wm-1-home');
    const all = mod.loadAllPickNotes();
    expect(all['wm-1-home']).toBeUndefined();
    expect(all['wm-2-away']).toBe('b');
  });

  it('Korruptes JSON wird tolerant ignoriert', async () => {
    const ctx = setupWindow();
    ctx.store['trading-app.wm-pick-notes-v1'] = '{nicht-json';
    const mod = await import('@/lib/sport/wm-pick-notes-store');
    expect(mod.loadAllPickNotes()).toEqual({});
  });
});

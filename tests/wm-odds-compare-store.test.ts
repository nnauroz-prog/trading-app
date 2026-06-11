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
  // sauberer window-Stub vor jedem Test
  setupWindow();
});

describe('wm-odds-compare-store', () => {
  it('loadSlotNames liefert Defaults wenn nichts gespeichert', async () => {
    const mod = await import('@/lib/sport/wm-odds-compare-store');
    expect(mod.loadSlotNames()).toEqual(['Anbieter A', 'Anbieter B', 'Anbieter C']);
  });

  it('saveSlotNames persistiert und feuert Event', async () => {
    const ctx = setupWindow();
    const mod = await import('@/lib/sport/wm-odds-compare-store');
    mod.saveSlotNames(['Bet365', 'Tipico', 'Bwin']);
    expect(mod.loadSlotNames()).toEqual(['Bet365', 'Tipico', 'Bwin']);
    expect(ctx.dispatched).toContain(mod.WM_ODDS_COMPARE_CHANGED_EVENT);
  });

  it('Leerer Anbieter-Name faellt auf Default zurueck', async () => {
    setupWindow();
    const mod = await import('@/lib/sport/wm-odds-compare-store');
    mod.saveSlotNames(['Bet365', '   ', 'Bwin']);
    expect(mod.loadSlotNames()).toEqual(['Bet365', 'Anbieter B', 'Bwin']);
  });

  it('Korrupter Slot-JSON liefert Defaults', async () => {
    const ctx = setupWindow();
    ctx.store['trading-app.wm-odds-compare-slot-names-v1'] = '{nicht-json';
    const mod = await import('@/lib/sport/wm-odds-compare-store');
    expect(mod.loadSlotNames()).toEqual(['Anbieter A', 'Anbieter B', 'Anbieter C']);
  });

  it('saveQuotesForPick persistiert und loadAllQuotes liest zurueck', async () => {
    setupWindow();
    const mod = await import('@/lib/sport/wm-odds-compare-store');
    mod.saveQuotesForPick('wm-1-home', ['1.85', '1.90', '']);
    expect(mod.loadAllQuotes()['wm-1-home']).toEqual({ drafts: ['1.85', '1.90', ''] });
  });

  it('Komplett leere Drafts loeschen Eintrag', async () => {
    setupWindow();
    const mod = await import('@/lib/sport/wm-odds-compare-store');
    mod.saveQuotesForPick('wm-1-home', ['1.85', '', '']);
    expect(mod.loadAllQuotes()['wm-1-home']).toBeDefined();
    mod.saveQuotesForPick('wm-1-home', ['', '', '']);
    expect(mod.loadAllQuotes()['wm-1-home']).toBeUndefined();
  });

  it('Mehrere Picks gleichzeitig persistieren', async () => {
    setupWindow();
    const mod = await import('@/lib/sport/wm-odds-compare-store');
    mod.saveQuotesForPick('wm-1-home', ['1.85', '1.90', '1.95']);
    mod.saveQuotesForPick('wm-2-away', ['2.10', '', '2.05']);
    const all = mod.loadAllQuotes();
    expect(Object.keys(all).sort()).toEqual(['wm-1-home', 'wm-2-away']);
  });

  it('Slot-Array mit weniger als 3 Eintraegen wird mit Defaults aufgefuellt', async () => {
    const ctx = setupWindow();
    ctx.store['trading-app.wm-odds-compare-slot-names-v1'] = JSON.stringify(['Bet365']);
    const mod = await import('@/lib/sport/wm-odds-compare-store');
    expect(mod.loadSlotNames()).toEqual(['Bet365', 'Anbieter B', 'Anbieter C']);
  });
});

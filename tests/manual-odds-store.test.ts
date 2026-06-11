import { describe, expect, it, beforeEach, vi } from 'vitest';

interface MemoryStore { [k: string]: string }

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

describe('manual-odds-store', () => {
  it('loadManualOdds liefert null wenn nichts gespeichert', async () => {
    const mod = await import('@/lib/sport/manual-odds-store');
    expect(mod.loadManualOdds('m1', '1X2-home')).toBeNull();
  });

  it('saveManualOdds persistiert und feuert Event', async () => {
    const ctx = setupWindow();
    const mod = await import('@/lib/sport/manual-odds-store');
    const entry = mod.saveManualOdds('m1', '1X2-home', 1.85);
    expect(entry).not.toBeNull();
    expect(entry?.decimalOdds).toBe(1.85);
    expect(mod.loadManualOdds('m1', '1X2-home')?.decimalOdds).toBe(1.85);
    expect(ctx.dispatched).toContain(mod.SPORT_MANUAL_ODDS_CHANGED_EVENT);
  });

  it('Quote <= 1 wird abgelehnt (keine Fake-Quote)', async () => {
    setupWindow();
    const mod = await import('@/lib/sport/manual-odds-store');
    expect(mod.saveManualOdds('m1', '1X2', 1.0)).toBeNull();
    expect(mod.saveManualOdds('m1', '1X2', 0)).toBeNull();
    expect(mod.saveManualOdds('m1', '1X2', -3)).toBeNull();
    expect(mod.saveManualOdds('m1', '1X2', NaN)).toBeNull();
    expect(mod.loadManualOdds('m1', '1X2')).toBeNull();
  });

  it('Verschiedene Maerkte pro Match werden getrennt gespeichert', async () => {
    setupWindow();
    const mod = await import('@/lib/sport/manual-odds-store');
    mod.saveManualOdds('m1', '1X2-home', 1.85);
    mod.saveManualOdds('m1', 'ueber-2.5', 2.10);
    expect(mod.loadManualOdds('m1', '1X2-home')?.decimalOdds).toBe(1.85);
    expect(mod.loadManualOdds('m1', 'ueber-2.5')?.decimalOdds).toBe(2.10);
  });

  it('Ueberschreiben funktioniert', async () => {
    setupWindow();
    const mod = await import('@/lib/sport/manual-odds-store');
    mod.saveManualOdds('m1', '1X2-home', 1.85);
    mod.saveManualOdds('m1', '1X2-home', 1.92);
    expect(mod.loadManualOdds('m1', '1X2-home')?.decimalOdds).toBe(1.92);
  });

  it('removeManualOdds loescht gezielt', async () => {
    const ctx = setupWindow();
    const mod = await import('@/lib/sport/manual-odds-store');
    mod.saveManualOdds('m1', '1X2-home', 1.85);
    mod.removeManualOdds('m1', '1X2-home');
    expect(mod.loadManualOdds('m1', '1X2-home')).toBeNull();
    expect(ctx.dispatched.filter((e) => e === mod.SPORT_MANUAL_ODDS_CHANGED_EVENT).length).toBe(2);
  });

  it('loadAllManualOdds listet alle Eintraege', async () => {
    setupWindow();
    const mod = await import('@/lib/sport/manual-odds-store');
    mod.saveManualOdds('m1', '1X2-home', 1.85);
    mod.saveManualOdds('m2', '1X2-home', 2.30);
    const all = mod.loadAllManualOdds();
    expect(all.length).toBe(2);
  });

  it('Korruptes JSON wird tolerant ignoriert', async () => {
    const ctx = setupWindow();
    ctx.store['trading-app.sport-manual-odds-v1'] = '{nicht-json';
    const mod = await import('@/lib/sport/manual-odds-store');
    expect(mod.loadAllManualOdds()).toEqual([]);
  });

  it('capturedAt ist ein ISO-Timestamp', async () => {
    setupWindow();
    const mod = await import('@/lib/sport/manual-odds-store');
    const entry = mod.saveManualOdds('m1', '1X2-home', 1.85);
    expect(entry?.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

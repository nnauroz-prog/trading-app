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

describe('wm-day-cap-store', () => {
  it('Default 8 wenn nichts gespeichert', async () => {
    const mod = await import('@/lib/sport/wm-day-cap-store');
    expect(mod.loadDayCapPct()).toBe(8);
  });

  it('Speichert und liest zurueck', async () => {
    setupWindow();
    const mod = await import('@/lib/sport/wm-day-cap-store');
    mod.saveDayCapPct(10);
    expect(mod.loadDayCapPct()).toBe(10);
  });

  it('Save unterhalb MIN wird auf MIN geclampt', async () => {
    setupWindow();
    const mod = await import('@/lib/sport/wm-day-cap-store');
    mod.saveDayCapPct(2);
    expect(mod.loadDayCapPct()).toBe(mod.MIN_CAP_PCT);
  });

  it('Save oberhalb MAX wird auf MAX geclampt', async () => {
    setupWindow();
    const mod = await import('@/lib/sport/wm-day-cap-store');
    mod.saveDayCapPct(99);
    expect(mod.loadDayCapPct()).toBe(mod.MAX_CAP_PCT);
  });

  it('Save feuert Change-Event', async () => {
    const ctx = setupWindow();
    const mod = await import('@/lib/sport/wm-day-cap-store');
    mod.saveDayCapPct(6);
    expect(ctx.dispatched).toContain(mod.WM_DAY_CAP_CHANGED_EVENT);
  });

  it('Korrupter Eintrag faellt auf Default zurueck', async () => {
    const ctx = setupWindow();
    ctx.store['trading-app.wm-day-cap-pct-v1'] = 'foo';
    const mod = await import('@/lib/sport/wm-day-cap-store');
    expect(mod.loadDayCapPct()).toBe(8);
  });

  it('Reset entfernt den Eintrag und feuert Event', async () => {
    const ctx = setupWindow();
    const mod = await import('@/lib/sport/wm-day-cap-store');
    mod.saveDayCapPct(12);
    mod.resetDayCapPct();
    expect(mod.loadDayCapPct()).toBe(8);
    expect(ctx.dispatched.filter((e) => e === mod.WM_DAY_CAP_CHANGED_EVENT).length).toBe(2);
  });
});

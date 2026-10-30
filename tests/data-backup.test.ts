import { describe, expect, it, beforeEach, vi } from 'vitest';

const store = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear()
};
vi.stubGlobal('window', {
  localStorage: localStorageMock,
  dispatchEvent: () => true,
  CustomEvent: class { constructor(public type: string) {} }
});
vi.stubGlobal('localStorage', localStorageMock);

import { exportData, exportToString, importData } from '@/lib/data-backup';

describe('data-backup', () => {
  beforeEach(() => store.clear());

  it('exports only present keys', () => {
    store.set('trading-app.positions', JSON.stringify([{ id: 'p1' }]));
    const env = exportData();
    expect(env.app).toBe('trading-app');
    expect(env.data['trading-app.positions']).toEqual([{ id: 'p1' }]);
    expect('trading-app.journal' in env.data).toBe(false);
  });

  it('round-trips export → import (replace)', () => {
    store.set('trading-app.positions', JSON.stringify([{ id: 'p1' }, { id: 'p2' }]));
    store.set('trading-app.watchlist', JSON.stringify([{ coinId: 'btc' }]));
    const json = exportToString();
    store.clear();
    const result = importData(json, 'replace');
    expect(result.ok).toBe(true);
    expect(JSON.parse(store.get('trading-app.positions')!)).toHaveLength(2);
    expect(JSON.parse(store.get('trading-app.watchlist')!)).toHaveLength(1);
  });

  it('merge mode unions by id without duplicates', () => {
    store.set('trading-app.positions', JSON.stringify([{ id: 'p1' }]));
    const json = JSON.stringify({ app: 'trading-app', version: 1, exportedAt: '', data: { 'trading-app.positions': [{ id: 'p1' }, { id: 'p2' }] } });
    const result = importData(json, 'merge');
    expect(result.ok).toBe(true);
    expect(JSON.parse(store.get('trading-app.positions')!)).toHaveLength(2);
  });

  it('merge dedups watchlist by coinId (no id field)', () => {
    store.set('trading-app.watchlist', JSON.stringify([{ coinId: 'btc', addedAt: 1000 }]));
    const json = JSON.stringify({ app: 'trading-app', version: 1, exportedAt: '', data: { 'trading-app.watchlist': [{ coinId: 'btc', addedAt: 2000, note: 'x' }, { coinId: 'eth' }] } });
    const result = importData(json, 'merge');
    expect(result.ok).toBe(true);
    const wl = JSON.parse(store.get('trading-app.watchlist')!);
    expect(wl).toHaveLength(2); // btc kept once, eth added
    expect(wl.filter((x: { coinId: string }) => x.coinId === 'btc')).toHaveLength(1);
  });

  it('merge keeps distinct alerts on the same coin (id-keyed)', () => {
    store.set('trading-app.price-alerts', JSON.stringify([{ id: 'a1', coinId: 'btc', direction: 'above' }]));
    const json = JSON.stringify({ app: 'trading-app', version: 1, exportedAt: '', data: { 'trading-app.price-alerts': [{ id: 'a2', coinId: 'btc', direction: 'below' }] } });
    importData(json, 'merge');
    expect(JSON.parse(store.get('trading-app.price-alerts')!)).toHaveLength(2);
  });

  it('merge dedups duplicate ids within the incoming array', () => {
    store.set('trading-app.positions', JSON.stringify([]));
    const json = JSON.stringify({ app: 'trading-app', version: 1, exportedAt: '', data: { 'trading-app.positions': [{ id: 'x' }, { id: 'x' }] } });
    importData(json, 'merge');
    expect(JSON.parse(store.get('trading-app.positions')!)).toHaveLength(1);
  });

  it('rejects non-backup json', () => {
    expect(importData('{"foo":1}').ok).toBe(false);
    expect(importData('not json').ok).toBe(false);
  });

  it('sichert auch Gold-Bestaende, Aktien-/Rohstoff-Watchlists, Persona-Tagebuch + Sport-Tips', () => {
    store.set('trading-app.gold-holdings-v1', JSON.stringify([{ id: 'g1', amount: 31 }]));
    store.set('trading-app.aktien-watchlist-v1', JSON.stringify([{ symbol: 'SAP' }]));
    store.set('trading-app.rohstoff-watchlist-v1', JSON.stringify([{ symbol: 'XAU' }]));
    store.set('trading-app.persona-history-v1', JSON.stringify([{ id: 'h1' }]));
    store.set('trading-app.sport-tip-journal-v1', JSON.stringify([{ id: 's1' }]));
    store.set('trading-app.firma-decisions-v2', JSON.stringify([{ id: 'f1' }]));
    store.set('trading-app.vorstand-log-v1', JSON.stringify([{ id: 'v1' }]));
    const env = exportData();
    expect(env.data['trading-app.gold-holdings-v1']).toEqual([{ id: 'g1', amount: 31 }]);
    expect(env.data['trading-app.aktien-watchlist-v1']).toEqual([{ symbol: 'SAP' }]);
    expect(env.data['trading-app.rohstoff-watchlist-v1']).toEqual([{ symbol: 'XAU' }]);
    expect(env.data['trading-app.persona-history-v1']).toEqual([{ id: 'h1' }]);
    expect(env.data['trading-app.sport-tip-journal-v1']).toEqual([{ id: 's1' }]);
    expect(env.data['trading-app.firma-decisions-v2']).toEqual([{ id: 'f1' }]);
    expect(env.data['trading-app.vorstand-log-v1']).toEqual([{ id: 'v1' }]);
  });
});

describe('WM data in the general backup', () => {
  beforeEach(() => store.clear());
  it('round-trips WM notes and bankroll without a separate WM export', () => {
    const values = {
      'trading-app.wm-pick-notes-v1': { match1: 'Meine Notiz' },
      'trading-app.wm-bankroll-ledger-v1': [{ id: 'entry1', amount: 25 }],
      'trading-app.wm-manual-results-v1': { match1: { home: 2, away: 1 } }
    };
    for (const [key, value] of Object.entries(values)) store.set(key, JSON.stringify(value));
    const backup = exportToString();
    store.clear();
    expect(importData(backup, 'replace').ok).toBe(true);
    for (const [key, value] of Object.entries(values)) expect(JSON.parse(store.get(key)!)).toEqual(value);
  });
  it('merges notes without dropping existing matches or overwriting conflicts', () => {
    store.set('trading-app.wm-pick-notes-v1', JSON.stringify({ a: 'importiert', b: 'neu' }));
    const backup = exportToString();
    store.set('trading-app.wm-pick-notes-v1', JSON.stringify({ a: 'lokal', c: 'behalten' }));
    expect(importData(backup, 'merge').ok).toBe(true);
    expect(JSON.parse(store.get('trading-app.wm-pick-notes-v1')!)).toEqual({ a: 'lokal', b: 'neu', c: 'behalten' });
  });
});


it('preserves the raw sport signal mode through the general backup', () => {
  store.clear();
  store.set('trading-app.sport-signal-mode-v1', 'PRECISION');
  const backup = exportToString();
  store.clear();
  expect(importData(backup).ok).toBe(true);
  expect(store.get('trading-app.sport-signal-mode-v1')).toBe('PRECISION');
});

describe('safe backup validation and map merging', () => {
  beforeEach(() => store.clear());

  it('rejects primitive, null and array envelopes without touching saved data', () => {
    store.set('trading-app.positions', '[{"id":"keep"}]');
    for (const value of [null, false, 3, 'backup', [], { app: 'trading-app', data: null }, { app: 'trading-app', data: [] }]) {
      expect(() => importData(JSON.stringify(value))).not.toThrow();
      expect(importData(JSON.stringify(value)).ok).toBe(false);
    }
    expect(store.get('trading-app.positions')).toBe('[{"id":"keep"}]');
  });

  it.each([
    'trading-app.sport-manual-odds-v1',
    'trading-app.wm-odds-compare-quotes-v1',
    'trading-app.squad-overrides-v1'
  ])('merges %s without deleting local matches or overwriting a conflict', key => {
    const incoming = { overlap: { value: 'imported' }, importedMatch: { value: 'new' } };
    const local = { overlap: { value: 'local' }, localMatch: { value: 'keep' } };
    store.set(key, JSON.stringify(local));
    const backup = JSON.stringify({ app: 'trading-app', version: 1, data: { [key]: incoming } });
    expect(importData(backup, 'merge').ok).toBe(true);
    expect(JSON.parse(store.get(key)!)).toEqual({ ...incoming, ...local });
  });

  it('still replaces an object map when replace is explicitly selected', () => {
    const key = 'trading-app.sport-manual-odds-v1';
    store.set(key, JSON.stringify({ oldMatch: { home: 2 } }));
    const incoming = { newMatch: { home: 3 } };
    expect(importData(JSON.stringify({ app: 'trading-app', data: { [key]: incoming } }), 'replace').ok).toBe(true);
    expect(JSON.parse(store.get(key)!)).toEqual(incoming);
  });

  it('deduplicates manual results by fixtureId and retains the local result', () => {
    const key = 'trading-app.wm-manual-results-v1';
    const local = { fixtureId: 'match-1', home: 2, away: 1 };
    store.set(key, JSON.stringify([local]));
    const incoming = [{ fixtureId: 'match-1', home: 3, away: 1 }, { fixtureId: 'match-2', home: 0, away: 0 }];
    expect(importData(JSON.stringify({ app: 'trading-app', data: { [key]: incoming } }), 'merge').ok).toBe(true);
    expect(JSON.parse(store.get(key)!)).toEqual([local, incoming[1]]);
  });

  it('backs up personal money-plan inputs and notifies the plan after restore', () => {
    const key = 'trading-app.money-plan-v1';
    const plan = { amount: 1200, horizonYears: 5, riskLevel: 'balanced', reserveReady: true, debtFree: true };
    store.set(key, JSON.stringify(plan));
    const backup = exportToString();
    store.clear();
    const dispatch = vi.spyOn(window, 'dispatchEvent');
    expect(importData(backup, 'replace').restoredKeys).toContain(key);
    expect(JSON.parse(store.get(key)!)).toEqual(plan);
    expect(dispatch.mock.calls.some(([event]) => event.type === 'trading-app:money-plan-changed')).toBe(true);
    dispatch.mockRestore();
  });
});

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
});

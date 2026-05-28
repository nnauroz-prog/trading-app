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

  it('rejects non-backup json', () => {
    expect(importData('{"foo":1}').ok).toBe(false);
    expect(importData('not json').ok).toBe(false);
  });
});

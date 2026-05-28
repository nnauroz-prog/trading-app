import { describe, expect, it, beforeEach, vi } from 'vitest';

// jsdom-free localStorage shim
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

import { addAlert, evaluateAlerts, loadAlerts, deleteAlert } from '@/lib/price-alerts';

describe('price-alerts', () => {
  beforeEach(() => store.clear());

  it('adds and loads an alert', () => {
    addAlert('btc', 'BTC', 'above', 100000);
    const alerts = loadAlerts();
    expect(alerts.length).toBe(1);
    expect(alerts[0].triggered).toBe(false);
  });

  it('triggers an above-alert when price crosses target', () => {
    addAlert('btc', 'BTC', 'above', 100000);
    const fired = evaluateAlerts({ btc: 101000 });
    expect(fired.length).toBe(1);
    expect(loadAlerts()[0].triggered).toBe(true);
  });

  it('does not trigger above-alert below target', () => {
    addAlert('btc', 'BTC', 'above', 100000);
    const fired = evaluateAlerts({ btc: 99000 });
    expect(fired.length).toBe(0);
    expect(loadAlerts()[0].triggered).toBe(false);
  });

  it('triggers a below-alert when price drops under target', () => {
    addAlert('eth', 'ETH', 'below', 2000);
    const fired = evaluateAlerts({ eth: 1950 });
    expect(fired.length).toBe(1);
  });

  it('does not re-trigger an already-triggered alert', () => {
    addAlert('btc', 'BTC', 'above', 100000);
    evaluateAlerts({ btc: 101000 });
    const second = evaluateAlerts({ btc: 102000 });
    expect(second.length).toBe(0);
  });

  it('deletes an alert', () => {
    const a = addAlert('btc', 'BTC', 'above', 100000);
    deleteAlert(a.id);
    expect(loadAlerts().length).toBe(0);
  });
});

import { describe, expect, it, beforeEach } from 'vitest';
import {
  collectWmBackup,
  serializeWmBackup,
  parseWmBackup,
  applyWmBackup,
  WM_BACKUP_VERSION,
  WM_BACKUP_KEYS
} from '@/lib/sport/wm-backup';

interface MemoryStore {
  [key: string]: string;
}

function setupWindow() {
  const store: MemoryStore = {};
  (globalThis as unknown as { window: object }).window = {
    localStorage: {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; }
    }
  };
  return { store };
}

beforeEach(() => {
  setupWindow();
});

describe('wm-backup', () => {
  it('collectWmBackup ohne gesetzte Keys liefert leeres Payload', () => {
    const b = collectWmBackup(new Date('2026-06-15T12:00:00Z'));
    expect(b.version).toBe(WM_BACKUP_VERSION);
    expect(b.createdAt).toBe('2026-06-15T12:00:00.000Z');
    expect(Object.keys(b.payload).length).toBe(0);
  });

  it('collectWmBackup nimmt vorhandene Keys mit', () => {
    const ctx = setupWindow();
    ctx.store['trading-app.wm-bankroll-eur-v1'] = '500';
    ctx.store['trading-app.wm-pick-notes-v1'] = '{"foo":"bar"}';
    const b = collectWmBackup();
    expect(b.payload['trading-app.wm-bankroll-eur-v1']).toBe('500');
    expect(b.payload['trading-app.wm-pick-notes-v1']).toBe('{"foo":"bar"}');
  });

  it('Roundtrip serialize -> parse erhaelt Daten', () => {
    const ctx = setupWindow();
    ctx.store['trading-app.wm-pick-learning-v1'] = JSON.stringify([{ id: 'x' }]);
    const original = collectWmBackup();
    const json = serializeWmBackup(original);
    const back = parseWmBackup(json);
    expect(back).not.toBeNull();
    expect(back!.payload['trading-app.wm-pick-learning-v1']).toBe(JSON.stringify([{ id: 'x' }]));
  });

  it('parseWmBackup gibt null bei kaputtem JSON', () => {
    expect(parseWmBackup('{nicht-json')).toBeNull();
  });

  it('parseWmBackup gibt null bei fehlender version', () => {
    expect(parseWmBackup(JSON.stringify({ createdAt: 'x', payload: {} }))).toBeNull();
  });

  it('parseWmBackup gibt null bei fehlendem payload', () => {
    expect(parseWmBackup(JSON.stringify({ version: 1, createdAt: 'x' }))).toBeNull();
  });

  it('parseWmBackup ignoriert unbekannte Payload-Keys', () => {
    const parsed = parseWmBackup(JSON.stringify({
      version: 1,
      createdAt: '2026-06-15T00:00:00Z',
      payload: { 'fremder.key': 'evil', 'trading-app.wm-pick-notes-v1': 'gut' }
    }));
    expect(parsed?.payload['trading-app.wm-pick-notes-v1']).toBe('gut');
    expect((parsed?.payload as Record<string, unknown>)['fremder.key']).toBeUndefined();
  });

  it('applyWmBackup schreibt Werte zurueck und meldet Anzahl', () => {
    setupWindow();
    const result = applyWmBackup({
      version: 1,
      createdAt: '2026-06-15T00:00:00Z',
      payload: {
        'trading-app.wm-bankroll-eur-v1': '250',
        'trading-app.wm-pick-notes-v1': '{"a":"b"}'
      }
    });
    expect(result.appliedCount).toBe(2);
    expect(result.skippedKeys.length).toBe(WM_BACKUP_KEYS.length - 2);
    expect(window.localStorage.getItem('trading-app.wm-bankroll-eur-v1')).toBe('250');
  });

  it('applyWmBackup laesst Keys ohne Wert unangetastet', () => {
    const ctx = setupWindow();
    ctx.store['trading-app.wm-bankroll-eur-v1'] = 'ALT';
    applyWmBackup({ version: 1, createdAt: 'x', payload: {} });
    expect(window.localStorage.getItem('trading-app.wm-bankroll-eur-v1')).toBe('ALT');
  });
});

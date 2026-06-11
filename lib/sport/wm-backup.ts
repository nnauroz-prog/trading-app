// Backup-/Restore-Lib fuer alle lokal gespeicherten WM-Daten.
//
// Konsolidiert die WM-spezifischen localStorage-Eintraege in ein
// JSON-Objekt (kein binary, gut versionierbar). Damit kann der User:
//   - vor Browser-Clear ein Backup ziehen
//   - Daten auf ein anderes Geraet uebertragen
//   - jederzeit zu einem Zustand zurueckkehren
//
// Reine Funktion bis auf den Browser-IO am Rand. Das Schema-Feld
// "version" ist Pflicht — kuenftige Format-Aenderungen koennen so
// erkannt und migriert werden.

export const WM_BACKUP_VERSION = 1;

const WM_LOCAL_STORAGE_KEYS = [
  'trading-app.sport-manual-odds-v1',
  'trading-app.sport-signal-mode-v1',
  'trading-app.wm-bankroll-eur-v1',
  'trading-app.wm-bankroll-ledger-v1',
  'trading-app.wm-day-cap-pct-v1',
  'trading-app.wm-erste-schritte-dismissed-v1',
  'trading-app.wm-manual-results-v1',
  'trading-app.wm-odds-compare-quotes-v1',
  'trading-app.wm-odds-compare-slot-names-v1',
  'trading-app.wm-pick-learning-v1',
  'trading-app.wm-pick-notes-v1'
] as const;

export type WmBackupKey = typeof WM_LOCAL_STORAGE_KEYS[number];

export interface WmBackup {
  version: number;
  createdAt: string; // ISO timestamp
  payload: Partial<Record<WmBackupKey, string>>;
}

export interface WmBackupApplyResult {
  appliedCount: number;
  skippedKeys: string[];
  errors: string[];
}

export function collectWmBackup(now: Date = new Date()): WmBackup {
  const payload: Partial<Record<WmBackupKey, string>> = {};
  if (typeof window !== 'undefined') {
    for (const key of WM_LOCAL_STORAGE_KEYS) {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) payload[key] = raw;
    }
  }
  return {
    version: WM_BACKUP_VERSION,
    createdAt: now.toISOString(),
    payload
  };
}

export function serializeWmBackup(backup: WmBackup): string {
  return JSON.stringify(backup, null, 2);
}

// Strikte Parse-Funktion: liefert null fuer alles, was nicht plausibel
// nach einem WmBackup aussieht. Toleriert keine Trash-Eingaben.
export function parseWmBackup(raw: string): WmBackup | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.version !== 'number') return null;
  if (typeof obj.createdAt !== 'string') return null;
  if (!obj.payload || typeof obj.payload !== 'object') return null;
  const cleanPayload: Partial<Record<WmBackupKey, string>> = {};
  for (const k of WM_LOCAL_STORAGE_KEYS) {
    const v = (obj.payload as Record<string, unknown>)[k];
    if (typeof v === 'string') cleanPayload[k] = v;
  }
  return { version: obj.version, createdAt: obj.createdAt, payload: cleanPayload };
}

// Schreibt die Daten zurueck in localStorage. Schluessel die nicht im
// Backup sind, bleiben unangetastet — kein Vollwipe.
// Fremde Schluessel (nicht in WM_LOCAL_STORAGE_KEYS) werden ignoriert.
export function applyWmBackup(backup: WmBackup): WmBackupApplyResult {
  const result: WmBackupApplyResult = { appliedCount: 0, skippedKeys: [], errors: [] };
  if (typeof window === 'undefined') {
    result.errors.push('Kein Browser-Kontext.');
    return result;
  }
  for (const key of WM_LOCAL_STORAGE_KEYS) {
    const value = backup.payload[key];
    if (value === undefined) {
      result.skippedKeys.push(key);
      continue;
    }
    try {
      window.localStorage.setItem(key, value);
      result.appliedCount += 1;
    } catch (e) {
      result.errors.push(`${key}: ${e instanceof Error ? e.message : 'unbekannter Fehler'}`);
    }
  }
  return result;
}

export const WM_BACKUP_KEYS: readonly WmBackupKey[] = WM_LOCAL_STORAGE_KEYS;

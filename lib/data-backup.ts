// Vollständiges Backup/Restore aller lokalen App-Daten. Keine externe
// Abhängigkeit — funktioniert offline, kann nichts kaputt machen.

const BACKUP_KEYS = [
  'trading-app.account-config',
  'trading-app.user-profile',
  'trading-app.positions',
  'trading-app.journal',
  'trading-app.paper-trades',
  'trading-app.watchlist',
  'trading-app.price-alerts',
  'trading-app.dca-plans',
  'trading-app.chart-drawings'
] as const;

const CHANGE_EVENTS = [
  'trading-app:positions-changed',
  'trading-app:journal-changed',
  'trading-app:trades-changed',
  'trading-app:watchlist-changed',
  'trading-app:price-alerts-changed',
  'trading-app:dca-changed',
  'trading-app:config-changed',
  'trading-app:profile-changed',
  'trading-app:drawings-changed'
];

export interface BackupEnvelope {
  app: 'trading-app';
  version: 1;
  exportedAt: string;
  data: Record<string, unknown>;
}

export function exportData(): BackupEnvelope {
  const data: Record<string, unknown> = {};
  if (typeof window !== 'undefined') {
    for (const key of BACKUP_KEYS) {
      const raw = window.localStorage.getItem(key);
      if (raw === null) continue;
      try {
        data[key] = JSON.parse(raw);
      } catch {
        data[key] = raw;
      }
    }
  }
  return { app: 'trading-app', version: 1, exportedAt: new Date().toISOString(), data };
}

export function exportToString(): string {
  return JSON.stringify(exportData(), null, 2);
}

export interface ImportResult {
  ok: boolean;
  restoredKeys: string[];
  error?: string;
}

// Identity for merge-dedup. Most stores key on `id`; the watchlist keys on
// `coinId`. `id` is checked first so e.g. two alerts on the same coin stay
// distinct. Anything without a known key falls back to deep-equality via JSON.
const IDENTITY_KEYS = ['id', 'coinId'] as const;

function identityOf(item: unknown): string {
  if (typeof item === 'object' && item !== null) {
    for (const k of IDENTITY_KEYS) {
      const v = (item as Record<string, unknown>)[k];
      if (v !== undefined && v !== null) return `${k}:${String(v)}`;
    }
  }
  return JSON.stringify(item);
}

export function importData(json: string, mode: 'replace' | 'merge' = 'replace'): ImportResult {
  if (typeof window === 'undefined') return { ok: false, restoredKeys: [], error: 'no_window' };
  let parsed: BackupEnvelope;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, restoredKeys: [], error: 'invalid_json' };
  }
  if (parsed.app !== 'trading-app' || typeof parsed.data !== 'object' || parsed.data === null) {
    return { ok: false, restoredKeys: [], error: 'not_a_trading_app_backup' };
  }

  const restored: string[] = [];
  for (const key of BACKUP_KEYS) {
    if (!(key in parsed.data)) continue;
    const incoming = parsed.data[key];
    if (mode === 'merge' && Array.isArray(incoming)) {
      const existingRaw = window.localStorage.getItem(key);
      let existing: unknown[] = [];
      if (existingRaw) {
        try {
          const e = JSON.parse(existingRaw);
          if (Array.isArray(e)) existing = e;
        } catch {
          /* ignore */
        }
      }
      const seen = new Set(existing.map(identityOf));
      const merged = [...existing];
      for (const item of incoming) {
        const id = identityOf(item);
        if (!seen.has(id)) {
          seen.add(id);
          merged.push(item);
        }
      }
      window.localStorage.setItem(key, JSON.stringify(merged));
    } else {
      window.localStorage.setItem(key, JSON.stringify(incoming));
    }
    restored.push(key);
  }

  for (const evt of CHANGE_EVENTS) {
    window.dispatchEvent(new CustomEvent(evt));
  }

  return { ok: true, restoredKeys: restored };
}

export function backupSummary(env: BackupEnvelope): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(env.data)) {
    const short = key.replace('trading-app.', '');
    out[short] = Array.isArray(value) ? value.length : 1;
  }
  return out;
}

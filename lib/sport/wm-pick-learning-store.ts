// localStorage-Wrapper fuer das WM Pick-Lern-Log. Reine Browser-Schicht,
// trennt SSR-sicher von der pure-lib (wm-pick-learning.ts).
//
// Append-Only mit Idempotenz pro (fixtureId, winnerSide). Maximal 600
// Eintraege gespeichert — die WM hat 64 Spiele, plus 5 % Multi-Tier-
// Eintraege ist mehr als genug.

import type { WmPickLogEntry, FinishedFixtureLite } from '@/lib/sport/wm-pick-learning';
import { resolveOpenPicks } from '@/lib/sport/wm-pick-learning';

const STORAGE_KEY = 'trading-app.wm-pick-learning-v1';
const MAX_ENTRIES = 600;

export const WM_PICK_LEARNING_CHANGED_EVENT = 'trading-app:wm-pick-learning-changed';

export function loadWmPickLog(): WmPickLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as WmPickLogEntry[];
  } catch {
    return [];
  }
}

function save(entries: WmPickLogEntry[]): void {
  if (typeof window === 'undefined') return;
  const trimmed = entries.slice(-MAX_ENTRIES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  window.dispatchEvent(new CustomEvent(WM_PICK_LEARNING_CHANGED_EVENT));
}

// Schreibt einen Pick mit Idempotenz pro (fixtureId, winnerSide).
// Wenn ein Eintrag fuer dasselbe Spiel/dieselbe Sieger-Seite existiert,
// wird er NICHT ueberschrieben — wir wollen die Faktor-Werte vom ersten
// Show-Zeitpunkt einfrieren (sonst kein faires Lernen).
export function recordWmPick(entry: Omit<WmPickLogEntry, 'recordedAt' | 'outcome'>): WmPickLogEntry {
  const log = loadWmPickLog();
  const existing = log.find((e) => e.fixtureId === entry.fixtureId && e.winnerSide === entry.winnerSide);
  if (existing) return existing;
  const created: WmPickLogEntry = {
    ...entry,
    recordedAt: Date.now(),
    outcome: 'pending'
  };
  log.push(created);
  save(log);
  return created;
}

// Bulk-Resolver: ruft die pure-lib auf, persistiert wenn was geaendert wurde.
export function resolveAndPersistWmPicks(finished: FinishedFixtureLite[]): { resolvedCount: number } {
  const log = loadWmPickLog();
  const { log: nextLog, resolvedCount } = resolveOpenPicks(log, finished);
  if (resolvedCount > 0) save(nextLog);
  return { resolvedCount };
}

export function clearWmPickLog(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(WM_PICK_LEARNING_CHANGED_EVENT));
}

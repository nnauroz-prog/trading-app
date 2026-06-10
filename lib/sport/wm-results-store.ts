// localStorage-Wrapper fuer manuelle WM-Final-Score-Eingaben. Damit
// kann der User Spielergebnisse selbst nachpflegen, falls TheSportsDB
// die WM-Spiele nicht oder nur langsam aufnimmt.

import type { ManualWmResult } from '@/lib/sport/wm-results-matcher';

const STORAGE_KEY = 'trading-app.wm-manual-results-v1';
export const WM_MANUAL_RESULTS_CHANGED_EVENT = 'trading-app:wm-manual-results-changed';

export function loadManualWmResults(): ManualWmResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ManualWmResult[];
  } catch {
    return [];
  }
}

function save(entries: ManualWmResult[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent(WM_MANUAL_RESULTS_CHANGED_EVENT));
}

export function setManualWmResult(fixtureId: string, homeScore: number, awayScore: number): void {
  const list = loadManualWmResults();
  const idx = list.findIndex((e) => e.fixtureId === fixtureId);
  const entry: ManualWmResult = { fixtureId, homeScore, awayScore, recordedAt: Date.now() };
  if (idx >= 0) list[idx] = entry; else list.push(entry);
  save(list);
}

export function clearManualWmResults(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(WM_MANUAL_RESULTS_CHANGED_EVENT));
}

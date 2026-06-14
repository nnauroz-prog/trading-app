// localStorage-Wrapper fuer manuelle WM-Final-Score-Eingaben. Damit
// kann der User Spielergebnisse selbst nachpflegen, falls TheSportsDB
// die WM-Spiele nicht oder nur langsam aufnimmt.
//
// SECURITY: pro Eintrag wird beim Lesen die Form validiert (kein
// "as any"-Trust). Manipulierter localStorage (XSS-fremde Erweiterung,
// devtools, andere Tabs) kann sonst NaN, Strings oder XSS-Payloads in
// die Render-Pipeline schmuggeln.

import type { ManualWmResult } from '@/lib/sport/wm-results-matcher';

const STORAGE_KEY = 'trading-app.wm-manual-results-v1';
export const WM_MANUAL_RESULTS_CHANGED_EVENT = 'trading-app:wm-manual-results-changed';

// Realistisches Fussball-Maximum, vgl. wm-endstand-input-inline.tsx.
const MAX_GOALS = 30;

function isValidManualResult(x: unknown): x is ManualWmResult {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  if (typeof o.fixtureId !== 'string' || o.fixtureId.length === 0 || o.fixtureId.length > 64) return false;
  if (!Number.isInteger(o.homeScore) || (o.homeScore as number) < 0 || (o.homeScore as number) > MAX_GOALS) return false;
  if (!Number.isInteger(o.awayScore) || (o.awayScore as number) < 0 || (o.awayScore as number) > MAX_GOALS) return false;
  if (typeof o.recordedAt !== 'number' || !Number.isFinite(o.recordedAt) || (o.recordedAt as number) < 0) return false;
  return true;
}

export function loadManualWmResults(): ManualWmResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Pro Eintrag validieren — manipulierte/korrupte Eintraege werden
    // stillschweigend verworfen, statt das ganze App zu vergiften.
    return parsed.filter(isValidManualResult);
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
  // Defensive Bounds — auch wenn die UI strikt validiert, schuetzt das
  // gegen Aufrufe aus anderen Code-Pfaden, z.B. Tests oder spaeteren
  // Live-Importen.
  if (!Number.isInteger(homeScore) || homeScore < 0 || homeScore > MAX_GOALS) return;
  if (!Number.isInteger(awayScore) || awayScore < 0 || awayScore > MAX_GOALS) return;
  if (typeof fixtureId !== 'string' || fixtureId.length === 0 || fixtureId.length > 64) return;
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

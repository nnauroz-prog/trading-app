// Tipprunde-Wochenziel: User setzt sich ein Ziel („4/5 Treffer diese Woche"),
// App rechnet Fortschritt aus dem Tipp-Tagebuch der laufenden ISO-Woche.

import { loadTipJournal, type TipJournalEntry } from '@/lib/sport/tip-journal';

const STORAGE_KEY = 'trading-app.tipprunde-wochenziel-v1';

export const WOCHENZIEL_CHANGED_EVENT = 'trading-app:wochenziel-changed';

export interface WochenZiel {
  // Saisonübergreifend, deshalb keine ISO-Woche im Datenmodell — Ziel gilt
  // einfach für die aktuelle Woche jeder Auswertung.
  targetWins: number;
  setAt: number;
}

export function loadWochenziel(): WochenZiel | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.targetWins !== 'number') return null;
    return parsed as WochenZiel;
  } catch {
    return null;
  }
}

export function saveWochenziel(targetWins: number): void {
  if (typeof window === 'undefined') return;
  if (!Number.isFinite(targetWins) || targetWins <= 0 || targetWins > 30) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ targetWins: Math.round(targetWins), setAt: Date.now() }));
  window.dispatchEvent(new CustomEvent(WOCHENZIEL_CHANGED_EVENT));
}

export function clearWochenziel(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(WOCHENZIEL_CHANGED_EVENT));
}

// ISO-Wochen-Anfang (Montag 00:00 Berlin-Zeit) als ms-Timestamp.
export function startOfIsoWeek(now: Date): number {
  const d = new Date(now);
  const day = d.getDay(); // 0 = Sonntag
  const diff = day === 0 ? -6 : 1 - day; // bis Montag rückwärts
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export interface WochenzielProgress {
  targetWins: number;
  currentWins: number;
  resolved: number;
  pending: number;
  percent: number; // 0..100
  reached: boolean;
  weekStart: number;
}

export function computeWochenzielProgress(now: Date = new Date()): WochenzielProgress | null {
  const ziel = loadWochenziel();
  if (!ziel) return null;
  const weekStart = startOfIsoWeek(now);
  const log = loadTipJournal();
  // Tipps werden über recordedAt zugeordnet — fairer als date,
  // da man auch Tipps für morgen heute eingibt.
  const thisWeek = log.filter((e: TipJournalEntry) => e.recordedAt >= weekStart);
  const resolved = thisWeek.filter((e) => e.outcome !== 'pending').length;
  const pending = thisWeek.filter((e) => e.outcome === 'pending').length;
  const wins = thisWeek.filter((e) => e.outcome === 'win').length;
  const percent = ziel.targetWins === 0 ? 0 : Math.min(100, Math.round((wins / ziel.targetWins) * 100));
  return {
    targetWins: ziel.targetWins,
    currentWins: wins,
    resolved,
    pending,
    percent,
    reached: wins >= ziel.targetWins,
    weekStart
  };
}

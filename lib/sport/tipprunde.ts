// Lokale Tipprunde — ein Spieler, ein Profil, lokaler Verlauf.
// Bewusst KEINE Server-Komponente, KEIN Account, KEIN Sharing: alles bleibt
// im Browser des Spielers. Wer mit Freunden tippen will, vergleicht
// Screenshots — Mehrspieler-Sync ist explizit nicht im Scope.

import { loadTipJournal, TipJournalEntry } from '@/lib/sport/tip-journal';

const PROFILE_KEY = 'trading-app.tipprunde-profile-v1';

export interface TipprundeProfile {
  displayName: string;
  joinedAt: number;
  // Freitext-Notiz, max 200 Zeichen. Z. B. Liga-Fokus oder Wochenziel.
  note?: string;
}

export const MAX_NOTE_LENGTH = 200;
export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 32;

export const TIPPRUNDE_CHANGED_EVENT = 'trading-app:tipprunde-changed';

export function loadProfile(): TipprundeProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.displayName !== 'string') return null;
    return parsed as TipprundeProfile;
  } catch {
    return null;
  }
}

export function saveProfile(profile: TipprundeProfile): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent(TIPPRUNDE_CHANGED_EVENT));
}

export function clearProfile(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PROFILE_KEY);
  window.dispatchEvent(new CustomEvent(TIPPRUNDE_CHANGED_EVENT));
}

export interface TipprundeStats {
  total: number;
  resolved: number;
  wins: number;
  hitRatePct: number | null;
  currentStreak: number; // aufeinanderfolgende Treffer (vom neuesten resolved aus)
  longestStreak: number;
  bestBand: {
    band: NonNullable<TipJournalEntry['qualityBand']>;
    resolved: number;
    hitRatePct: number | null;
  } | null;
  recent: Array<{
    id: string;
    date: string;
    label: string;
    outcome: TipJournalEntry['outcome'];
    qualityScore?: number;
  }>;
}

export function computeTipprundeStats(): TipprundeStats {
  const log = loadTipJournal();
  const resolved = log.filter((e) => e.outcome !== 'pending');
  const wins = resolved.filter((e) => e.outcome === 'win').length;
  const decisive = resolved.filter((e) => e.outcome !== 'push').length;
  const hitRatePct = decisive > 0 ? Math.round((wins / decisive) * 100) : null;

  const chronological = [...resolved].sort((a, b) => (a.resolvedAt ?? 0) - (b.resolvedAt ?? 0));
  let longest = 0;
  let running = 0;
  for (const e of chronological) {
    if (e.outcome === 'win') {
      running += 1;
      if (running > longest) longest = running;
    } else if (e.outcome === 'loss') {
      running = 0;
    }
  }
  let current = 0;
  for (let i = chronological.length - 1; i >= 0; i--) {
    const e = chronological[i];
    if (e.outcome === 'win') current += 1;
    else if (e.outcome === 'loss') break;
  }

  const bands = ['sehr_stark', 'stark', 'brauchbar', 'orientierung'] as const;
  let bestBand: TipprundeStats['bestBand'] = null;
  for (const band of bands) {
    const entries = resolved.filter((e) => e.qualityBand === band);
    const bandDecisive = entries.filter((e) => e.outcome !== 'push').length;
    if (bandDecisive < 3) continue;
    const bandWins = entries.filter((e) => e.outcome === 'win').length;
    const pct = Math.round((bandWins / bandDecisive) * 100);
    if (!bestBand || (bestBand.hitRatePct !== null && pct > (bestBand.hitRatePct ?? 0))) {
      bestBand = { band, resolved: entries.length, hitRatePct: pct };
    }
  }

  const recent = [...resolved]
    .sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0))
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      date: e.date,
      label: `${e.homeTeam} – ${e.awayTeam} · ${e.market}`,
      outcome: e.outcome,
      qualityScore: e.qualityScore
    }));

  return {
    total: log.length,
    resolved: resolved.length,
    wins,
    hitRatePct,
    currentStreak: current,
    longestStreak: longest,
    bestBand,
    recent
  };
}

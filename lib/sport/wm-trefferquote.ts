// WM-Trefferquoten-Zusammenfassung. Reduziert das Pick-Log auf eine
// auf den ersten Blick lesbare Bilanz: gesamt + nach Tier.
//
// Wichtig: nur RESOLVED-Picks zaehlen (also win/loss/push). pending
// laeuft noch — fliesst nicht in die Quote ein.
//
// Reine Funktion. Keine I/O.

import type { WmPickLogEntry } from '@/lib/sport/wm-pick-learning';

export interface WmTrefferquoteBucket {
  // Anzahl entschiedener Picks (win + loss).
  decided: number;
  wins: number;
  losses: number;
  pushes: number;
  // Trefferquote = wins / decided. null wenn decided=0.
  hitRatePct: number | null;
}

export interface WmTrefferquoteSummary {
  total: WmTrefferquoteBucket;
  hoechsteKonfluenz: WmTrefferquoteBucket;
  modellFavorit: WmTrefferquoteBucket;
  // Anzahl noch laufender Picks.
  pending: number;
}

function emptyBucket(): WmTrefferquoteBucket {
  return { decided: 0, wins: 0, losses: 0, pushes: 0, hitRatePct: null };
}

function add(bucket: WmTrefferquoteBucket, entry: WmPickLogEntry): void {
  if (entry.outcome === 'pending') return;
  if (entry.outcome === 'push') {
    bucket.pushes += 1;
    return;
  }
  bucket.decided += 1;
  if (entry.outcome === 'win') bucket.wins += 1;
  if (entry.outcome === 'loss') bucket.losses += 1;
}

function seal(bucket: WmTrefferquoteBucket): void {
  bucket.hitRatePct = bucket.decided > 0 ? Math.round((bucket.wins / bucket.decided) * 100) : null;
}

export function summarizeWmTrefferquote(log: WmPickLogEntry[]): WmTrefferquoteSummary {
  const total = emptyBucket();
  const hoechste = emptyBucket();
  const modell = emptyBucket();
  let pending = 0;
  for (const entry of log) {
    if (entry.outcome === 'pending') {
      pending += 1;
      continue;
    }
    add(total, entry);
    if (entry.tier === 'hoechste-konfluenz') add(hoechste, entry);
    else add(modell, entry);
  }
  seal(total);
  seal(hoechste);
  seal(modell);
  return { total, hoechsteKonfluenz: hoechste, modellFavorit: modell, pending };
}

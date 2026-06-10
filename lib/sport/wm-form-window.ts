// Aktuelle Form: Trefferquote der letzten N Tage als eigenes Bucket.
// Dient als Vergleichswert neben der Gesamt-Bilanz — sieht man auf
// einen Blick, ob das System gerade besser, schlechter oder gleich
// gut laeuft wie ueber den Gesamt-Zeitraum.
//
// Reine Funktion. Push zaehlt nicht in decided (analog Bilanz).

import type { WmPickLogEntry } from '@/lib/sport/wm-pick-learning';
import type { WmTrefferquoteBucket } from '@/lib/sport/wm-trefferquote';

export interface WmFormInfo {
  bucket: WmTrefferquoteBucket;
  windowDays: number;
  fromIso: string;
  toIso: string;
  // Differenz zur Gesamt-Trefferquote in Prozentpunkten. Positiv = die
  // letzten N Tage laufen besser als der Schnitt. null wenn eine der
  // beiden Quoten nicht ermittelbar ist.
  vsTotalDeltaPpct: number | null;
}

function subtractDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export function computeWmForm(
  log: WmPickLogEntry[],
  todayIso: string,
  windowDays: number,
  totalHitRatePct: number | null
): WmFormInfo {
  const fromIso = subtractDays(todayIso, windowDays - 1);
  let decided = 0;
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  for (const e of log) {
    if (e.dateIso < fromIso || e.dateIso > todayIso) continue;
    if (e.outcome === 'pending') continue;
    if (e.outcome === 'push') { pushes += 1; continue; }
    decided += 1;
    if (e.outcome === 'win') wins += 1;
    else if (e.outcome === 'loss') losses += 1;
  }
  const hitRatePct = decided > 0 ? Math.round((wins / decided) * 100) : null;
  const bucket: WmTrefferquoteBucket = { decided, wins, losses, pushes, hitRatePct };
  const vsTotalDeltaPpct = hitRatePct === null || totalHitRatePct === null ? null : hitRatePct - totalHitRatePct;
  return { bucket, windowDays, fromIso, toIso: todayIso, vsTotalDeltaPpct };
}

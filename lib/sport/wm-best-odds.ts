// Beste eingetragene Quote pro Pick aus dem Quoten-Vergleich-Store.
//
// Reine Funktion ueber den rohen Draft-Strings. Liefert null wenn
// keine gueltige Quote (> 1) eingetragen ist.

export function bestOddsFromDrafts(drafts: readonly string[] | undefined): number | null {
  if (!drafts || drafts.length === 0) return null;
  let best: number | null = null;
  for (const raw of drafts) {
    const n = parseFloat((raw ?? '').replace(',', '.'));
    if (!Number.isFinite(n) || n <= 1) continue;
    if (best === null || n > best) best = n;
  }
  return best;
}

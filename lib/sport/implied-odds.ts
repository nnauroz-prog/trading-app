// Implizite Quoten aus Wahrscheinlichkeiten: 1/p gibt die "faire" Buchmacher-
// Quote ohne Margin. Tipico und andere addieren typisch 5-8 % Marge oben drauf,
// d. h. unsere Quote sollte minimal niedriger sein als die echte.
//
// Beispiel: Heim 60 % → faire Quote 1.67. Tipico würde 1.55-1.60 anbieten.

export function impliedOdds(probability: number): number {
  if (!Number.isFinite(probability) || probability <= 0) return 0;
  if (probability >= 1) return 1;
  return Math.round((1 / probability) * 100) / 100;
}

// Komfort-Formatter für die Anzeige (zwei Nachkommastellen, deutsches Komma).
export function fmtOdds(probability: number): string {
  const o = impliedOdds(probability);
  if (o <= 0) return '—';
  return o.toFixed(2).replace('.', ',');
}

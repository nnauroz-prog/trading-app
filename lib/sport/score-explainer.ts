// Erklärt einen konkreten Score in Klartext. Wird vom Hilfe-Modal genutzt.

import type { QualityScoreResult } from '@/lib/sport/prediction-quality-score';

export interface ScoreExplanation {
  rawScore: number;
  band: QualityScoreResult['band'];
  bandLabel: string;
  parts: QualityScoreResult['parts'];
  reasoning: string[];
}

export function explainScore(q: QualityScoreResult): ScoreExplanation {
  const reasoning: string[] = [];
  const { parts } = q;

  if (parts.probability >= 35) reasoning.push(`Hohe Modell-Wahrscheinlichkeit (${parts.probability}/45 Punkte)`);
  else if (parts.probability >= 20) reasoning.push(`Mittlere Modell-Wahrscheinlichkeit (${parts.probability}/45)`);
  else reasoning.push(`Niedrige Modell-Wahrscheinlichkeit (${parts.probability}/45) — wenig Vorteil`);

  if (parts.confidence === 20) reasoning.push('Confidence des Modells: klar');
  else if (parts.confidence === 12) reasoning.push('Confidence des Modells: leicht');
  else reasoning.push('Confidence des Modells: offen — Spiel kann kippen');

  if (parts.dataQuality === 20) reasoning.push('Datenlage „good" + großer Sample (≥ 80 Spiele)');
  else if (parts.dataQuality === 15) reasoning.push('Datenlage „good" oder mittlerer Sample (≥ 50)');
  else if (parts.dataQuality === 10) reasoning.push('Datenlage mittel');
  else reasoning.push('Datenlage schwach — Hartdeckel max 60');

  if (parts.marketRisk === 10) reasoning.push('Stabiler Markt (Doppelchance / Tor-Markt) — sicheres Setup');
  else if (parts.marketRisk === 0) reasoning.push('Exakter Score — risikofreudige Wette, 0 Punkte für Marktart');
  else reasoning.push('Enger 1X2-Markt — Hartdeckel max 70');

  if (parts.actuality === 0) reasoning.push('Spiel beendet — Score auf 0 gesetzt');

  return {
    rawScore: q.score,
    band: q.band,
    bandLabel: q.bandLabel,
    parts: q.parts,
    reasoning
  };
}

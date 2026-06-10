// WM Combo-Picks.
//
// Profi-Tipper kombinieren manchmal mehrere Sieger-Picks zu einem
// Tippschein, um die Quote zu steigern. Risiko: alle muessen treffen.
//
// Wir geben pro Kombi (2er, 3er):
//   - Joint-Probability = Produkt der Einzel-Probabilities
//   - Combo-Quote = Produkt der Einzel-Quoten
//   - Erwarteter Wert: jointProb * (Quote - 1) - (1 - jointProb)
//   - Empfehlung nur wenn EV > 0
//
// Hartes Veto: Combos mit mehr als 3 Picks gibt es nicht — bei 4er
// wird die Quote zwar attraktiv, die Trefferwahrscheinlichkeit faellt
// aber drastisch und schoent das Erwartungswert-Bild.
//
// Reine Funktion. Wording ohne verbotene Begriffe.

import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

export interface ComboPickCandidate {
  picks: WmWinnerPick[];
  jointProbabilityPct: number;
  comboOdds: number;
  expectedValuePct: number;
  // EV-Klassifikation:
  //   POSITIV  = EV > 5 %  → echte Edge
  //   GRENZWERTIG = EV 0..5 %
  //   NEGATIV  = EV < 0     → nicht empfehlen
  evLabel: 'POSITIV' | 'GRENZWERTIG' | 'NEGATIV';
}

interface BuildOptions {
  picks: WmWinnerPick[];
  // Default decimal odds pro Pick (wenn nicht ueberschrieben).
  defaultOdds?: number;
  // Maximalgroesse einer Combo (Default 3).
  maxSize?: number;
  // Mindestens FREIGABE-Tier? Default true (nur "modell-favorit" + "hoechste-konfluenz").
  onlyFreigabe?: boolean;
}

function combinations<T>(arr: T[], size: number): T[][] {
  if (size <= 1) return arr.map((a) => [a]);
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    for (const rest of combinations(arr.slice(i + 1), size - 1)) {
      out.push([arr[i], ...rest]);
    }
  }
  return out;
}

export function rankWmComboPicks(opts: BuildOptions): ComboPickCandidate[] {
  const { picks, defaultOdds = 2.0, maxSize = 3, onlyFreigabe = true } = opts;
  const pool = onlyFreigabe
    ? picks.filter((p) => p.tier === 'hoechste-konfluenz' || p.tier === 'modell-favorit')
    : picks;
  if (pool.length < 2) return [];

  const out: ComboPickCandidate[] = [];
  for (let size = 2; size <= Math.min(maxSize, pool.length); size++) {
    for (const combo of combinations(pool, size)) {
      const jointProb = combo.reduce((p, c) => p * (c.modelProbabilityPct / 100), 1);
      const comboOdds = Math.pow(defaultOdds, size);
      const ev = jointProb * (comboOdds - 1) - (1 - jointProb);
      const evPct = ev * 100;
      const evLabel: ComboPickCandidate['evLabel'] = evPct > 5 ? 'POSITIV' : evPct > 0 ? 'GRENZWERTIG' : 'NEGATIV';
      out.push({
        picks: combo,
        jointProbabilityPct: Math.round(jointProb * 100),
        comboOdds: Math.round(comboOdds * 100) / 100,
        expectedValuePct: Math.round(evPct * 10) / 10,
        evLabel
      });
    }
  }
  out.sort((a, b) => b.expectedValuePct - a.expectedValuePct);
  return out;
}

// Position-Sizer pro Optionsschein-Vorschlag: bei N EUR Einsatz, wie
// viele Scheine kann man kaufen (gerundet auf ganze Scheine), wie viel
// Kapital ist tatsaechlich gebunden, was ist der max. Verlust bei
// Totalverlust. Bewusst transparent: User soll wissen, dass auch der
// "kleine" 100 EUR-Einsatz vollstaendig verloren werden kann.

import type { OptionsscheinSuggestion } from './suggest';

export interface PositionPlan {
  budget: number;                       // angenommene Budgetzeile (100 / 300 / 1000)
  estimatedScheinepreis: number;        // approx Preis pro Schein
  count: number;                        // wieviele Scheine fuer das Budget
  actualSpent: number;                  // count * estimatedScheinepreis
  unspent: number;                      // budget - actualSpent
  maxLoss: number;                      // = actualSpent (bei Totalverlust)
  // Was bringt die Position bei +10/+20 % Underlying?
  upsideAt10: number;
  upsideAt20: number;
}

const STANDARD_BUDGETS = [100, 300, 1000];

function approxScheinePrice(s: OptionsscheinSuggestion): number {
  // Pro Schein nach Bezugsverhaeltnis. Wenn der User einen Markt-
  // Premium eingegeben hat, nimm den; sonst Approx aus dem Modell.
  if (s.analysis.premiumQuoted !== null) return s.analysis.premiumQuoted;
  // approxPremium aus analyzeOptionsschein ist pro "ganzem" Schein vor
  // ratio-Skalierung — wir teilen, damit es pro tatsaechlich handelbarem
  // Schein passt.
  const ratio = s.analysis.ratio > 0 ? s.analysis.ratio : 1;
  // Naehe: estimatedDelta * underlying / leverage = approxPremium
  if (s.analysis.estimatedLeverage !== null && s.analysis.estimatedLeverage > 0 && s.analysis.estimatedDelta !== null) {
    return (s.analysis.estimatedDelta * s.analysis.underlyingPrice) / (s.analysis.estimatedLeverage * ratio);
  }
  return 1;
}

export function buildPositionPlans(s: OptionsscheinSuggestion, budgets: number[] = STANDARD_BUDGETS): PositionPlan[] {
  const pricePerScheine = approxScheinePrice(s);
  if (!Number.isFinite(pricePerScheine) || pricePerScheine <= 0) return [];

  return budgets.map<PositionPlan>((budget) => {
    const count = Math.floor(budget / pricePerScheine);
    const actualSpent = count * pricePerScheine;
    const unspent = budget - actualSpent;
    const maxLoss = actualSpent;

    // Upside-Approximation: Hebel * Underlying-Move * Spent
    const lev = s.analysis.estimatedLeverage ?? 1;
    const upsideAt10 = actualSpent * lev * 0.10;
    const upsideAt20 = actualSpent * lev * 0.20;

    return {
      budget,
      estimatedScheinepreis: pricePerScheine,
      count,
      actualSpent,
      unspent,
      maxLoss,
      upsideAt10,
      upsideAt20
    };
  });
}

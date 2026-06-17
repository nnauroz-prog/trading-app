// Vergleicht die theoretische Wertentwicklung der Aktie gegen die drei
// Optionsschein-Vorschlaege (niedrig / mittel / hoch Risiko) bei
// verschiedenen Underlying-Bewegungen. Zielt auf die ehrliche Frage
// "Lohnt sich der Schein-Hebel oder reicht die Aktie?" — wichtig fuer
// den User, der nicht aus Reflex hebeln will.

import type { OptionsscheinSuggestion } from './suggest';

export interface PayoffRow {
  underlyingDeltaPct: number;
  // Aktie folgt 1:1. Wert in % gegenueber Einsatz.
  aktiePct: number;
  // Pro Suggestion: prozentuale Wertveraenderung des Scheins
  // (Modell-Schaetzung, gleiche Approx wie der Analyzer).
  schein: Record<string, number>;
}

interface CompareInput {
  underlyingPrice: number;
  suggestions: OptionsscheinSuggestion[];
  today?: Date;
}

const STEPS = [-20, -10, -5, 0, 5, 10, 20];

function daysBetween(now: Date, futureIso: string): number | null {
  const parts = futureIso.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return null;
  const future = new Date(Date.UTC(y, m - 1, 15));
  const diffMs = future.getTime() - now.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function approxPremium(underlyingPrice: number, strike: number, daysToExpiry: number | null, direction: 'call' | 'put'): number {
  const intrinsic = Math.max(0, direction === 'call' ? underlyingPrice - strike : strike - underlyingPrice);
  if (daysToExpiry === null || daysToExpiry <= 0) return Math.max(0.01, intrinsic);
  const ttmYears = daysToExpiry / 365;
  const distPct = Math.abs((underlyingPrice - strike) / underlyingPrice);
  const sigma = 0.30;
  const timeValue = underlyingPrice * sigma * Math.sqrt(ttmYears) * Math.exp(-2 * distPct);
  return Math.max(0.01, intrinsic + timeValue);
}

export function buildPayoffCompare({ underlyingPrice, suggestions, today = new Date() }: CompareInput): PayoffRow[] {
  if (!Number.isFinite(underlyingPrice) || underlyingPrice <= 0 || suggestions.length === 0) return [];

  // Heutiges Premium pro Schein (vor ratio-Teilung) als Baseline.
  const baseline: Record<string, number> = {};
  for (const s of suggestions) {
    const days = daysBetween(today, s.expiryIso);
    baseline[s.risk] = approxPremium(underlyingPrice, s.strike, days, s.direction);
  }

  return STEPS.map<PayoffRow>((step) => {
    const factor = 1 + step / 100;
    const underlyingScenario = underlyingPrice * factor;
    const schein: Record<string, number> = {};
    for (const s of suggestions) {
      const days = daysBetween(today, s.expiryIso);
      const scenarioPremium = approxPremium(underlyingScenario, s.strike, days, s.direction);
      const base = baseline[s.risk];
      schein[s.risk] = base > 0 ? ((scenarioPremium - base) / base) * 100 : 0;
    }
    return {
      underlyingDeltaPct: step,
      aktiePct: step,
      schein
    };
  });
}

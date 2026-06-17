// Time-Decay-Simulation pro Vorschlag: wenn der Basiswert die naechsten
// 30 / 60 / 90 Tage GENAU AUF STELLE bleibt, was passiert mit dem
// Schein-Wert? Theta ist der versteckte Killer — der User soll sehen,
// dass "nichts passiert" beim Underlying NICHT bedeutet, dass der
// Schein-Wert stabil bleibt.

import type { OptionsscheinSuggestion } from './suggest';

export interface TimeDecayRow {
  days: number;
  premium: number;                  // approx Premium pro Schein
  premiumDeltaPct: number;          // vs. heutiger Premium
}

const STEPS = [0, 30, 60, 90, 180];

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

export function buildTimeDecay(s: OptionsscheinSuggestion, today: Date = new Date()): TimeDecayRow[] {
  const totalDays = daysBetween(today, s.expiryIso);
  if (totalDays === null || totalDays <= 0) return [];
  const ratio = s.analysis.ratio > 0 ? s.analysis.ratio : 1;
  const todayPremium = approxPremium(s.analysis.underlyingPrice, s.strike, totalDays, s.direction) / ratio;

  return STEPS
    .filter((d) => d < totalDays)   // keine Simulation ueber den Verfall hinaus
    .map<TimeDecayRow>((d) => {
      const remaining = totalDays - d;
      const premium = approxPremium(s.analysis.underlyingPrice, s.strike, remaining, s.direction) / ratio;
      const premiumDeltaPct = todayPremium > 0 ? ((premium - todayPremium) / todayPremium) * 100 : 0;
      return { days: d, premium, premiumDeltaPct };
    });
}

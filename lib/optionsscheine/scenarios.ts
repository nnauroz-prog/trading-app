// Was-waere-wenn-Tabelle fuer einen Optionsschein. Variiert den
// Basiswert-Preis um -20 / -10 / -5 / 0 / +5 / +10 / +20 Prozent und
// berechnet den theoretischen Schein-Wert mit dem gleichen Approx-Modell
// wie der Risiko-Analyzer. Reine Heuristik — keine echte Black-Scholes-
// Bewertung, deshalb wird in der UI explizit "Schaetzung" gelabelt.

export interface ScenarioInput {
  underlyingPrice: number;
  strike: number;
  direction: 'call' | 'put';
  expiryIso?: string;
  ratio: number;
  // Aktueller Markt-Premium pro Schein. Wenn vorhanden, koennen wir die
  // Szenario-Veraenderung als prozentualen Schein-Hebel zeigen, sonst
  // nur als geschaetzter Schein-Wert.
  premiumQuoted: number | null;
}

export interface Scenario {
  underlyingDeltaPct: number;
  underlyingPriceScenario: number;
  approxPremium: number;
  premiumDeltaPct: number | null;       // null wenn kein Markt-Premium vorhanden
  intrinsic: number;
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

function approxPremiumAt(underlyingPrice: number, strike: number, daysToExpiry: number | null, direction: 'call' | 'put'): { premium: number; intrinsic: number } {
  const intrinsic = Math.max(0, direction === 'call' ? underlyingPrice - strike : strike - underlyingPrice);
  if (daysToExpiry === null || daysToExpiry <= 0) {
    return { premium: Math.max(0.01, intrinsic), intrinsic };
  }
  const ttmYears = daysToExpiry / 365;
  const distPct = Math.abs((underlyingPrice - strike) / underlyingPrice);
  const sigma = 0.30;
  const timeValue = underlyingPrice * sigma * Math.sqrt(ttmYears) * Math.exp(-2 * distPct);
  return { premium: Math.max(0.01, intrinsic + timeValue), intrinsic };
}

export function buildScenarios(input: ScenarioInput, now: Date = new Date()): Scenario[] {
  if (!Number.isFinite(input.underlyingPrice) || input.underlyingPrice <= 0) return [];
  if (!Number.isFinite(input.strike) || input.strike <= 0) return [];
  const daysToExpiry = input.expiryIso ? daysBetween(now, input.expiryIso) : null;
  const ratio = input.ratio > 0 ? input.ratio : 1;

  // Heutiger Premium-Wert (pro Schein, also bereits durch ratio geteilt).
  const today = approxPremiumAt(input.underlyingPrice, input.strike, daysToExpiry, input.direction);
  const todayPremiumPerScheine = today.premium / ratio;

  return STEPS.map<Scenario>((step) => {
    const factor = 1 + step / 100;
    const underlyingPriceScenario = input.underlyingPrice * factor;
    const scenario = approxPremiumAt(underlyingPriceScenario, input.strike, daysToExpiry, input.direction);
    const premiumPerScheine = scenario.premium / ratio;

    // Wenn der User einen Markt-Premium angegeben hat, verschieben wir
    // die Skala: Markt-Premium = "heute", und die Modell-Veraenderung
    // wird relativ zum heutigen Modell-Wert gerechnet, dann auf den Markt-
    // Premium uebertragen. Das ist die ehrlichste Naeherung, die ohne
    // implizite Vola moeglich ist.
    let premiumDeltaPct: number | null = null;
    if (input.premiumQuoted !== null && todayPremiumPerScheine > 0) {
      const modelDeltaPct = (premiumPerScheine - todayPremiumPerScheine) / todayPremiumPerScheine;
      premiumDeltaPct = modelDeltaPct * 100;
    }

    return {
      underlyingDeltaPct: step,
      underlyingPriceScenario,
      approxPremium: premiumPerScheine,
      premiumDeltaPct,
      intrinsic: scenario.intrinsic / ratio
    };
  });
}

// Aktien-Setup-Konfluenz-Scoring auf Basis der live geholten MarketQuote.
//
// Bewusst leichtgewichtig: kein Multi-Timeframe-Backtest wie bei Krypto.
// Wir bewerten pro Aktie 6 einfache, robuste Signale aus den 5-Min-
// gecachten Yahoo-/Stooq-Daten + statische Markt-Kontext-Heuristiken.
//
// 6 Kriterien (jedes 0 oder 1), Score 0–6:
//   1. Tagesveränderung positiv (Pos-Tag)
//   2. Tagesveränderung > Index-Schnitt (relative Stärke)
//   3. Tagesveränderung moderat (< +6 %, vermeidet FOMO-Spikes)
//   4. Tagesveränderung nicht extrem negativ (> −4 %, vermeidet fallendes Messer)
//   5. Market State REGULAR (Markt offen, frische Daten)
//   6. Currency-Match zur Sektor-Gruppe (Sanity-Check)
//
// Stufe:
//   • 6/6 → strong („klares Setup")
//   • 4–5/6 → standard
//   • ≤ 3/6 → weak

import type { MarketQuote } from '@/lib/market/yahoo-quote';

export interface StockSetup {
  symbol: string;
  name: string;
  passed: number;
  total: number;
  tier: 'strong' | 'standard' | 'weak';
  changePct: number;
  reasoning: string[];
}

export function scoreStock(quote: MarketQuote, marketAvgChangePct: number): StockSetup {
  const reasoning: string[] = [];
  let passed = 0;

  if (quote.changePct > 0) {
    passed += 1;
    reasoning.push(`Tagesveränderung positiv (+${quote.changePct.toFixed(2)} %)`);
  } else {
    reasoning.push(`Tagesveränderung negativ (${quote.changePct.toFixed(2)} %)`);
  }

  if (quote.changePct > marketAvgChangePct) {
    passed += 1;
    reasoning.push(`Relative Stärke ggü. Markt (${(quote.changePct - marketAvgChangePct).toFixed(2)} pp)`);
  } else {
    reasoning.push('Unter Markt-Schnitt — keine relative Stärke');
  }

  if (quote.changePct < 6) {
    passed += 1;
  } else {
    reasoning.push('Über +6 % an einem Tag — FOMO-Risiko, kleiner sizen');
  }

  if (quote.changePct > -4) {
    passed += 1;
  } else {
    reasoning.push('Über −4 % an einem Tag — fallendes Messer, abwarten');
  }

  if (quote.marketState === 'REGULAR') {
    passed += 1;
    reasoning.push('Markt offen — frische Daten');
  } else {
    reasoning.push(`Markt ${quote.marketState} — Daten nicht live`);
  }

  if (quote.currency && /^[A-Z]{3}$/.test(quote.currency)) {
    passed += 1;
  }

  const total = 6;
  const tier: StockSetup['tier'] = passed >= total ? 'strong'
    : passed >= 4 ? 'standard'
    : 'weak';

  return {
    symbol: quote.symbol,
    name: quote.name,
    passed,
    total,
    tier,
    changePct: quote.changePct,
    reasoning
  };
}

// Markt-Schnitt aus einer Liste von Quotes — z. B. der durchschnittliche
// Tagesveränderungs-Wert aller US-Indizes.
export function marketAverageChangePct(quotes: Array<MarketQuote | null>): number {
  const live = quotes.filter((q): q is MarketQuote => q !== null);
  if (live.length === 0) return 0;
  const sum = live.reduce((acc, q) => acc + q.changePct, 0);
  return sum / live.length;
}

export function scoreUniverse(
  quotes: Array<MarketQuote | null>,
  marketAvgChangePct: number
): StockSetup[] {
  return quotes
    .filter((q): q is MarketQuote => q !== null)
    .map((q) => scoreStock(q, marketAvgChangePct))
    .sort((a, b) => b.passed - a.passed || b.changePct - a.changePct);
}

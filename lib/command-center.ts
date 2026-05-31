export type MarketMode = 'risk-on' | 'neutral' | 'risk-off';
export type BestAssetClass = 'crypto' | 'stocks' | 'gold' | 'cash';
export type DailyDecision = 'aktiv_handeln' | 'nur_watchlist' | 'cash_schuetzen' | 'positionen_managen';

export interface CommandCenterInput {
  marketMood: MarketMode;
  cryptoBestScore: number;     // best opportunity-score in crypto today
  stocksAvailable: boolean;    // do we have any stock data at all?
  stocksBestScore: number | null;
  goldTrendOk: boolean;        // is gold in a defensive uptrend right now?
  openPositionsCount: number;
  positionsNeedingAttention: number;
  hasHighImpactEventWithin24h: boolean;
}

export interface CommandCenterReport {
  marketMode: MarketMode;
  bestAssetClass: BestAssetClass;
  decision: DailyDecision;
  decisionLabel: string;
  reason: string;
}

export function buildCommandCenter(input: CommandCenterInput): CommandCenterReport {
  const cryptoStrong = input.cryptoBestScore >= 75;
  const cryptoWatch = input.cryptoBestScore >= 60;
  const stocksStrong = (input.stocksBestScore ?? 0) >= 75;
  const hasPositions = input.openPositionsCount > 0;

  // Pick best asset class.
  let bestAssetClass: BestAssetClass;
  if (cryptoStrong && input.cryptoBestScore >= (input.stocksBestScore ?? 0)) bestAssetClass = 'crypto';
  else if (stocksStrong) bestAssetClass = 'stocks';
  else if (input.goldTrendOk && !cryptoWatch) bestAssetClass = 'gold';
  else bestAssetClass = 'cash';

  // Decision.
  let decision: DailyDecision;
  let decisionLabel: string;
  if (input.positionsNeedingAttention > 0) {
    decision = 'positionen_managen';
    decisionLabel = 'Bestehende Positionen managen';
  } else if (input.hasHighImpactEventWithin24h) {
    decision = 'cash_schuetzen';
    decisionLabel = 'Cash schützen';
  } else if (cryptoStrong || stocksStrong) {
    decision = 'aktiv_handeln';
    decisionLabel = 'Selektiv aktiv handeln';
  } else if (cryptoWatch) {
    decision = 'nur_watchlist';
    decisionLabel = 'Nur Watchlist pflegen';
  } else if (input.marketMood === 'risk-off' || bestAssetClass === 'cash') {
    decision = 'cash_schuetzen';
    decisionLabel = 'Cash schützen';
  } else if (hasPositions) {
    decision = 'positionen_managen';
    decisionLabel = 'Bestehende Positionen managen';
  } else {
    decision = 'nur_watchlist';
    decisionLabel = 'Nur Watchlist pflegen';
  }

  // Plain-language reason.
  const parts: string[] = [];
  if (input.marketMood === 'risk-on') parts.push('Markt-Stimmung breit grün');
  else if (input.marketMood === 'risk-off') parts.push('Markt-Stimmung breit rot');
  else parts.push('Markt-Stimmung gemischt');

  if (cryptoStrong) parts.push(`Krypto zeigt mindestens ein Setup mit Score ${input.cryptoBestScore}`);
  else if (cryptoWatch) parts.push(`Krypto hat einzelne Watchlist-Chancen (Score ${input.cryptoBestScore})`);
  else parts.push('Krypto liefert heute keine saubere Chance');

  if (stocksStrong) parts.push(`Aktien zeigen ein Setup mit Score ${input.stocksBestScore}`);
  else if (!input.stocksAvailable) parts.push('Aktien-Daten nicht angebunden');

  if (input.goldTrendOk) parts.push('Gold bleibt defensiv stabil');

  if (input.hasHighImpactEventWithin24h) parts.push('Makro-Termin in den nächsten 24 Stunden — Volatilität droht');
  if (input.positionsNeedingAttention > 0) parts.push(`${input.positionsNeedingAttention} bestehende Position(en) brauchen Aufmerksamkeit`);

  const reason = parts.join('. ') + '.';

  return {
    marketMode: input.marketMood,
    bestAssetClass,
    decision,
    decisionLabel,
    reason
  };
}

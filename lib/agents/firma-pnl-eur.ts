// EUR-Projektion einer FirmaPnlSummary. Nimmt den abstrakten Prozent-Wert
// pro Trade und uebersetzt ihn in konkretes investiertes Kapital + aktuellen
// Wert + Gewinn in Euro. Gleich-gewichtetes Modell: pro BUY wird derselbe
// Betrag „investiert", unabhaengig vom Sizing-Modell der jeweiligen Firma.
//
// Bewusst simpel: kein Compounding, kein Spread, keine Steuern. Es geht
// darum, die Groessen-Ordnung sichtbar zu machen — nicht eine
// Performance-Attribution zu simulieren.

import type { FirmaPnlSummary } from '@/lib/agents/firma-pnl';

export interface FirmaEurProjection {
  // Gesamt-Kapital, das fuer alle bewertbaren BUYs „investiert" worden waere.
  investedEur: number;
  // Profit-/Verlust-Summe in Euro: amount × sum(pnlPct/100) ueber alle
  // bewertbaren Trades.
  profitEur: number;
  // Aktueller Wert dieser Position-Reihe in Euro: investiert + profit.
  currentWorthEur: number;
  // Profit/Verlust als Prozent der Investition (entspricht avgPnlPct × tradesEvaluable / tradesEvaluable
  // = totalPnlPct / tradesEvaluable). Wir liefern's separat, weil totalPnlPct
  // schon in der Summary steht.
  profitPct: number;
  // Anzahl der Trades, die in die Projektion eingegangen sind
  // (resolved + open, alles mit pnlPct !== null).
  evaluableTrades: number;
}

export function projectFirmaPnlEur(summary: FirmaPnlSummary, amountPerBuyEur: number): FirmaEurProjection {
  const safeAmount = Number.isFinite(amountPerBuyEur) && amountPerBuyEur > 0 ? amountPerBuyEur : 0;
  // evaluable: HIT_TP + HIT_SL + OPEN (alles mit pnlPct != null).
  // Wir koennen das aus den Summary-Feldern rekonstruieren statt durch trades
  // zu iterieren — robust, auch wenn trades[] auf 20 begrenzt ist.
  const evaluableTrades = summary.wins + summary.losses + summary.openTrades;
  const investedEur = Math.round(safeAmount * evaluableTrades * 100) / 100;
  // totalPnlPct ist die SUMME der prozent-Gewinne ueber alle Trades. Bei
  // gleich-gewichtetem Sizing entspricht das totalPnlPct/100 × amount.
  const profitEur = Math.round(safeAmount * (summary.totalPnlPct / 100) * 100) / 100;
  const currentWorthEur = Math.round((investedEur + profitEur) * 100) / 100;
  const profitPct = evaluableTrades > 0 && investedEur > 0
    ? Math.round((profitEur / investedEur) * 1000) / 10
    : 0;
  return { investedEur, profitEur, currentWorthEur, profitPct, evaluableTrades };
}

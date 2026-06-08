// Echtes virtuelles P&L pro Firma. Statt nur „Richtung richtig erraten?" zu
// messen, vergleicht diese Funktion JEDEN historischen BUY der Firma gegen den
// aktuellen Marktpreis — und liefert konkrete Prozent-Gewinne/-Verluste.
//
// Drei Outcome-Kategorien (vereinfachtes „Hold-to-Now"-Modell):
//   - HIT_TP: aktueller Preis ≥ TP1 → wahrscheinlich Take-Profit getroffen.
//             Annahme: Pos. ist zu TP1 ausgestiegen, realisierter Gewinn.
//   - HIT_SL: aktueller Preis ≤ SL → wahrscheinlich Stop-Loss getroffen.
//             Annahme: Pos. ist zu SL ausgestoppt, realisierter Verlust.
//   - OPEN:   aktueller Preis zwischen SL und TP1 → schwebende, unrealisierte
//             Position. Zeigt aktuellen schwebenden P&L (current vs entry).
//
// Per-Firma-Aggregat: realisierte + schwebende Summen, Trefferquote der
// realisierten Trades, gewichteter Durchschnitt.
//
// Reine Funktion, keine I/O, voll testbar. Kein TP2-/Time-Stop-Modell — wir
// halten es ehrlich-einfach, ohne intraday-Kerzen nachzuladen.

import type { FirmaDecision } from '@/lib/firma-memory';
import type { PersonaId } from '@/lib/agents/personas';

export type PnlOutcome = 'HIT_TP' | 'HIT_SL' | 'OPEN' | 'NO_DATA';

export interface FirmaTradePnl {
  date: string;
  coin: string;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  currentPrice: number | null;
  outcome: PnlOutcome;
  // Realisiert (bei HIT_TP/HIT_SL): Gewinn/Verlust in % der Position.
  // Schwebend (bei OPEN): aktueller, unrealisierter Stand.
  pnlPct: number | null;
}

export interface FirmaPnlSummary {
  firma: PersonaId;
  firmaName: string;
  totalBuys: number;
  resolvedTrades: number; // HIT_TP + HIT_SL
  wins: number;            // HIT_TP
  losses: number;          // HIT_SL
  openTrades: number;      // OPEN
  resolvedHitRatePct: number | null; // wins / resolvedTrades
  // Summe der realisierten + schwebenden P&L-Prozente. Gleichgewichtet
  // (kein Position-Sizing-Modell). Liefert „Wenn ich pro BUY 1 Einheit
  // gleich gewichtet gekauft haette, waere ich nach allen Trades bei X %".
  totalPnlPct: number;
  // Durchschnitt pro Trade.
  avgPnlPct: number;
  // Bestes + schlechtestes Einzel-Outcome.
  bestTradePct: number | null;
  worstTradePct: number | null;
  // Kumulative Equity-Kurve aus ALLEN bewerteten Trades, chronologisch
  // (aeltester zuerst). Jeder Punkt ist die laufende Summe der gleich-
  // gewichteten P&L-Prozente bis zu diesem Trade. Startpunkt 0.
  // So sieht der User die Trajektorie: wird die Firma ueber die Zeit besser?
  equityCurve: number[];
  // Groesster Peak-to-Trough-Einbruch der Equity-Kurve (≤ 0). Misst, wie tief
  // der schlimmste zwischenzeitliche Drawdown war.
  maxDrawdownPct: number;
  // Letzte 20 Trades fuer Detail-Anzeige (neueste zuerst).
  trades: FirmaTradePnl[];
}

// Liefert null wenn das Decision-Objekt keine validen Levels hat. Sonst eine
// vollstaendige Trade-Beurteilung.
export function evaluateTradePnl(d: FirmaDecision, currentPrice: number | null): FirmaTradePnl | null {
  if (d.verdict !== 'BUY') return null;
  if (d.entry === null || d.stopLoss === null || d.takeProfit1 === null || !d.coin) return null;
  if (currentPrice === null) {
    return {
      date: d.date, coin: d.coin,
      entry: d.entry, stopLoss: d.stopLoss, takeProfit1: d.takeProfit1,
      currentPrice: null, outcome: 'NO_DATA', pnlPct: null
    };
  }
  let outcome: PnlOutcome;
  let pnlPct: number;
  if (currentPrice >= d.takeProfit1) {
    outcome = 'HIT_TP';
    pnlPct = ((d.takeProfit1 - d.entry) / d.entry) * 100;
  } else if (currentPrice <= d.stopLoss) {
    outcome = 'HIT_SL';
    pnlPct = ((d.stopLoss - d.entry) / d.entry) * 100;
  } else {
    outcome = 'OPEN';
    pnlPct = ((currentPrice - d.entry) / d.entry) * 100;
  }
  return {
    date: d.date, coin: d.coin,
    entry: d.entry, stopLoss: d.stopLoss, takeProfit1: d.takeProfit1,
    currentPrice, outcome, pnlPct
  };
}

export function computeFirmaPnl(
  log: FirmaDecision[],
  currentPriceFor: (symbol: string) => number | null
): FirmaPnlSummary[] {
  const byFirma = new Map<PersonaId, FirmaDecision[]>();
  for (const d of log) {
    if (!byFirma.has(d.firma)) byFirma.set(d.firma, []);
    byFirma.get(d.firma)!.push(d);
  }
  const out: FirmaPnlSummary[] = [];
  for (const [firma, entries] of byFirma.entries()) {
    const buys = entries.filter((e) => e.verdict === 'BUY' && e.coin && e.entry !== null && e.stopLoss !== null && e.takeProfit1 !== null);
    const trades: FirmaTradePnl[] = [];
    for (const b of buys) {
      const t = evaluateTradePnl(b, currentPriceFor(b.coin!));
      if (t) trades.push(t);
    }
    trades.sort((a, b) => b.date.localeCompare(a.date));
    const evaluatable = trades.filter((t) => t.pnlPct !== null);
    const resolved = evaluatable.filter((t) => t.outcome === 'HIT_TP' || t.outcome === 'HIT_SL');
    const wins = resolved.filter((t) => t.outcome === 'HIT_TP').length;
    const losses = resolved.filter((t) => t.outcome === 'HIT_SL').length;
    const openTrades = evaluatable.filter((t) => t.outcome === 'OPEN').length;
    const totalPnlPct = evaluatable.reduce((s, t) => s + (t.pnlPct ?? 0), 0);
    const avgPnlPct = evaluatable.length > 0 ? totalPnlPct / evaluatable.length : 0;
    const pcts = evaluatable.map((t) => t.pnlPct as number);
    const bestTradePct = pcts.length > 0 ? Math.max(...pcts) : null;
    const worstTradePct = pcts.length > 0 ? Math.min(...pcts) : null;

    // Equity-Kurve: chronologisch (aeltester zuerst), kumulative Summe.
    // Startpunkt 0, danach ein Punkt pro bewertetem Trade.
    const chrono = [...evaluatable].sort((a, b) => a.date.localeCompare(b.date));
    const equityCurve: number[] = [0];
    let running = 0;
    let peak = 0;
    let maxDrawdownPct = 0;
    for (const t of chrono) {
      running += t.pnlPct ?? 0;
      equityCurve.push(Math.round(running * 10) / 10);
      if (running > peak) peak = running;
      const dd = running - peak;
      if (dd < maxDrawdownPct) maxDrawdownPct = dd;
    }

    out.push({
      firma,
      firmaName: entries[0]?.firmaName ?? firma,
      totalBuys: buys.length,
      resolvedTrades: resolved.length,
      wins,
      losses,
      openTrades,
      resolvedHitRatePct: resolved.length > 0 ? Math.round((wins / resolved.length) * 100) : null,
      totalPnlPct: Math.round(totalPnlPct * 10) / 10,
      avgPnlPct: Math.round(avgPnlPct * 100) / 100,
      bestTradePct: bestTradePct !== null ? Math.round(bestTradePct * 10) / 10 : null,
      worstTradePct: worstTradePct !== null ? Math.round(worstTradePct * 10) / 10 : null,
      equityCurve,
      maxDrawdownPct: Math.round(maxDrawdownPct * 10) / 10,
      trades: trades.slice(0, 20)
    });
  }
  const order: PersonaId[] = ['conservative', 'balanced', 'aggressive'];
  out.sort((a, b) => order.indexOf(a.firma) - order.indexOf(b.firma));
  return out;
}

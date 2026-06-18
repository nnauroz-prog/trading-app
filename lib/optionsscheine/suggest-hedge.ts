// Schutz-Put fuer eine Long-Aktien-Position. Wird auf der Aktien-/
// Krypto-Detail-Seite zusaetzlich zu den offensiven Call-Vorschlaegen
// angezeigt — als Antwort auf "wenn ich die Aktie KAUFE, wie schuetze
// ich mich gegen einen Crash?"
//
// Im Gegensatz zur Suggest-Logik (drei Risiko-Stufen) ist ein Hedge
// fokussiert: EINE sinnvolle Standard-Versicherung + die Kennzahlen,
// damit der User entscheiden kann, ob sie sich lohnt.

import { analyzeOptionsscheinInput, type OptionsscheinAnalysis } from './analyze';

export interface HedgeSuggestion {
  // Was die Versicherung deckt
  protectionStartPct: number;     // Versicherung greift bei dieser Underlying-Bewegung (z.B. -10)
  // Vorschlag-Parameter
  strike: number;
  expiryIso: string;
  monthsToExpiry: number;
  // Schein-Daten
  analysis: OptionsscheinAnalysis;
  // Kosten-Realitaet
  premiumPerScheinepreis: number;  // pro Schein
  // Was muesste der User insgesamt zahlen, um seine bestehende
  // Long-Position (1 Stueck Aktie) zu hedgen? Bei ratio 10:1 muss man
  // 10 Scheine kaufen, damit der Schutz auf ein "Aktien-Aequivalent"
  // greift.
  premiumPerAktienAequivalent: number;
  // In Prozent der Aktien-Position
  costPctOfPosition: number;
  // Klartext
  rationale: string;
}

interface HedgeInput {
  underlyingName: string;
  underlyingPrice: number;
  assetClass?: 'aktie' | 'krypto';
  // Wie tief schuetzen? Default: -10 %.
  stopLossPct?: number;
  // Laufzeit in Monaten. Default: 6.
  monthsToExpiry?: number;
  // Annualisierte Vola (z.B. aus realizedVolStock). Default 0.30.
  sigma?: number;
  today?: Date;
}

function roundStrike(strike: number, assetClass: 'aktie' | 'krypto'): number {
  if (!Number.isFinite(strike) || strike <= 0) return strike;
  if (assetClass === 'krypto') {
    if (strike >= 10000) return Math.round(strike / 1000) * 1000;
    if (strike >= 1000) return Math.round(strike / 100) * 100;
    if (strike >= 100) return Math.round(strike / 10) * 10;
    return Math.round(strike);
  }
  if (strike >= 1000) return Math.round(strike / 10) * 10;
  if (strike >= 100) return Math.round(strike / 5) * 5;
  if (strike >= 20) return Math.round(strike);
  return Math.round(strike * 2) / 2;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  d.setUTCDate(15);
  return d;
}

export function suggestHedge(input: HedgeInput): HedgeSuggestion | null {
  if (!Number.isFinite(input.underlyingPrice) || input.underlyingPrice <= 0) return null;
  if (!input.underlyingName.trim()) return null;

  const stopLossPct = input.stopLossPct ?? -10;   // -10 % Default
  if (stopLossPct >= 0) return null;               // Hedge nur unter Kurs sinnvoll

  const assetClass = input.assetClass ?? 'aktie';
  const monthsToExpiry = input.monthsToExpiry ?? 6;
  const today = input.today ?? new Date();

  // Put-Strike entspricht dem Stop-Loss-Level: bei Bewegung unter den
  // Strike beginnt die Versicherung den Verlust 1:1 zu kompensieren.
  const rawStrike = input.underlyingPrice * (1 + stopLossPct / 100);
  const strike = roundStrike(rawStrike, assetClass);
  const expiryDate = addMonths(today, monthsToExpiry);
  const expiryIso = expiryDate.toISOString().slice(0, 10);
  const ratio = assetClass === 'krypto' ? 100 : 10;

  const analysis = analyzeOptionsscheinInput({
    underlyingName: input.underlyingName,
    underlyingPrice: input.underlyingPrice,
    strike,
    direction: 'put',
    expiryIso,
    ratio,
    sigma: input.sigma
  });

  if (!analysis || analysis.approxBreakeven === null) return null;

  // approxBreakeven ist der Underlying-Preis, bei dem der Schein zu
  // Null wird. Bei Put: strike - premium. Das wollen wir nicht — wir
  // wollen das aktuelle Premium pro Schein.
  // Hack: wir nutzen die Differenz Underlying - Breakeven = Premium
  // (bei OTM-Put) bzw. (strike - underlying) + premium = intrinsic + tv.
  // Sauber: wir nehmen den approximierten Premium aus der Analyse.
  // estimatedLeverage = delta * underlying / premium => premium = delta * underlying / leverage
  const premiumPerScheinepreisRaw = analysis.estimatedDelta !== null && analysis.estimatedLeverage !== null && analysis.estimatedLeverage > 0
    ? (Math.abs(analysis.estimatedDelta) * input.underlyingPrice) / analysis.estimatedLeverage
    : 0;
  const premiumPerScheinepreis = premiumPerScheinepreisRaw / ratio;
  const premiumPerAktienAequivalent = premiumPerScheinepreis * ratio;
  const costPctOfPosition = (premiumPerAktienAequivalent / input.underlyingPrice) * 100;

  const rationale = `Put-Schein mit Strike ${strike} ${assetClass === 'krypto' ? 'USD' : 'EUR'} schuetzt deine Long-Position ab einer Underlying-Bewegung von ${stopLossPct} %. ` +
    `Kostet ca. ${costPctOfPosition.toFixed(1)} % des Aktien-Werts, gilt bis ${expiryIso}. ` +
    `Realistische Erwartung: Versicherung verfaellt wertlos, wenn die Aktie bis Verfall ueber dem Strike bleibt — das ist der Normalfall und auch okay.`;

  return {
    protectionStartPct: stopLossPct,
    strike,
    expiryIso,
    monthsToExpiry,
    analysis,
    premiumPerScheinepreis,
    premiumPerAktienAequivalent,
    costPctOfPosition,
    rationale
  };
}

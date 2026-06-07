// Gold-Holding-Rechner. Pure Funktion — keine I/O, kein localStorage.
// Eingabe: Position-Daten + Legierung + aktueller/historischer Preis + Markt-Kontext.
// Ausgabe: vollständige Performance-Auswertung + Verkaufs-Verdict.
//
// Goldpreise werden konsistent in USD pro Feinunze (Troy Ounce) gehandelt.
// 1 Feinunze = 31.1034768 Gramm.

export const GRAMS_PER_TROY_OUNCE = 31.1034768;

export type AmountUnit = 'gram' | 'ounce' | 'kilogram';

export type PurchasePriceMode =
  | 'auto'           // automatisch aus historischem Goldpreis am Kaufdatum
  | 'total'          // Gesamtsumme in USD
  | 'per-gram'       // USD pro Bruttogramm
  | 'per-ounce';     // USD pro Feinunze

export type Verdict = 'NACHKAUFEN' | 'HALTEN' | 'VERKAUFEN' | 'BEOBACHTEN';

export interface MarketContext {
  ma50: number | null;
  ma200: number | null;
  rsi: number | null;            // 0..100
  atr: number | null;             // optional, USD pro Unze
  performance30d: number | null;  // %
  performance90d: number | null;  // %
  fiftyTwoWeekPosition: number | null; // 0..100 (Position innerhalb der 52W-Range)
  priceAboveMa50: boolean | null;
  priceAboveMa200: boolean | null;
  ma50AboveMa200: boolean | null;
}

export interface GoldHoldingInput {
  purchaseDate: string;          // YYYY-MM-DD
  amount: number;
  amountUnit: AmountUnit;
  purityPromille: number;        // z.B. 999, 750, 585
  purchasePriceMode: PurchasePriceMode;
  // Bei mode='auto' ignoriert; sonst Pflichtwert.
  purchasePrice?: number;
  fees?: number;                 // USD, einmalig
  sellSpreadPct?: number;        // %, abzuziehen vom aktuellen Marktwert
  // Aktueller Spot-Preis (USD/oz).
  currentGoldPricePerOz: number | null;
  // Historischer Spot-Preis am Kaufdatum (USD/oz). Falls null + mode='auto',
  // wird ein Warnings-Eintrag erzeugt und das Ergebnis als unvollständig markiert.
  historicalGoldPricePerOz: number | null;
  currentDate: string;           // YYYY-MM-DD
  marketContext: MarketContext;
}

export interface GoldHoldingResult {
  // === Mengen-Aufschlüsselung ===
  grossAmountGrams: number;
  pureGoldGrams: number;
  pureGoldOunces: number;

  // === Einstand ===
  // Effektiver Kaufpreis je Feinunze (USD/oz).
  purchasePricePerOz: number | null;
  // Gesamtkaufwert inkl. Gebühren.
  purchaseValue: number | null;

  // === Aktueller Wert ===
  currentValue: number | null;
  estimatedSellValueAfterSpread: number | null;

  // === Performance ===
  absolutePnL: number | null;
  percentPnL: number | null;
  pnlAfterSpread: number | null;
  annualizedReturn: number | null; // %, compound
  holdingDays: number;
  breakEvenPricePerOz: number | null;

  // === Entscheidung ===
  verdict: Verdict;
  verdictReasons: string[];
  warnings: string[];

  // === Roh-Metriken für die UI ===
  hasCompleteData: boolean;
}

// === Unit-Konvertierung ===

export function toGrams(amount: number, unit: AmountUnit): number {
  if (unit === 'gram') return amount;
  if (unit === 'ounce') return amount * GRAMS_PER_TROY_OUNCE;
  if (unit === 'kilogram') return amount * 1000;
  return amount;
}

export function pureGoldGramsFor(grossGrams: number, purityPromille: number): number {
  return (grossGrams * purityPromille) / 1000;
}

export function gramsToOunces(grams: number): number {
  return grams / GRAMS_PER_TROY_OUNCE;
}

// === Kaufpreis-Auflösung ===

interface ResolvedPurchase {
  purchasePricePerOz: number | null;
  purchaseValue: number | null;
  warnings: string[];
}

function resolvePurchasePrice(input: GoldHoldingInput, pureGoldOunces: number, grossGrams: number): ResolvedPurchase {
  const warnings: string[] = [];
  let purchasePricePerOz: number | null = null;
  let purchaseValue: number | null = null;

  if (input.purchasePriceMode === 'auto') {
    if (input.historicalGoldPricePerOz !== null && input.historicalGoldPricePerOz > 0) {
      purchasePricePerOz = input.historicalGoldPricePerOz;
      purchaseValue = purchasePricePerOz * pureGoldOunces;
    } else {
      warnings.push('Für dieses Kaufdatum ist kein historischer Goldpreis verfügbar.');
    }
  } else if (input.purchasePriceMode === 'total') {
    const total = input.purchasePrice ?? 0;
    if (total > 0 && pureGoldOunces > 0) {
      purchaseValue = total;
      purchasePricePerOz = total / pureGoldOunces;
    } else {
      warnings.push('Kaufpreis (gesamt) fehlt oder ist null.');
    }
  } else if (input.purchasePriceMode === 'per-gram') {
    const perGram = input.purchasePrice ?? 0;
    if (perGram > 0 && grossGrams > 0) {
      purchaseValue = perGram * grossGrams;
      // Effektiver Preis pro Feinunze leitet sich aus Gesamtwert/Feingoldmenge ab.
      if (pureGoldOunces > 0) {
        purchasePricePerOz = purchaseValue / pureGoldOunces;
      }
    } else {
      warnings.push('Kaufpreis pro Gramm fehlt oder ist null.');
    }
  } else if (input.purchasePriceMode === 'per-ounce') {
    const perOz = input.purchasePrice ?? 0;
    if (perOz > 0 && pureGoldOunces > 0) {
      purchasePricePerOz = perOz;
      purchaseValue = perOz * pureGoldOunces;
    } else {
      warnings.push('Kaufpreis pro Unze fehlt oder ist null.');
    }
  }

  // Gebühren auf den Einstand draufrechnen, falls Wert existiert.
  if (purchaseValue !== null && input.fees !== undefined && input.fees > 0) {
    purchaseValue += input.fees;
  }

  return { purchasePricePerOz, purchaseValue, warnings };
}

// === Verdict-Engine ===

function computeVerdict(
  ctx: MarketContext,
  percentPnL: number | null
): { verdict: Verdict; reasons: string[] } {
  const reasons: string[] = [];
  const above50 = ctx.priceAboveMa50 ?? null;
  const above200 = ctx.priceAboveMa200 ?? null;
  const stack = ctx.ma50AboveMa200 ?? null;
  const rsi = ctx.rsi;
  const p30 = ctx.performance30d;
  const p90 = ctx.performance90d;
  const pos52 = ctx.fiftyTwoWeekPosition;
  const inProfit = percentPnL !== null && percentPnL > 0;
  const strongProfit = percentPnL !== null && percentPnL >= 20;

  // Wenn essenzielle Daten fehlen → BEOBACHTEN.
  if (above50 === null || above200 === null || stack === null) {
    reasons.push('Datenlage zur Markt-Struktur ist unvollständig — Entscheidung später wiederholen.');
    return { verdict: 'BEOBACHTEN', reasons };
  }

  // VERKAUFEN: starke Überhitzung bei klarem Gewinn.
  if (strongProfit && rsi !== null && rsi > 70 && pos52 !== null && pos52 > 90) {
    reasons.push(`Du bist im Gewinn (${percentPnL?.toFixed(1)} %), aber der Markt zeigt deutliche Überhitzung (RSI ${rsi.toFixed(0)}, 52W-Position ${pos52.toFixed(0)} %).`);
    reasons.push('Teil-Verkauf oder Gewinnmitnahme ist eine valide Reaktion.');
    reasons.push('Verkauf nach Spread prüfen — der Spread reduziert deinen Netto-Erlös.');
    return { verdict: 'VERKAUFEN', reasons };
  }

  // VERKAUFEN: struktureller Bruch — Preis unter MA50 + MA200, MA50 unter MA200, Momentum schwach.
  if (!above50 && !above200 && !stack) {
    if ((p30 ?? 0) < 0 && (p90 ?? 0) < 0) {
      reasons.push('Preis liegt unter MA50 UND unter MA200 — Trend ist gebrochen.');
      reasons.push('MA50 unter MA200 — der mittelfristige Trend folgt jetzt dem langfristigen nach unten.');
      reasons.push(`Momentum schwach: 30 Tage ${p30?.toFixed(1) ?? '—'} %, 90 Tage ${p90?.toFixed(1) ?? '—'} %.`);
      return { verdict: 'VERKAUFEN', reasons };
    }
  }

  // NACHKAUFEN: klares Aufwärts-Setup, kein Überhitzungs-Signal.
  if (above200 && stack && rsi !== null && rsi >= 35 && rsi <= 65 && pos52 !== null && pos52 <= 90 && (p30 ?? 0) <= 12) {
    if (above50 || (ctx.ma50 !== null && ctx.ma200 !== null && ctx.ma50 > 0)) {
      reasons.push('Preis über MA200, MA50 über MA200 — der langfristige Aufwärtstrend ist intakt.');
      reasons.push(`RSI ${rsi.toFixed(0)} in gesunder Range, 52W-Position ${pos52.toFixed(0)} % (kein Allzeit-Hoch).`);
      reasons.push('30-Tage-Performance noch nicht überhitzt — Nachkauf nur mit klar begrenzter Position.');
      return { verdict: 'NACHKAUFEN', reasons };
    }
  }

  // BEOBACHTEN: gemischte Signale (zuerst checken, damit HALTEN nicht zu greift).
  // Klassisches widersprüchliches Bild: Preis über MA200, aber MA50 unter MA200
  // (Death-Cross-Setup) ODER Preis liegt zwischen MA50 und MA200.
  const mixedSignals = (stack === false && above200 === true) || (above50 !== above200);
  if (mixedSignals) {
    reasons.push('Preis-Position zwischen MA50 und MA200 — Signale widersprüchlich.');
    if (p30 !== null) reasons.push(`30-Tage-Performance ${p30.toFixed(1)} %.`);
    reasons.push('Keine klare Entscheidung — Markt erst stabilisieren lassen.');
    return { verdict: 'BEOBACHTEN', reasons };
  }

  // HALTEN: langfristiger Trend intakt, kein klares Verkaufssignal.
  if (above200 && (rsi === null || (rsi >= 25 && rsi <= 80))) {
    reasons.push('Preis über MA200 — der langfristige Trend ist intakt.');
    if (rsi !== null) reasons.push(`RSI ${rsi.toFixed(0)} im neutralen bis erhöhten Bereich — kein klares Verkaufssignal.`);
    if (inProfit) reasons.push(`Du bist im Gewinn (${percentPnL?.toFixed(1)} %). Der Markt spricht eher für Halten.`);
    else reasons.push('Position bleibt strukturell intakt.');
    return { verdict: 'HALTEN', reasons };
  }

  // Fallback: BEOBACHTEN.
  reasons.push('Signale nicht eindeutig genug für eine klare Aktion.');
  return { verdict: 'BEOBACHTEN', reasons };
}

// === Warn-Badges ===

function computeWarnings(ctx: MarketContext, sellSpreadPct: number | undefined, warningsAlready: string[]): string[] {
  const out: string[] = [];
  if (ctx.rsi !== null && ctx.rsi > 70) out.push('Überkauft (RSI über 70)');
  if (ctx.priceAboveMa50 === false) out.push('Unter 50-Tage-Linie');
  if (ctx.priceAboveMa200 === false) out.push('Unter 200-Tage-Linie');
  if (ctx.ma50AboveMa200 === false) out.push('Langfristiger Trend gebrochen (MA50 unter MA200)');
  if (sellSpreadPct !== undefined && sellSpreadPct >= 3) out.push('Verkauf nach Spread prüfen');
  for (const w of warningsAlready) {
    if (w.includes('historischer Goldpreis')) out.push('Historische Daten unvollständig');
  }
  out.push('Steuerstatus prüfen');
  return Array.from(new Set(out));
}

// === Hauptfunktion ===

export function calculateGoldHoldingPerformance(input: GoldHoldingInput): GoldHoldingResult {
  // === Mengen-Aufschlüsselung ===
  const grossAmountGrams = toGrams(input.amount, input.amountUnit);
  const pureGoldGrams = pureGoldGramsFor(grossAmountGrams, input.purityPromille);
  const pureGoldOunces = gramsToOunces(pureGoldGrams);

  // === Einstand ===
  const resolved = resolvePurchasePrice(input, pureGoldOunces, grossAmountGrams);
  const { purchasePricePerOz, purchaseValue } = resolved;
  const allWarnings = [...resolved.warnings];

  // === Aktueller Wert ===
  let currentValue: number | null = null;
  let estimatedSellValueAfterSpread: number | null = null;
  if (input.currentGoldPricePerOz !== null && input.currentGoldPricePerOz > 0 && pureGoldOunces > 0) {
    currentValue = input.currentGoldPricePerOz * pureGoldOunces;
    const spreadPct = input.sellSpreadPct ?? 0;
    if (spreadPct < 0) {
      allWarnings.push('Negativer Spread eingegeben — ignoriert.');
      estimatedSellValueAfterSpread = currentValue;
    } else if (spreadPct === 0) {
      estimatedSellValueAfterSpread = currentValue;
    } else {
      estimatedSellValueAfterSpread = currentValue * (1 - spreadPct / 100);
    }
  } else {
    allWarnings.push('Aktueller Goldpreis nicht verfügbar.');
  }

  // === Performance ===
  let absolutePnL: number | null = null;
  let percentPnL: number | null = null;
  let pnlAfterSpread: number | null = null;
  let annualizedReturn: number | null = null;
  let breakEvenPricePerOz: number | null = null;

  if (purchaseValue !== null && currentValue !== null) {
    absolutePnL = currentValue - purchaseValue;
    if (purchaseValue > 0) {
      percentPnL = (absolutePnL / purchaseValue) * 100;
    }
    if (estimatedSellValueAfterSpread !== null) {
      pnlAfterSpread = estimatedSellValueAfterSpread - purchaseValue;
    }
  }

  // Break-Even: welcher Goldpreis je Unze deckt den Einstandswert exakt?
  // Bei Einstandswert / Unzen — Gebühren sind bereits im Einstand enthalten.
  if (purchaseValue !== null && pureGoldOunces > 0) {
    breakEvenPricePerOz = purchaseValue / pureGoldOunces;
  }

  // Haltedauer + annualisierte Rendite.
  const purchaseMs = new Date(`${input.purchaseDate}T00:00:00`).getTime();
  const currentMs = new Date(`${input.currentDate}T00:00:00`).getTime();
  let holdingDays = 0;
  if (!Number.isNaN(purchaseMs) && !Number.isNaN(currentMs) && currentMs >= purchaseMs) {
    holdingDays = Math.floor((currentMs - purchaseMs) / (24 * 60 * 60 * 1000));
  }

  if (percentPnL !== null && holdingDays > 0) {
    const r = percentPnL / 100;
    // (1 + r)^(365/days) - 1 = compound annualized return.
    // Bei r <= -1 würde die Basis negativ. Wir klammern bei r > -1.
    if (1 + r > 0) {
      annualizedReturn = (Math.pow(1 + r, 365 / holdingDays) - 1) * 100;
    } else {
      annualizedReturn = -100;
    }
  }

  // === Verdict ===
  const { verdict, reasons } = computeVerdict(input.marketContext, percentPnL);

  // === Warn-Badges ===
  const warnings = computeWarnings(input.marketContext, input.sellSpreadPct, allWarnings);

  return {
    grossAmountGrams,
    pureGoldGrams,
    pureGoldOunces,
    purchasePricePerOz,
    purchaseValue,
    currentValue,
    estimatedSellValueAfterSpread,
    absolutePnL,
    percentPnL,
    pnlAfterSpread,
    annualizedReturn,
    holdingDays,
    breakEvenPricePerOz,
    verdict,
    verdictReasons: reasons,
    warnings,
    hasCompleteData: purchaseValue !== null && currentValue !== null
  };
}

// === Legierungs-Liste (für die UI) ===

export const ALLOY_OPTIONS = [
  { label: '999 Feingold / 24 Karat', promille: 999 },
  { label: '986 Dukatengold', promille: 986 },
  { label: '916 / 22 Karat', promille: 916 },
  { label: '900 Münzgold', promille: 900 },
  { label: '750 / 18 Karat', promille: 750 },
  { label: '585 / 14 Karat', promille: 585 },
  { label: '375 / 9 Karat', promille: 375 },
  { label: '333 / 8 Karat', promille: 333 }
] as const;

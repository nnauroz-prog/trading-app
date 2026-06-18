// Realized Volatility aus historischen Tages-/Kerzen-Daten. Wird
// genutzt, um die Standard-Vola-Annahme von 30 % im
// Optionsschein-Modell durch die echte Marktrealitaet des konkreten
// Basiswerts zu ersetzen.
//
// Verfahren: annualisiert die Standardabweichung der Log-Returns ueber
// das Sample. Default-Sample 60 Handelstage (~12 Wochen). Liefert null,
// wenn nicht genug Daten oder Daten degeneriert sind.

export interface VolatilitySample {
  // Tages-Schlusskurse, chronologisch alt -> neu.
  closes: number[];
  // Wieviele der juengsten Closes verwenden. Default 60.
  windowDays?: number;
  // Trading-Tage pro Jahr fuer Annualisierung. Aktien ~252,
  // Krypto-24/7 ~365.
  tradingDaysPerYear?: number;
}

/**
 * Liefert die annualisierte realisierte Volatilitaet als Dezimalwert
 * (z.B. 0.28 = 28 %). null wenn Sample zu klein oder degeneriert.
 */
export function realizedVolatility({ closes, windowDays = 60, tradingDaysPerYear = 252 }: VolatilitySample): number | null {
  if (!Array.isArray(closes) || closes.length < 10) return null;
  const window = closes.slice(-Math.max(11, windowDays + 1));
  if (window.length < 11) return null;

  const logReturns: number[] = [];
  for (let i = 1; i < window.length; i++) {
    const prev = window[i - 1];
    const curr = window[i];
    if (!Number.isFinite(prev) || !Number.isFinite(curr) || prev <= 0 || curr <= 0) continue;
    logReturns.push(Math.log(curr / prev));
  }
  if (logReturns.length < 10) return null;

  const mean = logReturns.reduce((s, v) => s + v, 0) / logReturns.length;
  const variance = logReturns.reduce((s, v) => s + (v - mean) * (v - mean), 0) / (logReturns.length - 1);
  if (!Number.isFinite(variance) || variance < 0) return null;
  const stdDaily = Math.sqrt(variance);
  const annualized = stdDaily * Math.sqrt(tradingDaysPerYear);
  if (!Number.isFinite(annualized) || annualized <= 0) return null;
  // Schutz vor Ausreissern: Vola ueber 200 % p.a. ist meist ein
  // Datenartefakt. Wir kappen, statt die ganze Berechnung zu verwerfen.
  return Math.min(2.0, annualized);
}

/**
 * Realized Volatility fuer eine Aktie. Sample 60 Handelstage,
 * Annualisierung 252.
 */
export function realizedVolStock(closes: number[]): number | null {
  return realizedVolatility({ closes, windowDays: 60, tradingDaysPerYear: 252 });
}

/**
 * Realized Volatility fuer einen Krypto-Wert. Sample 90 Tage,
 * Annualisierung 365 (24/7-Markt).
 */
export function realizedVolCrypto(closes: number[]): number | null {
  return realizedVolatility({ closes, windowDays: 90, tradingDaysPerYear: 365 });
}

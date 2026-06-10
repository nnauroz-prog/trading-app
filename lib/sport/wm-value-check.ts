// Value-Check fuer einen WM-Pick.
//
// Vergleicht die Buchmacher-Quote mit der Modell-Wahrscheinlichkeit:
//   faire Quote   = 100 / modelProbabilityPct
//   edgePct       = (decimalOdds * modelProbabilityPct/100 - 1) * 100
//   verdict 'value' wenn edgePct > 0, 'fair' wenn ~0, 'unter-quote'
//   wenn edgePct < 0.
//
// Reine Funktion. Keine I/O.

export type WmValueVerdict = 'value' | 'fair' | 'unter-quote' | 'ungueltig';

export interface WmValueCheck {
  modelProbabilityPct: number;
  decimalOdds: number;
  fairOdds: number | null;      // null wenn Wahrscheinlichkeit ungueltig
  edgePct: number | null;       // null bei ungueltig, sonst gerundet auf 0.1
  verdict: WmValueVerdict;
  // Klartext-Hinweis fuer die UI.
  hint: string;
}

const FAIR_THRESHOLD_PCT = 1.5; // +/- 1.5 % gelten als "fair"

export function evaluateWmValue(modelProbabilityPct: number, decimalOdds: number): WmValueCheck {
  if (!Number.isFinite(modelProbabilityPct) || modelProbabilityPct <= 0 || modelProbabilityPct >= 100 || !Number.isFinite(decimalOdds) || decimalOdds <= 1) {
    return {
      modelProbabilityPct,
      decimalOdds,
      fairOdds: null,
      edgePct: null,
      verdict: 'ungueltig',
      hint: 'Quote oder Wahrscheinlichkeit ungueltig.'
    };
  }
  const fairOdds = Math.round((100 / modelProbabilityPct) * 100) / 100;
  const edgePct = Math.round((decimalOdds * (modelProbabilityPct / 100) - 1) * 1000) / 10;
  let verdict: WmValueVerdict = 'fair';
  if (edgePct > FAIR_THRESHOLD_PCT) verdict = 'value';
  else if (edgePct < -FAIR_THRESHOLD_PCT) verdict = 'unter-quote';
  const hint = (() => {
    if (verdict === 'value') return `Buchmacher-Quote ueber der fairen Quote (${fairOdds.toFixed(2)}). Theoretischer Vorteil.`;
    if (verdict === 'unter-quote') return `Buchmacher-Quote unter der fairen Quote (${fairOdds.toFixed(2)}). Theoretischer Nachteil.`;
    return `Buchmacher-Quote nahe der fairen Quote (${fairOdds.toFixed(2)}).`;
  })();
  return { modelProbabilityPct, decimalOdds, fairOdds, edgePct, verdict, hint };
}

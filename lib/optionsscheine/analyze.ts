// Optionsscheine-Analyse: ein Wrapper um die existierende
// analyzeOptionsschein-Logik aus lib/derivatives, der direkt mit den
// Form-Inputs der /optionsscheine-Page arbeitet — ohne den
// ParsedInstrument-Umweg aus dem Telegram-Ideen-Pfad.

import { analyzeOptionsschein } from '@/lib/derivatives/optionsschein-risk';
import type { DerivativeAnalysis, ParsedInstrument } from '@/lib/types/ideas';

export interface OptionsscheinInput {
  // Pflichtfelder
  underlyingName: string;        // z. B. "SAP", "Dax", "Apple"
  underlyingPrice: number;       // aktueller Kurs des Basiswerts
  strike: number;                // Basispreis
  direction: 'call' | 'put';
  // Optional
  wkn?: string;
  isin?: string;
  expiryIso?: string;            // "YYYY-MM-DD" oder "YYYY-MM"
  knockOut?: boolean;
  // Marktdaten falls bekannt — werden angezeigt, fliessen aber nicht in
  // die Risiko-Approximation ein (die nutzt das gleiche Modell wie der
  // Telegram-Pfad, damit alles konsistent ist).
  premiumQuoted?: number;        // tatsaechlich am Markt notierter Schein-Preis
  ratio?: number;                // Bezugsverhaeltnis, default 1
  // Annualisierte Volatilitaet als Dezimalwert (z.B. 0.28). Wenn nicht
  // gesetzt: Default 0.30 (Standard-Annahme). Wenn aus historischen
  // Daten berechnet, wird die Modell-Schaetzung deutlich praeziser.
  sigma?: number;
}

export interface OptionsscheinAnalysis extends DerivativeAnalysis {
  underlyingName: string;
  ratio: number;
  premiumQuoted: number | null;
  // Tatsaechlicher Hebel aus Marktpreis (wenn vorhanden) — anders als
  // der Modell-Hebel im DerivativeAnalysis-Block.
  effectiveLeverage: number | null;
  // Die Vola, die ins Premium-Modell eingeflossen ist. Macht in der UI
  // sichtbar, ob historische oder Default-Vola benutzt wurde.
  sigmaUsed: number;
}

export function analyzeOptionsscheinInput(input: OptionsscheinInput): OptionsscheinAnalysis | null {
  if (!Number.isFinite(input.underlyingPrice) || input.underlyingPrice <= 0) return null;
  if (!Number.isFinite(input.strike) || input.strike <= 0) return null;
  if (!input.underlyingName.trim()) return null;

  const ratio = input.ratio && input.ratio > 0 ? input.ratio : 1;
  const sigmaUsed = Number.isFinite(input.sigma) && (input.sigma ?? 0) > 0 && (input.sigma ?? 0) <= 2
    ? (input.sigma as number)
    : 0.30;
  const instrument: ParsedInstrument = {
    broker: 'Unknown',
    wkn: input.wkn,
    isin: input.isin,
    instrumentType: input.knockOut ? 'knockout' : 'optionsschein',
    strike: input.strike,
    expiry: input.expiryIso,
    direction: input.direction,
    userIntent: 'considering'
  };

  const base = analyzeOptionsschein(instrument, input.underlyingPrice, sigmaUsed);
  if (!base) return null;

  const premiumQuoted = input.premiumQuoted && input.premiumQuoted > 0 ? input.premiumQuoted : null;
  const effectiveLeverage =
    premiumQuoted !== null && base.estimatedDelta !== null
      ? (base.estimatedDelta * input.underlyingPrice) / (premiumQuoted * ratio)
      : null;

  return {
    ...base,
    underlyingName: input.underlyingName.trim(),
    ratio,
    premiumQuoted,
    effectiveLeverage,
    sigmaUsed
  };
}

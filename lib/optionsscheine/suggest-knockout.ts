// Knock-Out-Vorschlaege als Ergaenzung zu klassischen Optionsscheinen.
// Wesentlicher Unterschied: bei Knock-Outs ist der Hebel konstanter
// (kaum Zeitwert), aber der Schein verfaellt SOFORT wertlos, wenn der
// Basiswert die Knock-Out-Schwelle erreicht. Wir empfehlen drei
// Schwellen, die mit dem Risiko-Appetit skalieren.

import { analyzeOptionsscheinInput, type OptionsscheinAnalysis } from './analyze';
import type { SuggestionRisk } from './suggest';

export interface KnockOutSuggestion {
  risk: SuggestionRisk;
  direction: 'call' | 'put';
  // Strike = Finanzierungs-Level beim Long-Knockout. Wir setzen
  // Strike == Knock-Out-Schwelle als Naeherung — bei echten Turbos kann
  // KO knapp unter Strike liegen, das ist hier vereinfacht.
  strike: number;
  knockOutLevel: number;
  // Wie weit weg ist die KO-Schwelle vom aktuellen Basiswert-Preis?
  bufferPct: number;
  // Approx Hebel = Underlying / (Underlying - KO-Schwelle) bei Call.
  estimatedLeverage: number;
  analysis: OptionsscheinAnalysis;
  rationale: string;
}

interface SuggestKnockOutInput {
  underlyingName: string;
  underlyingPrice: number;
  direction?: 'call' | 'put';
  assetClass?: 'aktie' | 'krypto';
  // Annualisierte Vola als Dezimalwert. Default 0.30.
  sigma?: number;
}

const KO_PROFILES: Array<{
  risk: SuggestionRisk;
  bufferPct: number;            // Abstand zur KO-Schwelle in %
  rationale: string;
}> = [
  {
    risk: 'niedrig',
    bufferPct: 0.20,
    rationale: 'KO-Schwelle 20 % vom Kurs entfernt. Hebel ~5×, ueberlebt typische Korrekturen. Theta ist hier nicht das Problem — der Markt darf Zeit nehmen.'
  },
  {
    risk: 'mittel',
    bufferPct: 0.10,
    rationale: 'KO-Schwelle 10 % vom Kurs. Hebel ~10×, normale Volatilitaet kann die Schwelle in 1-2 Wochen reissen. Stop-Loss VOR die KO-Schwelle setzen.'
  },
  {
    risk: 'hoch',
    bufferPct: 0.05,
    rationale: 'KO-Schwelle nur 5 % vom Kurs. Hebel ~20×, kleine Bewegung reicht zum Totalverlust. Nur fuer sehr kurze Trades mit fester Stop-Disziplin.'
  }
];

function roundLevel(level: number, assetClass: 'aktie' | 'krypto'): number {
  if (!Number.isFinite(level) || level <= 0) return level;
  if (assetClass === 'krypto') {
    if (level >= 10000) return Math.round(level / 100) * 100;
    if (level >= 1000) return Math.round(level / 10) * 10;
    if (level >= 100) return Math.round(level);
    return Math.round(level * 10) / 10;
  }
  if (level >= 1000) return Math.round(level);
  if (level >= 100) return Math.round(level * 2) / 2;
  if (level >= 20) return Math.round(level * 10) / 10;
  return Math.round(level * 100) / 100;
}

export function suggestKnockOuts(input: SuggestKnockOutInput): KnockOutSuggestion[] {
  if (!Number.isFinite(input.underlyingPrice) || input.underlyingPrice <= 0) return [];
  if (!input.underlyingName.trim()) return [];

  const direction = input.direction ?? 'call';
  const assetClass = input.assetClass ?? 'aktie';

  return KO_PROFILES.map((profile) => {
    // Bei Long-Knockout liegt die KO-Schwelle UNTER dem Kurs (Call),
    // bei Short-Knockout (Put) UEBER.
    const rawLevel = direction === 'call'
      ? input.underlyingPrice * (1 - profile.bufferPct)
      : input.underlyingPrice * (1 + profile.bufferPct);
    const knockOutLevel = roundLevel(rawLevel, assetClass);
    const strike = knockOutLevel;
    const estimatedLeverage = 1 / profile.bufferPct;

    // Wir nutzen die existierende Analyse, aber mit knockOut: true,
    // damit die Warnungen passen.
    const analysis = analyzeOptionsscheinInput({
      underlyingName: input.underlyingName,
      underlyingPrice: input.underlyingPrice,
      strike,
      direction,
      knockOut: true,
      ratio: assetClass === 'krypto' ? 100 : 10,
      sigma: input.sigma
    });

    if (!analysis) return null;

    return {
      risk: profile.risk,
      direction,
      strike,
      knockOutLevel,
      bufferPct: profile.bufferPct * 100,
      estimatedLeverage,
      analysis,
      rationale: profile.rationale
    } satisfies KnockOutSuggestion;
  }).filter((x): x is KnockOutSuggestion => x !== null);
}

import { StrategyParams } from '@/lib/analysis/strategy-backtest';
import { PersonaId } from '@/lib/agents/personas';

// Each firma trades the same engine but with parameters that match its
// philosophy. Kept here so the rest of the code can map FirmaId → parameters.
export const FIRMA_STRATEGY_PARAMS: Record<PersonaId, StrategyParams> = {
  // Konservativ: enge Stops + lange Gewinnläufe, hohe Konfluenz-Schwelle.
  conservative: {
    minConfluence: 9,
    stopAtrMult: 1.0,
    tp1AtrMult: 3.0,
    maxHoldBars: 72
  },
  // Balanciert: Default-Mitte.
  balanced: {
    minConfluence: 8,
    stopAtrMult: 1.5,
    tp1AtrMult: 2.5,
    maxHoldBars: 72
  },
  // Aggressiv: niedrigere Schwelle, weitere Stops, näheres Ziel.
  aggressive: {
    minConfluence: 7,
    stopAtrMult: 2.0,
    tp1AtrMult: 2.0,
    maxHoldBars: 48
  }
};

export function paramsFor(firma: PersonaId): StrategyParams {
  return FIRMA_STRATEGY_PARAMS[firma];
}

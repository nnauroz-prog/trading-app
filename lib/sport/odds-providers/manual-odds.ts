// Manueller Odds-Provider.
//
// Der User traegt seine Quote selbst ein (lokal). Wir speichern nichts
// auf dem Server, keine Login-Automation, keine Wettabgabe.
//
// Reine Pure-Funktion. localStorage-Bindung passiert in der UI.

import type {
  OddsProvider,
  OddsProviderResult,
  OddsQuote
} from '@/lib/sport/odds-providers/types';

export interface ManualOddsInput {
  matchId: string;
  marketType: string;
  decimalOdds: number;
}

export function manualOddsResult(entries: ManualOddsInput[]): OddsProviderResult {
  const now = new Date().toISOString();
  const quotes: OddsQuote[] = entries
    .filter((e) => Number.isFinite(e.decimalOdds) && e.decimalOdds > 1)
    .map((e) => ({
      provider: 'manual',
      matchId: e.matchId,
      marketType: e.marketType,
      decimalOdds: e.decimalOdds,
      capturedAt: now,
      sourceStatus: 'MANUAL_ONLY',
      isManual: true
    }));
  return {
    status: 'MANUAL_ONLY',
    quotes
  };
}

export const manualOddsProvider: OddsProvider = {
  name: 'manual',
  getStatus: () => 'MANUAL_ONLY',
  fetchQuotes: async () => ({
    status: 'MANUAL_ONLY',
    quotes: [],
    reason: 'Manuelle Quoten kommen aus der UI, nicht aus einem Fetch.'
  })
};

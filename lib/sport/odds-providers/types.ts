// Gemeinsame Typen fuer Odds-Provider.
//
// Wichtige Ehrlichkeits-Regeln:
// * Keine Fake-Quoten.
// * Keine Platzhalter-Werte.
// * Keine Login-Automation.
// * Keine automatische Wettabgabe.
// * Wenn ein Provider keinen erlaubten Zugriff hat -> NOT_AVAILABLE.
// * "Manuelle Quote" ist ein vollwertiger Provider — der User tippt
//   die Quote selbst ein.

export type OddsProviderStatus =
  | 'AVAILABLE'
  | 'NOT_AVAILABLE'
  | 'MANUAL_ONLY'
  | 'ERROR';

export interface OddsQuote {
  provider: string;       // z. B. "tipico" oder "manual"
  matchId: string;
  marketType: string;     // z. B. "1X2-home", "ueber-2.5"
  decimalOdds: number;    // > 1
  capturedAt: string;     // ISO timestamp
  sourceStatus: OddsProviderStatus;
  isManual: boolean;
}

export interface OddsProviderResult {
  status: OddsProviderStatus;
  quotes: OddsQuote[];
  reason?: string;        // Klartext warum NOT_AVAILABLE / ERROR
}

export interface OddsProvider {
  name: string;
  getStatus(): OddsProviderStatus;
  // Liefert Quoten fuer die uebergebenen matchIds, oder eine leere
  // Liste wenn nichts verfuegbar. Niemals geschaetzt.
  fetchQuotes(matchIds: string[]): Promise<OddsProviderResult>;
}

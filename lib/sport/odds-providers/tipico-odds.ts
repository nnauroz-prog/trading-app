// Tipico Odds Provider — Stub.
//
// Aktuell ist KEIN sauberer, rechtlich und technisch zulaessiger
// Zugriff auf Tipico-Quoten konfiguriert. Solange das so ist, liefert
// dieser Provider strikt NOT_AVAILABLE.
//
// Diese Datei darf erst dann eine echte Implementierung bekommen,
// wenn folgende Voraussetzungen vollstaendig erfuellt sind:
//   1. Offizielle, von Tipico erlaubte Datenquelle (Partner-API o. ae.)
//      oder offizielle Affiliate-/Daten-Schnittstelle mit Vertrag.
//   2. Saubere technische Zugriffsschicht ohne Umgehung von
//      Schutzmechanismen, ohne Login-Automation, ohne Scraping.
//   3. Klartext-Hinweis in der UI: "Quelle: Tipico (offiziell)".
//
// NICHT erlaubt:
//   * Scraping/Screen-Scraping der Web-Oberflaeche
//   * Login-Automation
//   * Umgehung von Bot-Schutz oder Geoblocking
//   * Fake- oder Platzhalter-Quoten
//   * Automatische Wettabgabe
//
// Solange diese Voraussetzungen nicht offiziell vorliegen, bleibt
// dieser Provider ein ehrlicher Stub.

import type {
  OddsProvider,
  OddsProviderResult,
  OddsProviderStatus
} from '@/lib/sport/odds-providers/types';

// Feature-Flag: ENV-Variable um spaeter einen offiziellen Tipico-
// Zugriff freizuschalten — auch dann nur, wenn die echte Implementierung
// vorhanden ist.
function isOfficiallyEnabled(): boolean {
  const flag = process.env.TIPICO_OFFICIAL_PROVIDER;
  return flag === 'true';
}

export function tipicoStatus(): OddsProviderStatus {
  return isOfficiallyEnabled() ? 'AVAILABLE' : 'NOT_AVAILABLE';
}

export async function tipicoFetchQuotes(matchIds: string[]): Promise<OddsProviderResult> {
  void matchIds;
  if (!isOfficiallyEnabled()) {
    return {
      status: 'NOT_AVAILABLE',
      quotes: [],
      reason: 'Tipico-Quoten aktuell nicht angebunden. Manuelle Quote moeglich.'
    };
  }
  // PLATZHALTER: hier wuerde die echte, vertraglich erlaubte
  // Tipico-Quellanbindung folgen. Solange das nicht der Fall ist,
  // duerfen wir KEINE Daten zurueckgeben.
  return {
    status: 'NOT_AVAILABLE',
    quotes: [],
    reason: 'Tipico-Quelle aktuell nicht implementiert. Manuelle Quote moeglich.'
  };
}

export const tipicoOddsProvider: OddsProvider = {
  name: 'tipico',
  getStatus: tipicoStatus,
  fetchQuotes: tipicoFetchQuotes
};

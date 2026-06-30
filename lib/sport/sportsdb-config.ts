// Zentrale TheSportsDB-API-Konfiguration.
//
// WICHTIG (ehrlich): Der Default-Key "3" ist der oeffentliche
// Gratis-TEST-Key von TheSportsDB. Er ist stark rate-limitiert, von
// vielen Apps gleichzeitig genutzt und liefert oft LEERE oder
// VERALTETE Daten — besonders fuer aktuelle Turniere wie die WM 2026.
// Das ist der Hauptgrund, warum Spielplaene/Ergebnisse falsch oder
// gar nicht erscheinen.
//
// LOESUNG: Einen eigenen Premium-Key bei TheSportsDB besorgen
// (https://www.thesportsdb.com/api.php — ~3 USD/Monat ueber Patreon)
// und als Env-Variable THESPORTSDB_KEY setzen. Dann gehen ALLE
// Sportarten (Fussball, WM, Basketball, Tennis, Eishockey, Handball)
// sofort auf echte Live-Daten — ohne Code-Aenderung.
//
// Vercel: Settings → Environment Variables → THESPORTSDB_KEY = <dein Key>

const TEST_KEY = '3';

export function thesportsdbKey(): string {
  const fromEnv = process.env.THESPORTSDB_KEY?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : TEST_KEY;
}

// True, wenn nur der gemeinsame Gratis-Test-Key aktiv ist. Wird in der
// UI genutzt, um ehrlich anzuzeigen, dass Daten unzuverlaessig sein
// koennen.
export function isUsingTestKey(): boolean {
  return thesportsdbKey() === TEST_KEY;
}

export function thesportsdbBase(): string {
  return `https://www.thesportsdb.com/api/v1/json/${thesportsdbKey()}`;
}

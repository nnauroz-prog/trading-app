// Welle-Manifest: jede Welle muss hier eine Zeile haben, die in einem
// Satz beantwortet "was aendert sich fuer den User?". Lint-Test
// erzwingt das beim Build. Wenn die Antwort leer oder zu vage ist,
// faellt CI — verhindert Wartungs-Wellen, die als Wert-Wellen
// vermarktet werden.
//
// Zweck im System: bricht den "Welle-Lieferung-als-Beruhigung"-Loop
// aus SYSTEM-ANALYSE.md. Jeder Diff hat einen Adressaten, jeder
// Adressat einen konkreten User-Satz.

export interface WelleEntry {
  // 5-stelliger Bereich, z.B. '33101-33200'.
  range: string;
  // EIN Satz, was sich konkret fuer den End-User aendert.
  // Verboten: "nur Tests", "Refactor", "Code-Cleanup" als einzige Aussage.
  userImpact: string;
  // muss mit next.config.ts BUILD_MARKER uebereinstimmen.
  buildMarker: string;
  // YYYY-MM-DD
  date: string;
  // Optional: external grounding — wer hat den Diff gesehen / wem
  // wurde er gezeigt? Leer wenn niemand (das ist auch ein Signal).
  shownTo?: string;
}

// Neueste Welle zuerst. Pro Welle EIN Eintrag.
export const WELLEN: WelleEntry[] = [
  {
    range: '33101-33200',
    userImpact: 'Jede WM-Vorhersage hat jetzt eine eigene teilbare URL — du kannst genau ein Match-Tipp-Bild per WhatsApp/Mail an eine Person senden, ohne sie durch die ganze App zu fuehren.',
    buildMarker: 'welle-33101-33200-system-fix-bricht-loop',
    date: '2026-06-14'
  }
  // Historische Wellen koennen nachgepflegt werden — neue Wellen MUESSEN
  // einen Eintrag haben, sonst schlaegt der Lint-Test fehl.
];

export function latestWelle(): WelleEntry {
  return WELLEN[0];
}

export function findWelleByMarker(marker: string): WelleEntry | null {
  return WELLEN.find((w) => w.buildMarker === marker) ?? null;
}

// Erkennt vage/inhaltslose userImpact-Aussagen. Wird vom Test verwendet.
const VAGUE_PATTERNS = [
  /^refactor/i,
  /^code[\s-]?cleanup/i,
  /^nur tests/i,
  /^interne tests( \+ lint)?$/i,
  /^bugfixes$/i,
  /^aufraeumen$/i,
  /^polish$/i,
  /^stabilisierung$/i,
  /^wartung$/i
];

export function isUserImpactConcrete(text: string): boolean {
  if (!text || text.trim().length < 30) return false;
  const trimmed = text.trim();
  return !VAGUE_PATTERNS.some((re) => re.test(trimmed));
}

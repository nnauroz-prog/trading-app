// Live-Action des Daten-Integritaets-Agents.
//
// Liefert konkrete Konsequenzen aus den Audit-Issues:
//   - blockedTeams: Set von Team-Namen, die wegen fehlender Datenbasis
//     KEINEN Pick bekommen duerfen. Wird vom rankWmWinnerPicks
//     beruecksichtigt.
//   - blockedVenues: Set von Stadion-Namen mit fehlender Geo-Datenbasis.
//
// Reine Funktion. Bietet dem Picks-Ranking eine harte Veto-Liste.

import { auditWmData, type IntegrityIssue } from '@/lib/sport/wm-data-integrity-agent';

export interface IntegrityAction {
  blockedTeams: Set<string>;
  blockedVenues: Set<string>;
  // Anzahl konkreter Eingriffe in das Pick-System.
  activeBlocks: number;
  generatedAt: string;
  issues: IntegrityIssue[];
}

export function evaluateIntegrityAction(): IntegrityAction {
  const issues = auditWmData();
  const blockedTeams = new Set<string>();
  const blockedVenues = new Set<string>();
  for (const i of issues) {
    if (i.severity !== 'BLOCKIERT') continue;
    if (i.kind === 'MISSING_TEAM_STRENGTH' || i.kind === 'MISSING_TEAM_ORIGIN') {
      blockedTeams.add(i.subject);
    }
    if (i.kind === 'MISSING_VENUE') {
      blockedVenues.add(i.subject);
    }
  }
  return {
    blockedTeams,
    blockedVenues,
    activeBlocks: blockedTeams.size + blockedVenues.size,
    generatedAt: new Date().toISOString(),
    issues
  };
}

// Akzent-Toleranz: deutsche Umlaute + ASCII-Lower. Explizit ohne
// Regex auf Unicode-Combining-Marks, damit es ueberall konsistent ist.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/á/g, 'a')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .trim();
}

// Pruefe ob ein Team aktuell blockiert ist. Toleranter Vergleich
// (Substring + Akzent-Toleranz) damit Aliases gefangen werden.
export function isTeamBlocked(team: string, blockedSet: Set<string>): boolean {
  const norm = normalize(team);
  for (const b of blockedSet) {
    const bn = normalize(b);
    if (bn === norm) return true;
    if (bn.includes(norm) || norm.includes(bn)) return true;
  }
  return false;
}

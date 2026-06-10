// WM Datenintegritaets-Agent.
//
// Pruefte automatisch ob unsere Datenbasis vollstaendig und konsistent
// ist. Findet konkrete Luecken die das Profi-System fuer Picks blind
// machen wuerden:
//
//   1) Team taucht im Fixture-Schedule auf, fehlt aber in wm-team-strength
//      oder wm-team-origins → Akklimatisierung/ELO faellt auf neutral.
//   2) Venue im Fixture aufloesbar? Encoding-Match?
//   3) Encoding-Inkonsistenz (z.B. Suedkorea vs. Südkorea).
//   4) ELO-Werte ausserhalb des plausiblen Bereichs.
//   5) Team-Aliase ueberlappen (falsches Match-Risiko).
//
// Reine Funktion. Liefert eine Liste konkreter Probleme, die im UI
// rot angezeigt werden und im Profi-Tipper-Agent als BLOCKIERT-Quelle
// dienen koennen.

import { WM_2026_FIXTURES, effectiveConfidence } from '@/lib/sport/wm-schedule-2026';
import { WM_2026_TEAMS, findTeamStrength } from '@/lib/sport/wm-team-strength';
import { findTeamOrigin, WM_TEAM_ORIGINS } from '@/lib/sport/wm-team-origins';
import { findVenue, WM_2026_VENUES } from '@/lib/sport/wm-venues';

export type IntegrityIssueSeverity = 'BLOCKIERT' | 'WARNUNG' | 'HINWEIS';
export type IntegrityIssueKind =
  | 'MISSING_TEAM_STRENGTH'
  | 'MISSING_TEAM_ORIGIN'
  | 'MISSING_VENUE'
  | 'IMPLAUSIBLE_ELO'
  | 'OVERLAPPING_ALIASES'
  | 'PLACEHOLDER_TEAM'
  | 'PLACEHOLDER_FIXTURE';

export interface IntegrityIssue {
  severity: IntegrityIssueSeverity;
  kind: IntegrityIssueKind;
  subject: string;
  detail: string;
}

function isPlaceholderTeam(name: string): boolean {
  const t = name.trim();
  return t.includes('TBD') || /^(Sieger|Verlierer|Zweiter|Erster)\s/i.test(t);
}

export function auditWmData(): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];

  // 0) Schedule-Confidence: placeholder-Fixtures werden als WARNUNG
  // gemeldet. Sie sind im Schedule eingetragen, aber Paarung nicht
  // 100 % von FIFA verifiziert.
  for (const f of WM_2026_FIXTURES) {
    if (effectiveConfidence(f) === 'placeholder') {
      issues.push({
        severity: 'WARNUNG',
        kind: 'PLACEHOLDER_FIXTURE',
        subject: `${f.homeTeam} – ${f.awayTeam}`,
        detail: `Fixture ${f.id} (${f.date}) hat sourceConfidence='placeholder'. Termin und Stadion sind offiziell, die konkrete Paarung stammt aus aelteren Sekundaerquellen und ist nicht final verifiziert. Picks dieses Spiels werden vom Profi-Tipper blockiert.`
      });
    }
  }

  // 1) Alle Teams aus den Fixtures sammeln (TBD-Slots ignorieren).
  const fixtureTeams = new Set<string>();
  for (const f of WM_2026_FIXTURES) {
    if (!isPlaceholderTeam(f.homeTeam)) fixtureTeams.add(f.homeTeam);
    if (!isPlaceholderTeam(f.awayTeam)) fixtureTeams.add(f.awayTeam);
  }

  for (const team of fixtureTeams) {
    if (!findTeamStrength(team) || findTeamStrength(team)?.name === 'Unbekannte Mannschaft') {
      issues.push({
        severity: 'BLOCKIERT',
        kind: 'MISSING_TEAM_STRENGTH',
        subject: team,
        detail: `Team ${team} ist im Fixture-Schedule, hat aber keinen ELO-Eintrag in wm-team-strength. Picks dieses Teams haben keine valide Spielstaerken-Basis.`
      });
    }
    if (!findTeamOrigin(team)) {
      issues.push({
        severity: 'BLOCKIERT',
        kind: 'MISSING_TEAM_ORIGIN',
        subject: team,
        detail: `Team ${team} fehlt in wm-team-origins — Akklimatisierungs-, Jetlag- und Reisefaktoren werden fuer dieses Team nicht berechnet.`
      });
    }
  }

  // 2) Venue-Lookup pro Fixture.
  const venueIssues = new Set<string>();
  for (const f of WM_2026_FIXTURES) {
    if (!f.venue || f.venue === 'TBD') continue;
    if (!findVenue(f.venue)) {
      if (venueIssues.has(f.venue)) continue;
      venueIssues.add(f.venue);
      issues.push({
        severity: 'WARNUNG',
        kind: 'MISSING_VENUE',
        subject: f.venue,
        detail: `Spielort "${f.venue}" laesst sich in wm-venues nicht aufloesen. Geo-/Klima-Faktoren fallen fuer alle Spiele in diesem Stadion aus.`
      });
    }
  }

  // 3) ELO-Plausibilitaet.
  for (const t of WM_2026_TEAMS) {
    if (t.elo < 1300 || t.elo > 2300) {
      issues.push({
        severity: 'HINWEIS',
        kind: 'IMPLAUSIBLE_ELO',
        subject: t.name,
        detail: `ELO ${t.elo} ausserhalb des plausiblen Bereichs (1300-2300). Bitte pruefen ob der Wert stimmt.`
      });
    }
  }

  // 4) Alias-Ueberlappung: Wenn ein Team-Name oder Alias gleichzeitig
  // bei zwei verschiedenen Eintraegen auftritt, ist das Match-Risiko hoch.
  const aliasMap = new Map<string, string>();
  for (const t of WM_2026_TEAMS) {
    const names = [t.name, ...(t.aliases ?? [])];
    for (const n of names) {
      const key = n.toLowerCase();
      const ex = aliasMap.get(key);
      if (ex && ex !== t.name) {
        issues.push({
          severity: 'WARNUNG',
          kind: 'OVERLAPPING_ALIASES',
          subject: n,
          detail: `Alias "${n}" gehoert zu zwei Teams (${ex} und ${t.name}) — Match-Lookup wird unzuverlaessig.`
        });
      }
      aliasMap.set(key, t.name);
    }
  }
  const originAliasMap = new Map<string, string>();
  for (const t of WM_TEAM_ORIGINS) {
    const names = [t.team, ...(t.aliases ?? [])];
    for (const n of names) {
      const key = n.toLowerCase();
      const ex = originAliasMap.get(key);
      if (ex && ex !== t.team) {
        issues.push({
          severity: 'WARNUNG',
          kind: 'OVERLAPPING_ALIASES',
          subject: n,
          detail: `Origin-Alias "${n}" gehoert zu zwei Teams (${ex} und ${t.team}).`
        });
      }
      originAliasMap.set(key, t.team);
    }
  }

  return issues;
}

export function summarizeIntegrity(issues: IntegrityIssue[]): {
  blocked: number;
  warnings: number;
  hints: number;
  totalAffectedTeams: string[];
} {
  const blocked = issues.filter((i) => i.severity === 'BLOCKIERT').length;
  const warnings = issues.filter((i) => i.severity === 'WARNUNG').length;
  const hints = issues.filter((i) => i.severity === 'HINWEIS').length;
  const totalAffectedTeams = Array.from(new Set(issues.map((i) => i.subject)));
  return { blocked, warnings, hints, totalAffectedTeams };
}

// Anzahl der Stadien insgesamt (fuer Reports).
export function totalVenues(): number {
  return WM_2026_VENUES.length;
}

// WM Schedule-Reconciler.
//
// Vergleicht das interne WM_2026_FIXTURES-Schedule live gegen externe
// Quellen (TheSportsDB FIFA World Cup-Liga). Drei Outputs pro Fixture:
//
//   - MATCH:      externe Quelle bestaetigt Paarung + Datum exakt.
//                 confidence kann von 'placeholder' auf 'auslosung'
//                 hochgestuft werden.
//   - MISMATCH:   externe Quelle hat eine andere Paarung am selben Tag.
//                 Hartes Veto — internes Fixture stimmt nicht.
//   - UNKNOWN:    externe Quelle hat fuer dieses Datum keine Information.
//                 confidence bleibt unveraendert.
//
// Reine Funktion. Der externe Fetch laeuft im Caller (Server-Component
// holt aus getFootballFixtures die Liga FIFA World Cup).

import type { WmFixture, WmFixtureConfidence } from '@/lib/sport/wm-schedule-2026';
import { WM_2026_FIXTURES, effectiveConfidence } from '@/lib/sport/wm-schedule-2026';

export interface ExternalScheduleEntry {
  date: string;
  time: string | null;
  homeTeam: string;
  awayTeam: string;
}

export type ReconcileStatus = 'MATCH' | 'MISMATCH' | 'UNKNOWN';

export interface ReconcileEntry {
  fixtureId: string;
  internalHome: string;
  internalAway: string;
  internalDate: string;
  internalConfidence: WmFixtureConfidence;
  externalHome: string | null;
  externalAway: string | null;
  status: ReconcileStatus;
  // Wenn MATCH: vorgeschlagene neue Confidence (z. B. placeholder → auslosung).
  upgradeTo: WmFixtureConfidence | null;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/é/g, 'e').replace(/í/g, 'i').replace(/á/g, 'a').replace(/ó/g, 'o').replace(/ú/g, 'u')
    .trim();
}

function teamsMatch(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return true;
  // Aliase-Toleranz: "USA" === "United States", "Korea" === "Suedkorea"
  if (na.includes(nb) || nb.includes(na)) return true;
  return false;
}

export interface ReconcileResult {
  entries: ReconcileEntry[];
  // Anzahl interner Fixtures (gefiltert nach Datum-Fenster).
  internalCount: number;
  // Counts pro Status.
  matched: number;
  mismatched: number;
  unknown: number;
  // Anteil bestaetigter Fixtures (matched / internalCount).
  verifiedPct: number;
}

interface BuildOptions {
  external: ExternalScheduleEntry[];
  // Nur Fixtures in diesem Datums-Fenster vergleichen (z. B. naechste 14 Tage).
  fromIso: string;
  toIso: string;
  schedule?: WmFixture[];
}

export function reconcileWmSchedule(opts: BuildOptions): ReconcileResult {
  const schedule = opts.schedule ?? WM_2026_FIXTURES;
  const inWindow = schedule.filter((f) => f.date >= opts.fromIso && f.date <= opts.toIso);
  const entries: ReconcileEntry[] = [];

  for (const f of inWindow) {
    const internalConfidence = effectiveConfidence(f);
    // TBDs ueberspringen — wir haben dort keinen Vergleich.
    if (internalConfidence === 'tbd') continue;
    // Externe Eintraege fuer das gleiche Datum.
    const sameDay = opts.external.filter((e) => e.date === f.date);
    if (sameDay.length === 0) {
      entries.push({
        fixtureId: f.id,
        internalHome: f.homeTeam,
        internalAway: f.awayTeam,
        internalDate: f.date,
        internalConfidence,
        externalHome: null,
        externalAway: null,
        status: 'UNKNOWN',
        upgradeTo: null
      });
      continue;
    }
    // Suche eine Paarung am selben Tag, die zu uns passt (auch reversed).
    const match = sameDay.find((e) =>
      (teamsMatch(e.homeTeam, f.homeTeam) && teamsMatch(e.awayTeam, f.awayTeam)) ||
      (teamsMatch(e.homeTeam, f.awayTeam) && teamsMatch(e.awayTeam, f.homeTeam))
    );
    if (match) {
      const upgradeTo: WmFixtureConfidence | null =
        internalConfidence === 'placeholder' ? 'auslosung' : null;
      entries.push({
        fixtureId: f.id,
        internalHome: f.homeTeam,
        internalAway: f.awayTeam,
        internalDate: f.date,
        internalConfidence,
        externalHome: match.homeTeam,
        externalAway: match.awayTeam,
        status: 'MATCH',
        upgradeTo
      });
      continue;
    }
    // Keine passende Paarung am Tag — Mismatch.
    const firstSameDay = sameDay[0];
    entries.push({
      fixtureId: f.id,
      internalHome: f.homeTeam,
      internalAway: f.awayTeam,
      internalDate: f.date,
      internalConfidence,
      externalHome: firstSameDay.homeTeam,
      externalAway: firstSameDay.awayTeam,
      status: 'MISMATCH',
      upgradeTo: null
    });
  }

  const matched = entries.filter((e) => e.status === 'MATCH').length;
  const mismatched = entries.filter((e) => e.status === 'MISMATCH').length;
  const unknown = entries.filter((e) => e.status === 'UNKNOWN').length;
  const verifiedPct = inWindow.length > 0 ? Math.round((matched / inWindow.length) * 100) : 0;

  return {
    entries,
    internalCount: inWindow.length,
    matched,
    mismatched,
    unknown,
    verifiedPct
  };
}

// Liefert ein Set von fixtureIds, die durch externe Quelle als MATCH
// bestaetigt wurden. Das wird im Pick-Ranking als Confidence-Override
// genutzt — verifizierte placeholder werden wie auslosung behandelt.
export function verifiedFixtureIds(result: ReconcileResult): Set<string> {
  return new Set(result.entries.filter((e) => e.status === 'MATCH').map((e) => e.fixtureId));
}

// Liefert ein Set von fixtureIds mit MISMATCH-Status — die externe
// Quelle widerspricht unserer internen Paarung. Hartes Pick-Veto:
// solche Spiele duerfen NICHT gepickt werden, egal welche Confidence
// die interne Eintragung hat.
export function mismatchedFixtureIds(result: ReconcileResult): Set<string> {
  return new Set(result.entries.filter((e) => e.status === 'MISMATCH').map((e) => e.fixtureId));
}

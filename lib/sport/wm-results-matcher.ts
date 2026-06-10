// WM-Resultate-Matcher.
//
// Verbindet die statischen WM-2026-Fixtures mit Final-Scores aus zwei
// Quellen, in dieser Prioritaet:
//   1) Manuelle User-Overrides (localStorage) — schnelle Selbstpflege,
//      damit der Lern-Loop auch ohne externe API zuverlaessig laeuft.
//   2) TheSportsDB Liga-Pool (falls ein WM-Spiel als finished auftaucht).
//
// Reine Funktion. Der localStorage-Teil ist getrennt im Store.

import { WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';
import type { FinishedFixtureLite } from '@/lib/sport/wm-pick-learning';

export interface ManualWmResult {
  fixtureId: string;
  homeScore: number;
  awayScore: number;
  recordedAt: number;
}

// Normalisiert Team-Namen fuer Fuzzy-Matching (Akzente weg, Casing).
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

export interface ExternalLastFixture {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  date: string;
}

// Matcht externe finished Fixtures (z. B. aus TheSportsDB-Liga-Pool)
// gegen die WM-Fixtures. Strikt nach (homeTeam, awayTeam, date).
export function matchExternalResults(
  externalFixtures: ExternalLastFixture[],
  schedule: WmFixture[] = WM_2026_FIXTURES
): FinishedFixtureLite[] {
  const out: FinishedFixtureLite[] = [];
  for (const f of schedule) {
    const fh = norm(f.homeTeam);
    const fa = norm(f.awayTeam);
    const match = externalFixtures.find((e) => {
      if (e.date !== f.date) return false;
      const eh = norm(e.homeTeam);
      const ea = norm(e.awayTeam);
      // Exakter Match oder Substring-Toleranz (z.B. "USA" in "United States")
      return (
        (eh === fh || eh.includes(fh) || fh.includes(eh)) &&
        (ea === fa || ea.includes(fa) || fa.includes(ea))
      );
    });
    if (match) {
      out.push({
        fixtureId: f.id,
        homeScore: match.homeScore,
        awayScore: match.awayScore
      });
    }
  }
  return out;
}

// Verschmilzt manuelle Overrides + externe Resultate. Manuell hat
// Vorrang (User-Eingabe ist authoritativ).
export function mergeResults(
  manual: ManualWmResult[],
  external: FinishedFixtureLite[]
): FinishedFixtureLite[] {
  const seen = new Set(manual.map((m) => m.fixtureId));
  return [
    ...manual.map((m) => ({ fixtureId: m.fixtureId, homeScore: m.homeScore, awayScore: m.awayScore })),
    ...external.filter((e) => !seen.has(e.fixtureId))
  ];
}

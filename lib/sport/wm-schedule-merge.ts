// Mergt statische WM-Schedule (verifiziert, mit sourceConfidence) und
// Live-Fixtures (TheSportsDB oder andere). Statische Eintraege haben
// Vorrang — bei Konflikt gewinnt die statische Quelle.
//
// Dedup-Schluessel: ${date}__${normalizedHome}__${normalizedAway}.
// So koennen wir denselben Spielslot von beiden Seiten erkennen, auch
// wenn die IDs unterschiedlich sind.
//
// Reine Funktion.

import type { WmFixture } from '@/lib/sport/wm-schedule-2026';

function isTbd(team: string): boolean {
  if (!team) return true;
  if (team.includes('TBD')) return true;
  return /^(Sieger|Verlierer|Zweiter|Erster|Gruppenerster|Gruppenzweiter|Bester|Gewinner|Drittplatzierter)\s/i.test(team.trim());
}

function normTeam(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function pairKey(date: string, home: string, away: string): string {
  // Symmetrischer Key: Heim/Auswaerts-Reihenfolge spielt fuer das
  // Erkennen identischer Spielslot keine Rolle.
  const a = normTeam(home);
  const b = normTeam(away);
  const [x, y] = a < b ? [a, b] : [b, a];
  return `${date}__${x}__${y}`;
}

export function mergeWmFixtures(staticSchedule: WmFixture[], liveFixtures: WmFixture[]): WmFixture[] {
  const out: WmFixture[] = [...staticSchedule];
  const seen = new Set<string>();
  for (const f of staticSchedule) {
    // TBD-Eintraege haben keine Paarung — die ueberspringen wir, damit
    // konkrete Live-Paarungen ergaenzt werden koennen (statt blockiert
    // zu werden).
    if (isTbd(f.homeTeam) || isTbd(f.awayTeam)) continue;
    seen.add(pairKey(f.date, f.homeTeam, f.awayTeam));
  }
  for (const live of liveFixtures) {
    if (isTbd(live.homeTeam) || isTbd(live.awayTeam)) continue;
    const k = pairKey(live.date, live.homeTeam, live.awayTeam);
    if (seen.has(k)) continue;
    out.push(live);
    seen.add(k);
  }
  return out;
}

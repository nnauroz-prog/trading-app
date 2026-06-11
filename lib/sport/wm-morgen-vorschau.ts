// Morgen-Vorschau: kompakte Zusammenfassung des naechsten Tages.
//
// Liefert Spielanzahl morgen + die freigegebenen Picks in Kurzform.
// Damit kann der User abends die Quoten schon vergleichen und den
// Stake vorbereiten.
//
// Reine Funktion. Keine I/O.

import { WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';
import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

export interface MorgenPickLite {
  time: string | null;
  winnerTeam: string;
  opponentTeam: string;
  modelProbabilityPct: number;
  tier: WmWinnerPick['tier'];
}

export interface WmMorgenVorschau {
  dateIso: string;
  fixturesTotal: number;
  picks: MorgenPickLite[];
  headline: string; // "Morgen: 3 Spiele - 1 Tipp"
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function buildWmMorgenVorschau(
  picks: WmWinnerPick[],
  todayIso: string,
  schedule: WmFixture[] = WM_2026_FIXTURES
): WmMorgenVorschau {
  const morgenIso = addDays(todayIso, 1);
  const fixturesTotal = schedule.filter((f) => f.date === morgenIso).length;
  const morgenPicks = picks
    .filter((p) => p.fixture.date === morgenIso)
    .map<MorgenPickLite>((p) => ({
      time: p.fixture.time,
      winnerTeam: p.winnerTeam,
      opponentTeam: p.winnerSide === 'home' ? p.fixture.awayTeam : p.fixture.homeTeam,
      modelProbabilityPct: p.modelProbabilityPct,
      tier: p.tier
    }))
    .sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));
  const headline = fixturesTotal === 0
    ? 'Morgen: spielfrei'
    : `Morgen: ${fixturesTotal} Spiel${fixturesTotal === 1 ? '' : 'e'} · ${morgenPicks.length} Tipp${morgenPicks.length === 1 ? '' : 's'}`;
  return { dateIso: morgenIso, fixturesTotal, picks: morgenPicks, headline };
}

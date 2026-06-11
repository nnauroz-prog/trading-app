// Einfachste Sicht auf die WM: pro Spiel chronologisch — wer ist der
// Sieger-Tipp, wer ist der Verlierer-Tipp, oder Remis-Tipp.
// Nichts weiter.
//
// Reine Funktion. Nimmt den statischen Spielplan + (optional) Live-
// Wetter-Snapshots. Nutzt die bestehende predictWmMatch-Engine.

import { WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';
import { predictWmMatch } from '@/lib/sport/wm-match-engine';

export type WmSimpleStatus = 'klar' | 'knapp' | 'remis' | 'tbd';

export interface WmSimplePick {
  fixtureId: string;
  dateIso: string;
  time: string | null;
  homeTeam: string;
  awayTeam: string;
  // Wer gewinnt nach Modell. null wenn Remis-Tipp oder TBD.
  winnerTeam: string | null;
  // Wer verliert nach Modell. null wenn Remis-Tipp oder TBD.
  loserTeam: string | null;
  status: WmSimpleStatus;
  // Klartext-Label fuer die Anzeige.
  label: string;
}

function isTbd(team: string): boolean {
  if (!team || team.includes('TBD')) return true;
  return /^(Sieger|Verlierer|Zweiter|Erster|Gruppenerster|Gruppenzweiter|Bester|Gewinner|Drittplatzierter)\s/i.test(team.trim());
}

function decide(homeTeam: string, awayTeam: string, fixture: WmFixture): { winnerTeam: string | null; loserTeam: string | null; status: WmSimpleStatus; label: string } {
  if (isTbd(homeTeam) || isTbd(awayTeam)) {
    return { winnerTeam: null, loserTeam: null, status: 'tbd', label: 'Paarung noch offen' };
  }
  const pred = predictWmMatch({
    homeTeam,
    awayTeam,
    venue: fixture.venue,
    phase: fixture.phase
  });
  // Klarer Sieger: clarity strong oder leaning auf home/away.
  if (pred.pick.winner === 'home') {
    return {
      winnerTeam: homeTeam,
      loserTeam: awayTeam,
      status: pred.pick.clarity === 'strong' ? 'klar' : 'knapp',
      label: `Sieger: ${homeTeam} · Verlierer: ${awayTeam}`
    };
  }
  if (pred.pick.winner === 'away') {
    return {
      winnerTeam: awayTeam,
      loserTeam: homeTeam,
      status: pred.pick.clarity === 'strong' ? 'klar' : 'knapp',
      label: `Sieger: ${awayTeam} · Verlierer: ${homeTeam}`
    };
  }
  if (pred.pick.winner === 'draw') {
    return {
      winnerTeam: null,
      loserTeam: null,
      status: 'remis',
      label: `Remis-Tipp: ${homeTeam} – ${awayTeam}`
    };
  }
  // undecided: knapper Tipp auf die Seite mit dem leichten Vorteil
  if (pred.regular.homePct >= pred.regular.awayPct) {
    return {
      winnerTeam: homeTeam,
      loserTeam: awayTeam,
      status: 'knapp',
      label: `Knapp: ${homeTeam} leicht vor ${awayTeam}`
    };
  }
  return {
    winnerTeam: awayTeam,
    loserTeam: homeTeam,
    status: 'knapp',
    label: `Knapp: ${awayTeam} leicht vor ${homeTeam}`
  };
}

interface BuildOptions {
  schedule?: WmFixture[];
}

export function buildWmSimplePicks(opts: BuildOptions = {}): WmSimplePick[] {
  const schedule = opts.schedule ?? WM_2026_FIXTURES;
  const sorted = [...schedule].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.time ?? '99:99').localeCompare(b.time ?? '99:99');
  });
  return sorted.map((fix) => {
    const decision = decide(fix.homeTeam, fix.awayTeam, fix);
    return {
      fixtureId: fix.id,
      dateIso: fix.date,
      time: fix.time,
      homeTeam: fix.homeTeam,
      awayTeam: fix.awayTeam,
      ...decision
    };
  });
}

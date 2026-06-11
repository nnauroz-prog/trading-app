// Einfachste Sicht auf die WM: pro Spiel chronologisch — wer ist der
// Sieger-Tipp, wer ist der Verlierer-Tipp, oder Remis-Tipp.
// Optional: Endstand (falls vorhanden) und Hit/Miss-Anzeige.
//
// Reine Funktion. Nimmt den statischen Spielplan + (optional) finished
// Ergebnisse. Nutzt die bestehende predictWmMatch-Engine.

import { WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';
import { predictWmMatch } from '@/lib/sport/wm-match-engine';
import type { FinishedFixtureLite } from '@/lib/sport/wm-pick-learning';

export type WmSimpleStatus = 'klar' | 'knapp' | 'remis' | 'tbd';
export type WmSimpleOutcome = 'treffer' | 'daneben' | 'remis-push' | 'remis-getroffen';

export interface WmSimpleResult {
  homeScore: number;
  awayScore: number;
  // Wer hat tatsaechlich gewonnen.
  actualWinner: string | null; // null = Remis
  // Klassifikation gegen den Modell-Tipp.
  outcome: WmSimpleOutcome;
}

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
  // Endstand falls bereits gespielt + nachgepflegt.
  result: WmSimpleResult | null;
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
  finished?: FinishedFixtureLite[];
}

function classifyOutcome(
  predictedWinner: string | null,
  predictedStatus: WmSimpleStatus,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number
): { actualWinner: string | null; outcome: WmSimpleOutcome } {
  const actualWinner = homeScore === awayScore
    ? null
    : homeScore > awayScore ? homeTeam : awayTeam;
  // Remis-Tipp gegen tatsaechliches Remis = Treffer; sonst push (kein Schaden)
  if (predictedStatus === 'remis') {
    return { actualWinner, outcome: actualWinner === null ? 'remis-getroffen' : 'daneben' };
  }
  // Sieger-Tipp gegen tatsaechliches Remis = push
  if (actualWinner === null) {
    return { actualWinner, outcome: 'remis-push' };
  }
  return {
    actualWinner,
    outcome: actualWinner === predictedWinner ? 'treffer' : 'daneben'
  };
}

export function buildWmSimplePicks(opts: BuildOptions = {}): WmSimplePick[] {
  const schedule = opts.schedule ?? WM_2026_FIXTURES;
  const finishedById = new Map<string, FinishedFixtureLite>(
    (opts.finished ?? []).map((f) => [f.fixtureId, f] as const)
  );
  const sorted = [...schedule].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.time ?? '99:99').localeCompare(b.time ?? '99:99');
  });
  return sorted.map((fix) => {
    const decision = decide(fix.homeTeam, fix.awayTeam, fix);
    const fin = finishedById.get(fix.id);
    let result: WmSimpleResult | null = null;
    if (fin && decision.status !== 'tbd') {
      const cls = classifyOutcome(decision.winnerTeam, decision.status, fix.homeTeam, fix.awayTeam, fin.homeScore, fin.awayScore);
      result = {
        homeScore: fin.homeScore,
        awayScore: fin.awayScore,
        actualWinner: cls.actualWinner,
        outcome: cls.outcome
      };
    }
    return {
      fixtureId: fix.id,
      dateIso: fix.date,
      time: fix.time,
      homeTeam: fix.homeTeam,
      awayTeam: fix.awayTeam,
      ...decision,
      result
    };
  });
}

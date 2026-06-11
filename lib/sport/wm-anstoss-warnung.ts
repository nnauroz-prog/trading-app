// Vor-Anstoss-Warnung. Findet alle Picks deren Anstoss innerhalb des
// Warn-Fensters liegt (Default 30 Minuten) und liefert ein
// Klartext-Label pro Eintrag. Pflicht-Status fliesst mit ein, damit
// die Warnung sagen kann ob noch was zu tun ist.
//
// Reine Funktion. Keine I/O.

import { computeKickoffCountdown } from '@/lib/sport/wm-kickoff-countdown';

export interface WmAnstossWarnungInput {
  pickId: string;
  winnerTeam: string;
  opponentTeam: string;
  fixtureDateIso: string;
  fixtureTime: string | null;
  pflichtErledigt: boolean;
}

export interface WmAnstossWarnungEntry {
  pickId: string;
  minutesUntilKickoff: number;
  countdownLabel: string; // "in 22min"
  headline: string;       // "Spanien gegen Kap Verde - Anstoss in 22min"
  toDoHint: string | null; // "Stake noch nicht uebernommen" oder null
}

export interface WmAnstossWarnungResult {
  entries: WmAnstossWarnungEntry[];
  hasOpenToDo: boolean;
}

const DEFAULT_WINDOW_MIN = 30;

export function computeWmAnstossWarnung(
  picks: WmAnstossWarnungInput[],
  now: Date = new Date(),
  windowMin: number = DEFAULT_WINDOW_MIN
): WmAnstossWarnungResult {
  const entries: WmAnstossWarnungEntry[] = [];
  for (const p of picks) {
    const info = computeKickoffCountdown(p.fixtureDateIso, p.fixtureTime, now);
    if (info.status !== 'vor-anstoss' || info.minutesUntilKickoff === null) continue;
    if (info.minutesUntilKickoff > windowMin) continue;
    entries.push({
      pickId: p.pickId,
      minutesUntilKickoff: info.minutesUntilKickoff,
      countdownLabel: info.labelLong,
      headline: `${p.winnerTeam} gegen ${p.opponentTeam} — Anstoss ${info.labelLong}`,
      toDoHint: p.pflichtErledigt ? null : 'Stake/Quote noch nicht uebernommen'
    });
  }
  entries.sort((a, b) => a.minutesUntilKickoff - b.minutesUntilKickoff);
  const hasOpenToDo = entries.some((e) => e.toDoHint !== null);
  return { entries, hasOpenToDo };
}

// Tagesheld + Lehrstueck der letzten N Tage.
//
// Tagesheld: der entschiedene Pick mit der hoechsten Modell-
//   Wahrscheinlichkeit, der GEWONNEN hat. Belohnt selbst-bewusste
//   Tipps.
// Lehrstueck: der Pick mit der hoechsten Modell-Wahrscheinlichkeit,
//   der VERLOREN hat. Zeigt wo das Modell danebenlag — wichtig fuer
//   die ehrliche Lernschleife.
//
// Reine Funktion. Keine I/O. Pushes werden ignoriert.

import type { WmPickLogEntry } from '@/lib/sport/wm-pick-learning';

export interface TagesHeldEntry {
  id: string;
  fixtureId: string;
  dateIso: string;
  winnerTeam: string;
  opponentTeam: string;
  modelProbabilityPct: number;
  eloDiff: number;
  tier: WmPickLogEntry['tier'];
  finalHomeScore: number | null;
  finalAwayScore: number | null;
}

export interface WmTagesHeldResult {
  tagesheld: TagesHeldEntry | null;
  lehrstueck: TagesHeldEntry | null;
  fromIso: string;
  toIso: string;
  windowDays: number;
}

function subtractDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function toEntry(e: WmPickLogEntry): TagesHeldEntry {
  return {
    id: e.id,
    fixtureId: e.fixtureId,
    dateIso: e.dateIso,
    winnerTeam: e.winnerTeam,
    opponentTeam: e.winnerSide === 'home' ? e.awayTeam : e.homeTeam,
    modelProbabilityPct: e.modelProbabilityPct,
    eloDiff: e.eloDiff,
    tier: e.tier,
    finalHomeScore: e.finalHomeScore ?? null,
    finalAwayScore: e.finalAwayScore ?? null
  };
}

export function computeWmTagesheld(log: WmPickLogEntry[], todayIso: string, windowDays = 7): WmTagesHeldResult {
  const fromIso = subtractDays(todayIso, windowDays - 1);
  const inWindow = log.filter((e) => e.dateIso >= fromIso && e.dateIso <= todayIso);
  let held: WmPickLogEntry | null = null;
  let lehr: WmPickLogEntry | null = null;
  for (const e of inWindow) {
    if (e.outcome === 'win') {
      if (held === null || e.modelProbabilityPct > held.modelProbabilityPct) held = e;
    } else if (e.outcome === 'loss') {
      if (lehr === null || e.modelProbabilityPct > lehr.modelProbabilityPct) lehr = e;
    }
  }
  return {
    tagesheld: held ? toEntry(held) : null,
    lehrstueck: lehr ? toEntry(lehr) : null,
    fromIso,
    toIso: todayIso,
    windowDays
  };
}

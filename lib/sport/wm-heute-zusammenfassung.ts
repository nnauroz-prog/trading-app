// Tages-Zusammenfassung fuer den Heute-Bereich.
//
// Aggregiert ueber die Picks von HEUTE (todayIso == fixture.date):
//   - Anzahl Picks heute
//   - Anzahl erledigt (pflichtErledigt aus wm-pick-status)
//   - Anzahl offen
//   - naechster Anstoss (frueheste Zeit unter den Picks, die noch
//     vor-anstoss sind) plus Countdown-Label
//   - Anzahl Picks, deren Spiel gerade laeuft
//   - Anzahl Picks, deren Spiel wahrscheinlich vorbei ist
//
// Reine Funktion. Status-Daten kommen vom Caller (Client liest die
// Stores). Keine I/O hier.

import { computeKickoffCountdown } from '@/lib/sport/wm-kickoff-countdown';

export interface HeuteZusammenfassungPick {
  pickId: string;
  fixtureDateIso: string;
  fixtureTime: string | null;
  pflichtErledigt: boolean;
}

export interface HeuteZusammenfassung {
  pickCountHeute: number;
  erledigt: number;
  offen: number;
  laufend: number;
  vorbei: number;
  naechsterAnstoss: {
    fixtureTime: string;
    countdownLabel: string;
  } | null;
  // Klartext-Headline fuer die UI ("3 Tipps heute · 1 erledigt · 2 offen").
  headline: string;
}

export function summarizeWmHeute(picks: HeuteZusammenfassungPick[], todayIso: string, now: Date = new Date()): HeuteZusammenfassung {
  const heute = picks.filter((p) => p.fixtureDateIso === todayIso);
  let erledigt = 0;
  let laufend = 0;
  let vorbei = 0;
  let earliestPending: { time: string; minutes: number } | null = null;
  for (const p of heute) {
    if (p.pflichtErledigt) erledigt += 1;
    const info = computeKickoffCountdown(p.fixtureDateIso, p.fixtureTime, now);
    if (info.status === 'laeuft') laufend += 1;
    else if (info.status === 'wahrscheinlich-vorbei') vorbei += 1;
    if (info.status === 'vor-anstoss' && info.minutesUntilKickoff !== null && p.fixtureTime) {
      if (!earliestPending || info.minutesUntilKickoff < earliestPending.minutes) {
        earliestPending = { time: p.fixtureTime, minutes: info.minutesUntilKickoff };
      }
    }
  }
  const offen = heute.length - erledigt;
  const naechsterAnstoss = earliestPending
    ? {
        fixtureTime: earliestPending.time,
        countdownLabel: computeKickoffCountdown(todayIso, earliestPending.time, now).labelLong
      }
    : null;
  const headline = heute.length === 0
    ? 'Heute keine freigegebenen Tipps'
    : `${heute.length} Tipp${heute.length === 1 ? '' : 's'} heute · ${erledigt} erledigt · ${offen} offen`;
  return {
    pickCountHeute: heute.length,
    erledigt,
    offen,
    laufend,
    vorbei,
    naechsterAnstoss,
    headline
  };
}

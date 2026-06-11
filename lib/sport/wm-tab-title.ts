// Klartext-Label fuer das naechste WM-Event aus Sicht des Users.
//
// Priorisierung:
//   1. Wenn gerade ein Pick-Spiel laeuft -> "LIVE · Team A"
//   2. Sonst frueheste vor-anstoss-Pick heute -> "22m · Team A-Team B"
//   3. Sonst null (kein Label -> Tab-Titel zurueck auf Original)
//
// Reine Funktion. Keine I/O.

import { computeKickoffCountdown } from '@/lib/sport/wm-kickoff-countdown';

export interface WmTabTitlePickInput {
  homeTeam: string;
  awayTeam: string;
  winnerTeam: string;
  fixtureDateIso: string;
  fixtureTime: string | null;
}

export interface WmTabTitleResult {
  prefix: string | null;        // "⚽ 22m · Mexiko-Marokko"
  live: boolean;
  matchLabel: string | null;
  minutesUntilKickoff: number | null;
  minutesSinceKickoff: number | null;
}

function shorten(name: string): string {
  return name.length > 12 ? name.slice(0, 10) + '…' : name;
}

export function computeWmTabTitle(picks: WmTabTitlePickInput[], now: Date = new Date()): WmTabTitleResult {
  let live: WmTabTitlePickInput | null = null;
  let liveMins = 0;
  let upcoming: { p: WmTabTitlePickInput; minutes: number } | null = null;
  for (const p of picks) {
    const info = computeKickoffCountdown(p.fixtureDateIso, p.fixtureTime, now);
    if (info.status === 'laeuft' && info.minutesSinceKickoff !== null) {
      if (live === null) {
        live = p;
        liveMins = info.minutesSinceKickoff;
      }
    } else if (info.status === 'vor-anstoss' && info.minutesUntilKickoff !== null) {
      if (!upcoming || info.minutesUntilKickoff < upcoming.minutes) {
        upcoming = { p, minutes: info.minutesUntilKickoff };
      }
    }
  }
  if (live) {
    const label = `${shorten(live.homeTeam)}-${shorten(live.awayTeam)}`;
    return {
      prefix: `🟢 LIVE · ${label}`,
      live: true,
      matchLabel: label,
      minutesUntilKickoff: null,
      minutesSinceKickoff: liveMins
    };
  }
  if (upcoming) {
    const label = `${shorten(upcoming.p.homeTeam)}-${shorten(upcoming.p.awayTeam)}`;
    const m = upcoming.minutes;
    const time = m >= 60 ? `${Math.floor(m / 60)}h${m % 60 > 0 ? m % 60 + 'm' : ''}` : `${m}m`;
    return {
      prefix: `⚽ ${time} · ${label}`,
      live: false,
      matchLabel: label,
      minutesUntilKickoff: m,
      minutesSinceKickoff: null
    };
  }
  return { prefix: null, live: false, matchLabel: null, minutesUntilKickoff: null, minutesSinceKickoff: null };
}

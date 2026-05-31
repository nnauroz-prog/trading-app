import { MacroEvent } from '@/lib/calendar/macro-events';

export interface EventWindowState {
  imminent: boolean; // a hoch-impact event sits within the caution window
  veryImminent: boolean; // a hoch-impact event sits within the inner window
  nextHighImpact: MacroEvent | null;
  hoursUntilNextHighImpact: number | null;
  plainSummary: string;
}

const OUTER_WINDOW_HOURS = 24; // konservativ-blocking
const INNER_WINDOW_HOURS = 12; // balanced-blocking

function eventTimestampUtc(e: MacroEvent): number {
  // The calendar produces dates+times in Europe/Berlin local time; treat them
  // as Berlin and convert to UTC. Approximation: Berlin is UTC+1 (winter) or
  // UTC+2 (summer). For the caution window the ~hour-precision is fine, so we
  // construct via Date parsing with a Europe/Berlin offset string.
  const month = parseInt(e.date.split('-')[1], 10);
  const isSummer = month >= 4 && month <= 10; // rough DST
  const offset = isSummer ? '+02:00' : '+01:00';
  return new Date(`${e.date}T${e.time}:00${offset}`).getTime();
}

export function computeEventWindow(events: MacroEvent[], now: Date = new Date()): EventWindowState {
  const nowMs = now.getTime();
  const high = events
    .filter((e) => e.impact === 'hoch')
    .map((e) => ({ event: e, ms: eventTimestampUtc(e) }))
    .filter((e) => e.ms >= nowMs)
    .sort((a, b) => a.ms - b.ms);

  if (high.length === 0) {
    return {
      imminent: false,
      veryImminent: false,
      nextHighImpact: null,
      hoursUntilNextHighImpact: null,
      plainSummary: 'In den nächsten Tagen kein hoch-impact Makro-Termin im Plan — Setup darf rein technisch beurteilt werden.'
    };
  }

  const nextHigh = high[0];
  const hours = Math.round((nextHigh.ms - nowMs) / (1000 * 60 * 60));
  const imminent = hours <= OUTER_WINDOW_HOURS;
  const veryImminent = hours <= INNER_WINDOW_HOURS;

  let plainSummary: string;
  if (veryImminent) {
    plainSummary = `${nextHigh.event.title} in ca. ${hours} Stunden — die App hält jetzt Abstand. Sogar saubere Setups können nach dem Release wild schwanken.`;
  } else if (imminent) {
    plainSummary = `${nextHigh.event.title} in ca. ${hours} Stunden — Konservativ wartet bis nach dem Termin. Balanciert und Aggressiv schauen noch normal aufs Setup.`;
  } else {
    const days = Math.round(hours / 24);
    plainSummary = `Nächster hoch-impact Termin: ${nextHigh.event.title} in ca. ${days} ${days === 1 ? 'Tag' : 'Tagen'}.`;
  }

  return {
    imminent,
    veryImminent,
    nextHighImpact: nextHigh.event,
    hoursUntilNextHighImpact: hours,
    plainSummary
  };
}

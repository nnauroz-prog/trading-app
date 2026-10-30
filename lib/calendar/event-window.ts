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

const berlinClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Berlin',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});

function berlinWallTimestamp(timestamp: number): number {
  const parts: Record<string, number> = {};
  for (const part of berlinClock.formatToParts(new Date(timestamp))) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

function eventTimestampUtc(e: MacroEvent): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) || !/^\d{2}:\d{2}$/.test(e.time)) return NaN;
  const [year, month, day] = e.date.split('-').map(Number);
  const [hour, minute] = e.time.split(':').map(Number);
  const wallTimestamp = Date.UTC(year, month - 1, day, hour, minute);
  const normalized = new Date(wallTimestamp);
  if (normalized.getUTCFullYear() !== year || normalized.getUTCMonth() !== month - 1
    || normalized.getUTCDate() !== day || hour > 23 || minute > 59) return NaN;

  // Resolve the actual Europe/Berlin offset using the time-zone database.
  // Iterating also detects the nonexistent spring-forward hour instead of
  // silently shifting an event. In the repeated autumn hour this chooses the
  // later occurrence, retaining the caution window until both could have passed.
  let timestamp = wallTimestamp;
  for (let attempt = 0; attempt < 3; attempt++) {
    const difference = berlinWallTimestamp(timestamp) - wallTimestamp;
    if (difference === 0) return timestamp;
    timestamp -= difference;
  }
  return berlinWallTimestamp(timestamp) === wallTimestamp ? timestamp : NaN;
}

export function computeEventWindow(events: MacroEvent[], now: Date = new Date()): EventWindowState {
  const nowMs = now.getTime();
  const high = events
    .filter((e) => e.impact === 'hoch')
    .map((e) => ({ event: e, ms: eventTimestampUtc(e) }))
    .filter((e) => Number.isFinite(e.ms) && e.ms >= nowMs)
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
  const remainingMs = nextHigh.ms - nowMs;
  const hours = Math.round(remainingMs / (1000 * 60 * 60));
  const imminent = remainingMs <= OUTER_WINDOW_HOURS * 60 * 60 * 1000;
  const veryImminent = remainingMs <= INNER_WINDOW_HOURS * 60 * 60 * 1000;

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

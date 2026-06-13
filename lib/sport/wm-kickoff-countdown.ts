// Anstoss-Countdown fuer ein WM-Fixture.
//
// Liefert pro Spiel drei Sichten:
//   status: 'vor-anstoss' | 'laeuft' | 'wahrscheinlich-vorbei'
//   labelLong: "in 3h 12min" / "laeuft seit 22 min" / "vorbei – Endstand kommt"
//   labelShort: "3h 12m" / "+22m" / "vorbei"
//
// Reine Funktion. Eingabe: Fixture-Datum (YYYY-MM-DD), Anstoss-Zeit
// (HH:MM, lokale Spielort-Zeit) und ein "jetzt"-Zeitpunkt (Date).
//
// Wichtig: WM-Spielzeiten in unserem Datensatz sind in lokaler
// Spielort-Zeit gespeichert; fuer ein einfaches und vorhersagbares
// Verhalten interpretieren wir Datum+Zeit als Europe/Berlin-naive Zeit
// (Vergleichsbasis fuer den User der die App in Deutschland nutzt).
// Das verschiebt den Wert um wenige Stunden ggue. der echten Welt;
// das ist akzeptabel, weil der User sowieso auf seinen Anbieter
// schaut. Die Differenz ist kein Genauigkeits-Killer fuer einen
// Hinweis.

export type WmKickoffStatus = 'vor-anstoss' | 'laeuft' | 'wahrscheinlich-vorbei';

export interface WmKickoffInfo {
  status: WmKickoffStatus;
  labelLong: string;
  labelShort: string;
  minutesUntilKickoff: number | null; // > 0 vor Anstoss, sonst null
  minutesSinceKickoff: number | null; // > 0 nach Anstoss, sonst null
}

const NINETY_PLUS = 110; // 90 min + Halbzeit + Nachspielzeit

function parseKickoff(dateIso: string, time: string | null): Date | null {
  if (!time) return null;
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) return null;
  // Annahme: Datum + Zeit als Berlin-naive ISO. Bewusst ohne
  // Zeitzonen-Math — Genauigkeit auf wenige Stunden reicht.
  const iso = `${dateIso}T${time}:00`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Variante: Datum + Zeit werden als UTC interpretiert. Robust gegen
// Reisen / Browser in anderer Zeitzone. Gleiche Output-Semantik wie
// computeKickoffCountdown.
function parseKickoffUtc(dateIso: string, time: string | null): Date | null {
  if (!time) return null;
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  const d = new Date(`${dateIso}T${time}:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtLong(minutes: number): string {
  if (minutes >= 60 * 24) {
    const days = Math.floor(minutes / (60 * 24));
    return `in ${days} Tag${days === 1 ? '' : 'en'}`;
  }
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `in ${h}h ${m}min`;
  }
  return `in ${minutes}min`;
}

function fmtShort(minutes: number): string {
  if (minutes >= 60 * 24) {
    const days = Math.floor(minutes / (60 * 24));
    return `${days}d`;
  }
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  }
  return `${minutes}m`;
}

function buildInfo(kickoff: Date | null, now: Date): WmKickoffInfo {
  if (!kickoff) {
    return {
      status: 'vor-anstoss',
      labelLong: 'Anstoss noch unklar',
      labelShort: '—',
      minutesUntilKickoff: null,
      minutesSinceKickoff: null
    };
  }
  const diffMs = kickoff.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin > 0) {
    return {
      status: 'vor-anstoss',
      labelLong: fmtLong(diffMin),
      labelShort: fmtShort(diffMin),
      minutesUntilKickoff: diffMin,
      minutesSinceKickoff: null
    };
  }
  const elapsed = Math.abs(diffMin);
  if (elapsed <= NINETY_PLUS) {
    return {
      status: 'laeuft',
      labelLong: `laeuft seit ${elapsed} min`,
      labelShort: `+${elapsed}m`,
      minutesUntilKickoff: null,
      minutesSinceKickoff: elapsed
    };
  }
  return {
    status: 'wahrscheinlich-vorbei',
    labelLong: 'vorbei — Endstand kommt',
    labelShort: 'vorbei',
    minutesUntilKickoff: null,
    minutesSinceKickoff: elapsed
  };
}

export function computeKickoffCountdown(dateIso: string, time: string | null, now: Date = new Date()): WmKickoffInfo {
  return buildInfo(parseKickoff(dateIso, time), now);
}

// UTC-Variante: interpretiert Datum + Zeit als UTC. Wenn der Aufrufer
// einen UTC-Timestamp aus dem Spielplan hat, ist das die robuste Wahl.
export function computeKickoffCountdownUtc(dateIso: string, time: string | null, now: Date = new Date()): WmKickoffInfo {
  return buildInfo(parseKickoffUtc(dateIso, time), now);
}

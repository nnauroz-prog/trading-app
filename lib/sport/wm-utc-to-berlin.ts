// UTC-Zeit-Strings in Berlin-lokale Zeit umrechnen.
//
// Hintergrund: Der WM-Spielplan speichert Datum/Zeit als UTC
// (siehe Kommentar-Konvention in wm-schedule-2026.ts: "21:00 UTC =
// 23:00 Berlin"). Die UI muss aber in Berlin-Zeit anzeigen, sonst
// liest der Nutzer aus Deutschland die falschen Anstosszeiten.
//
// Sommerzeit (CEST, UTC+2) und Winterzeit (CET, UTC+1) werden
// automatisch beruecksichtigt — Intl.DateTimeFormat mit
// timeZone Europe/Berlin macht das richtig.
//
// Reine Funktion.

export function utcToBerlin(dateIso: string, timeUtc: string | null): { dateIso: string; time: string | null } {
  if (!timeUtc || !/^\d{2}:\d{2}$/.test(timeUtc)) return { dateIso, time: timeUtc };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return { dateIso, time: timeUtc };
  const utc = new Date(`${dateIso}T${timeUtc}:00Z`);
  if (Number.isNaN(utc.getTime())) return { dateIso, time: timeUtc };
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
  const parts = fmt.formatToParts(utc);
  const pick = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? '00';
  const y = pick('year');
  const m = pick('month');
  const d = pick('day');
  let h = pick('hour');
  if (h === '24') h = '00';
  const mi = pick('minute');
  return { dateIso: `${y}-${m}-${d}`, time: `${h}:${mi}` };
}

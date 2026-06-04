// Exportiert die offenen getippten Spiele als .ics-Datei (RFC 5545).
// User kann die importieren — z. B. in Google Kalender oder Apple Kalender —
// und bekommt 60-Minuten-Erinnerungen vor Anstoß.

import type { TipJournalEntry } from '@/lib/sport/tip-journal';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function toIcsDate(iso: string, time: string | null): string {
  // iso = YYYY-MM-DD, time = HH:MM (UTC) oder null → default 18:00
  const [y, m, d] = iso.split('-').map(Number);
  const [hh, mm] = time ? time.split(':').map(Number) : [18, 0];
  return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00Z`;
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function tipsToIcs(log: TipJournalEntry[], options: { defaultTime?: string } = {}): string {
  const upcoming = log.filter((e) => e.outcome === 'pending');
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Trading Desk//Sport-Tipps//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];
  for (const e of upcoming) {
    const dtstart = toIcsDate(e.date, options.defaultTime ?? null);
    // 2 Stunden später als Default-Ende
    const [y, m, d] = e.date.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 18, 0, 0));
    const dtend = `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours() + 2)}0000Z`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@trading-desk`,
      `DTSTAMP:${now}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${escapeIcs(`${e.homeTeam} – ${e.awayTeam}`)}`,
      `DESCRIPTION:${escapeIcs(`Tipp: ${e.market}${e.modelProbabilityPct ? ` (Modell ${e.modelProbabilityPct} %)` : ''}`)}`,
      `CATEGORIES:${escapeIcs(e.league || 'Sport')}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT60M',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcs(`Anstoß in 60 Min: ${e.homeTeam} vs. ${e.awayTeam}`)}`,
      'END:VALARM',
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export type EventImpact = 'hoch' | 'mittel' | 'niedrig';
export type EventRegion = 'US' | 'EU' | 'DE' | 'UK' | 'GLOBAL' | 'CRYPTO';

export interface MacroEvent {
  id: string;
  date: string; // YYYY-MM-DD in Europe/Berlin
  time: string; // HH:MM Europe/Berlin
  region: EventRegion;
  title: string;
  category: 'inflation' | 'gdp' | 'jobs' | 'central_bank' | 'sentiment' | 'housing' | 'energy' | 'rating' | 'crypto' | 'other';
  impact: EventImpact;
  note?: string;
}

interface RecurringRule {
  // Either nth-weekday-of-month (e.g. 2nd Tuesday) or last-weekday-of-month
  kind: 'nth' | 'last';
  weekday: number; // 0=Sun .. 6=Sat
  nth?: number; // 1..5 for 'nth'
  // Month filter (1..12), defaults to "every month"
  months?: number[];
  // The event template
  template: Omit<MacroEvent, 'id' | 'date'>;
}

// Recurring high-impact US/EU events. Most of these are published by the
// respective central banks and statistical offices on a strict monthly
// schedule, so the day-of-week pattern is reliable.
const RECURRING: RecurringRule[] = [
  // US Non-Farm-Payrolls: 1st Friday of the month, 14:30 Europe/Berlin (08:30 ET)
  {
    kind: 'nth', weekday: 5, nth: 1,
    template: { time: '14:30', region: 'US', title: 'Non-Farm-Payrolls (NFP)', category: 'jobs', impact: 'hoch',
      note: 'Größter monatlicher Arbeitsmarkt-Bericht, treibt Zinserwartungen.' }
  },
  // US CPI: 2nd Tuesday/Wednesday of the month, 14:30 Berlin
  {
    kind: 'nth', weekday: 2, nth: 2,
    template: { time: '14:30', region: 'US', title: 'CPI (Verbraucherpreisindex)', category: 'inflation', impact: 'hoch',
      note: 'Hauptmaß für US-Inflation, bewegt Aktien & Krypto stark.' }
  },
  // US Core PCE: last Friday of the month, 14:30 Berlin
  {
    kind: 'last', weekday: 5,
    template: { time: '14:30', region: 'US', title: 'Core PCE (Fed-Lieblingsinflation)', category: 'inflation', impact: 'hoch',
      note: 'Die Fed schaut auf PCE, nicht CPI — entsprechend marktbewegend.' }
  },
  // ECB rate decision: typically Thursday, every ~6 weeks. We approximate
  // with "1st Thursday of every other month" — close enough for a heads-up.
  {
    kind: 'nth', weekday: 4, nth: 1, months: [1, 3, 4, 6, 7, 9, 10, 12],
    template: { time: '14:15', region: 'EU', title: 'EZB-Zinsentscheidung (geschätzt)', category: 'central_bank', impact: 'hoch',
      note: 'Geschätzter Termin — offizielles Datum auf ecb.europa.eu prüfen.' }
  },
  // US Consumer Confidence: last Tuesday of the month
  {
    kind: 'last', weekday: 2,
    template: { time: '16:00', region: 'US', title: 'CB Verbrauchervertrauen', category: 'sentiment', impact: 'mittel' }
  },
  // S&P/Case-Shiller: last Tuesday of the month, 15:00 Berlin
  {
    kind: 'last', weekday: 2,
    template: { time: '15:00', region: 'US', title: 'S&P/Case-Shiller Hauspreisindex', category: 'housing', impact: 'niedrig' }
  },
  // US weekly jobless claims: every Thursday 14:30
  {
    kind: 'nth', weekday: 4, nth: 1,
    template: { time: '14:30', region: 'US', title: 'Erstanträge Arbeitslosenhilfe (wöchentlich)', category: 'jobs', impact: 'mittel' }
  },
  {
    kind: 'nth', weekday: 4, nth: 2,
    template: { time: '14:30', region: 'US', title: 'Erstanträge Arbeitslosenhilfe (wöchentlich)', category: 'jobs', impact: 'mittel' }
  },
  {
    kind: 'nth', weekday: 4, nth: 3,
    template: { time: '14:30', region: 'US', title: 'Erstanträge Arbeitslosenhilfe (wöchentlich)', category: 'jobs', impact: 'mittel' }
  },
  {
    kind: 'nth', weekday: 4, nth: 4,
    template: { time: '14:30', region: 'US', title: 'Erstanträge Arbeitslosenhilfe (wöchentlich)', category: 'jobs', impact: 'mittel' }
  }
];

// FOMC-Sitzungen sind nicht regelmäßig, daher fest hinterlegt (offizieller
// federalreserve.gov-Plan). Hier 2026 — bei Bedarf jährlich ergänzen.
const FOMC_MEETINGS_2026: string[] = [
  '2026-01-28', '2026-03-18', '2026-04-29', '2026-06-17',
  '2026-07-29', '2026-09-16', '2026-10-28', '2026-12-09'
];

// Bekannte fixe Termine (nicht-rekurrent).
const KNOWN_FIXED: MacroEvent[] = FOMC_MEETINGS_2026.map((date) => ({
  id: `fomc-${date}`,
  date,
  time: '20:00',
  region: 'US',
  title: 'FOMC-Zinsentscheidung + Powell-Pressekonferenz',
  category: 'central_bank',
  impact: 'hoch',
  note: 'Wichtigster Krypto/Aktien-Trigger des Quartals.'
}));

function isoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date | null {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const firstWeekday = first.getUTCDay();
  const offset = (weekday - firstWeekday + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > last) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date | null {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let day = last; day >= 1; day--) {
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCDay() === weekday) return d;
  }
  return null;
}

// Returns scheduled macro events in the given date window (start inclusive,
// end inclusive). Both server-safe and pure.
export function listMacroEvents(start: Date, end: Date): MacroEvent[] {
  const events: MacroEvent[] = [];
  const seen = new Set<string>();

  for (const fix of KNOWN_FIXED) {
    if (fix.date >= isoDate(start) && fix.date <= isoDate(end)) {
      if (!seen.has(fix.id)) { events.push(fix); seen.add(fix.id); }
    }
  }

  // Iterate months touched by the window.
  const startY = start.getUTCFullYear();
  const startM = start.getUTCMonth() + 1;
  const endY = end.getUTCFullYear();
  const endM = end.getUTCMonth() + 1;
  for (let y = startY; y <= endY; y++) {
    const firstMonth = y === startY ? startM : 1;
    const lastMonth = y === endY ? endM : 12;
    for (let m = firstMonth; m <= lastMonth; m++) {
      for (const rule of RECURRING) {
        if (rule.months && !rule.months.includes(m)) continue;
        const d = rule.kind === 'nth'
          ? nthWeekdayOfMonth(y, m, rule.weekday, rule.nth ?? 1)
          : lastWeekdayOfMonth(y, m, rule.weekday);
        if (!d) continue;
        const date = isoDate(d);
        if (date < isoDate(start) || date > isoDate(end)) continue;
        const id = `${rule.template.title}-${date}`.replace(/\s+/g, '-');
        if (seen.has(id)) continue;
        seen.add(id);
        events.push({ id, date, ...rule.template });
      }
    }
  }

  events.sort((a, b) => (a.date.localeCompare(b.date) || a.time.localeCompare(b.time)));
  return events;
}

// Convenience: next 7 days from "now" (Europe/Berlin perspective).
export function listMacroEventsThisWeek(now: Date = new Date()): MacroEvent[] {
  const start = new Date(now);
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + 7);
  return listMacroEvents(start, end);
}

// Pure Funktionen für Handels-Zeiten der wichtigsten Börsen.
// Aktuelle Logik: Mo-Fr nur, US 9:30-16:00 ET, Xetra 9:00-17:30 CET.
// Feiertage werden NICHT abgedeckt — der User soll das selbst checken.

export type MarketStatus = 'open' | 'pre' | 'after' | 'closed' | 'weekend';

export interface MarketState {
  market: 'us' | 'xetra';
  status: MarketStatus;
  label: string;
  detail: string;
}

// US-Märkte: 9:30-16:00 ET. Pre-Market 4:00-9:30, After-Hours 16:00-20:00.
// ET = UTC-5 (Winter) bzw. UTC-4 (Sommer). Vereinfacht: nutzen wir die
// effektive US/Eastern-Zeit aus toLocaleString.
function getEastern(now: Date): { hour: number; minute: number; dow: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false
  });
  const parts = fmt.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { hour, minute, dow: dowMap[weekday] ?? 1 };
}

function getBerlin(now: Date): { hour: number; minute: number; dow: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false
  });
  const parts = fmt.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { hour, minute, dow: dowMap[weekday] ?? 1 };
}

function minutesOfDay(hour: number, minute: number): number {
  return hour * 60 + minute;
}

export function usMarketState(now: Date = new Date()): MarketState {
  const { hour, minute, dow } = getEastern(now);
  if (dow === 0 || dow === 6) {
    return { market: 'us', status: 'weekend', label: 'US geschlossen', detail: 'Wochenende — NYSE und Nasdaq sind zu.' };
  }
  const mins = minutesOfDay(hour, minute);
  const open = 9 * 60 + 30;
  const close = 16 * 60;
  const preStart = 4 * 60;
  const afterEnd = 20 * 60;
  if (mins >= open && mins < close) {
    return { market: 'us', status: 'open', label: 'US offen', detail: 'NYSE und Nasdaq haben regulär geöffnet.' };
  }
  if (mins >= preStart && mins < open) {
    return { market: 'us', status: 'pre', label: 'US Pre-Market', detail: 'Vor-Börse 4:00–9:30 ET — dünne Liquidität, größere Spreads.' };
  }
  if (mins >= close && mins < afterEnd) {
    return { market: 'us', status: 'after', label: 'US After-Hours', detail: 'Nach-Börse 16:00–20:00 ET — Quotes weichen oft vom Eröffnungskurs ab.' };
  }
  return { market: 'us', status: 'closed', label: 'US geschlossen', detail: 'Außerhalb der Handelszeiten.' };
}

export function xetraMarketState(now: Date = new Date()): MarketState {
  const { hour, minute, dow } = getBerlin(now);
  if (dow === 0 || dow === 6) {
    return { market: 'xetra', status: 'weekend', label: 'Xetra geschlossen', detail: 'Wochenende — DAX, MDax & Co. sind zu.' };
  }
  const mins = minutesOfDay(hour, minute);
  const open = 9 * 60;
  const close = 17 * 60 + 30;
  if (mins >= open && mins < close) {
    return { market: 'xetra', status: 'open', label: 'Xetra offen', detail: 'Frankfurt regulär geöffnet 9:00–17:30 CET.' };
  }
  return { market: 'xetra', status: 'closed', label: 'Xetra geschlossen', detail: 'Außerhalb der Handelszeiten.' };
}

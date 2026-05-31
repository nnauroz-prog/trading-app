import { describe, expect, it } from 'vitest';
import { listMacroEvents, listMacroEventsThisWeek } from '@/lib/calendar/macro-events';

describe('listMacroEvents', () => {
  it('returns FOMC for the week containing a fixed FOMC date', () => {
    const start = new Date('2026-06-15T00:00:00Z');
    const end = new Date('2026-06-21T23:59:59Z');
    const events = listMacroEvents(start, end);
    expect(events.some((e) => e.title.includes('FOMC'))).toBe(true);
  });

  it('NFP appears on the first Friday of the month', () => {
    // June 2026: 1st Friday is the 5th.
    const start = new Date('2026-06-01T00:00:00Z');
    const end = new Date('2026-06-30T23:59:59Z');
    const events = listMacroEvents(start, end);
    const nfp = events.find((e) => e.title.includes('Non-Farm-Payrolls'));
    expect(nfp?.date).toBe('2026-06-05');
  });

  it('Core PCE appears on the last Friday of the month', () => {
    // May 2026: last Friday is the 29th.
    const start = new Date('2026-05-01T00:00:00Z');
    const end = new Date('2026-05-31T23:59:59Z');
    const events = listMacroEvents(start, end);
    const pce = events.find((e) => e.title.includes('Core PCE'));
    expect(pce?.date).toBe('2026-05-29');
  });

  it('CPI appears on the 2nd Tuesday', () => {
    // May 2026: 2nd Tuesday is the 12th.
    const start = new Date('2026-05-01T00:00:00Z');
    const end = new Date('2026-05-31T23:59:59Z');
    const events = listMacroEvents(start, end);
    const cpi = events.find((e) => e.title === 'CPI (Verbraucherpreisindex)');
    expect(cpi?.date).toBe('2026-05-12');
  });

  it('events are sorted chronologically', () => {
    const start = new Date('2026-06-01T00:00:00Z');
    const end = new Date('2026-06-30T23:59:59Z');
    const events = listMacroEvents(start, end);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].date.localeCompare(events[i - 1].date)).toBeGreaterThanOrEqual(0);
    }
  });

  it('this-week window returns events within 7 days', () => {
    const events = listMacroEventsThisWeek(new Date('2026-05-29T00:00:00Z'));
    expect(events.length).toBeGreaterThan(0);
    // PCE on 2026-05-29 should be there
    expect(events.some((e) => e.date === '2026-05-29')).toBe(true);
  });

  it('high-impact events are flagged', () => {
    const start = new Date('2026-06-01T00:00:00Z');
    const end = new Date('2026-06-30T23:59:59Z');
    const events = listMacroEvents(start, end);
    const highs = events.filter((e) => e.impact === 'hoch');
    expect(highs.length).toBeGreaterThan(0);
  });
});

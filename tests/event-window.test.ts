import { describe, expect, it } from 'vitest';
import { computeEventWindow } from '@/lib/calendar/event-window';
import { MacroEvent } from '@/lib/calendar/macro-events';

function fomc(date: string, time = '20:00'): MacroEvent {
  return {
    id: `fomc-${date}`, date, time, region: 'US',
    title: 'FOMC-Zinsentscheidung', category: 'central_bank', impact: 'hoch'
  };
}

describe('computeEventWindow', () => {
  it('reports no events when list is empty', () => {
    const w = computeEventWindow([], new Date('2026-06-01T12:00:00Z'));
    expect(w.imminent).toBe(false);
    expect(w.veryImminent).toBe(false);
    expect(w.nextHighImpact).toBeNull();
    expect(w.plainSummary.toLowerCase()).toContain('kein hoch-impact');
  });

  it('marks an event 6h away as veryImminent', () => {
    const now = new Date('2026-06-17T14:00:00Z'); // 14:00 UTC = 16:00 Berlin summer
    const ev = fomc('2026-06-17', '20:00'); // 20:00 Berlin = 18:00 UTC
    const w = computeEventWindow([ev], now);
    expect(w.veryImminent).toBe(true);
    expect(w.imminent).toBe(true);
    expect(w.hoursUntilNextHighImpact).toBe(4);
  });

  it('marks an event 18h away as imminent but not veryImminent', () => {
    const now = new Date('2026-06-17T00:00:00Z'); // 02:00 Berlin
    const ev = fomc('2026-06-17', '20:00'); // 20:00 Berlin = 18:00 UTC
    const w = computeEventWindow([ev], now);
    expect(w.imminent).toBe(true);
    expect(w.veryImminent).toBe(false);
  });

  it('does not flag events many days out', () => {
    const now = new Date('2026-06-15T12:00:00Z');
    const ev = fomc('2026-06-17', '20:00');
    const w = computeEventWindow([ev], now);
    expect(w.imminent).toBe(false);
    expect(w.nextHighImpact?.id).toBe(ev.id);
  });

  it('skips already-past events and picks the next one', () => {
    const now = new Date('2026-06-18T00:00:00Z');
    const past = fomc('2026-06-17', '20:00');
    const future = fomc('2026-07-29', '20:00');
    const w = computeEventWindow([past, future], now);
    expect(w.nextHighImpact?.id).toBe(future.id);
  });

  it('ignores low-impact events', () => {
    const lowImpact: MacroEvent = {
      id: 'low', date: '2026-06-17', time: '15:00', region: 'US',
      title: 'Hauspreise', category: 'housing', impact: 'niedrig'
    };
    const w = computeEventWindow([lowImpact], new Date('2026-06-17T10:00:00Z'));
    expect(w.imminent).toBe(false);
    expect(w.nextHighImpact).toBeNull();
  });
});

describe('Berlin time-zone and exact caution boundaries', () => {
  it('keeps an October 30 afternoon event upcoming after Berlin returned to winter time', () => {
    const event = fomc('2026-10-30', '15:30'); // 14:30 UTC, not 13:30 UTC
    const window = computeEventWindow([event], new Date('2026-10-30T13:45:00Z'));
    expect(window.nextHighImpact?.id).toBe(event.id);
    expect(window.hoursUntilNextHighImpact).toBe(1);
    expect(window.veryImminent).toBe(true);
  });

  it.each([
    ['2026-03-28', '2026-03-28T13:30:00Z'],
    ['2026-03-29', '2026-03-29T12:30:00Z'],
    ['2026-10-24', '2026-10-24T12:30:00Z'],
    ['2026-10-25', '2026-10-25T13:30:00Z']
  ])('uses the actual Berlin offset on %s', (date, now) => {
    expect(computeEventWindow([fomc(date, '15:30')], new Date(now)).hoursUntilNextHighImpact).toBe(1);
  });

  it('does not round an event just beyond 24 hours into the blocking window', () => {
    const window = computeEventWindow([fomc('2026-10-30', '15:30')], new Date('2026-10-29T14:29:00Z'));
    expect(window.hoursUntilNextHighImpact).toBe(24);
    expect(window.imminent).toBe(false);
    expect(window.veryImminent).toBe(false);
  });

  it('does not round an event just beyond 12 hours into the inner blocking window', () => {
    const window = computeEventWindow([fomc('2026-10-30', '15:30')], new Date('2026-10-30T02:29:00Z'));
    expect(window.hoursUntilNextHighImpact).toBe(12);
    expect(window.imminent).toBe(true);
    expect(window.veryImminent).toBe(false);
  });

  it('includes events exactly at the caution boundaries', () => {
    const event = fomc('2026-10-30', '15:30');
    expect(computeEventWindow([event], new Date('2026-10-29T14:30:00Z')).imminent).toBe(true);
    expect(computeEventWindow([event], new Date('2026-10-30T02:30:00Z')).veryImminent).toBe(true);
  });

  it('does not silently shift an event in the nonexistent spring-forward hour', () => {
    const window = computeEventWindow([fomc('2026-03-29', '02:30')], new Date('2026-03-28T00:00:00Z'));
    expect(window.nextHighImpact).toBeNull();
  });
});

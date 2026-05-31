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

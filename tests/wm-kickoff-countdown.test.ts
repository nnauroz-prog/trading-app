import { describe, expect, it } from 'vitest';
import { computeKickoffCountdown } from '@/lib/sport/wm-kickoff-countdown';

describe('computeKickoffCountdown', () => {
  const noon = new Date('2026-06-11T12:00:00');

  it('3h 12min vor Anstoss', () => {
    const r = computeKickoffCountdown('2026-06-11', '15:12', noon);
    expect(r.status).toBe('vor-anstoss');
    expect(r.labelLong).toBe('in 3h 12min');
    expect(r.labelShort).toBe('3h 12m');
    expect(r.minutesUntilKickoff).toBe(192);
  });

  it('Genau zum Anstoss = laeuft seit 0 min', () => {
    const r = computeKickoffCountdown('2026-06-11', '12:00', noon);
    expect(r.status).toBe('laeuft');
    expect(r.labelLong).toBe('laeuft seit 0 min');
  });

  it('22 min nach Anstoss = laeuft', () => {
    const r = computeKickoffCountdown('2026-06-11', '11:38', noon);
    expect(r.status).toBe('laeuft');
    expect(r.labelLong).toBe('laeuft seit 22 min');
    expect(r.labelShort).toBe('+22m');
  });

  it('Weniger als 60 Minuten vor Anstoss zeigt min', () => {
    const r = computeKickoffCountdown('2026-06-11', '12:45', noon);
    expect(r.labelLong).toBe('in 45min');
    expect(r.labelShort).toBe('45m');
  });

  it('Tage vor Anstoss', () => {
    const r = computeKickoffCountdown('2026-06-15', '12:00', noon);
    expect(r.status).toBe('vor-anstoss');
    expect(r.labelLong).toContain('Tag');
    expect(r.minutesUntilKickoff).toBeGreaterThan(60 * 24 * 3);
  });

  it('Mehr als 110 min nach Anstoss = wahrscheinlich-vorbei', () => {
    const r = computeKickoffCountdown('2026-06-11', '10:00', noon);
    expect(r.status).toBe('wahrscheinlich-vorbei');
    expect(r.labelLong).toBe('vorbei — Endstand kommt');
    expect(r.labelShort).toBe('vorbei');
  });

  it('Time null -> Status vor-anstoss mit Hinweis "noch unklar"', () => {
    const r = computeKickoffCountdown('2026-06-11', null, noon);
    expect(r.status).toBe('vor-anstoss');
    expect(r.labelLong).toContain('unklar');
    expect(r.minutesUntilKickoff).toBeNull();
  });

  it('Fehlerhafte Zeit toleriert', () => {
    const r = computeKickoffCountdown('2026-06-11', '99:99', noon);
    expect(r.status).toBe('vor-anstoss');
    expect(r.labelLong).toContain('unklar');
  });

  it('Genau 90+ min nach Anstoss zaehlt noch als laeuft', () => {
    const r = computeKickoffCountdown('2026-06-11', '10:10', noon);
    expect(r.status).toBe('laeuft');
    expect(r.minutesSinceKickoff).toBe(110);
  });
});

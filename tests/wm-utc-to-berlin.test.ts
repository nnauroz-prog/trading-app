import { describe, expect, it } from 'vitest';
import { utcToBerlin } from '@/lib/sport/wm-utc-to-berlin';

describe('utcToBerlin', () => {
  it('Sommerzeit (CEST, UTC+2): 21:00 UTC -> 23:00 Berlin', () => {
    const r = utcToBerlin('2026-06-11', '21:00');
    expect(r.dateIso).toBe('2026-06-11');
    expect(r.time).toBe('23:00');
  });

  it('Sommerzeit: 22:00 UTC -> 00:00 naechster Tag Berlin', () => {
    const r = utcToBerlin('2026-06-11', '22:00');
    expect(r.dateIso).toBe('2026-06-12');
    expect(r.time).toBe('00:00');
  });

  it('Sommerzeit: 01:00 UTC -> 03:00 Berlin (selber Tag)', () => {
    const r = utcToBerlin('2026-06-13', '01:00');
    expect(r.dateIso).toBe('2026-06-13');
    expect(r.time).toBe('03:00');
  });

  it('Winterzeit (CET, UTC+1) — Beispiel: 23:00 UTC -> 00:00 naechster Tag', () => {
    const r = utcToBerlin('2026-01-15', '23:00');
    expect(r.dateIso).toBe('2026-01-16');
    expect(r.time).toBe('00:00');
  });

  it('time null -> bleibt null', () => {
    expect(utcToBerlin('2026-06-11', null).time).toBeNull();
  });

  it('Ungueltige Zeit -> unveraendert zurueck', () => {
    const r = utcToBerlin('2026-06-11', '99:99');
    expect(r.time).toBe('99:99');
  });

  it('Ungueltiges Datum -> unveraendert zurueck', () => {
    const r = utcToBerlin('06.11.2026', '21:00');
    expect(r.dateIso).toBe('06.11.2026');
  });

  it('Mitternacht UTC -> 02:00 Berlin (Sommer) — selber Tag', () => {
    const r = utcToBerlin('2026-06-12', '00:00');
    expect(r.dateIso).toBe('2026-06-12');
    expect(r.time).toBe('02:00');
  });
});

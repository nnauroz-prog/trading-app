import { describe, expect, it } from 'vitest';
import {
  wmTournamentPhase,
  isWmOver,
  daysSinceWmEnd,
  WM_START_ISO,
  WM_END_ISO
} from '@/lib/sport/wm-tournament-phase';

describe('wm-tournament-phase', () => {
  it('Start = Eroeffnung 11.06.2026, Ende = Finale 19.07.2026', () => {
    expect(WM_START_ISO).toBe('2026-06-11');
    expect(WM_END_ISO).toBe('2026-07-19');
  });

  it('vor der Eroeffnung: before', () => {
    expect(wmTournamentPhase('2026-05-01')).toBe('before');
    expect(wmTournamentPhase('2026-06-10')).toBe('before');
    expect(isWmOver('2026-05-01')).toBe(false);
  });

  it('am Eroeffnungstag und waehrend: during', () => {
    expect(wmTournamentPhase('2026-06-11')).toBe('during');
    expect(wmTournamentPhase('2026-07-01')).toBe('during');
    expect(wmTournamentPhase('2026-07-19')).toBe('during'); // Finaltag zaehlt noch
  });

  it('nach dem Finale: after', () => {
    expect(wmTournamentPhase('2026-07-20')).toBe('after');
    expect(wmTournamentPhase('2026-10-29')).toBe('after'); // der heutige Fall
    expect(isWmOver('2026-10-29')).toBe(true);
  });

  it('daysSinceWmEnd rechnet korrekt', () => {
    expect(daysSinceWmEnd('2026-07-19')).toBe(0);
    expect(daysSinceWmEnd('2026-07-20')).toBe(1);
    expect(daysSinceWmEnd('2026-07-18')).toBe(-1);
    // 29.10.2026 ist 102 Tage nach dem 19.07.2026
    expect(daysSinceWmEnd('2026-10-29')).toBe(102);
  });

  it('akzeptiert volle ISO-Timestamps (schneidet auf Datum)', () => {
    expect(wmTournamentPhase('2026-10-29T09:37:00.000Z')).toBe('after');
  });
});

import { describe, expect, it } from 'vitest';
import { WM_2026_PHASES, currentPhase, nextPhase } from '@/lib/sport/wm-phases';

describe('WM_2026_PHASES', () => {
  it('hat 7 Phasen', () => {
    expect(WM_2026_PHASES.length).toBe(7);
  });

  it('Match-Counts summieren sich auf 104', () => {
    const total = WM_2026_PHASES.reduce((s, p) => s + p.matchCount, 0);
    expect(total).toBe(104); // 72 + 16 + 8 + 4 + 2 + 1 + 1
  });

  it('Phasen sind chronologisch sortiert', () => {
    for (let i = 1; i < WM_2026_PHASES.length; i++) {
      expect(WM_2026_PHASES[i].startIso.localeCompare(WM_2026_PHASES[i - 1].startIso)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('currentPhase', () => {
  it('Gruppenphase am Eröffnungstag', () => {
    expect(currentPhase('2026-06-11')?.name).toBe('Gruppenphase');
  });

  it('null vor Turnier', () => {
    expect(currentPhase('2026-06-03')).toBe(null);
  });

  it('Finale am 19. Juli', () => {
    expect(currentPhase('2026-07-19')?.name).toBe('Finale');
  });

  it('null nach Turnier', () => {
    expect(currentPhase('2026-07-25')).toBe(null);
  });
});

describe('nextPhase', () => {
  it('Vor Eröffnung → Gruppenphase', () => {
    expect(nextPhase('2026-06-03')?.name).toBe('Gruppenphase');
  });

  it('Während Gruppenphase → Sechzehntelfinale', () => {
    expect(nextPhase('2026-06-20')?.name).toBe('Sechzehntelfinale');
  });

  it('Nach Finale → null', () => {
    expect(nextPhase('2026-07-25')).toBe(null);
  });
});

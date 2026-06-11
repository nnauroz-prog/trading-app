import { describe, expect, it } from 'vitest';
import { evaluateStakeWindow } from '@/lib/sport/wm-stake-window';

const now = new Date('2026-06-11T18:00:00');

describe('evaluateStakeWindow', () => {
  it('Vor Anstoss -> offen', () => {
    const w = evaluateStakeWindow('2026-06-11', '21:00', now);
    expect(w.open).toBe(true);
    expect(w.reason).toBeNull();
  });

  it('Spiel laeuft -> gesperrt mit Grund', () => {
    const w = evaluateStakeWindow('2026-06-11', '17:30', now);
    expect(w.open).toBe(false);
    expect(w.reason).toContain('laeuft');
  });

  it('Spiel vorbei -> gesperrt mit Grund', () => {
    const w = evaluateStakeWindow('2026-06-11', '14:00', now);
    expect(w.open).toBe(false);
    expect(w.reason).toContain('vorbei');
  });

  it('Keine Anstoss-Zeit -> offen (TBD blockiert nicht)', () => {
    const w = evaluateStakeWindow('2026-06-11', null, now);
    expect(w.open).toBe(true);
  });

  it('Morgen -> offen', () => {
    const w = evaluateStakeWindow('2026-06-12', '15:00', now);
    expect(w.open).toBe(true);
  });

  it('Exakt zum Anstoss -> gesperrt', () => {
    const w = evaluateStakeWindow('2026-06-11', '18:00', now);
    expect(w.open).toBe(false);
  });
});

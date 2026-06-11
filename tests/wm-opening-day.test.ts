import { describe, expect, it } from 'vitest';
import { detectWmPhase } from '@/lib/sport/wm-opening-day';
import type { WmFixture } from '@/lib/sport/wm-schedule-2026';

const schedule: WmFixture[] = [
  { id: 'a', date: '2026-06-11', time: '21:00', homeTeam: 'Mexiko', awayTeam: 'Suedafrika', venue: 'Mexico City', phase: 'Gruppe', group: 'A' },
  { id: 'b', date: '2026-06-12', time: '19:00', homeTeam: 'Spanien', awayTeam: 'Kap Verde', venue: 'Atlanta', phase: 'Gruppe', group: 'H' },
  { id: 'z', date: '2026-07-19', time: '21:00', homeTeam: 'Sieger HF1', awayTeam: 'Sieger HF2', venue: 'New York', phase: 'Finale' }
];

describe('detectWmPhase', () => {
  it('Vor WM = vor-wm', () => {
    const p = detectWmPhase('2026-06-10', schedule);
    expect(p.phase).toBe('vor-wm');
    expect(p.daysUntilOpening).toBe(1);
    expect(p.openingFixture?.homeTeam).toBe('Mexiko');
  });

  it('Am Eroeffnungstag = eroeffnungs-tag', () => {
    const p = detectWmPhase('2026-06-11', schedule);
    expect(p.phase).toBe('eroeffnungs-tag');
    expect(p.daysUntilOpening).toBe(0);
  });

  it('Tag 2 = wm-laeuft', () => {
    const p = detectWmPhase('2026-06-12', schedule);
    expect(p.phase).toBe('wm-laeuft');
  });

  it('Letzter Tag = wm-laeuft', () => {
    const p = detectWmPhase('2026-07-19', schedule);
    expect(p.phase).toBe('wm-laeuft');
  });

  it('Nach WM = wm-vorbei', () => {
    const p = detectWmPhase('2026-07-20', schedule);
    expect(p.phase).toBe('wm-vorbei');
  });

  it('openingDateIso + closingDateIso korrekt', () => {
    const p = detectWmPhase('2026-06-11', schedule);
    expect(p.openingDateIso).toBe('2026-06-11');
    expect(p.closingDateIso).toBe('2026-07-19');
  });

  it('Leere Schedule -> vor-wm', () => {
    const p = detectWmPhase('2026-06-11', []);
    expect(p.phase).toBe('vor-wm');
    expect(p.openingFixture).toBeNull();
  });
});

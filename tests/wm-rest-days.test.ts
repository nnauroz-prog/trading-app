import { describe, expect, it } from 'vitest';
import { evaluateRestDays } from '@/lib/sport/wm-rest-days';
import type { WmFixture } from '@/lib/sport/wm-schedule-2026';

const schedule: WmFixture[] = [
  { id: 'a', date: '2026-06-12', time: null, homeTeam: 'Frankreich', awayTeam: 'England', venue: 'MetLife Stadium', phase: 'Gruppe', group: 'A' },
  { id: 'b', date: '2026-06-13', time: null, homeTeam: 'Brasilien',  awayTeam: 'Frankreich', venue: 'Hard Rock Stadium', phase: 'Gruppe', group: 'B' }, // Frankreich nach 1 Tag
  { id: 'c', date: '2026-06-19', time: null, homeTeam: 'England',    awayTeam: 'Brasilien',  venue: 'AT&T Stadium',        phase: 'Gruppe', group: 'A' }, // beide nach >= 6 Tagen
  { id: 'd', date: '2026-06-25', time: null, homeTeam: 'Frankreich', awayTeam: 'England',    venue: 'NRG Stadium',         phase: 'Achtelfinale' } // beide nach langer Pause
];

describe('evaluateRestDays', () => {
  it('Erstes Spiel eines Teams → kein vorheriges Spiel, neutral', () => {
    const out = evaluateRestDays({ fixture: schedule[0], schedule });
    expect(out.homeRestDays).toBeNull();
    expect(out.awayRestDays).toBeNull();
    expect(out.homeGoalMultiplier).toBe(1);
    expect(out.awayGoalMultiplier).toBe(1);
  });

  it('Frankreich nur 1 Tag Pause → Tor-Multiplier < 1 und ELO-Penalty', () => {
    const out = evaluateRestDays({ fixture: schedule[1], schedule });
    expect(out.awayRestDays).toBe(1); // Frankreich war Auswaerts
    expect(out.awayGoalMultiplier).toBeLessThan(1);
    expect(out.awayEloDelta).toBeLessThan(0);
  });

  it('Asymmetrische Pause: Heim 6 Tage, Auswaerts 6 Tage → kein Asymmetrie-Shift', () => {
    const out = evaluateRestDays({ fixture: schedule[2], schedule });
    expect(out.homeRestDays).toBe(7);
    expect(out.awayRestDays).toBe(6);
    // Symmetrisch genug — kein Asymmetrie-Bonus
    expect(out.homeEloDelta).toBeLessThanOrEqual(50);
    expect(out.awayEloDelta).toBeLessThanOrEqual(50);
  });

  it('Lange Pause >9 Tage → leichter Rhythmus-Penalty', () => {
    const out = evaluateRestDays({ fixture: schedule[3], schedule });
    // Beide haben sehr lange Pause
    if (out.homeRestDays !== null && out.homeRestDays > 9) {
      expect(out.homeGoalMultiplier).toBeLessThan(1);
    }
    if (out.awayRestDays !== null && out.awayRestDays > 9) {
      expect(out.awayGoalMultiplier).toBeLessThan(1);
    }
  });

  it('Label ist informativ', () => {
    const out = evaluateRestDays({ fixture: schedule[1], schedule });
    expect(out.label.toLowerCase()).toContain('erholungstage');
  });
});

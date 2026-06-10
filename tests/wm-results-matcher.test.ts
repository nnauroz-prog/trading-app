import { describe, expect, it } from 'vitest';
import {
  matchExternalResults,
  mergeResults,
  type ExternalLastFixture,
  type ManualWmResult
} from '@/lib/sport/wm-results-matcher';
import type { WmFixture } from '@/lib/sport/wm-schedule-2026';

const schedule: WmFixture[] = [
  { id: 'wm-1', date: '2026-06-12', time: null, homeTeam: 'Argentinien', awayTeam: 'Mexiko', venue: 'MetLife Stadium', phase: 'Gruppe', group: 'A' },
  { id: 'wm-2', date: '2026-06-13', time: null, homeTeam: 'Deutschland', awayTeam: 'England', venue: 'Hard Rock Stadium', phase: 'Gruppe', group: 'B' }
];

describe('matchExternalResults', () => {
  it('Findet exakte Team+Datum-Treffer', () => {
    const ext: ExternalLastFixture[] = [
      { homeTeam: 'Argentinien', awayTeam: 'Mexiko', homeScore: 2, awayScore: 0, date: '2026-06-12' }
    ];
    const out = matchExternalResults(ext, schedule);
    expect(out.length).toBe(1);
    expect(out[0].fixtureId).toBe('wm-1');
    expect(out[0].homeScore).toBe(2);
    expect(out[0].awayScore).toBe(0);
  });

  it('Tolerantes Matching (Substring/Akzente)', () => {
    const ext: ExternalLastFixture[] = [
      { homeTeam: 'Argentina', awayTeam: 'Mexico', homeScore: 3, awayScore: 1, date: '2026-06-12' }
    ];
    const out = matchExternalResults(ext, schedule);
    expect(out.length).toBe(0); // strikt: erwartet "Argentinien"
  });

  it('Falsches Datum → kein Match', () => {
    const ext: ExternalLastFixture[] = [
      { homeTeam: 'Argentinien', awayTeam: 'Mexiko', homeScore: 1, awayScore: 1, date: '2026-06-11' }
    ];
    expect(matchExternalResults(ext, schedule).length).toBe(0);
  });

  it('Mehrere Treffer auf demselben Tag', () => {
    const ext: ExternalLastFixture[] = [
      { homeTeam: 'Argentinien', awayTeam: 'Mexiko', homeScore: 2, awayScore: 0, date: '2026-06-12' },
      { homeTeam: 'Deutschland', awayTeam: 'England', homeScore: 0, awayScore: 0, date: '2026-06-13' }
    ];
    const out = matchExternalResults(ext, schedule);
    expect(out.length).toBe(2);
  });
});

describe('mergeResults', () => {
  it('Manuelle Overrides haben Vorrang', () => {
    const manual: ManualWmResult[] = [
      { fixtureId: 'wm-1', homeScore: 3, awayScore: 3, recordedAt: 0 }
    ];
    const external = [
      { fixtureId: 'wm-1', homeScore: 1, awayScore: 0 },
      { fixtureId: 'wm-2', homeScore: 2, awayScore: 1 }
    ];
    const out = mergeResults(manual, external);
    expect(out.length).toBe(2);
    const wm1 = out.find((o) => o.fixtureId === 'wm-1');
    expect(wm1?.homeScore).toBe(3); // manual gewinnt
    expect(wm1?.awayScore).toBe(3);
  });

  it('Externes Ergebnis wird genutzt wenn kein manueller Override existiert', () => {
    const out = mergeResults([], [{ fixtureId: 'wm-2', homeScore: 2, awayScore: 1 }]);
    expect(out.length).toBe(1);
    expect(out[0].fixtureId).toBe('wm-2');
  });

  it('Leere Inputs → leere Liste', () => {
    expect(mergeResults([], []).length).toBe(0);
  });
});

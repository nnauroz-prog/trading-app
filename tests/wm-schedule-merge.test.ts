import { describe, expect, it } from 'vitest';
import { mergeWmFixtures } from '@/lib/sport/wm-schedule-merge';
import type { WmFixture } from '@/lib/sport/wm-schedule-2026';

const staticSchedule: WmFixture[] = [
  { id: 's-1', date: '2026-06-11', time: '21:00', homeTeam: 'Mexiko', awayTeam: 'Südafrika', venue: 'Mexico City', phase: 'Gruppe', group: 'A', sourceConfidence: 'official' },
  { id: 's-2', date: '2026-06-12', time: '19:00', homeTeam: 'Kanada', awayTeam: 'Bosnien-Herzegowina', venue: 'Toronto', phase: 'Gruppe', group: 'B', sourceConfidence: 'official' },
  { id: 's-r16', date: '2026-06-28', time: '18:00', homeTeam: 'Sieger Gruppe A', awayTeam: 'Zweiter Gruppe B', venue: 'Houston', phase: 'Achtelfinale' }
];

describe('mergeWmFixtures', () => {
  it('Statische Eintraege bleiben unveraendert dabei', () => {
    const merged = mergeWmFixtures(staticSchedule, []);
    expect(merged.length).toBe(3);
    expect(merged[0].id).toBe('s-1');
  });

  it('Live-Eintrag fuer existierende Paarung wird NICHT dupliziert', () => {
    const live: WmFixture[] = [
      { id: 'tsdb-9999', date: '2026-06-11', time: '21:00', homeTeam: 'Mexiko', awayTeam: 'Südafrika', venue: '', phase: 'Gruppe', group: 'A' }
    ];
    const merged = mergeWmFixtures(staticSchedule, live);
    expect(merged.length).toBe(3);
    expect(merged[0].id).toBe('s-1');
  });

  it('Live-Eintrag mit neuer Paarung wird aufgenommen', () => {
    const live: WmFixture[] = [
      { id: 'tsdb-1', date: '2026-06-18', time: '15:00', homeTeam: 'Mexiko', awayTeam: 'Südkorea', venue: '', phase: 'Gruppe', group: 'A' }
    ];
    const merged = mergeWmFixtures(staticSchedule, live);
    expect(merged.length).toBe(4);
    expect(merged[3].homeTeam).toBe('Mexiko');
    expect(merged[3].awayTeam).toBe('Südkorea');
  });

  it('Reihenfolge der Teams in der Paarung ist egal (Heim/Auswaerts vertauscht)', () => {
    const live: WmFixture[] = [
      { id: 'tsdb-1', date: '2026-06-11', time: '21:00', homeTeam: 'Südafrika', awayTeam: 'Mexiko', venue: '', phase: 'Gruppe', group: 'A' }
    ];
    const merged = mergeWmFixtures(staticSchedule, live);
    expect(merged.length).toBe(3);
  });

  it('Umlaute / Diakritika werden beim Vergleich normalisiert', () => {
    const live: WmFixture[] = [
      { id: 'tsdb-1', date: '2026-06-11', time: '21:00', homeTeam: 'Mexico', awayTeam: 'South Africa', venue: '', phase: 'Gruppe', group: 'A' }
    ];
    // Mexico/Suedafrika != Mexiko/Suedafrika (verschiedene Schreibweisen)
    // -> aktuell wird das als NEU erkannt, weil die Namen nicht uebereinstimmen.
    // Der Test dokumentiert: Normalisierung greift nur fuer Diakritika,
    // nicht fuer Sprach-Aliase. Aliase muessen vom Caller normalisiert werden.
    const merged = mergeWmFixtures(staticSchedule, live);
    expect(merged.length).toBe(4);
  });

  it('TBD-Live-Eintraege werden komplett ignoriert', () => {
    const live: WmFixture[] = [
      { id: 'tsdb-tbd', date: '2026-06-28', time: '18:00', homeTeam: 'TBD', awayTeam: 'Sieger Gruppe X', venue: '', phase: 'Achtelfinale' }
    ];
    const merged = mergeWmFixtures(staticSchedule, live);
    expect(merged.length).toBe(3);
  });

  it('TBD-Eintraege in statischer Schedule blockieren keine konkreten Live-Paarungen', () => {
    // Achtelfinale ist TBD ("Sieger Gruppe A"), eine echte Achtelfinal-
    // Paarung von TheSportsDB muss durchkommen.
    const live: WmFixture[] = [
      { id: 'tsdb-1', date: '2026-06-28', time: '18:00', homeTeam: 'Mexiko', awayTeam: 'Schweiz', venue: 'Houston', phase: 'Achtelfinale' }
    ];
    const merged = mergeWmFixtures(staticSchedule, live);
    expect(merged.length).toBe(4);
  });

  it('Mehrere Live-Eintraege mit derselben Paarung werden nur einmal aufgenommen', () => {
    const live: WmFixture[] = [
      { id: 'tsdb-1', date: '2026-06-18', time: '15:00', homeTeam: 'Mexiko', awayTeam: 'Südkorea', venue: '', phase: 'Gruppe', group: 'A' },
      { id: 'tsdb-2', date: '2026-06-18', time: '15:00', homeTeam: 'Mexiko', awayTeam: 'Südkorea', venue: '', phase: 'Gruppe', group: 'A' }
    ];
    const merged = mergeWmFixtures(staticSchedule, live);
    expect(merged.length).toBe(4);
  });

  it('Leere Inputs -> leere Liste', () => {
    expect(mergeWmFixtures([], []).length).toBe(0);
  });
});

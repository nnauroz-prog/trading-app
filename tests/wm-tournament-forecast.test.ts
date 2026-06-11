import { describe, expect, it } from 'vitest';
import { buildWmTournamentForecast } from '@/lib/sport/wm-tournament-forecast';
import type { WmFixture } from '@/lib/sport/wm-schedule-2026';

// Minimaler 2-Gruppen-Schedule + 1 Achtelfinale + Finale fuer
// isolierte Tests. Gruppen-Vier-Mannschaften, jede Paarung nur 1x.
function buildTestSchedule(): WmFixture[] {
  return [
    // Gruppe A: 4 Teams (Spanien, Frankreich, Kap Verde, Suedafrika)
    { id: 'a-1', date: '2026-06-15', time: '19:00', homeTeam: 'Spanien', awayTeam: 'Suedafrika', venue: '', phase: 'Gruppe', group: 'A' },
    { id: 'a-2', date: '2026-06-15', time: '22:00', homeTeam: 'Frankreich', awayTeam: 'Kap Verde', venue: '', phase: 'Gruppe', group: 'A' },
    { id: 'a-3', date: '2026-06-20', time: '19:00', homeTeam: 'Spanien', awayTeam: 'Frankreich', venue: '', phase: 'Gruppe', group: 'A' },
    // Gruppe B: 4 Teams
    { id: 'b-1', date: '2026-06-16', time: '19:00', homeTeam: 'Brasilien', awayTeam: 'Norwegen', venue: '', phase: 'Gruppe', group: 'B' },
    { id: 'b-2', date: '2026-06-16', time: '22:00', homeTeam: 'Argentinien', awayTeam: 'Marokko', venue: '', phase: 'Gruppe', group: 'B' },
    { id: 'b-3', date: '2026-06-21', time: '19:00', homeTeam: 'Brasilien', awayTeam: 'Argentinien', venue: '', phase: 'Gruppe', group: 'B' },
    // KO mit Platzhaltern
    { id: 'wm-r16-1', date: '2026-06-28', time: '18:00', homeTeam: 'Sieger Gruppe A', awayTeam: 'Zweiter Gruppe B', venue: '', phase: 'Achtelfinale' },
    { id: 'wm-final', date: '2026-07-19', time: '21:00', homeTeam: 'Sieger AF1', awayTeam: 'Sieger AF1', venue: '', phase: 'Finale' }
  ];
}

describe('buildWmTournamentForecast', () => {
  it('Erkennt 2 Gruppen mit jeweils 4 Teams (Lookup disabled)', () => {
    const fc = buildWmTournamentForecast({ schedule: buildTestSchedule(), useGroupDrawLookup: false });
    expect(fc.groups.length).toBe(2);
    expect(fc.groups[0].group).toBe('A');
    expect(fc.groups[1].group).toBe('B');
    expect(fc.groups[0].table.length).toBe(4);
  });

  it('Gruppen-Tabelle ist nach Punkten sortiert (Sieger zuerst)', () => {
    const fc = buildWmTournamentForecast({ schedule: buildTestSchedule(), useGroupDrawLookup: false });
    const a = fc.groups[0];
    for (let i = 1; i < a.table.length; i++) {
      expect(a.table[i - 1].expectedPoints).toBeGreaterThanOrEqual(a.table[i].expectedPoints);
    }
  });

  it('Top 2 jeder Gruppe sind im advancing-Array', () => {
    const fc = buildWmTournamentForecast({ schedule: buildTestSchedule(), useGroupDrawLookup: false });
    for (const g of fc.groups) {
      expect(g.advancing.length).toBe(2);
      expect(g.advancing[0]).toBe(g.table[0].team);
      expect(g.advancing[1]).toBe(g.table[1].team);
    }
  });

  it('Achtelfinale loest Sieger Gruppe A vs Zweiter Gruppe B auf', () => {
    const fc = buildWmTournamentForecast({ schedule: buildTestSchedule(), useGroupDrawLookup: false });
    const r16 = fc.ko.find((k) => k.fixtureId === 'wm-r16-1');
    expect(r16).toBeDefined();
    expect(r16!.homeTeam).toBe(fc.groups[0].table[0].team);
    expect(r16!.awayTeam).toBe(fc.groups[1].table[1].team);
    expect(r16!.predictedWinner).not.toBeNull();
  });

  it('Finale baut auf Sieger AF1 auf -> championPick gesetzt', () => {
    const fc = buildWmTournamentForecast({ schedule: buildTestSchedule(), useGroupDrawLookup: false });
    expect(fc.championPick).not.toBeNull();
    const r16 = fc.ko.find((k) => k.fixtureId === 'wm-r16-1');
    expect(fc.championPick).toBe(r16!.predictedWinner);
  });

  it('Gruppen-Forecast ignoriert Gruppen mit < 4 Teams (Lookup disabled)', () => {
    const partial: WmFixture[] = [
      { id: 'a-1', date: '2026-06-15', time: '19:00', homeTeam: 'Spanien', awayTeam: 'Suedafrika', venue: '', phase: 'Gruppe', group: 'A' }
    ];
    const fc = buildWmTournamentForecast({ schedule: partial, useGroupDrawLookup: false });
    expect(fc.groups.length).toBe(0);
  });

  it('Auf dem echten Schedule liefert die Lib mindestens 1 Gruppe', () => {
    const fc = buildWmTournamentForecast();
    expect(fc.groups.length).toBeGreaterThanOrEqual(1);
  });

  it('Predicted Winner ist immer einer der beiden Teams', () => {
    const fc = buildWmTournamentForecast();
    for (const k of fc.ko) {
      if (k.homeTeam && k.awayTeam) {
        expect([k.homeTeam, k.awayTeam]).toContain(k.predictedWinner);
        expect(k.predictedLoser).not.toBe(k.predictedWinner);
      }
    }
  });

  it('Auslosungs-Lookup deckt alle 12 Gruppen ab', () => {
    const fc = buildWmTournamentForecast();
    expect(fc.groups.length).toBe(12);
    expect(fc.incompleteGroups.length).toBe(0);
  });

  it('championPick ist gesetzt — komplette Bracket-Kette resolvbar', () => {
    const fc = buildWmTournamentForecast();
    expect(fc.championPick).not.toBeNull();
    // Finale-Sieger muss ein real existierendes Team sein.
    expect(typeof fc.championPick).toBe('string');
    expect(fc.championPick!.length).toBeGreaterThan(2);
  });
});

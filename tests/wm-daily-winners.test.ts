import { describe, expect, it } from 'vitest';
import { buildWmDailyWinners } from '@/lib/sport/wm-daily-winners';

describe('buildWmDailyWinners (echter Schedule)', () => {
  const result = buildWmDailyWinners();

  it('Liefert Zeilen fuer Gruppen- UND KO-Spiele', () => {
    const phases = new Set(result.rows.map((r) => r.phase));
    expect(phases.has('Gruppe')).toBe(true);
    expect(phases.has('Achtelfinale')).toBe(true);
    expect(phases.has('Finale')).toBe(true);
  });

  it('Chronologisch sortiert (Datum aufsteigend)', () => {
    for (let i = 1; i < result.rows.length; i++) {
      const prev = result.rows[i - 1];
      const cur = result.rows[i];
      const prevKey = `${prev.dateIso}T${prev.time ?? '99:99'}`;
      const curKey = `${cur.dateIso}T${cur.time ?? '99:99'}`;
      expect(prevKey <= curKey).toBe(true);
    }
  });

  it('Jede Zeile hat Gewinner und Verlierer', () => {
    for (const r of result.rows) {
      expect(r.winner.length).toBeGreaterThan(1);
      expect(r.loser.length).toBeGreaterThan(1);
      expect(r.winner).not.toBe(r.loser);
    }
  });

  it('KO-Zeilen sind als projizierte Paarungen markiert', () => {
    const ko = result.rows.filter((r) => r.phase !== 'Gruppe');
    expect(ko.length).toBeGreaterThanOrEqual(8 + 4 + 2 + 1 + 1);
    expect(ko.every((r) => r.isProjectedPairing)).toBe(true);
  });

  it('Gruppen-Zeilen sind echte Paarungen', () => {
    const gr = result.rows.filter((r) => r.phase === 'Gruppe');
    expect(gr.length).toBeGreaterThan(10);
    expect(gr.every((r) => !r.isProjectedPairing)).toBe(true);
  });

  it('championPick gesetzt und identisch mit dem Finale-Gewinner', () => {
    const finale = result.rows.find((r) => r.phase === 'Finale');
    expect(result.championPick).not.toBeNull();
    expect(finale?.winner).toBe(result.championPick);
  });

  it('Erstes Spiel ist die Eroeffnung am 11.06.', () => {
    expect(result.rows[0].dateIso).toBe('2026-06-11');
  });

  it('Ohne Endstand -> result null', () => {
    expect(result.rows.every((r) => r.result === null)).toBe(true);
  });

  it('Endstand bei Sieger-Treffer = "treffer"', () => {
    const wm1 = result.rows.find((r) => r.fixtureId === 'wm-1')!;
    const finished = [{ fixtureId: 'wm-1', homeScore: 3, awayScore: 0 }];
    const r = buildWmDailyWinners({ finished });
    const row = r.rows.find((x) => x.fixtureId === 'wm-1')!;
    expect(row.result).not.toBeNull();
    expect(row.result?.outcome).toBe('treffer');
    expect(row.result?.homeScore).toBe(3);
    expect(row.winner).toBe(wm1.winner);
  });

  it('Endstand bei Sieger-Fehl = "daneben"', () => {
    const r = buildWmDailyWinners({
      finished: [{ fixtureId: 'wm-1', homeScore: 0, awayScore: 2 }]
    });
    const row = r.rows.find((x) => x.fixtureId === 'wm-1')!;
    expect(row.result?.outcome).toBe('daneben');
  });

  it('Remis = "remis-push"', () => {
    const r = buildWmDailyWinners({
      finished: [{ fixtureId: 'wm-1', homeScore: 1, awayScore: 1 }]
    });
    const row = r.rows.find((x) => x.fixtureId === 'wm-1')!;
    expect(row.result?.outcome).toBe('remis-push');
  });
});

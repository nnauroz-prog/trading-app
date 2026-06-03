import { describe, expect, it } from 'vitest';
import { evaluateTip, summariseTips, TipJournalEntry } from '@/lib/sport/tip-journal';

function entry(over: Partial<TipJournalEntry>): TipJournalEntry {
  return {
    id: 'x', fixtureId: 'fx', recordedAt: Date.now(),
    league: 'L', date: '2026-05-01', homeTeam: 'A', awayTeam: 'B',
    tier: 'standard', market: 'Heimsieg A', modelProbabilityPct: 60,
    outcome: 'pending',
    ...over
  };
}

describe('evaluateTip', () => {
  it('exact score win', () => {
    expect(evaluateTip('Ergebnis 2:1', 'A', 'B', 2, 1)).toBe('win');
    expect(evaluateTip('Ergebnis 2:1', 'A', 'B', 3, 1)).toBe('loss');
  });
  it('Over 2.5 Tore', () => {
    expect(evaluateTip('Over 2.5 Tore', 'A', 'B', 2, 1)).toBe('win');
    expect(evaluateTip('Over 2.5 Tore', 'A', 'B', 1, 1)).toBe('loss');
  });
  it('Under 2.5 Tore', () => {
    expect(evaluateTip('Under 2.5 Tore', 'A', 'B', 1, 1)).toBe('win');
    expect(evaluateTip('Under 2.5 Tore', 'A', 'B', 2, 1)).toBe('loss');
  });
  it('Beide Teams treffen', () => {
    expect(evaluateTip('Beide Teams treffen', 'A', 'B', 1, 1)).toBe('win');
    expect(evaluateTip('Beide Teams treffen', 'A', 'B', 1, 0)).toBe('loss');
  });
  it('Beide Teams treffen NICHT', () => {
    expect(evaluateTip('Beide Teams treffen NICHT', 'A', 'B', 1, 0)).toBe('win');
    expect(evaluateTip('Beide Teams treffen NICHT', 'A', 'B', 1, 1)).toBe('loss');
  });
  it('1X / X2 / 12 double chance', () => {
    expect(evaluateTip('1X (A oder Unentschieden)', 'A', 'B', 2, 1)).toBe('win'); // home win
    expect(evaluateTip('1X (A oder Unentschieden)', 'A', 'B', 1, 1)).toBe('win'); // draw
    expect(evaluateTip('1X (A oder Unentschieden)', 'A', 'B', 0, 1)).toBe('loss');
    expect(evaluateTip('X2 (B oder Unentschieden)', 'A', 'B', 0, 1)).toBe('win');
    expect(evaluateTip('12 (kein Unentschieden)', 'A', 'B', 1, 1)).toBe('loss');
  });
  it('Heimsieg / Auswärtssieg / Unentschieden', () => {
    expect(evaluateTip('Heimsieg A', 'A', 'B', 2, 1)).toBe('win');
    expect(evaluateTip('Unentschieden', 'A', 'B', 1, 1)).toBe('win');
    expect(evaluateTip('Auswärtssieg B', 'A', 'B', 0, 1)).toBe('win');
  });
});

describe('summariseTips', () => {
  it('counts wins, losses, pending across tiers', () => {
    const log: TipJournalEntry[] = [
      entry({ id: '1', tier: 'konservativ', outcome: 'win' }),
      entry({ id: '2', tier: 'konservativ', outcome: 'loss' }),
      entry({ id: '3', tier: 'standard', outcome: 'win' }),
      entry({ id: '4', tier: 'risiko', outcome: 'pending' })
    ];
    const s = summariseTips(log);
    expect(s.total).toBe(4);
    expect(s.pending).toBe(1);
    expect(s.wins).toBe(2);
    expect(s.losses).toBe(1);
    expect(s.hitRatePct).toBe(67);
    expect(s.byTier.konservativ.hitRatePct).toBe(50);
    expect(s.byTier.standard.hitRatePct).toBe(100);
  });

  it('splittet Trefferquote pro Quality-Band', () => {
    const log: TipJournalEntry[] = [
      entry({ id: '1', qualityBand: 'sehr_stark', outcome: 'win' }),
      entry({ id: '2', qualityBand: 'sehr_stark', outcome: 'win' }),
      entry({ id: '3', qualityBand: 'sehr_stark', outcome: 'loss' }),
      entry({ id: '4', qualityBand: 'orientierung', outcome: 'loss' }),
      entry({ id: '5', qualityBand: 'orientierung', outcome: 'loss' }),
      entry({ id: '6', qualityBand: 'brauchbar', outcome: 'pending' })
    ];
    const s = summariseTips(log);
    expect(s.byQualityBand.sehr_stark.resolved).toBe(3);
    expect(s.byQualityBand.sehr_stark.hitRatePct).toBe(67);
    expect(s.byQualityBand.orientierung.hitRatePct).toBe(0);
    expect(s.byQualityBand.brauchbar.resolved).toBe(0);
    expect(s.byQualityBand.stark.resolved).toBe(0);
  });

  it('Quality-Band-Bucket bleibt leer wenn Felder fehlen (Legacy-Einträge)', () => {
    const log: TipJournalEntry[] = [
      entry({ id: '1', outcome: 'win' }),
      entry({ id: '2', outcome: 'loss' })
    ];
    const s = summariseTips(log);
    expect(s.byQualityBand.sehr_stark.resolved).toBe(0);
    expect(s.byQualityBand.orientierung.resolved).toBe(0);
  });
});

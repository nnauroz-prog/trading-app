import { describe, expect, it } from 'vitest';
import { tipJournalToCsv } from '@/lib/sport/tip-journal-csv';
import type { TipJournalEntry } from '@/lib/sport/tip-journal';

function entry(over: Partial<TipJournalEntry>): TipJournalEntry {
  return {
    id: 'x', fixtureId: 'fx', recordedAt: 0,
    league: 'Bundesliga', date: '2026-05-15', homeTeam: 'Bayern', awayTeam: 'BVB',
    tier: 'standard', market: 'Heimsieg Bayern', modelProbabilityPct: 65,
    outcome: 'pending',
    ...over
  };
}

describe('tipJournalToCsv', () => {
  it('hat Header-Zeile mit allen 14 Spalten', () => {
    const csv = tipJournalToCsv([]);
    const header = csv.split('\n')[0].split(',');
    expect(header.length).toBe(14);
    expect(header).toContain('date');
    expect(header).toContain('qualityScore');
    expect(header).toContain('outcome');
  });

  it('serialisiert einen Eintrag korrekt', () => {
    const csv = tipJournalToCsv([entry({
      id: '1',
      qualityScore: 78,
      qualityBand: 'stark',
      outcome: 'win',
      finalHomeScore: 2,
      finalAwayScore: 1,
      resolvedAt: new Date('2026-05-15T18:00:00Z').getTime()
    })]);
    const lines = csv.split('\n');
    expect(lines.length).toBe(2);
    expect(lines[1]).toContain('Bayern');
    expect(lines[1]).toContain('78');
    expect(lines[1]).toContain('win');
  });

  it('escapt Kommata im Marktnamen mit Anführungszeichen', () => {
    const csv = tipJournalToCsv([entry({ market: 'Tipp, mit Komma' })]);
    const dataLine = csv.split('\n')[1];
    expect(dataLine).toContain('"Tipp, mit Komma"');
  });

  it('escapt eingebettete Anführungszeichen', () => {
    const csv = tipJournalToCsv([entry({ homeTeam: 'Team "Spezial"' })]);
    const dataLine = csv.split('\n')[1];
    expect(dataLine).toContain('"Team ""Spezial"""');
  });

  it('leere undefined-Felder werden zu leerem String', () => {
    const csv = tipJournalToCsv([entry({ qualityScore: undefined, resolvedAt: undefined })]);
    const dataLine = csv.split('\n')[1].split(',');
    expect(dataLine[6]).toBe(''); // qualityScore
    expect(dataLine[13]).toBe(''); // resolvedAt
  });
});

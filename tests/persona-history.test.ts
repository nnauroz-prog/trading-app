import { describe, expect, it } from 'vitest';
import { sliceLastDays, type HistoryEntry } from '@/lib/agents/persona-history';

function entry(date: string, klass: string, persona: string, verdict: string): HistoryEntry {
  return { dateIso: date, klass, personaId: persona, verdict, targetLabel: null };
}

describe('sliceLastDays', () => {
  it('leere Historie → leeres Array', () => {
    expect(sliceLastDays([], 7, '2026-06-09')).toEqual([]);
  });

  it('Einträge innerhalb des Fensters werden zurückgegeben', () => {
    const history = [
      entry('2026-06-09', 'Aktien', 'conservative', 'KAUFEN'),
      entry('2026-06-08', 'Aktien', 'conservative', 'WARTEN')
    ];
    const slices = sliceLastDays(history, 7, '2026-06-09');
    expect(slices).toHaveLength(1);
    expect(slices[0].entries).toHaveLength(2);
  });

  it('Einträge außerhalb des Fensters werden gefiltert', () => {
    const history = [
      entry('2026-06-01', 'Aktien', 'conservative', 'KAUFEN')
    ];
    const slices = sliceLastDays(history, 3, '2026-06-09');
    expect(slices).toEqual([]);
  });

  it('verschiedene Personas werden in eigene Slices gruppiert', () => {
    const history = [
      entry('2026-06-09', 'Aktien', 'conservative', 'KAUFEN'),
      entry('2026-06-09', 'Aktien', 'balanced', 'BEOBACHTEN'),
      entry('2026-06-09', 'Rohstoffe', 'conservative', 'WARTEN')
    ];
    const slices = sliceLastDays(history, 7, '2026-06-09');
    expect(slices).toHaveLength(3);
  });

  it('Entries pro Slice sind nach Datum aufsteigend sortiert', () => {
    const history = [
      entry('2026-06-09', 'Aktien', 'conservative', 'KAUFEN'),
      entry('2026-06-07', 'Aktien', 'conservative', 'WARTEN'),
      entry('2026-06-08', 'Aktien', 'conservative', 'BEOBACHTEN')
    ];
    const slices = sliceLastDays(history, 7, '2026-06-09');
    expect(slices[0].entries.map((e) => e.dateIso)).toEqual(['2026-06-07', '2026-06-08', '2026-06-09']);
  });

  it('ungültige Daten werden übersprungen', () => {
    const history = [
      entry('not-a-date', 'Aktien', 'conservative', 'KAUFEN'),
      entry('2026-06-09', 'Aktien', 'conservative', 'WARTEN')
    ];
    const slices = sliceLastDays(history, 7, '2026-06-09');
    expect(slices).toHaveLength(1);
    expect(slices[0].entries).toHaveLength(1);
  });
});

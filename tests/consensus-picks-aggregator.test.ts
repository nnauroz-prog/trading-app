import { describe, expect, it } from 'vitest';
import { aggregateConsensus, type PersonaPickEntry } from '@/lib/agents/consensus-picks-aggregator';

function pick(klass: PersonaPickEntry['klass'], persona: string, name: string, assetKey: string, label: string, verdict: string = 'KAUFEN'): PersonaPickEntry {
  return {
    klass, personaId: persona, personaName: name, verdict,
    assetKey, assetLabel: label, href: `/${klass.toLowerCase()}/${assetKey}`
  };
}

describe('aggregateConsensus', () => {
  it('leere Eingabe → leeres Array', () => {
    expect(aggregateConsensus([])).toEqual([]);
  });

  it('nur einzelne Picks → leeres Array (Default minPicks=2)', () => {
    const entries = [pick('Aktien', 'conservative', 'Konservativ', 'AAPL', 'Apple')];
    expect(aggregateConsensus(entries)).toEqual([]);
  });

  it('zwei Personas, gleicher Pick → eine Gruppe', () => {
    const entries = [
      pick('Aktien', 'conservative', 'Konservativ', 'AAPL', 'Apple'),
      pick('Aktien', 'balanced', 'Balanciert', 'AAPL', 'Apple')
    ];
    const groups = aggregateConsensus(entries);
    expect(groups).toHaveLength(1);
    expect(groups[0].picks).toHaveLength(2);
    expect(groups[0].assetLabel).toBe('Apple');
  });

  it('verschiedene Asset-Klassen mit gleichem assetKey werden NICHT zusammengeführt', () => {
    const entries = [
      pick('Aktien', 'c', 'K', 'X', 'Aktien-X'),
      pick('Rohstoffe', 'b', 'B', 'X', 'Rohstoff-X'),
      pick('Aktien', 'a', 'A', 'X', 'Aktien-X')
    ];
    const groups = aggregateConsensus(entries);
    expect(groups).toHaveLength(1);
    expect(groups[0].assetLabel).toBe('Aktien-X');
    expect(groups[0].picks).toHaveLength(2);
  });

  it('sortiert nach Pick-Zahl absteigend, dann alphabetisch', () => {
    const entries = [
      pick('Aktien', 'c', 'K', 'A', 'Apple'),
      pick('Aktien', 'b', 'B', 'A', 'Apple'),
      pick('Aktien', 'c', 'K', 'B', 'Bayer'),
      pick('Aktien', 'b', 'B', 'B', 'Bayer'),
      pick('Aktien', 'a', 'A', 'B', 'Bayer')
    ];
    const groups = aggregateConsensus(entries);
    expect(groups[0].assetLabel).toBe('Bayer'); // 3 Picks
    expect(groups[1].assetLabel).toBe('Apple'); // 2 Picks
  });

  it('minPicks=3 lässt nur Volle Konsens-Gruppen durch', () => {
    const entries = [
      pick('Aktien', 'a', 'A', 'X', 'X'),
      pick('Aktien', 'b', 'B', 'X', 'X')
    ];
    expect(aggregateConsensus(entries, 3)).toEqual([]);
  });

  it('alphabetische Sortierung bei Gleichstand', () => {
    const entries = [
      pick('Aktien', 'a', 'A', 'BB', 'Bayer'),
      pick('Aktien', 'b', 'B', 'BB', 'Bayer'),
      pick('Aktien', 'a', 'A', 'AA', 'Apple'),
      pick('Aktien', 'b', 'B', 'AA', 'Apple')
    ];
    const groups = aggregateConsensus(entries);
    expect(groups[0].assetLabel).toBe('Apple');
    expect(groups[1].assetLabel).toBe('Bayer');
  });
});

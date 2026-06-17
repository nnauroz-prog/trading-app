import { describe, it, expect } from 'vitest';
import { buildPayoffCompare } from '@/lib/optionsscheine/payoff-compare';
import { suggestOptionsscheine } from '@/lib/optionsscheine/suggest';

describe('buildPayoffCompare', () => {
  const baseSuggestions = suggestOptionsscheine({
    underlyingName: 'Apple',
    underlyingPrice: 295.96,
    direction: 'call',
    assetClass: 'aktie',
    today: new Date('2026-06-16T00:00:00Z')
  });

  it('liefert sieben Szenarien fuer -20/-10/-5/0/+5/+10/+20 %', () => {
    const rows = buildPayoffCompare({
      underlyingPrice: 295.96,
      suggestions: baseSuggestions,
      today: new Date('2026-06-16T00:00:00Z')
    });
    expect(rows.map((r) => r.underlyingDeltaPct)).toEqual([-20, -10, -5, 0, 5, 10, 20]);
  });

  it('Aktie macht 1:1 die Underlying-Bewegung mit', () => {
    const rows = buildPayoffCompare({
      underlyingPrice: 295.96,
      suggestions: baseSuggestions,
      today: new Date('2026-06-16T00:00:00Z')
    });
    for (const r of rows) {
      expect(r.aktiePct).toBe(r.underlyingDeltaPct);
    }
  });

  it('Schein-Werte sind im 0%-Szenario alle 0', () => {
    const rows = buildPayoffCompare({
      underlyingPrice: 295.96,
      suggestions: baseSuggestions,
      today: new Date('2026-06-16T00:00:00Z')
    });
    const zero = rows.find((r) => r.underlyingDeltaPct === 0)!;
    for (const k of Object.keys(zero.schein)) {
      expect(Math.abs(zero.schein[k])).toBeLessThan(0.001);
    }
  });

  it('Bei +20 % Underlying gewinnt der hoch-Schein prozentual MEHR als die Aktie', () => {
    const rows = buildPayoffCompare({
      underlyingPrice: 295.96,
      suggestions: baseSuggestions,
      today: new Date('2026-06-16T00:00:00Z')
    });
    const r = rows.find((x) => x.underlyingDeltaPct === 20)!;
    expect(r.schein.hoch).toBeGreaterThan(r.aktiePct);
  });

  it('Bei -20 % Underlying verliert der hoch-Schein DEUTLICH mehr als die Aktie', () => {
    const rows = buildPayoffCompare({
      underlyingPrice: 295.96,
      suggestions: baseSuggestions,
      today: new Date('2026-06-16T00:00:00Z')
    });
    const r = rows.find((x) => x.underlyingDeltaPct === -20)!;
    expect(r.schein.hoch).toBeLessThan(r.aktiePct);
  });

  it('Niedrig-Schein folgt der Aktie deutlich enger als hoch-Schein', () => {
    const rows = buildPayoffCompare({
      underlyingPrice: 295.96,
      suggestions: baseSuggestions,
      today: new Date('2026-06-16T00:00:00Z')
    });
    const up = rows.find((x) => x.underlyingDeltaPct === 10)!;
    // Hoch-Schein ist deutlich starker gehebelt
    expect(Math.abs(up.schein.hoch - up.aktiePct)).toBeGreaterThan(Math.abs(up.schein.niedrig - up.aktiePct));
  });

  it('liefert leere Liste bei ungueltigen Eingaben', () => {
    expect(buildPayoffCompare({ underlyingPrice: 0, suggestions: baseSuggestions })).toEqual([]);
    expect(buildPayoffCompare({ underlyingPrice: 100, suggestions: [] })).toEqual([]);
  });
});

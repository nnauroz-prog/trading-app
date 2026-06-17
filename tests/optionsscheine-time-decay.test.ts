import { describe, it, expect } from 'vitest';
import { buildTimeDecay } from '@/lib/optionsscheine/time-decay';
import { suggestOptionsscheine } from '@/lib/optionsscheine/suggest';

describe('buildTimeDecay', () => {
  const today = new Date('2026-06-16T00:00:00Z');
  const suggestions = suggestOptionsscheine({
    underlyingName: 'Apple',
    underlyingPrice: 295.96,
    direction: 'call',
    assetClass: 'aktie',
    today
  });

  it('liefert mehrere Snapshots fuer einen langlaufenden Schein', () => {
    const low = suggestions.find((s) => s.risk === 'niedrig')!;
    const rows = buildTimeDecay(low, today);
    expect(rows.length).toBeGreaterThan(3);
    expect(rows[0].days).toBe(0);
  });

  it('Heute-Snapshot hat 0 % Veraenderung', () => {
    const low = suggestions.find((s) => s.risk === 'niedrig')!;
    const rows = buildTimeDecay(low, today);
    expect(Math.abs(rows[0].premiumDeltaPct)).toBeLessThan(0.001);
  });

  it('Premium faellt monoton, wenn der Basiswert nicht bewegt wird', () => {
    const mid = suggestions.find((s) => s.risk === 'mittel')!;
    const rows = buildTimeDecay(mid, today);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].premium).toBeLessThanOrEqual(rows[i - 1].premium);
    }
  });

  it('Hoch-Risiko-Schein verliert deutlich mehr in den ersten 30 Tagen als Niedrig-Risiko', () => {
    const high = suggestions.find((s) => s.risk === 'hoch')!;
    const low = suggestions.find((s) => s.risk === 'niedrig')!;
    const highRows = buildTimeDecay(high, today);
    const lowRows = buildTimeDecay(low, today);
    const highAt30 = highRows.find((r) => r.days === 30);
    const lowAt30 = lowRows.find((r) => r.days === 30);
    if (highAt30 && lowAt30) {
      expect(highAt30.premiumDeltaPct).toBeLessThan(lowAt30.premiumDeltaPct);
    }
  });

  it('Schaut nicht ueber den Verfall hinaus', () => {
    const high = suggestions.find((s) => s.risk === 'hoch')!;
    const rows = buildTimeDecay(high, today);
    const totalDays = (new Date(high.expiryIso).getTime() - today.getTime()) / (24 * 60 * 60 * 1000);
    for (const r of rows) {
      expect(r.days).toBeLessThan(totalDays);
    }
  });
});

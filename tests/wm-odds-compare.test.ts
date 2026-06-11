import { describe, expect, it } from 'vitest';
import { compareWmOdds } from '@/lib/sport/wm-odds-compare';

describe('compareWmOdds', () => {
  it('Leere Liste -> leeres Result', () => {
    const r = compareWmOdds(60, []);
    expect(r.rows.length).toBe(0);
    expect(r.bestEdgePct).toBeNull();
    expect(r.spread).toBeNull();
  });

  it('Sortiert beste Quote zuerst', () => {
    const r = compareWmOdds(60, [
      { anbieter: 'A', decimalOdds: 1.80 },
      { anbieter: 'B', decimalOdds: 2.00 },
      { anbieter: 'C', decimalOdds: 1.90 }
    ]);
    expect(r.rows[0].anbieter).toBe('B');
    expect(r.rows[1].anbieter).toBe('C');
    expect(r.rows[2].anbieter).toBe('A');
  });

  it('Leader bekommt isLeader=true, andere false', () => {
    const r = compareWmOdds(60, [
      { anbieter: 'A', decimalOdds: 1.80 },
      { anbieter: 'B', decimalOdds: 2.00 }
    ]);
    expect(r.rows[0].isLeader).toBe(true);
    expect(r.rows[1].isLeader).toBe(false);
  });

  it('Bei Gleichstand sind mehrere Leader', () => {
    const r = compareWmOdds(60, [
      { anbieter: 'A', decimalOdds: 1.95 },
      { anbieter: 'B', decimalOdds: 1.95 },
      { anbieter: 'C', decimalOdds: 1.90 }
    ]);
    expect(r.rows[0].isLeader).toBe(true);
    expect(r.rows[1].isLeader).toBe(true);
    expect(r.rows[2].isLeader).toBe(false);
  });

  it('bestEdgePct wird aus der besten Quote berechnet', () => {
    const r = compareWmOdds(60, [
      { anbieter: 'A', decimalOdds: 1.67 },
      { anbieter: 'B', decimalOdds: 2.00 }
    ]);
    expect(r.bestEdgePct).toBe(20); // 2.00 * 0.60 - 1 = 0.20
  });

  it('Spread = beste - schlechteste', () => {
    const r = compareWmOdds(60, [
      { anbieter: 'A', decimalOdds: 1.80 },
      { anbieter: 'B', decimalOdds: 2.00 }
    ]);
    expect(r.spread).toBe(0.20);
  });

  it('Spread null bei < 2 gueltigen Eintraegen', () => {
    const r = compareWmOdds(60, [{ anbieter: 'A', decimalOdds: 1.80 }]);
    expect(r.spread).toBeNull();
  });

  it('Ungueltige Quoten werden gefiltert', () => {
    const r = compareWmOdds(60, [
      { anbieter: 'A', decimalOdds: 1.80 },
      { anbieter: 'B', decimalOdds: 1.0 }, // <= 1
      { anbieter: 'C', decimalOdds: NaN }
    ]);
    expect(r.rows.length).toBe(1);
    expect(r.rows[0].anbieter).toBe('A');
  });

  it('Jede Zeile hat einen Value-Check', () => {
    const r = compareWmOdds(60, [
      { anbieter: 'A', decimalOdds: 2.00 },
      { anbieter: 'B', decimalOdds: 1.40 }
    ]);
    expect(r.rows[0].value.verdict).toBe('value');
    expect(r.rows[1].value.verdict).toBe('unter-quote');
  });
});

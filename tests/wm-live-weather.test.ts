import { describe, expect, it } from 'vitest';
import { weatherFactor } from '@/lib/sport/wm-live-weather';
import type { WeatherSnapshot } from '@/lib/providers/open-meteo';

function snap(over: Partial<WeatherSnapshot> = {}): WeatherSnapshot {
  return {
    matchTimeUtc: 1_780_000_000_000,
    windKmh: 10,
    precipMm: 0,
    temperatureC: 22,
    forecastHourIso: '2026-06-15T19:00',
    ...over
  };
}

describe('weatherFactor', () => {
  it('null Snapshot → null (kein Fake-Wetter)', () => {
    expect(weatherFactor(null)).toBeNull();
  });

  it('Ruhiges Wetter → kein Faktor', () => {
    expect(weatherFactor(snap())).toBeNull();
  });

  it('Starker Regen (>=5 mm/h) → -8 % beidseitig + Confidence-Drop', () => {
    const f = weatherFactor(snap({ precipMm: 6 }));
    expect(f).not.toBeNull();
    expect(f!.homeGoalMultiplier).toBeCloseTo(0.92, 2);
    expect(f!.awayGoalMultiplier).toBeCloseTo(0.92, 2);
    expect(f!.confidenceShift).toBeLessThan(0);
  });

  it('Leichter Regen (2-5 mm/h) → -3 %', () => {
    const f = weatherFactor(snap({ precipMm: 3 }));
    expect(f!.homeGoalMultiplier).toBeCloseTo(0.97, 2);
  });

  it('Starker Wind (>=28 km/h) → -5 %', () => {
    const f = weatherFactor(snap({ windKmh: 30 }));
    expect(f!.homeGoalMultiplier).toBeCloseTo(0.95, 2);
  });

  it('Live-Hitze (>=32 °C) → -4 %', () => {
    const f = weatherFactor(snap({ temperatureC: 34 }));
    expect(f!.homeGoalMultiplier).toBeCloseTo(0.96, 2);
  });

  it('Kombination Regen + Wind multipliziert', () => {
    const f = weatherFactor(snap({ precipMm: 6, windKmh: 30 }));
    // 0.92 * 0.95 = 0.874
    expect(f!.homeGoalMultiplier).toBeCloseTo(0.874, 2);
  });

  it('ELO-Delta bleibt 0 — Wetter trifft beide Seiten gleich', () => {
    const f = weatherFactor(snap({ precipMm: 8, windKmh: 40, temperatureC: 35 }));
    expect(f!.homeEloDelta).toBe(0);
    expect(f!.awayEloDelta).toBe(0);
  });

  it('Faktor-ID ist weather (Lern-System-Schluessel)', () => {
    const f = weatherFactor(snap({ precipMm: 6 }));
    expect(f!.id).toBe('weather');
  });

  it('Label enthaelt Forecast-Zeitpunkt + konkrete Werte', () => {
    const f = weatherFactor(snap({ precipMm: 6.5 }));
    expect(f!.label).toContain('2026-06-15T19:00');
    expect(f!.label).toContain('6.5');
  });
});

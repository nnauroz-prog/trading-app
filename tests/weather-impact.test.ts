import { describe, expect, it } from 'vitest';
import { scoreWeatherImpact } from '@/lib/sport/weather-impact';
import { lookupStadium, normalizeTeamName } from '@/lib/sport/stadium-coords';

describe('scoreWeatherImpact', () => {
  it('null Snapshot → neutral', () => {
    const out = scoreWeatherImpact(null);
    expect(out.lambdaMultiplier).toBe(1.0);
    expect(out.riskLabel).toBe('normal');
    expect(out.factors[0]).toContain('Wetterneutral');
  });

  it('normales Wetter → neutral, faktor-text erklaerend', () => {
    const out = scoreWeatherImpact({
      matchTimeUtc: 0, windKmh: 10, precipMm: 0, temperatureC: 18, forecastHourIso: '2026-05-01T15:00'
    });
    expect(out.lambdaMultiplier).toBe(1.0);
    expect(out.factors[0]).toContain('normal');
    expect(out.riskLabel).toBe('normal');
  });

  it('sehr starker Wind (≥ 40 km/h) → Multiplier 0.92', () => {
    const out = scoreWeatherImpact({
      matchTimeUtc: 0, windKmh: 50, precipMm: 0, temperatureC: 18, forecastHourIso: ''
    });
    expect(out.lambdaMultiplier).toBe(0.92);
    expect(out.factors.some((f) => f.includes('sehr starker Wind'))).toBe(true);
  });

  it('moderater Wind (25-39 km/h) → 0.96', () => {
    const out = scoreWeatherImpact({
      matchTimeUtc: 0, windKmh: 30, precipMm: 0, temperatureC: 18, forecastHourIso: ''
    });
    expect(out.lambdaMultiplier).toBe(0.96);
  });

  it('Starker Regen ≥ 5 mm → 0.92', () => {
    const out = scoreWeatherImpact({
      matchTimeUtc: 0, windKmh: 10, precipMm: 8, temperatureC: 18, forecastHourIso: ''
    });
    expect(out.lambdaMultiplier).toBe(0.92);
    expect(out.factors.some((f) => f.includes('Regen'))).toBe(true);
  });

  it('Wind + Regen kombiniert → multiplikativ (0.92 × 0.92 ≈ 0.846)', () => {
    const out = scoreWeatherImpact({
      matchTimeUtc: 0, windKmh: 45, precipMm: 8, temperatureC: 18, forecastHourIso: ''
    });
    expect(out.lambdaMultiplier).toBeCloseTo(0.846, 2);
    expect(out.riskLabel).toBe('sehr tor-arm');
    expect(out.factors.length).toBeGreaterThanOrEqual(2);
  });

  it('Hitze ≥ 28 °C → 0.95', () => {
    const out = scoreWeatherImpact({
      matchTimeUtc: 0, windKmh: 5, precipMm: 0, temperatureC: 32, forecastHourIso: ''
    });
    expect(out.lambdaMultiplier).toBe(0.95);
    expect(out.factors.some((f) => f.includes('Hitze'))).toBe(true);
  });

  it('strenger Frost ≤ -5 °C → 0.95', () => {
    const out = scoreWeatherImpact({
      matchTimeUtc: 0, windKmh: 5, precipMm: 0, temperatureC: -8, forecastHourIso: ''
    });
    expect(out.lambdaMultiplier).toBe(0.95);
    expect(out.factors.some((f) => f.includes('Frost'))).toBe(true);
  });

  it('riskLabel skaliert mit multiplier-Schwellen', () => {
    expect(scoreWeatherImpact({
      matchTimeUtc: 0, windKmh: 30, precipMm: 0, temperatureC: 18, forecastHourIso: ''
    }).riskLabel).toBe('normal'); // 0.96
    expect(scoreWeatherImpact({
      matchTimeUtc: 0, windKmh: 45, precipMm: 0, temperatureC: 18, forecastHourIso: ''
    }).riskLabel).toBe('tor-arm-erwartet'); // 0.92
    expect(scoreWeatherImpact({
      matchTimeUtc: 0, windKmh: 45, precipMm: 8, temperatureC: 32, forecastHourIso: ''
    }).riskLabel).toBe('sehr tor-arm'); // 0.846 × 0.95 < 0.88
  });
});

describe('normalizeTeamName', () => {
  it('lowercased, suffixe weg, akzente weg', () => {
    expect(normalizeTeamName('FC Bayern München')).toBe('bayern munchen');
    expect(normalizeTeamName('Real Madrid')).toBe('real madrid');
    expect(normalizeTeamName('1. FC Köln')).toBe('koln');
    expect(normalizeTeamName('Borussia Dortmund')).toBe('dortmund');
  });
});

describe('lookupStadium', () => {
  it('Bayern → Allianz Arena coords', () => {
    const c = lookupStadium('FC Bayern München');
    expect(c).not.toBeNull();
    expect(c!.lat).toBeCloseTo(48.22, 1);
    expect(c!.lon).toBeCloseTo(11.62, 1);
    expect(c!.source).toBe('stadium');
  });

  it('Premier League: Manchester City', () => {
    const c = lookupStadium('Manchester City');
    expect(c).not.toBeNull();
    expect(c!.lat).toBeCloseTo(53.48, 1);
  });

  it('Substring fallback funktioniert (Manchester United → United)', () => {
    const c = lookupStadium('Manchester United');
    expect(c).not.toBeNull();
  });

  it('Unbekanntes Team → null (ehrlich)', () => {
    expect(lookupStadium('Tatsachenverein Hintertupfingen')).toBeNull();
  });

  it('Akzent-Varianten matchen (München vs Munchen vs muenchen)', () => {
    expect(lookupStadium('München')).not.toBeNull();
    expect(lookupStadium('Munchen')).not.toBeNull();
    expect(lookupStadium('Muenchen')).not.toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { predictMatch } from '@/lib/sport/predictor';
import type { Fixture } from '@/lib/sport/fetcher';
import { scoreWeatherImpact } from '@/lib/sport/weather-impact';

function past(home: string, away: string, hs: number, as_: number, date: string): Fixture {
  return {
    id: `${home}-${away}-${date}`,
    homeTeam: home, awayTeam: away,
    league: 'L', date, time: null, venue: null,
    homeScore: hs, awayScore: as_,
    status: 'finished'
  };
}

const baseHistory: Fixture[] = [
  past('A', 'X1', 3, 0, '2026-04-01'),
  past('A', 'X2', 2, 1, '2026-04-08'),
  past('A', 'X3', 2, 0, '2026-04-15'),
  past('B', 'Y1', 1, 1, '2026-04-01'),
  past('B', 'Y2', 0, 2, '2026-04-08'),
  past('B', 'Y3', 2, 1, '2026-04-15')
];

describe('predictMatch + weather', () => {
  it('ohne weather: lambdas wie bisher (Regression)', () => {
    const p = predictMatch('A', 'B', baseHistory);
    expect(p).not.toBeNull();
    expect(p!.weather).toBeUndefined();
  });

  it('Wetterneutral (mult = 1.0): lambdas unveraendert', () => {
    const weather = scoreWeatherImpact({
      matchTimeUtc: 0, windKmh: 10, precipMm: 0, temperatureC: 18, forecastHourIso: ''
    });
    const noWeather = predictMatch('A', 'B', baseHistory)!;
    const withWeather = predictMatch('A', 'B', baseHistory, weather)!;
    expect(withWeather.lambdaHome).toBeCloseTo(noWeather.lambdaHome, 3);
    expect(withWeather.lambdaAway).toBeCloseTo(noWeather.lambdaAway, 3);
    expect(withWeather.weather).toBeDefined();
  });

  it('Sturm + Regen: lambdas signifikant gedrueckt (~ × 0.846)', () => {
    const weather = scoreWeatherImpact({
      matchTimeUtc: 0, windKmh: 45, precipMm: 8, temperatureC: 18, forecastHourIso: ''
    });
    const noWeather = predictMatch('A', 'B', baseHistory)!;
    const stormy = predictMatch('A', 'B', baseHistory, weather)!;
    expect(stormy.lambdaHome / noWeather.lambdaHome).toBeCloseTo(weather.lambdaMultiplier, 2);
    expect(stormy.lambdaAway / noWeather.lambdaAway).toBeCloseTo(weather.lambdaMultiplier, 2);
    expect(stormy.weather?.riskLabel).toBe('sehr tor-arm');
  });

  it('Tor-arm-Erwartung führt zu niedrigerem likelyScore', () => {
    const stormy = scoreWeatherImpact({
      matchTimeUtc: 0, windKmh: 45, precipMm: 8, temperatureC: 18, forecastHourIso: ''
    });
    const sunny = predictMatch('A', 'B', baseHistory)!;
    const wet = predictMatch('A', 'B', baseHistory, stormy)!;
    const sunnyTotal = sunny.likelyScore.home + sunny.likelyScore.away;
    const wetTotal = wet.likelyScore.home + wet.likelyScore.away;
    expect(wetTotal).toBeLessThanOrEqual(sunnyTotal);
  });

  it('Wahrscheinlichkeiten summieren weiterhin auf 1.0', () => {
    const weather = scoreWeatherImpact({
      matchTimeUtc: 0, windKmh: 45, precipMm: 8, temperatureC: 0, forecastHourIso: ''
    });
    const p = predictMatch('A', 'B', baseHistory, weather)!;
    expect(p.pHome + p.pDraw + p.pAway).toBeCloseTo(1.0, 3);
  });
});

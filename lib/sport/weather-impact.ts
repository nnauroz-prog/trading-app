// Wetter-Impact auf eine Fussball-Vorhersage. Reine Funktion. Nimmt eine
// WeatherSnapshot und liefert (a) einen Modifier auf die erwarteten Tore
// (lambdaHome, lambdaAway) und (b) eine Klartext-Begruendung fuer den UI.
//
// Bewusst konservativ kalibriert — Studien (z.B. Goldman, Pelechrinis,
// Schauberger / Tutz) zeigen, dass Wetter-Effekte auf Fussball-Tore real
// aber moderat sind:
//   - Starker Wind (>= 25 km/h) druekt die Trefferquote (schwierigeres Passspiel),
//     etwa -8 % bei sehr starkem Wind (>= 40 km/h).
//   - Starker Regen (>= 5 mm/h) druekt analog -5 % bis -10 %.
//   - Extreme Hitze (>= 28 °C) druekt Tore moderat (-5 %).
//   - Extreme Kaelte (<= -5 °C) druekt Tore moderat (-5 %).
//
// Wir veraendern lambdaHome und lambdaAway gleichgewichtet — Wetter trifft
// beide Mannschaften. Aussage „Heim-Vorteil bei Schlechtwetter steigt" wird
// in der Literatur diskutiert, ist aber statistisch nicht robust.

import type { WeatherSnapshot } from '@/lib/providers/open-meteo';

export interface WeatherImpact {
  lambdaMultiplier: number; // 0.85 .. 1.00
  factors: string[];        // Klartext, was den Multiplier treibt
  riskLabel: 'normal' | 'tor-arm-erwartet' | 'sehr tor-arm';
}

const NORMAL: WeatherImpact = {
  lambdaMultiplier: 1.0,
  factors: ['Wetterneutral'],
  riskLabel: 'normal'
};

export function scoreWeatherImpact(weather: WeatherSnapshot | null): WeatherImpact {
  if (!weather) return NORMAL;
  let multiplier = 1.0;
  const factors: string[] = [];

  // Wind
  if (weather.windKmh >= 40) {
    multiplier *= 0.92;
    factors.push(`sehr starker Wind (${Math.round(weather.windKmh)} km/h) — Passspiel + Flanken erschwert`);
  } else if (weather.windKmh >= 25) {
    multiplier *= 0.96;
    factors.push(`Wind (${Math.round(weather.windKmh)} km/h) — leicht tor-arm`);
  }

  // Niederschlag
  if (weather.precipMm >= 5) {
    multiplier *= 0.92;
    factors.push(`Starker Regen (${weather.precipMm.toFixed(1)} mm/h) — rutschiger Platz`);
  } else if (weather.precipMm >= 1) {
    multiplier *= 0.97;
    factors.push(`Leichter Regen (${weather.precipMm.toFixed(1)} mm/h)`);
  }

  // Temperatur — Extreme
  if (weather.temperatureC >= 28) {
    multiplier *= 0.95;
    factors.push(`Hitze (${Math.round(weather.temperatureC)}°C) — Sprint-Ermuedung`);
  } else if (weather.temperatureC <= -5) {
    multiplier *= 0.95;
    factors.push(`Strenger Frost (${Math.round(weather.temperatureC)}°C) — harter Platz, schweres Spiel`);
  }

  if (factors.length === 0) {
    factors.push(`Wetter normal (Wind ${Math.round(weather.windKmh)} km/h, Regen ${weather.precipMm.toFixed(1)} mm/h, ${Math.round(weather.temperatureC)}°C)`);
  }

  const riskLabel: WeatherImpact['riskLabel'] =
    multiplier <= 0.88 ? 'sehr tor-arm' :
    multiplier <= 0.95 ? 'tor-arm-erwartet' :
    'normal';

  return {
    lambdaMultiplier: Math.round(multiplier * 1000) / 1000,
    factors,
    riskLabel
  };
}

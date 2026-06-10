// Live-Wetter-Faktor pro WM-Spiel.
//
// Holt fuer jedes anstehende WM-Spiel der naechsten 7 Tage das echte
// Wetter am Anstoss-Zeitpunkt ueber Open-Meteo (lat/lon des Stadions).
// Liefert konkrete Faktoren mit Tor-Multiplier und Confidence-Shift:
//
//   - Niederschlag > 5 mm/h: -8 % Tor-Multiplier beidseitig
//     (rutschiger Ball, ungenaue Paesse, defensiver -> tor-armer).
//   - Wind > 28 km/h: -5 % Tor-Multiplier beidseitig
//     (Flanken und Distanz-Schuesse ungenau).
//   - Live-Temperatur > 32 °C: zusaetzlicher Hitze-Penalty (-4 %
//     Multiplier auf beiden Seiten) wenn nicht schon die Akkli-
//     matisierung greift.
//
// Wenn Wetter nicht verfuegbar (Open-Meteo down oder Spiel > 7 Tage
// entfernt): liefert null. Pure-Funktion fuer die Faktor-Erzeugung;
// der Fetcher ist async und liegt in der parallelen runtime-Schicht.
//
// Wording ohne verbotene Begriffe.

import type { WeatherSnapshot } from '@/lib/providers/open-meteo';
import type { WmConditionFactor } from '@/lib/sport/wm-conditions';

export function weatherFactor(snapshot: WeatherSnapshot | null): WmConditionFactor | null {
  if (!snapshot) return null;
  const parts: string[] = [];
  let homeMul = 1.0;
  let awayMul = 1.0;
  let confShift = 0;

  if (snapshot.precipMm >= 5) {
    const penalty = 0.08;
    homeMul *= 1 - penalty;
    awayMul *= 1 - penalty;
    confShift -= 10;
    parts.push(`Regen ${snapshot.precipMm.toFixed(1)} mm/h`);
  } else if (snapshot.precipMm >= 2) {
    const penalty = 0.03;
    homeMul *= 1 - penalty;
    awayMul *= 1 - penalty;
    confShift -= 4;
    parts.push(`leichter Regen ${snapshot.precipMm.toFixed(1)} mm/h`);
  }

  if (snapshot.windKmh >= 28) {
    const penalty = 0.05;
    homeMul *= 1 - penalty;
    awayMul *= 1 - penalty;
    confShift -= 8;
    parts.push(`Wind ${Math.round(snapshot.windKmh)} km/h`);
  }

  if (snapshot.temperatureC >= 32) {
    const penalty = 0.04;
    homeMul *= 1 - penalty;
    awayMul *= 1 - penalty;
    confShift -= 6;
    parts.push(`Live-Temperatur ${Math.round(snapshot.temperatureC)} °C`);
  }

  if (parts.length === 0) return null;

  return {
    id: 'weather',
    label: `Live-Wetter (${snapshot.forecastHourIso} UTC): ${parts.join(' · ')}`,
    homeGoalMultiplier: homeMul,
    awayGoalMultiplier: awayMul,
    // ELO-Delta neutral — Wetter trifft beide Seiten gleich, nur
    // Confidence-Shift signalisiert "Tor-armer + mehr Zufalls-Anteil".
    homeEloDelta: 0,
    awayEloDelta: 0,
    confidenceShift: confShift
  };
}

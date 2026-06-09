// Open-Meteo Wetter-Forecast. Frei (kein API-Key), liefert stuendliche
// Forecast-Werte fuer beliebige lat/lon. Nutzen wir hier nur fuer Wind +
// Niederschlag + Temperatur, weil das die einzigen Werte sind, die
// Modell-relevant fuer Fussball sind.
// Doku: https://open-meteo.com/en/docs

import { unstable_cache } from 'next/cache';

export interface WeatherSnapshot {
  // Lokal-Zeit in der Wetter-Antwort ist UTC. Wir reichen die UTC-Zeit
  // hierher, weil der Caller (predictor) sie auf den Spielanstoss umrechnet.
  matchTimeUtc: number;
  // Naechster verfuegbarer Forecast-Datenpunkt zur Anstosszeit.
  windKmh: number;
  precipMm: number;
  temperatureC: number;
  // Stunde des Forecast-Datenpunkts (zur Diagnose).
  forecastHourIso: string;
}

interface OpenMeteoResponse {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation?: number[];
    wind_speed_10m?: number[];
  };
}

async function fetchForecast(lat: number, lon: number, matchTimeUtc: number): Promise<WeatherSnapshot | null> {
  // Open-Meteo liefert standardmaessig 7 Tage Forecast. Reicht fuer alle
  // Tipps, die wir auf der App stehen haben.
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat.toFixed(4));
  url.searchParams.set('longitude', lon.toFixed(4));
  url.searchParams.set('hourly', 'temperature_2m,precipitation,wind_speed_10m');
  url.searchParams.set('wind_speed_unit', 'kmh');
  url.searchParams.set('timezone', 'UTC');
  url.searchParams.set('forecast_days', '7');
  try {
    const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const data = (await res.json()) as OpenMeteoResponse;
    const times = data.hourly?.time ?? [];
    const winds = data.hourly?.wind_speed_10m ?? [];
    const precs = data.hourly?.precipitation ?? [];
    const temps = data.hourly?.temperature_2m ?? [];
    if (times.length === 0) return null;
    // Finde die Stunde, die dem Anstoss am naechsten ist.
    const matchHour = Math.floor(matchTimeUtc / (60 * 60 * 1000)) * 60 * 60 * 1000;
    let bestIdx = -1;
    let bestDelta = Infinity;
    for (let i = 0; i < times.length; i++) {
      const t = new Date(`${times[i]}:00Z`).getTime();
      if (Number.isNaN(t)) continue;
      const d = Math.abs(t - matchHour);
      if (d < bestDelta) {
        bestDelta = d;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) return null;
    return {
      matchTimeUtc,
      windKmh: Number(winds[bestIdx] ?? 0),
      precipMm: Number(precs[bestIdx] ?? 0),
      temperatureC: Number(temps[bestIdx] ?? 0),
      forecastHourIso: times[bestIdx]
    };
  } catch {
    return null;
  }
}

// Cache nach lat/lon + Stunde der Anstosszeit, damit derselbe Lat/Lon nicht
// fuer jede Vorhersage neu abgefragt wird.
export const fetchWeatherSnapshot = unstable_cache(
  fetchForecast,
  ['open-meteo-forecast-v1'],
  { revalidate: 1800 }
);

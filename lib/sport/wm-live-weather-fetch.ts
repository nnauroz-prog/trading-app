// Live-Wetter-Fetcher fuer WM-Fixtures.
//
// Holt fuer jedes WM-Spiel der naechsten 7 Tage das Open-Meteo-Wetter
// am Anstoss-Zeitpunkt (lat/lon des Stadions). Cache 30 min uebernimmt
// open-meteo.fetchWeatherSnapshot direkt — diese Wrapper-Funktion macht
// nur die Parallel-Anfrage und das Mapping.
//
// Server-only (verwendet next/cache via fetchWeatherSnapshot).

import { WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';
import { findVenue } from '@/lib/sport/wm-venues';
import { fetchWeatherSnapshot, type WeatherSnapshot } from '@/lib/providers/open-meteo';

interface BuildOptions {
  todayIso: string;
  horizonDays?: number; // Default 7
}

function fixtureUtcMs(f: WmFixture): number | null {
  if (!f.time) return null;
  const iso = `${f.date}T${f.time}:00Z`;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

export async function fetchWmWeatherByFixture(opts: BuildOptions): Promise<Record<string, WeatherSnapshot | null>> {
  const { todayIso, horizonDays = 7 } = opts;
  const todayMs = new Date(`${todayIso}T00:00:00`).getTime();
  const horizonMs = todayMs + horizonDays * 24 * 60 * 60 * 1000;

  const targets: { fixture: WmFixture; lat: number; lon: number; matchTimeUtc: number }[] = [];
  for (const f of WM_2026_FIXTURES) {
    const fMs = new Date(`${f.date}T00:00:00`).getTime();
    if (fMs < todayMs || fMs > horizonMs) continue;
    const venue = findVenue(f.venue);
    if (!venue) continue;
    const matchTime = fixtureUtcMs(f) ?? fMs + 19 * 60 * 60 * 1000; // Default 19 UTC wenn keine Zeit
    targets.push({ fixture: f, lat: venue.lat, lon: venue.lon, matchTimeUtc: matchTime });
  }

  const results = await Promise.all(
    targets.map(async (t) => {
      const snap = await fetchWeatherSnapshot(t.lat, t.lon, t.matchTimeUtc);
      return [t.fixture.id, snap] as const;
    })
  );
  return Object.fromEntries(results);
}

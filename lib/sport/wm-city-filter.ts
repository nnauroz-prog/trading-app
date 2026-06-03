// Wertet die WM-Fixtures pro Stadt aus — wie viele Spiele finden in jeder
// Stadt statt? Hilft beim Reise-Planen oder als Trivia.

import { WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';

export interface CityCount {
  venue: string;
  city: string;
  matchCount: number;
  upcoming: WmFixture[];
}

function cityFromVenue(venue: string): string {
  // „SoFi Stadium, Los Angeles" → „Los Angeles"
  const idx = venue.lastIndexOf(',');
  return idx >= 0 ? venue.slice(idx + 1).trim() : venue;
}

export function fixturesByCity(todayIso: string): CityCount[] {
  const map = new Map<string, CityCount>();
  for (const f of WM_2026_FIXTURES) {
    const city = cityFromVenue(f.venue);
    const isUpcoming = f.date >= todayIso;
    const existing = map.get(f.venue);
    if (existing) {
      existing.matchCount += 1;
      if (isUpcoming) existing.upcoming.push(f);
    } else {
      map.set(f.venue, {
        venue: f.venue,
        city,
        matchCount: 1,
        upcoming: isUpcoming ? [f] : []
      });
    }
  }
  return [...map.values()].sort((a, b) => b.matchCount - a.matchCount || a.city.localeCompare(b.city));
}

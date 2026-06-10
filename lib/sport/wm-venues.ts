// Alle 16 WM-2026-Stadien — Quelle: FIFA offizielle Auswahl.
// Erweitert um Geo-/Klima-/Hoehen-Felder fuer das Profi-Adjustment-Modul
// (lib/sport/wm-conditions). Werte aus oeffentlichen Wetterdurchschnitt-
// Quellen (OpenMeteo Archiv, NOAA-Klimanormen) konservativ gerundet.

export type WmCountry = 'USA' | 'Kanada' | 'Mexiko';
export type WmClimateZone = 'kuehl' | 'mild' | 'warm' | 'heiss' | 'tropisch' | 'hochgebirge';

export interface WmVenue {
  city: string;
  country: WmCountry;
  name: string;
  // Sponsor-/FIFA-Namen, unter denen das Stadion ebenfalls auftaucht
  // (z. B. "GEHA Field at Arrowhead" fuer Arrowhead Stadium).
  aliases?: string[];
  capacity: number;
  // Geo + Klima — neu seit Welle 24101.
  lat: number;
  lon: number;
  altitudeM: number;
  // Mittlere Tageshoechsttemperatur Juni/Juli in Celsius.
  meanHighTempJunJulC: number;
  climate: WmClimateZone;
  // Lokale Anstosszeit-Risikoklasse: Mittagsspiele in Hitze-Stadien
  // erzeugen historisch weniger Tore.
  hotMiddayRisk: boolean;
}

export const WM_2026_VENUES: WmVenue[] = [
  // Mexiko
  { city: 'Mexico City', country: 'Mexiko', name: 'Estadio Azteca', aliases: ['Estadio Ciudad de Mexico', 'Mexico City Stadium'], capacity: 87000, lat: 19.30, lon: -99.15, altitudeM: 2240, meanHighTempJunJulC: 24, climate: 'hochgebirge', hotMiddayRisk: false },
  { city: 'Guadalajara', country: 'Mexiko', name: 'Estadio Akron', aliases: ['Estadio Guadalajara'], capacity: 49000, lat: 20.68, lon: -103.46, altitudeM: 1600, meanHighTempJunJulC: 27, climate: 'mild', hotMiddayRisk: false },
  { city: 'Monterrey', country: 'Mexiko', name: 'Estadio BBVA', aliases: ['Estadio Monterrey'], capacity: 53000, lat: 25.67, lon: -100.31, altitudeM: 500, meanHighTempJunJulC: 33, climate: 'heiss', hotMiddayRisk: true },
  // Kanada
  { city: 'Toronto', country: 'Kanada', name: 'BMO Field', aliases: ['Toronto Stadium'], capacity: 45000, lat: 43.63, lon: -79.41, altitudeM: 76, meanHighTempJunJulC: 26, climate: 'mild', hotMiddayRisk: false },
  { city: 'Vancouver', country: 'Kanada', name: 'BC Place', aliases: ['Vancouver Stadium'], capacity: 54000, lat: 49.27, lon: -123.11, altitudeM: 0, meanHighTempJunJulC: 22, climate: 'kuehl', hotMiddayRisk: false },
  // USA
  { city: 'Los Angeles', country: 'USA', name: 'SoFi Stadium', aliases: ['Los Angeles Stadium'], capacity: 70000, lat: 33.95, lon: -118.34, altitudeM: 11, meanHighTempJunJulC: 24, climate: 'mild', hotMiddayRisk: false },
  { city: 'San Francisco Bay', country: 'USA', name: "Levi's Stadium", aliases: ['San Francisco Bay Area Stadium'], capacity: 68500, lat: 37.40, lon: -121.97, altitudeM: 3, meanHighTempJunJulC: 26, climate: 'mild', hotMiddayRisk: false },
  { city: 'Seattle', country: 'USA', name: 'Lumen Field', aliases: ['Seattle Stadium'], capacity: 69000, lat: 47.59, lon: -122.33, altitudeM: 27, meanHighTempJunJulC: 23, climate: 'kuehl', hotMiddayRisk: false },
  { city: 'Kansas City', country: 'USA', name: 'Arrowhead Stadium', aliases: ['GEHA Field at Arrowhead', 'Kansas City Stadium'], capacity: 76000, lat: 39.05, lon: -94.48, altitudeM: 270, meanHighTempJunJulC: 32, climate: 'heiss', hotMiddayRisk: true },
  { city: 'Dallas', country: 'USA', name: 'AT&T Stadium', aliases: ['Dallas Stadium'], capacity: 80000, lat: 32.75, lon: -97.09, altitudeM: 180, meanHighTempJunJulC: 35, climate: 'heiss', hotMiddayRisk: true },
  { city: 'Houston', country: 'USA', name: 'NRG Stadium', aliases: ['Houston Stadium'], capacity: 72000, lat: 29.68, lon: -95.41, altitudeM: 15, meanHighTempJunJulC: 34, climate: 'heiss', hotMiddayRisk: true },
  { city: 'Atlanta', country: 'USA', name: 'Mercedes-Benz Stadium', aliases: ['Atlanta Stadium'], capacity: 71000, lat: 33.76, lon: -84.40, altitudeM: 320, meanHighTempJunJulC: 32, climate: 'heiss', hotMiddayRisk: true },
  { city: 'Boston', country: 'USA', name: 'Gillette Stadium', aliases: ['Boston Stadium'], capacity: 65000, lat: 42.09, lon: -71.26, altitudeM: 30, meanHighTempJunJulC: 27, climate: 'mild', hotMiddayRisk: false },
  { city: 'New York / New Jersey', country: 'USA', name: 'MetLife Stadium', aliases: ['New York New Jersey Stadium', 'New York/New Jersey'], capacity: 82500, lat: 40.81, lon: -74.07, altitudeM: 3, meanHighTempJunJulC: 29, climate: 'warm', hotMiddayRisk: false },
  { city: 'Philadelphia', country: 'USA', name: 'Lincoln Financial Field', aliases: ['Philadelphia Stadium'], capacity: 69000, lat: 39.90, lon: -75.17, altitudeM: 10, meanHighTempJunJulC: 30, climate: 'warm', hotMiddayRisk: false },
  { city: 'Miami', country: 'USA', name: 'Hard Rock Stadium', aliases: ['Miami Stadium'], capacity: 65000, lat: 25.96, lon: -80.24, altitudeM: 2, meanHighTempJunJulC: 33, climate: 'tropisch', hotMiddayRisk: true }
];

export function venuesByCountry(): Record<WmCountry, WmVenue[]> {
  return {
    USA: WM_2026_VENUES.filter((v) => v.country === 'USA'),
    Kanada: WM_2026_VENUES.filter((v) => v.country === 'Kanada'),
    Mexiko: WM_2026_VENUES.filter((v) => v.country === 'Mexiko')
  };
}

// Findet das WM-Stadion anhand des venue-Strings aus WmFixture.
// Toleranz fuer Apostroph-Varianten, Substring-Treffer, Sponsor-
// Aliase und Stadt-Namen ("GEHA Field at Arrowhead, Kansas City"
// matcht ueber Alias UND Stadt).
export function findVenue(name: string | undefined): WmVenue | null {
  if (!name) return null;
  const norm = name.toLowerCase().replace(/[’'`]/g, '').trim();
  for (const v of WM_2026_VENUES) {
    const vn = v.name.toLowerCase().replace(/[’'`]/g, '').trim();
    if (vn === norm) return v;
    if (vn.includes(norm) || norm.includes(vn)) return v;
    // Sponsor-/FIFA-Aliase
    for (const a of v.aliases ?? []) {
      const an = a.toLowerCase().replace(/[’'`]/g, '').trim();
      if (an === norm || an.includes(norm) || norm.includes(an)) return v;
    }
  }
  // Fallback: eindeutiger Stadt-Match ("..., Kansas City" → Arrowhead).
  const cityMatches = WM_2026_VENUES.filter((v) => norm.includes(v.city.toLowerCase()));
  if (cityMatches.length === 1) return cityMatches[0];
  return null;
}

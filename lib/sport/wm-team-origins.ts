// Heimat-Daten der WM-2026-qualifizierten Teams — Hauptstadt-Koordinaten,
// durchschnittliches Sommerklima, mittlere Hoehenlage. Eingabe fuer:
//   - Akklimatisierungs-Distanz (Klima-Heimat vs. Spielort)
//   - Reisedistanz / Jetlag (Heimat vs. Spielort)
//   - Hoehenlage-Adaption (Anden-Teams sind in Mexico City im Vorteil)
//
// Strikt nur Teams, die fuer die WM 2026 qualifiziert sind oder im
// WM_2026_FIXTURES-Schedule auftauchen. Italien fehlt bewusst — sie sind
// erneut nicht qualifiziert (UEFA-Playoffs nicht durchgekommen).
//
// Wenn ein Team nicht in der Liste ist, liefert findTeamOrigin null — der
// Akklimatisierung-Code faellt dann auf einen neutralen Mittelwert zurueck
// statt eine Fake-Annahme zu machen.

import type { WmClimateZone } from '@/lib/sport/wm-venues';

export interface WmTeamOrigin {
  team: string;
  aliases?: string[];
  // Hauptstadt-Koordinaten als Approximation der Trainingsbasis.
  lat: number;
  lon: number;
  // Mittlere Sommer-Tageshoechsttemperatur in Celsius.
  meanHighTempJunJulC: number;
  climate: WmClimateZone;
  // Mittlere Hoehenlage der Heimat-Trainingsbasis in Metern.
  altitudeM: number;
  // Zeitzone als UTC-Offset (Stunden) — fuer Jetlag-Berechnung.
  utcOffsetHrs: number;
  confederation: 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC';
}

export const WM_TEAM_ORIGINS: WmTeamOrigin[] = [
  // CONMEBOL
  { team: 'Argentinien', aliases: ['Argentina'], lat: -34.61, lon: -58.38, meanHighTempJunJulC: 14, climate: 'mild', altitudeM: 25, utcOffsetHrs: -3, confederation: 'CONMEBOL' },
  { team: 'Brasilien', aliases: ['Brazil'], lat: -15.78, lon: -47.93, meanHighTempJunJulC: 26, climate: 'warm', altitudeM: 1170, utcOffsetHrs: -3, confederation: 'CONMEBOL' },
  { team: 'Uruguay', lat: -34.90, lon: -56.16, meanHighTempJunJulC: 15, climate: 'mild', altitudeM: 30, utcOffsetHrs: -3, confederation: 'CONMEBOL' },
  { team: 'Kolumbien', aliases: ['Colombia'], lat: 4.71, lon: -74.07, meanHighTempJunJulC: 20, climate: 'mild', altitudeM: 2640, utcOffsetHrs: -5, confederation: 'CONMEBOL' },
  { team: 'Ecuador', lat: -0.18, lon: -78.47, meanHighTempJunJulC: 19, climate: 'mild', altitudeM: 2850, utcOffsetHrs: -5, confederation: 'CONMEBOL' },
  { team: 'Paraguay', lat: -25.26, lon: -57.57, meanHighTempJunJulC: 22, climate: 'warm', altitudeM: 43, utcOffsetHrs: -4, confederation: 'CONMEBOL' },
  // CONCACAF
  { team: 'USA', aliases: ['United States', 'Vereinigte Staaten'], lat: 38.91, lon: -77.04, meanHighTempJunJulC: 31, climate: 'warm', altitudeM: 17, utcOffsetHrs: -5, confederation: 'CONCACAF' },
  { team: 'Mexiko', aliases: ['Mexico'], lat: 19.43, lon: -99.13, meanHighTempJunJulC: 24, climate: 'hochgebirge', altitudeM: 2240, utcOffsetHrs: -6, confederation: 'CONCACAF' },
  { team: 'Kanada', aliases: ['Canada'], lat: 45.42, lon: -75.69, meanHighTempJunJulC: 26, climate: 'mild', altitudeM: 70, utcOffsetHrs: -5, confederation: 'CONCACAF' },
  // UEFA
  { team: 'Frankreich', aliases: ['France'], lat: 48.85, lon: 2.35, meanHighTempJunJulC: 25, climate: 'mild', altitudeM: 35, utcOffsetHrs: 1, confederation: 'UEFA' },
  { team: 'Spanien', aliases: ['Spain'], lat: 40.42, lon: -3.70, meanHighTempJunJulC: 32, climate: 'heiss', altitudeM: 667, utcOffsetHrs: 1, confederation: 'UEFA' },
  { team: 'England', lat: 51.51, lon: -0.13, meanHighTempJunJulC: 23, climate: 'kuehl', altitudeM: 35, utcOffsetHrs: 0, confederation: 'UEFA' },
  { team: 'Portugal', lat: 38.72, lon: -9.14, meanHighTempJunJulC: 28, climate: 'warm', altitudeM: 11, utcOffsetHrs: 0, confederation: 'UEFA' },
  { team: 'Niederlande', aliases: ['Netherlands', 'Holland'], lat: 52.37, lon: 4.90, meanHighTempJunJulC: 22, climate: 'kuehl', altitudeM: 2, utcOffsetHrs: 1, confederation: 'UEFA' },
  { team: 'Deutschland', aliases: ['Germany'], lat: 52.52, lon: 13.40, meanHighTempJunJulC: 24, climate: 'mild', altitudeM: 34, utcOffsetHrs: 1, confederation: 'UEFA' },
  { team: 'Belgien', aliases: ['Belgium'], lat: 50.85, lon: 4.35, meanHighTempJunJulC: 22, climate: 'kuehl', altitudeM: 13, utcOffsetHrs: 1, confederation: 'UEFA' },
  // Italien NICHT in der Liste — fuer WM 2026 nicht qualifiziert (UEFA-Playoffs).
  { team: 'Kroatien', aliases: ['Croatia'], lat: 45.81, lon: 15.98, meanHighTempJunJulC: 27, climate: 'mild', altitudeM: 122, utcOffsetHrs: 1, confederation: 'UEFA' },
  { team: 'Schweiz', aliases: ['Switzerland'], lat: 46.95, lon: 7.45, meanHighTempJunJulC: 24, climate: 'mild', altitudeM: 540, utcOffsetHrs: 1, confederation: 'UEFA' },
  { team: 'Dänemark', aliases: ['Daenemark', 'Denmark'], lat: 55.68, lon: 12.57, meanHighTempJunJulC: 21, climate: 'kuehl', altitudeM: 14, utcOffsetHrs: 1, confederation: 'UEFA' },
  { team: 'Schweden', aliases: ['Sweden'], lat: 59.33, lon: 18.07, meanHighTempJunJulC: 22, climate: 'kuehl', altitudeM: 28, utcOffsetHrs: 1, confederation: 'UEFA' },
  { team: 'Polen', aliases: ['Poland'], lat: 52.23, lon: 21.01, meanHighTempJunJulC: 23, climate: 'mild', altitudeM: 113, utcOffsetHrs: 1, confederation: 'UEFA' },
  { team: 'Österreich', aliases: ['Oesterreich', 'Austria'], lat: 48.21, lon: 16.37, meanHighTempJunJulC: 25, climate: 'mild', altitudeM: 171, utcOffsetHrs: 1, confederation: 'UEFA' },
  { team: 'Serbien', aliases: ['Serbia'], lat: 44.79, lon: 20.45, meanHighTempJunJulC: 28, climate: 'warm', altitudeM: 117, utcOffsetHrs: 1, confederation: 'UEFA' },
  { team: 'Wales', lat: 51.48, lon: -3.18, meanHighTempJunJulC: 20, climate: 'kuehl', altitudeM: 9, utcOffsetHrs: 0, confederation: 'UEFA' },
  { team: 'Tschechien', aliases: ['Czech Republic', 'Czechia'], lat: 50.07, lon: 14.42, meanHighTempJunJulC: 24, climate: 'mild', altitudeM: 200, utcOffsetHrs: 1, confederation: 'UEFA' },
  { team: 'Bosnien-Herzegowina', aliases: ['Bosnia and Herzegovina', 'Bosnia'], lat: 43.85, lon: 18.36, meanHighTempJunJulC: 26, climate: 'mild', altitudeM: 500, utcOffsetHrs: 1, confederation: 'UEFA' },
  { team: 'Türkei', aliases: ['Tuerkei', 'Turkey', 'Türkiye'], lat: 39.93, lon: 32.86, meanHighTempJunJulC: 30, climate: 'warm', altitudeM: 938, utcOffsetHrs: 3, confederation: 'UEFA' },
  // CAF
  { team: 'Marokko', aliases: ['Morocco'], lat: 33.97, lon: -6.85, meanHighTempJunJulC: 28, climate: 'warm', altitudeM: 76, utcOffsetHrs: 1, confederation: 'CAF' },
  { team: 'Senegal', lat: 14.69, lon: -17.45, meanHighTempJunJulC: 30, climate: 'tropisch', altitudeM: 22, utcOffsetHrs: 0, confederation: 'CAF' },
  { team: 'Tunesien', aliases: ['Tunisia'], lat: 36.81, lon: 10.18, meanHighTempJunJulC: 33, climate: 'heiss', altitudeM: 4, utcOffsetHrs: 1, confederation: 'CAF' },
  { team: 'Ägypten', aliases: ['Aegypten', 'Egypt'], lat: 30.04, lon: 31.24, meanHighTempJunJulC: 35, climate: 'heiss', altitudeM: 23, utcOffsetHrs: 2, confederation: 'CAF' },
  { team: 'Nigeria', lat: 9.08, lon: 7.39, meanHighTempJunJulC: 29, climate: 'tropisch', altitudeM: 476, utcOffsetHrs: 1, confederation: 'CAF' },
  { team: 'Algerien', aliases: ['Algeria'], lat: 36.75, lon: 3.05, meanHighTempJunJulC: 30, climate: 'warm', altitudeM: 24, utcOffsetHrs: 1, confederation: 'CAF' },
  // AFC
  { team: 'Japan', lat: 35.69, lon: 139.69, meanHighTempJunJulC: 28, climate: 'warm', altitudeM: 40, utcOffsetHrs: 9, confederation: 'AFC' },
  { team: 'Südkorea', aliases: ['Suedkorea', 'South Korea', 'Korea', 'Republic of Korea', 'Korea Republik'], lat: 37.57, lon: 126.98, meanHighTempJunJulC: 28, climate: 'warm', altitudeM: 38, utcOffsetHrs: 9, confederation: 'AFC' },
  { team: 'Südafrika', aliases: ['Suedafrika', 'South Africa'], lat: -25.75, lon: 28.19, meanHighTempJunJulC: 21, climate: 'mild', altitudeM: 1339, utcOffsetHrs: 2, confederation: 'CAF' },
  { team: 'Jordanien', aliases: ['Jordan'], lat: 31.95, lon: 35.93, meanHighTempJunJulC: 32, climate: 'heiss', altitudeM: 1100, utcOffsetHrs: 3, confederation: 'AFC' },
  // Verifizierte Gruppen-Gegner (eingepflegt 10.06.2026):
  { team: 'Norwegen', aliases: ['Norway'], lat: 59.91, lon: 10.75, meanHighTempJunJulC: 21, climate: 'kuehl', altitudeM: 23, utcOffsetHrs: 1, confederation: 'UEFA' },
  { team: 'Elfenbeinküste', aliases: ['Ivory Coast', 'Cote d\'Ivoire'], lat: 5.35, lon: -4.03, meanHighTempJunJulC: 29, climate: 'tropisch', altitudeM: 18, utcOffsetHrs: 0, confederation: 'CAF' },
  { team: 'Schottland', aliases: ['Scotland'], lat: 55.86, lon: -4.25, meanHighTempJunJulC: 19, climate: 'kuehl', altitudeM: 20, utcOffsetHrs: 0, confederation: 'UEFA' },
  { team: 'Panama', lat: 8.98, lon: -79.52, meanHighTempJunJulC: 32, climate: 'tropisch', altitudeM: 2, utcOffsetHrs: -5, confederation: 'CONCACAF' },
  { team: 'Ghana', lat: 5.60, lon: -0.19, meanHighTempJunJulC: 30, climate: 'tropisch', altitudeM: 61, utcOffsetHrs: 0, confederation: 'CAF' },
  { team: 'Usbekistan', aliases: ['Uzbekistan'], lat: 41.30, lon: 69.24, meanHighTempJunJulC: 36, climate: 'heiss', altitudeM: 455, utcOffsetHrs: 5, confederation: 'AFC' },
  { team: 'DR Kongo', aliases: ['Congo DR', 'DR Congo'], lat: -4.44, lon: 15.27, meanHighTempJunJulC: 28, climate: 'tropisch', altitudeM: 240, utcOffsetHrs: 1, confederation: 'CAF' },
  { team: 'Irak', aliases: ['Iraq'], lat: 33.31, lon: 44.37, meanHighTempJunJulC: 43, climate: 'heiss', altitudeM: 34, utcOffsetHrs: 3, confederation: 'AFC' },
  { team: 'Kap Verde', aliases: ['Cape Verde', 'Cabo Verde'], lat: 14.93, lon: -23.51, meanHighTempJunJulC: 27, climate: 'warm', altitudeM: 24, utcOffsetHrs: -1, confederation: 'CAF' },
  { team: 'Curaçao', aliases: ['Curacao'], lat: 12.11, lon: -68.93, meanHighTempJunJulC: 31, climate: 'tropisch', altitudeM: 0, utcOffsetHrs: -4, confederation: 'CONCACAF' },
  { team: 'Haiti', lat: 18.54, lon: -72.34, meanHighTempJunJulC: 33, climate: 'tropisch', altitudeM: 41, utcOffsetHrs: -5, confederation: 'CONCACAF' },
  { team: 'Australien', aliases: ['Australia'], lat: -35.28, lon: 149.13, meanHighTempJunJulC: 12, climate: 'mild', altitudeM: 580, utcOffsetHrs: 10, confederation: 'AFC' },
  { team: 'Neuseeland', aliases: ['New Zealand'], lat: -41.29, lon: 174.78, meanHighTempJunJulC: 12, climate: 'mild', altitudeM: 30, utcOffsetHrs: 12, confederation: 'OFC' },
  { team: 'Iran', lat: 35.69, lon: 51.39, meanHighTempJunJulC: 36, climate: 'heiss', altitudeM: 1200, utcOffsetHrs: 3.5, confederation: 'AFC' },
  { team: 'Saudi-Arabien', aliases: ['Saudi Arabia'], lat: 24.71, lon: 46.68, meanHighTempJunJulC: 43, climate: 'heiss', altitudeM: 612, utcOffsetHrs: 3, confederation: 'AFC' },
  { team: 'Katar', aliases: ['Qatar'], lat: 25.28, lon: 51.52, meanHighTempJunJulC: 41, climate: 'heiss', altitudeM: 10, utcOffsetHrs: 3, confederation: 'AFC' }
];

export function findTeamOrigin(name: string | undefined): WmTeamOrigin | null {
  if (!name) return null;
  const norm = name.toLowerCase().trim();
  for (const t of WM_TEAM_ORIGINS) {
    if (t.team.toLowerCase() === norm) return t;
    if (t.aliases?.some((a) => a.toLowerCase() === norm)) return t;
  }
  // tolerant substring match — z.B. "Korea Republik"
  for (const t of WM_TEAM_ORIGINS) {
    if (norm.includes(t.team.toLowerCase()) || t.team.toLowerCase().includes(norm)) return t;
    if (t.aliases?.some((a) => norm.includes(a.toLowerCase()) || a.toLowerCase().includes(norm))) return t;
  }
  return null;
}

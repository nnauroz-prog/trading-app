// Alle 16 WM-2026-Stadien — Quelle: FIFA offizielle Auswahl.
// Kapazitäten gerundet, sortiert nach Land + Stadt.

export interface WmVenue {
  city: string;
  country: 'USA' | 'Kanada' | 'Mexiko';
  name: string;
  capacity: number;
}

export const WM_2026_VENUES: WmVenue[] = [
  // Mexiko
  { city: 'Mexico City', country: 'Mexiko', name: 'Estadio Azteca', capacity: 87000 },
  { city: 'Guadalajara', country: 'Mexiko', name: 'Estadio Akron', capacity: 49000 },
  { city: 'Monterrey', country: 'Mexiko', name: 'Estadio BBVA', capacity: 53000 },
  // Kanada
  { city: 'Toronto', country: 'Kanada', name: 'BMO Field', capacity: 45000 },
  { city: 'Vancouver', country: 'Kanada', name: 'BC Place', capacity: 54000 },
  // USA
  { city: 'Los Angeles', country: 'USA', name: 'SoFi Stadium', capacity: 70000 },
  { city: 'San Francisco Bay', country: 'USA', name: "Levi's Stadium", capacity: 68500 },
  { city: 'Seattle', country: 'USA', name: 'Lumen Field', capacity: 69000 },
  { city: 'Kansas City', country: 'USA', name: 'Arrowhead Stadium', capacity: 76000 },
  { city: 'Dallas', country: 'USA', name: 'AT&T Stadium', capacity: 80000 },
  { city: 'Houston', country: 'USA', name: 'NRG Stadium', capacity: 72000 },
  { city: 'Atlanta', country: 'USA', name: 'Mercedes-Benz Stadium', capacity: 71000 },
  { city: 'Boston', country: 'USA', name: 'Gillette Stadium', capacity: 65000 },
  { city: 'New York / New Jersey', country: 'USA', name: 'MetLife Stadium', capacity: 82500 },
  { city: 'Philadelphia', country: 'USA', name: 'Lincoln Financial Field', capacity: 69000 },
  { city: 'Miami', country: 'USA', name: 'Hard Rock Stadium', capacity: 65000 }
];

export function venuesByCountry(): Record<'USA' | 'Kanada' | 'Mexiko', WmVenue[]> {
  return {
    USA: WM_2026_VENUES.filter((v) => v.country === 'USA'),
    Kanada: WM_2026_VENUES.filter((v) => v.country === 'Kanada'),
    Mexiko: WM_2026_VENUES.filter((v) => v.country === 'Mexiko')
  };
}

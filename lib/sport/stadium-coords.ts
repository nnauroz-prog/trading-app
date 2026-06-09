// Stadion-Koordinaten fuer die wichtigsten Vereine der eingebundenen Ligen.
// Genau genug fuer eine Wetter-Abfrage per Open-Meteo (lat/lon auf 0.01°
// reicht — Distanz < 1 km, Wettermodell-Aufloesung ist sowieso ~9 km).
//
// Wenn ein Verein hier fehlt, faellt der Aufrufer auf die Stadt (siehe
// CITY_FALLBACK) zurueck. Ehrlicher Fallback: kein Wetter-Modifier,
// nicht raten.

export interface StadiumCoord {
  lat: number;
  lon: number;
  source: 'stadium' | 'city';
}

// Normalisiert einen Team-Namen fuer den Lookup: lowercase, Akzente weg,
// haeufige Suffixe (FC / SC / CF / VfB / 1.) entfernen.
export function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // Akzente raus
    .replace(/^\d+\.\s+/, '') // Fuehrendes "1. " (1. FC Koeln etc.)
    .replace(/\b(fc|cf|sc|sv|vfb|vfl|tsg|borussia|bayer)\b/gi, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Stadium-Koordinaten der wichtigsten Vereine. Manuell gepflegt — kein API-Pull
// notwendig, weil die Koordinaten sich nie aendern. Quelle: Wikipedia /
// OpenStreetMap, gerundet auf 0.0001°.
const STADIUMS: Record<string, { lat: number; lon: number }> = {
  // Bundesliga
  'bayern munchen': { lat: 48.2188, lon: 11.6247 },           // Allianz Arena
  'bayern muenchen': { lat: 48.2188, lon: 11.6247 },
  'bayern': { lat: 48.2188, lon: 11.6247 },
  'dortmund': { lat: 51.4928, lon: 7.4519 },                  // Signal Iduna Park
  'leverkusen': { lat: 51.0383, lon: 7.0023 },                // BayArena
  'leipzig': { lat: 51.3458, lon: 12.3481 },                  // Red Bull Arena
  'union berlin': { lat: 52.4571, lon: 13.5683 },             // An der Alten Foersterei
  'union': { lat: 52.4571, lon: 13.5683 },
  'eintracht frankfurt': { lat: 50.0686, lon: 8.6450 },       // Deutsche Bank Park
  'frankfurt': { lat: 50.0686, lon: 8.6450 },
  'freiburg': { lat: 48.0211, lon: 7.8298 },                  // Europa-Park Stadion
  'hoffenheim': { lat: 49.2389, lon: 8.8889 },                // PreZero Arena
  'mainz': { lat: 49.9839, lon: 8.2247 },                     // Mewa Arena
  'wolfsburg': { lat: 52.4319, lon: 10.8036 },                // VW Arena
  'stuttgart': { lat: 48.7925, lon: 9.2317 },                 // MHPArena
  'monchengladbach': { lat: 51.1750, lon: 6.3853 },           // Borussia-Park
  'mochengladbach': { lat: 51.1750, lon: 6.3853 },
  'gladbach': { lat: 51.1750, lon: 6.3853 },
  'koln': { lat: 50.9333, lon: 6.8750 },                      // RheinEnergieStadion
  'koeln': { lat: 50.9333, lon: 6.8750 },
  'bremen': { lat: 53.0664, lon: 8.8378 },                    // Weserstadion
  'werder bremen': { lat: 53.0664, lon: 8.8378 },
  'augsburg': { lat: 48.3236, lon: 10.8861 },                 // WWK Arena
  'heidenheim': { lat: 48.6764, lon: 10.1547 },               // Voith-Arena
  'bochum': { lat: 51.4892, lon: 7.2364 },                    // Vonovia Ruhrstadion
  'darmstadt': { lat: 49.8542, lon: 8.6722 },                 // Boellenfalltor

  // Premier League
  'manchester city': { lat: 53.4831, lon: -2.2003 },          // Etihad
  'manchester united': { lat: 53.4631, lon: -2.2914 },        // Old Trafford
  'liverpool': { lat: 53.4308, lon: -2.9608 },                // Anfield
  'arsenal': { lat: 51.5550, lon: -0.1080 },                  // Emirates
  'chelsea': { lat: 51.4817, lon: -0.1908 },                  // Stamford Bridge
  'tottenham': { lat: 51.6043, lon: -0.0664 },                // Tottenham Hotspur Stadium
  'newcastle': { lat: 54.9756, lon: -1.6217 },                // St James' Park
  'aston villa': { lat: 52.5092, lon: -1.8847 },              // Villa Park
  'villa': { lat: 52.5092, lon: -1.8847 },
  'brighton': { lat: 50.8617, lon: -0.0833 },                 // Amex
  'west ham': { lat: 51.5386, lon: -0.0167 },                 // London Stadium
  'crystal palace': { lat: 51.3983, lon: -0.0856 },           // Selhurst Park
  'palace': { lat: 51.3983, lon: -0.0856 },
  'everton': { lat: 53.4392, lon: -2.9664 },                  // Goodison Park (uebergangsweise)
  'fulham': { lat: 51.4750, lon: -0.2217 },                   // Craven Cottage
  'brentford': { lat: 51.4906, lon: -0.2885 },                // Gtech
  'wolves': { lat: 52.5903, lon: -2.1306 },                   // Molineux
  'nottingham forest': { lat: 52.9400, lon: -1.1325 },        // City Ground
  'bournemouth': { lat: 50.7353, lon: -1.8383 },              // Vitality
  'sheffield united': { lat: 53.3703, lon: -1.4711 },         // Bramall Lane
  'burnley': { lat: 53.7892, lon: -2.2300 },                  // Turf Moor
  'luton': { lat: 51.8842, lon: -0.4317 },                    // Kenilworth Road

  // La Liga
  'real madrid': { lat: 40.4531, lon: -3.6883 },              // Bernabeu
  'barcelona': { lat: 41.3811, lon: 2.1228 },                 // Camp Nou / Montjuic
  'atletico madrid': { lat: 40.4364, lon: -3.5996 },          // Metropolitano
  'atletico': { lat: 40.4364, lon: -3.5996 },
  'sevilla': { lat: 37.3839, lon: -5.9706 },                  // Sanchez Pizjuan
  'real sociedad': { lat: 43.3014, lon: -1.9736 },            // Anoeta
  'sociedad': { lat: 43.3014, lon: -1.9736 },
  'villarreal': { lat: 39.9442, lon: -0.1031 },               // Estadio de la Ceramica
  'real betis': { lat: 37.3567, lon: -5.9817 },               // Benito Villamarin
  'betis': { lat: 37.3567, lon: -5.9817 },
  'athletic bilbao': { lat: 43.2642, lon: -2.9492 },          // San Mames
  'bilbao': { lat: 43.2642, lon: -2.9492 },
  'valencia': { lat: 39.4747, lon: -0.3583 },                 // Mestalla
  'getafe': { lat: 40.3253, lon: -3.7144 },                   // Coliseum
  'osasuna': { lat: 42.7967, lon: -1.6371 },                  // El Sadar
  'celta': { lat: 42.2119, lon: -8.7400 },                    // Balaidos
  'celta vigo': { lat: 42.2119, lon: -8.7400 },
  'mallorca': { lat: 39.5897, lon: 2.6300 },                  // Son Moix
  'almeria': { lat: 36.8400, lon: -2.4350 },                  // Power Horse Stadium
  'cadiz': { lat: 36.5031, lon: -6.2722 },                    // Nuevo Mirandilla
  'granada': { lat: 37.1525, lon: -3.5953 },                  // Los Carmenes
  'rayo vallecano': { lat: 40.3922, lon: -3.6586 },           // Vallecas
  'las palmas': { lat: 28.1006, lon: -15.4569 },              // Gran Canaria

  // Serie A
  'inter': { lat: 45.4781, lon: 9.1239 },                     // San Siro
  'inter milan': { lat: 45.4781, lon: 9.1239 },
  'milan': { lat: 45.4781, lon: 9.1239 },                     // San Siro
  'ac milan': { lat: 45.4781, lon: 9.1239 },
  'juventus': { lat: 45.1097, lon: 7.6411 },                  // Allianz Stadium
  'napoli': { lat: 40.8275, lon: 14.1928 },                   // Diego Armando Maradona
  'roma': { lat: 41.9339, lon: 12.4544 },                     // Olimpico
  'lazio': { lat: 41.9339, lon: 12.4544 },                    // Olimpico
  'atalanta': { lat: 45.7089, lon: 9.6800 },                  // Gewiss Stadium
  'fiorentina': { lat: 43.7806, lon: 11.2825 },               // Franchi
  'torino': { lat: 45.0413, lon: 7.6500 },                    // Olimpico Grande Torino
  'bologna': { lat: 44.4925, lon: 11.3097 },                  // Dall'Ara
  'sassuolo': { lat: 44.6489, lon: 10.8456 },                 // MAPEI
  'udinese': { lat: 46.0814, lon: 13.2003 },                  // Bluenergy
  'verona': { lat: 45.4356, lon: 10.9683 },                   // Bentegodi
  'genoa': { lat: 44.4164, lon: 8.9522 },                     // Marassi
  'cagliari': { lat: 39.2003, lon: 9.1372 },                  // Unipol Domus
  'monza': { lat: 45.5847, lon: 9.3083 },                     // U-Power
  'lecce': { lat: 40.3653, lon: 18.2086 },                    // Via del Mare
  'salernitana': { lat: 40.6447, lon: 14.8347 },              // Arechi
  'empoli': { lat: 43.7264, lon: 10.9550 },                   // Castellani
  'frosinone': { lat: 41.6378, lon: 13.3475 }                 // Stirpe
};

export function lookupStadium(team: string): StadiumCoord | null {
  const normalized = normalizeTeamName(team);
  // Direct hit
  const direct = STADIUMS[normalized];
  if (direct) return { ...direct, source: 'stadium' };
  // Word-boundary Substring-Match: nur wenn das Token als eigenes Wort
  // (Anfang/Ende des Strings oder Leerzeichen) im normalisierten Namen
  // vorkommt. Damit verhindern wir spurious hits wie „hinter" → „inter".
  const tokenized = ` ${normalized} `;
  for (const [key, coord] of Object.entries(STADIUMS)) {
    if (key.length < 4) continue; // sehr kurze Keys (zu generisch) skippen
    if (tokenized.includes(` ${key} `) || tokenized.includes(`${key} `) || tokenized.includes(` ${key}`)) {
      return { ...coord, source: 'stadium' };
    }
    // ODER: der normalisierte Name ist eine echte Teil-Sequenz des Keys
    // (z.B. „bilbao" findet „athletic bilbao"-Key).
    if (normalized.length >= 4 && key.includes(` ${normalized}`)) {
      return { ...coord, source: 'stadium' };
    }
  }
  return null;
}

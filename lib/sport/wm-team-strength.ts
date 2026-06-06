// Profi-Team-Stärke-Datenbasis für die WM 2026.
//
// Quellen-Kombination:
//   • ELO-Wert nach World Football Elo Ratings (Stand 06/2026, Schätzung
//     auf Basis öffentlich bekannter Werte). Bandbreite ~1500–2200.
//   • Offensives Rating: durchschnittliche Tore/Spiel der letzten 24
//     Länderspiele * 100, normiert auf 0–100.
//   • Defensives Rating: 100 minus durchschnittliche Gegentore/Spiel *
//     50, normiert auf 0–100. Höher = bessere Defense.
//   • Form-Index: −5 bis +5, Trend der letzten 5 Spiele.
//   • Confederation für eventuelle gleicher-Verband-Boni.
//
// HINWEIS: Diese Werte sind beste Schätzung kurz vor Turnierbeginn. Sie
// werden NICHT live aktualisiert. Engine bleibt für 5-Punkt-Genauigkeit
// gedacht, nicht für Wett-Empfehlung.

export interface TeamStrength {
  name: string;
  aliases?: string[];              // alternative Schreibweisen für Matching
  elo: number;
  offensive: number;               // 0–100, höher = mehr Tore
  defensive: number;               // 0–100, höher = weniger Gegentore
  formIndex: number;               // −5 bis +5
  confederation: 'UEFA' | 'CONMEBOL' | 'CAF' | 'AFC' | 'CONCACAF' | 'OFC';
  isHost?: boolean;
}

export const WM_2026_TEAMS: TeamStrength[] = [
  // Spitzenreiter / Top-Favoriten
  { name: 'Argentinien', aliases: ['Argentina'], elo: 2155, offensive: 85, defensive: 78, formIndex: 4, confederation: 'CONMEBOL' },
  { name: 'Frankreich', aliases: ['France'], elo: 2120, offensive: 88, defensive: 80, formIndex: 3, confederation: 'UEFA' },
  { name: 'Spanien', aliases: ['Spain'], elo: 2110, offensive: 86, defensive: 82, formIndex: 5, confederation: 'UEFA' },
  { name: 'England', elo: 2090, offensive: 84, defensive: 79, formIndex: 3, confederation: 'UEFA' },
  { name: 'Brasilien', aliases: ['Brazil'], elo: 2075, offensive: 82, defensive: 76, formIndex: 2, confederation: 'CONMEBOL' },
  { name: 'Portugal', elo: 2055, offensive: 82, defensive: 75, formIndex: 3, confederation: 'UEFA' },

  // Starke Mittelfeld-Top
  { name: 'Niederlande', aliases: ['Netherlands', 'Holland'], elo: 2030, offensive: 80, defensive: 75, formIndex: 2, confederation: 'UEFA' },
  { name: 'Deutschland', aliases: ['Germany'], elo: 2015, offensive: 78, defensive: 72, formIndex: 1, confederation: 'UEFA' },
  { name: 'Belgien', aliases: ['Belgium'], elo: 1995, offensive: 78, defensive: 71, formIndex: 0, confederation: 'UEFA' },
  { name: 'Italien', aliases: ['Italy'], elo: 1985, offensive: 73, defensive: 79, formIndex: 1, confederation: 'UEFA' },
  { name: 'Kroatien', aliases: ['Croatia'], elo: 1975, offensive: 72, defensive: 74, formIndex: 0, confederation: 'UEFA' },
  { name: 'Marokko', aliases: ['Morocco'], elo: 1955, offensive: 70, defensive: 78, formIndex: 3, confederation: 'CAF' },

  // Solide Outsider
  { name: 'Uruguay', elo: 1925, offensive: 75, defensive: 73, formIndex: 1, confederation: 'CONMEBOL' },
  { name: 'Dänemark', aliases: ['Denmark'], elo: 1925, offensive: 71, defensive: 73, formIndex: 2, confederation: 'UEFA' },
  { name: 'Schweiz', aliases: ['Switzerland'], elo: 1915, offensive: 68, defensive: 75, formIndex: 0, confederation: 'UEFA' },
  { name: 'Kolumbien', aliases: ['Colombia'], elo: 1900, offensive: 73, defensive: 70, formIndex: 2, confederation: 'CONMEBOL' },
  { name: 'Senegal', elo: 1895, offensive: 72, defensive: 70, formIndex: 1, confederation: 'CAF' },
  { name: 'Polen', aliases: ['Poland'], elo: 1885, offensive: 70, defensive: 67, formIndex: 0, confederation: 'UEFA' },
  { name: 'USA', aliases: ['United States', 'Vereinigte Staaten'], elo: 1885, offensive: 69, defensive: 68, formIndex: 2, confederation: 'CONCACAF', isHost: true },
  { name: 'Mexiko', aliases: ['Mexico'], elo: 1865, offensive: 71, defensive: 67, formIndex: 1, confederation: 'CONCACAF', isHost: true },
  { name: 'Japan', elo: 1865, offensive: 70, defensive: 71, formIndex: 3, confederation: 'AFC' },
  { name: 'Schweden', aliases: ['Sweden'], elo: 1855, offensive: 70, defensive: 68, formIndex: 0, confederation: 'UEFA' },
  { name: 'Türkei', aliases: ['Turkey', 'Türkei'], elo: 1850, offensive: 71, defensive: 65, formIndex: 1, confederation: 'UEFA' },
  { name: 'Ecuador', elo: 1845, offensive: 67, defensive: 71, formIndex: 1, confederation: 'CONMEBOL' },
  { name: 'Österreich', aliases: ['Austria'], elo: 1840, offensive: 70, defensive: 67, formIndex: 2, confederation: 'UEFA' },
  { name: 'Ungarn', aliases: ['Hungary'], elo: 1830, offensive: 67, defensive: 65, formIndex: 0, confederation: 'UEFA' },
  { name: 'Algerien', aliases: ['Algeria'], elo: 1825, offensive: 69, defensive: 68, formIndex: 1, confederation: 'CAF' },
  { name: 'Korea Republik', aliases: ['Südkorea', 'South Korea', 'Korea Republic'], elo: 1820, offensive: 68, defensive: 67, formIndex: 0, confederation: 'AFC' },
  { name: 'Iran', elo: 1815, offensive: 65, defensive: 70, formIndex: 0, confederation: 'AFC' },
  { name: 'Tschechien', aliases: ['Czech Republic'], elo: 1810, offensive: 66, defensive: 66, formIndex: 0, confederation: 'UEFA' },
  { name: 'Ägypten', aliases: ['Egypt'], elo: 1810, offensive: 69, defensive: 67, formIndex: 1, confederation: 'CAF' },
  { name: 'Kanada', aliases: ['Canada'], elo: 1810, offensive: 67, defensive: 66, formIndex: 0, confederation: 'CONCACAF', isHost: true },
  { name: 'Norwegen', aliases: ['Norway'], elo: 1805, offensive: 74, defensive: 62, formIndex: 1, confederation: 'UEFA' },
  { name: 'Australien', aliases: ['Australia'], elo: 1780, offensive: 66, defensive: 65, formIndex: 0, confederation: 'OFC' },
  { name: 'Nigeria', elo: 1775, offensive: 70, defensive: 64, formIndex: 1, confederation: 'CAF' },
  { name: 'Saudi-Arabien', aliases: ['Saudi Arabia'], elo: 1755, offensive: 64, defensive: 65, formIndex: -1, confederation: 'AFC' },
  { name: 'Tunesien', aliases: ['Tunisia'], elo: 1745, offensive: 65, defensive: 67, formIndex: 0, confederation: 'CAF' },
  { name: 'Ghana', elo: 1725, offensive: 66, defensive: 62, formIndex: -1, confederation: 'CAF' },
  { name: 'Kamerun', aliases: ['Cameroon'], elo: 1715, offensive: 66, defensive: 62, formIndex: 0, confederation: 'CAF' },
  { name: 'Costa Rica', elo: 1665, offensive: 62, defensive: 65, formIndex: -1, confederation: 'CONCACAF' },
  { name: 'Neuseeland', aliases: ['New Zealand'], elo: 1610, offensive: 58, defensive: 62, formIndex: 0, confederation: 'OFC' }
];

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '').trim();
}

export function findTeamStrength(name: string): TeamStrength | null {
  const target = normalize(name);
  if (!target) return null;
  for (const t of WM_2026_TEAMS) {
    if (normalize(t.name) === target) return t;
    if (t.aliases?.some((a) => normalize(a) === target)) return t;
    // Fuzzy: substring-Match nur bei mindestens 5 Zeichen.
    if (target.length >= 5 && normalize(t.name).includes(target)) return t;
    if (target.length >= 5 && t.aliases?.some((a) => normalize(a).includes(target) || target.includes(normalize(a)))) return t;
  }
  return null;
}

// Standardteam für Lookup-Fehlschläge — Mittelfeld-Durchschnitt, damit
// das Modell nicht crasht.
export const FALLBACK_TEAM: TeamStrength = {
  name: 'Unbekanntes Team',
  elo: 1700,
  offensive: 60,
  defensive: 60,
  formIndex: 0,
  confederation: 'UEFA'
};

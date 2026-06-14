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
  // Form-Index 06/2026 — Markt-Konsens-Kalibrierung:
  // Spanien (Euro-2024-Sieger) führt aktuelle Form klar an,
  // Argentinien (WM-Sieger 2022) hat seit Copa America leicht nachgelassen,
  // Frankreich + England durchgehend stabil im oberen Bereich.
  // Aggressivere Form-Kalibrierung Welle 11001+ — Markt-Konsens stuft
  // Spanien klar an die Spitze (Euro-2024-Sieger + Quali makellos),
  // Argentinien deutlich darunter (Copa-America-Performance schwach).
  { name: 'Argentinien', aliases: ['Argentina'], elo: 2155, offensive: 85, defensive: 78, formIndex: 0, confederation: 'CONMEBOL' },
  { name: 'Frankreich', aliases: ['France'], elo: 2120, offensive: 88, defensive: 80, formIndex: 4, confederation: 'UEFA' },
  { name: 'Spanien', aliases: ['Spain'], elo: 2110, offensive: 86, defensive: 82, formIndex: 7, confederation: 'UEFA' },
  { name: 'England', elo: 2090, offensive: 84, defensive: 79, formIndex: 5, confederation: 'UEFA' },
  { name: 'Brasilien', aliases: ['Brazil'], elo: 2075, offensive: 82, defensive: 76, formIndex: 2, confederation: 'CONMEBOL' },
  { name: 'Portugal', elo: 2055, offensive: 82, defensive: 75, formIndex: 4, confederation: 'UEFA' },

  // Starke Mittelfeld-Top
  { name: 'Niederlande', aliases: ['Netherlands', 'Holland'], elo: 2030, offensive: 80, defensive: 75, formIndex: 2, confederation: 'UEFA' },
  { name: 'Deutschland', aliases: ['Germany'], elo: 2015, offensive: 78, defensive: 72, formIndex: 1, confederation: 'UEFA' },
  { name: 'Belgien', aliases: ['Belgium'], elo: 1995, offensive: 78, defensive: 71, formIndex: 0, confederation: 'UEFA' },
  // Italien NICHT in der Liste — fuer WM 2026 nicht qualifiziert (UEFA-Playoffs).
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
  // Norwegen + Ghana intentional weggelassen — sind in der verifizierten
  // Sektion 10.06.2026 mit aktuellen Werten gepflegt.
  { name: 'Australien', aliases: ['Australia'], elo: 1780, offensive: 66, defensive: 65, formIndex: 0, confederation: 'OFC' },
  { name: 'Nigeria', elo: 1775, offensive: 70, defensive: 64, formIndex: 1, confederation: 'CAF' },
  { name: 'Saudi-Arabien', aliases: ['Saudi Arabia'], elo: 1755, offensive: 64, defensive: 65, formIndex: -1, confederation: 'AFC' },
  { name: 'Tunesien', aliases: ['Tunisia'], elo: 1745, offensive: 65, defensive: 67, formIndex: 0, confederation: 'CAF' },
  { name: 'Kamerun', aliases: ['Cameroon'], elo: 1715, offensive: 66, defensive: 62, formIndex: 0, confederation: 'CAF' },
  { name: 'Costa Rica', elo: 1665, offensive: 62, defensive: 65, formIndex: -1, confederation: 'CONCACAF' },
  { name: 'Neuseeland', aliases: ['New Zealand'], elo: 1610, offensive: 58, defensive: 62, formIndex: 0, confederation: 'OFC' },

  // Nachträglich ergänzt nach Auslosung Dez 2025 (Welle 9501+):
  // alle Teams, die durch die WM-2026-Auslosung in die 12 Gruppen kamen
  // und vorher nicht in der Datenbasis standen.
  { name: 'Südafrika', aliases: ['South Africa'], elo: 1690, offensive: 65, defensive: 65, formIndex: 1, confederation: 'CAF' },
  { name: 'Bosnien-Herzegowina', aliases: ['Bosnia and Herzegovina', 'Bosnia'], elo: 1675, offensive: 67, defensive: 64, formIndex: 0, confederation: 'UEFA' },
  { name: 'Katar', aliases: ['Qatar'], elo: 1640, offensive: 63, defensive: 65, formIndex: -1, confederation: 'AFC' },
  // Schottland, Curaçao, Elfenbeinküste, Kap Verde, Irak, Haiti
  // wurden bei der Welle-32xxx-Verifizierung in die untere Sektion
  // (10.06.2026-Block) verschoben. Hier bewusst nur Paraguay und
  // Jordanien — die haben keinen verifizierten Update bekommen.
  { name: 'Paraguay', elo: 1755, offensive: 66, defensive: 69, formIndex: 1, confederation: 'CONMEBOL' },
  { name: 'Jordanien', aliases: ['Jordan'], elo: 1580, offensive: 58, defensive: 63, formIndex: 0, confederation: 'AFC' },
  // Verifizierte Gruppen-Gegner (eingepflegt 10.06.2026 nach Gruppen-
  // Bestaetigung). Pro Team genau EIN Eintrag — Duplikate wurden in
  // Welle 33001-33100 entfernt, weil findTeamStrength First-Match-Lookup
  // verwendet und die spaeter eingepflegten Updates sonst dead code waeren.
  { name: 'Norwegen', aliases: ['Norway'], elo: 1860, offensive: 78, defensive: 70, formIndex: 4, confederation: 'UEFA' },
  { name: 'Elfenbeinküste', aliases: ['Ivory Coast', 'Cote d\'Ivoire', 'Côte d\'Ivoire'], elo: 1780, offensive: 72, defensive: 70, formIndex: 2, confederation: 'CAF' },
  { name: 'Schottland', aliases: ['Scotland'], elo: 1740, offensive: 65, defensive: 68, formIndex: 1, confederation: 'UEFA' },
  { name: 'Ghana', elo: 1700, offensive: 68, defensive: 64, formIndex: 0, confederation: 'CAF' },
  { name: 'Irak', aliases: ['Iraq'], elo: 1620, offensive: 60, defensive: 65, formIndex: 0, confederation: 'AFC' },
  { name: 'Kap Verde', aliases: ['Cape Verde', 'Cabo Verde'], elo: 1610, offensive: 60, defensive: 63, formIndex: 1, confederation: 'CAF' },
  { name: 'Curaçao', aliases: ['Curacao'], elo: 1570, offensive: 60, defensive: 61, formIndex: 0, confederation: 'CONCACAF' },
  { name: 'Haiti', elo: 1530, offensive: 58, defensive: 58, formIndex: 0, confederation: 'CONCACAF' },
  { name: 'DR Kongo', aliases: ['DR Congo', 'Congo DR', 'Demokratische Republik Kongo'], elo: 1735, offensive: 68, defensive: 65, formIndex: 1, confederation: 'CAF' },
  { name: 'Usbekistan', aliases: ['Uzbekistan'], elo: 1645, offensive: 62, defensive: 65, formIndex: 0, confederation: 'AFC' },
  { name: 'Panama', elo: 1670, offensive: 64, defensive: 63, formIndex: 0, confederation: 'CONCACAF' }
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

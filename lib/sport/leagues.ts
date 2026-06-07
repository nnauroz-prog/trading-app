export interface League {
  id: string;
  name: string;
  country: string;
}

// TheSportsDB free league IDs. Breite Abdeckung — alles was typischerweise
// auf Tipico handelbar ist: Top-Ligen + Unterklasse-Ligen + Sommer-aktive
// Ligen + nationale Spielklassen. Doppelte IDs sind streng vermieden.
export const FOOTBALL_LEAGUES: League[] = [
  // === Deutschland ===
  { id: '4331', name: 'Bundesliga', country: 'Deutschland' },
  { id: '4329', name: '2. Bundesliga', country: 'Deutschland' },
  // === England ===
  { id: '4328', name: 'Premier League', country: 'England' },
  { id: '4395', name: 'Championship', country: 'England' },
  // === Spanien ===
  { id: '4335', name: 'La Liga', country: 'Spanien' },
  { id: '4336', name: 'Segunda División', country: 'Spanien' },
  // === Italien ===
  { id: '4332', name: 'Serie A', country: 'Italien' },
  { id: '4333', name: 'Serie B', country: 'Italien' },
  { id: '4470', name: 'Serie C', country: 'Italien' },
  // === Frankreich ===
  { id: '4334', name: 'Ligue 1', country: 'Frankreich' },
  { id: '4393', name: 'Ligue 2', country: 'Frankreich' },
  // === Niederlande / Portugal / Belgien / Schweiz / Österreich ===
  { id: '4337', name: 'Eredivisie', country: 'Niederlande' },
  { id: '4338', name: 'Liga Portugal', country: 'Portugal' },
  { id: '4399', name: 'Jupiler Pro League', country: 'Belgien' },
  { id: '4392', name: 'Super League', country: 'Schweiz' },
  { id: '4385', name: 'Bundesliga', country: 'Österreich' },
  // === Skandinavien ===
  { id: '4347', name: 'Eliteserien', country: 'Norwegen' },
  { id: '4330', name: 'Allsvenskan', country: 'Schweden' },
  // === Süd-Europa / Osteuropa ===
  { id: '4388', name: 'Super League', country: 'Griechenland' },
  // ID 4380 entfernt — kollidiert mit NHL (Eishockey) bei TheSportsDB.
  // Aktuell laufen NHL-Stanley-Cup-Finals, die Daten kamen fälschlich
  // in der Fußball-Liste an (Vegas Golden Knights vs. Carolina Hurricanes).
  // Russische Top-Liga ist bei TheSportsDB unter einer anderen ID oder
  // gar nicht zuverlässig gepflegt — wir lassen sie raus.
  // === Europa-Pokale ===
  { id: '4480', name: 'UEFA Champions League', country: 'Europa' },
  { id: '4481', name: 'UEFA Europa League', country: 'Europa' },
  { id: '4548', name: 'UEFA Nations League', country: 'Europa' },
  // === Amerika ===
  { id: '4346', name: 'MLS', country: 'USA' },
  { id: '4351', name: 'Brasileirão Série A', country: 'Brasilien' },
  { id: '4352', name: 'Brasileirão Série B', country: 'Brasilien' },
  { id: '4344', name: 'Liga MX', country: 'Mexiko' },
  { id: '4406', name: 'Primera División', country: 'Argentinien' },
  { id: '4407', name: 'Primera Nacional', country: 'Argentinien' },
  { id: '4413', name: 'Primera B Metropolitana', country: 'Argentinien' },
  { id: '4502', name: 'Copa Colombia', country: 'Kolumbien' },
  { id: '4501', name: 'Categoría Primera A', country: 'Kolumbien' },
  // === Afrika / Naher Osten ===
  { id: '4341', name: 'Ligue Professionnelle 1', country: 'Algerien' },
  { id: '4505', name: 'Botola Pro', country: 'Marokko' },
  { id: '4378', name: 'Egyptian Premier League', country: 'Ägypten' },
  { id: '4477', name: 'Saudi Pro League', country: 'Saudi-Arabien' },
  // === Asien / Australien ===
  { id: '4339', name: 'J1 League', country: 'Japan' },
  { id: '4356', name: 'A-League Men', country: 'Australien' },
  { id: '4391', name: 'Chinese Super League', country: 'China' },
  { id: '4396', name: 'Indian Super League', country: 'Indien' },
  // === International ===
  { id: '4429', name: 'FIFA World Cup', country: 'International' },
  { id: '4503', name: 'International Friendlies', country: 'International' }
];

// Basketball-Ligen — TheSportsDB-IDs für die wichtigsten Wett-Märkte.
// Wichtig: 4477 wurde entfernt — diese ID ist bei TheSportsDB als Saudi Pro
// League (Fußball) angelegt. Mehrfache Best-Guess-ID-Kollisionen würden
// sonst Basketball-Spiele in der Fußball-Liste zeigen.
export const BASKETBALL_LEAGUES: League[] = [
  { id: '4387', name: 'NBA', country: 'USA' },
  { id: '4408', name: 'EuroLeague', country: 'Europa' },
  { id: '4607', name: 'BBL', country: 'Deutschland' }
];

// Tennis-Turniere — die vier Grand Slams + ATP/WTA-Top.
export const TENNIS_LEAGUES: League[] = [
  { id: '4464', name: 'ATP Tour', country: 'International' },
  { id: '4465', name: 'WTA Tour', country: 'International' },
  { id: '4466', name: 'Australian Open', country: 'Australien' },
  { id: '4467', name: 'French Open', country: 'Frankreich' },
  { id: '4468', name: 'Wimbledon', country: 'England' },
  { id: '4469', name: 'US Open', country: 'USA' }
];

// Eishockey — NHL (USA), DEL (Deutschland), KHL (Russland), SHL (Schweden)
export const HOCKEY_LEAGUES: League[] = [
  { id: '4380', name: 'NHL', country: 'USA' },
  { id: '4625', name: 'DEL', country: 'Deutschland' },
  { id: '4626', name: 'KHL', country: 'Russland' },
  { id: '4627', name: 'SHL', country: 'Schweden' }
];

// Handball — Handball-Bundesliga, EHF Champions League, LIQUI MOLY HBL
export const HANDBALL_LEAGUES: League[] = [
  { id: '4641', name: 'Handball-Bundesliga', country: 'Deutschland' },
  { id: '4642', name: 'EHF Champions League', country: 'Europa' },
  { id: '4643', name: 'Liga ASOBAL', country: 'Spanien' },
  { id: '4644', name: 'LNH Division 1', country: 'Frankreich' }
];

// Motorsport — Formel 1, MotoGP (best-guess IDs)
export const MOTORSPORT_LEAGUES: League[] = [
  { id: '4370', name: 'Formula 1', country: 'International' },
  { id: '4371', name: 'MotoGP', country: 'International' },
  { id: '4372', name: 'IndyCar Series', country: 'USA' }
];

// Baseball — MLB
export const BASEBALL_LEAGUES: League[] = [
  { id: '4424', name: 'MLB', country: 'USA' },
  { id: '4830', name: 'NPB', country: 'Japan' }
];

// American Football — NFL (best-guess ID)
export const NFL_LEAGUES: League[] = [
  { id: '4391', name: 'NFL', country: 'USA' }
];

// Mehrere mögliche IDs für die WM 2026 — TheSportsDB pflegt sie oft unter
// verschiedenen IDs (Hauptturnier, Qualifikation, Friendlies).
export const WORLD_CUP_LEAGUE_IDS = ['4429', '4503'];

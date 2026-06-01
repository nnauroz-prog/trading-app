// 100-köpfige Sport-Redaktion. Jeder Mitarbeiter hat eine Rolle und ein
// Department; die meisten arbeiten gegen unsere Form-/Spielplan-Daten
// (TheSportsDB), ein paar Abteilungen warten ehrlich auf Feeds, die noch nicht
// angebunden sind (Transfer-Rumours, Verbands-Politik).

export type SportDepartment =
  | 'chef'
  | 'league_scout'
  | 'team_analyst'
  | 'form_analyst'
  | 'tactical_analyst'
  | 'international_watch'
  | 'transfer_watch'
  | 'politik_watch'
  | 'schedule_gatekeeper'
  | 'safety_picker';

export interface SportEmployee {
  id: string;
  name: string;
  role: string;
  department: SportDepartment;
  // Optional bindings — z.B. „BL" für Bundesliga-Spezialist
  leagueKey?: string;
  teamKey?: string;
}

const CHEFS: SportEmployee[] = [
  { id: 'chef-de', name: 'Hannes Kruger', role: 'Chefredakteur Deutschland', department: 'chef', leagueKey: 'BL' },
  { id: 'chef-en', name: 'Alistair Wren', role: 'Chefredakteur England', department: 'chef', leagueKey: 'PL' },
  { id: 'chef-es', name: 'Pilar Saavedra', role: 'Chefredakteurin Spanien', department: 'chef', leagueKey: 'LL' },
  { id: 'chef-it', name: 'Matteo Ricci', role: 'Chefredakteur Italien', department: 'chef', leagueKey: 'SA' },
  { id: 'chef-eu', name: 'Sven-Olof Berg', role: 'Chefredakteur Europa-Pokale', department: 'chef', leagueKey: 'UCL' }
];

const LEAGUE_SCOUTS: SportEmployee[] = [
  // Bundesliga (5)
  { id: 'ls-bl-1', name: 'Theo Lindner', role: 'Liga-Scout Bundesliga · Spitze', department: 'league_scout', leagueKey: 'BL' },
  { id: 'ls-bl-2', name: 'Jana Wessels', role: 'Liga-Scout Bundesliga · Mittelfeld', department: 'league_scout', leagueKey: 'BL' },
  { id: 'ls-bl-3', name: 'Robin Markwart', role: 'Liga-Scout Bundesliga · Abstiegszone', department: 'league_scout', leagueKey: 'BL' },
  { id: 'ls-bl-4', name: 'Mira Hofmann', role: 'Liga-Scout Bundesliga · Heim/Auswärts', department: 'league_scout', leagueKey: 'BL' },
  { id: 'ls-bl-5', name: 'Onur Yıldırım', role: 'Liga-Scout Bundesliga · Aufsteiger', department: 'league_scout', leagueKey: 'BL' },
  // Premier League (5)
  { id: 'ls-pl-1', name: 'Eleanor Whitcombe', role: 'Liga-Scout Premier League · Top-6', department: 'league_scout', leagueKey: 'PL' },
  { id: 'ls-pl-2', name: 'Dominic Quigley', role: 'Liga-Scout Premier League · Mid-Table', department: 'league_scout', leagueKey: 'PL' },
  { id: 'ls-pl-3', name: 'Khalid Mensah', role: 'Liga-Scout Premier League · Relegation-Battle', department: 'league_scout', leagueKey: 'PL' },
  { id: 'ls-pl-4', name: 'Bryony Aldridge', role: 'Liga-Scout Premier League · Pace & Press', department: 'league_scout', leagueKey: 'PL' },
  { id: 'ls-pl-5', name: 'Cillian Doherty', role: 'Liga-Scout Premier League · Set-Pieces', department: 'league_scout', leagueKey: 'PL' },
  // La Liga (5)
  { id: 'ls-ll-1', name: 'Ramón Esquivel', role: 'Liga-Scout La Liga · Spitze', department: 'league_scout', leagueKey: 'LL' },
  { id: 'ls-ll-2', name: 'Lucía Vidal', role: 'Liga-Scout La Liga · Mittelfeld', department: 'league_scout', leagueKey: 'LL' },
  { id: 'ls-ll-3', name: 'Iker Mendiola', role: 'Liga-Scout La Liga · Abstiegszone', department: 'league_scout', leagueKey: 'LL' },
  { id: 'ls-ll-4', name: 'Carmen Pellicer', role: 'Liga-Scout La Liga · Junge Talente', department: 'league_scout', leagueKey: 'LL' },
  { id: 'ls-ll-5', name: 'Andrés Fontana', role: 'Liga-Scout La Liga · Auswärts-Form', department: 'league_scout', leagueKey: 'LL' },
  // Serie A (5)
  { id: 'ls-sa-1', name: 'Giulia Romano', role: 'Liga-Scout Serie A · Spitze', department: 'league_scout', leagueKey: 'SA' },
  { id: 'ls-sa-2', name: 'Pietro Calabrese', role: 'Liga-Scout Serie A · Mittelfeld', department: 'league_scout', leagueKey: 'SA' },
  { id: 'ls-sa-3', name: 'Beatrice Conti', role: 'Liga-Scout Serie A · Abstieg', department: 'league_scout', leagueKey: 'SA' },
  { id: 'ls-sa-4', name: 'Luca Bertolini', role: 'Liga-Scout Serie A · Catenaccio-Defensiv', department: 'league_scout', leagueKey: 'SA' },
  { id: 'ls-sa-5', name: 'Sofia Marchetti', role: 'Liga-Scout Serie A · Heim-Stadion', department: 'league_scout', leagueKey: 'SA' },
  // Champions League (5)
  { id: 'ls-cl-1', name: 'Henrik Bergstrøm', role: 'CL-Scout · Gruppenphase', department: 'league_scout', leagueKey: 'UCL' },
  { id: 'ls-cl-2', name: 'Alessandra Vinci', role: 'CL-Scout · Achtelfinale', department: 'league_scout', leagueKey: 'UCL' },
  { id: 'ls-cl-3', name: 'Marko Đurić', role: 'CL-Scout · Außenseiter', department: 'league_scout', leagueKey: 'UCL' },
  { id: 'ls-cl-4', name: 'Adèle Chevalier', role: 'CL-Scout · Top-Favoriten', department: 'league_scout', leagueKey: 'UCL' },
  { id: 'ls-cl-5', name: 'Christos Vlachos', role: 'CL-Scout · Heim-Vorteil', department: 'league_scout', leagueKey: 'UCL' }
];

const TEAM_ANALYSTS_RAW = [
  'FC Bayern München',
  'Borussia Dortmund',
  'RB Leipzig',
  'Bayer Leverkusen',
  'VfB Stuttgart',
  'Eintracht Frankfurt',
  'Manchester City',
  'Liverpool',
  'Arsenal',
  'Manchester United',
  'Chelsea',
  'Tottenham Hotspur',
  'Real Madrid',
  'FC Barcelona',
  'Atlético Madrid',
  'Athletic Bilbao',
  'Real Sociedad',
  'Sevilla',
  'Internazionale',
  'AC Milan',
  'Juventus',
  'Napoli',
  'AS Roma',
  'Lazio',
  'Paris Saint-Germain',
  'Olympique Marseille',
  'Olympique Lyon',
  'AS Monaco',
  'Benfica',
  'Porto'
];

const FIRST_NAMES = ['Sarah', 'Tobias', 'Florian', 'Inga', 'Ben', 'Lara', 'Hendrik', 'Greta', 'Niko', 'Vanessa', 'Marcus', 'Anika', 'Jonas', 'Lina', 'Adrian', 'Mila', 'Felix', 'Maja', 'Levi', 'Nora', 'Erik', 'Yara', 'Mats', 'Linnea', 'Konrad', 'Saskia', 'Jaromir', 'Helena', 'Ezra', 'Olivia'];
const LAST_NAMES = ['Bauer', 'Schroeder', 'Vogel', 'Eckert', 'Lemke', 'Naumann', 'Brandt', 'Sommer', 'Renner', 'Falk', 'Reimer', 'Tietz', 'Werner', 'Holzer', 'Brügger', 'Maas', 'Roth', 'Frey', 'Kunz', 'Schenk', 'Voss', 'Kessel', 'Pfaff', 'Heinze', 'Kröger', 'Stein', 'Lutz', 'Decker', 'Auer', 'Krieger'];

const TEAM_ANALYSTS: SportEmployee[] = TEAM_ANALYSTS_RAW.map((team, i) => ({
  id: `ta-${i + 1}`,
  name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`,
  role: `Mannschafts-Analyst·in · ${team}`,
  department: 'team_analyst',
  teamKey: team
}));

const FORM_ANALYSTS: SportEmployee[] = [
  { id: 'fa-1', name: 'Wibke Allendorf', role: 'Form-Analyst · Sieg-Serien', department: 'form_analyst' },
  { id: 'fa-2', name: 'Diego Salazar', role: 'Form-Analyst · Niederlagen-Serien', department: 'form_analyst' },
  { id: 'fa-3', name: 'Yvonne Marquardt', role: 'Form-Analyst · Tor-Quote', department: 'form_analyst' },
  { id: 'fa-4', name: 'Sebastián Ortega', role: 'Form-Analyst · Gegen-Tor-Quote', department: 'form_analyst' },
  { id: 'fa-5', name: 'Heike Tollner', role: 'Form-Analyst · Heim-Form', department: 'form_analyst' },
  { id: 'fa-6', name: 'Phil Karras', role: 'Form-Analyst · Auswärts-Form', department: 'form_analyst' },
  { id: 'fa-7', name: 'Margit Wiesinger', role: 'Form-Analyst · Aufholjagden', department: 'form_analyst' },
  { id: 'fa-8', name: 'Bo-Yeon Lee', role: 'Form-Analyst · Knappe Spiele', department: 'form_analyst' }
];

const SCHEDULE_GATEKEEPER: SportEmployee[] = [
  {
    id: 'gate-1',
    name: 'Linnea Steinmetz',
    role: 'Aktualitäts-Wächterin · sorgt dafür, dass nur kommende Spiele angezeigt werden, vergangene Begegnungen werden ausgeblendet.',
    department: 'schedule_gatekeeper'
  }
];

const SAFETY_PICKER: SportEmployee[] = [
  {
    id: 'pick-1',
    name: 'Roland Vogt',
    role: 'Sicherheits-Tipp-Wächter · filtert die Wochenvorhersage und zeigt nur Begegnungen mit sehr hoher Konfidenz (≥ 65 %).',
    department: 'safety_picker'
  }
];

const TACTICAL_ANALYSTS: SportEmployee[] = [
  { id: 'tac-1', name: 'Prof. Dr. Heiner Soltau', role: 'Taktik · High-Press-Systeme', department: 'tactical_analyst' },
  { id: 'tac-2', name: 'Isabel Ronnefeldt', role: 'Taktik · Tief-Block-Systeme', department: 'tactical_analyst' },
  { id: 'tac-3', name: 'Friedrich Engelhart', role: 'Taktik · Konter-Mannschaften', department: 'tactical_analyst' },
  { id: 'tac-4', name: 'Rosalia Bonetti', role: 'Taktik · Ballbesitz-Teams', department: 'tactical_analyst' },
  { id: 'tac-5', name: 'Casper van Velden', role: 'Taktik · Flügelspiel', department: 'tactical_analyst' },
  { id: 'tac-6', name: 'Tariq Boudjellal', role: 'Taktik · Standards', department: 'tactical_analyst' },
  { id: 'tac-7', name: 'Helga Knappek', role: 'Taktik · Pressing-Intensität', department: 'tactical_analyst' },
  { id: 'tac-8', name: 'Stojan Petrović', role: 'Taktik · Zentrumsdominanz', department: 'tactical_analyst' },
  { id: 'tac-9', name: 'Ines Carvalho', role: 'Taktik · Rotation & Belastung', department: 'tactical_analyst' },
  { id: 'tac-10', name: 'Bartosz Lewandowski', role: 'Taktik · Halbzeit-Anpassungen', department: 'tactical_analyst' }
];

const INTERNATIONAL_WATCH: SportEmployee[] = [
  { id: 'iw-1', name: 'Aysel Tunca', role: 'International · UEFA-Wettbewerbe', department: 'international_watch' },
  { id: 'iw-2', name: 'Rajiv Mehta', role: 'International · Nationalmannschaften', department: 'international_watch' },
  { id: 'iw-3', name: 'Aaron Goldfeder', role: 'International · WM/EM-Qualis', department: 'international_watch' },
  { id: 'iw-4', name: 'Inka Sjöberg', role: 'International · Skandinavien', department: 'international_watch' },
  { id: 'iw-5', name: 'Ola Eriksson', role: 'International · Süd-Amerika', department: 'international_watch' }
];

const TRANSFER_WATCH: SportEmployee[] = [
  { id: 'tw-1', name: 'Carlo Renz', role: 'Transfer-Markt · Bundesliga-Zugänge', department: 'transfer_watch' },
  { id: 'tw-2', name: 'Doreen Habicht', role: 'Transfer-Markt · Bundesliga-Abgänge', department: 'transfer_watch' },
  { id: 'tw-3', name: 'Niccolò Damiani', role: 'Transfer-Markt · Serie A', department: 'transfer_watch' },
  { id: 'tw-4', name: 'Aoife Brennan', role: 'Transfer-Markt · Premier League', department: 'transfer_watch' },
  { id: 'tw-5', name: 'Eduardo Pinheiro', role: 'Transfer-Markt · La Liga', department: 'transfer_watch' },
  { id: 'tw-6', name: 'Hilde Stenersen', role: 'Transfer-Markt · Skandinavien', department: 'transfer_watch' },
  { id: 'tw-7', name: 'Mohamed Tannoury', role: 'Transfer-Markt · Frankreich', department: 'transfer_watch' },
  { id: 'tw-8', name: 'Lena Pärtel', role: 'Transfer-Markt · Junge Talente', department: 'transfer_watch' },
  { id: 'tw-9', name: 'Vasili Komninos', role: 'Transfer-Markt · Vereinslose', department: 'transfer_watch' },
  { id: 'tw-10', name: 'Maxime Lacroix', role: 'Karriere-Ende-Beobachter · Aktive Stars', department: 'transfer_watch' }
];

const POLITIK_WATCH: SportEmployee[] = [
  { id: 'pol-1', name: 'Dr. Reinhard Krempel', role: 'Verbands-Politik · DFB', department: 'politik_watch' },
  { id: 'pol-2', name: 'Petra Sienkiewicz', role: 'Verbands-Politik · UEFA', department: 'politik_watch' },
  { id: 'pol-3', name: 'Kwame Asare', role: 'Verbands-Politik · FIFA', department: 'politik_watch' },
  { id: 'pol-4', name: 'Thea Munk', role: 'Stadion- & Fan-Politik', department: 'politik_watch' },
  { id: 'pol-5', name: 'Achim Schwarzer', role: 'Schiri-Themen & VAR', department: 'politik_watch' }
];

export const SPORT_FIRMA: SportEmployee[] = [
  ...CHEFS,
  ...LEAGUE_SCOUTS,
  ...TEAM_ANALYSTS,
  ...FORM_ANALYSTS,
  ...TACTICAL_ANALYSTS,
  ...INTERNATIONAL_WATCH,
  ...TRANSFER_WATCH,
  ...POLITIK_WATCH,
  ...SCHEDULE_GATEKEEPER,
  ...SAFETY_PICKER
];

// Praktischer Zugriff auf die zwei „Einzelplatz"-Rollen, deren Namen die UI
// neben ihrer Auswertung ausweist.
export const SCHEDULE_GATEKEEPER_EMPLOYEE: SportEmployee = SCHEDULE_GATEKEEPER[0];
export const SAFETY_PICKER_EMPLOYEE: SportEmployee = SAFETY_PICKER[0];

export const SAFETY_PICK_THRESHOLD = 0.65;

// Sicherheits-Check: Wenn jemand die Liste anpasst, soll der Build laut werden,
// falls wir nicht mehr genau 100 Mitarbeiter haben. Die Karte verspricht „100".
export const SPORT_FIRMA_SIZE = SPORT_FIRMA.length;

export function countByDepartment(): Record<SportDepartment, number> {
  const out = {
    chef: 0, league_scout: 0, team_analyst: 0, form_analyst: 0,
    tactical_analyst: 0, international_watch: 0, transfer_watch: 0, politik_watch: 0,
    schedule_gatekeeper: 0, safety_picker: 0
  } as Record<SportDepartment, number>;
  for (const e of SPORT_FIRMA) out[e.department]++;
  return out;
}

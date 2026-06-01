export interface League {
  id: string;
  name: string;
  country: string;
}

// TheSportsDB free league IDs.
// Europäische Top-Ligen + Sommer-aktive Ligen (Mai–November). Damit ist auch
// in der europäischen Sommerpause (Juni–Juli) immer was zum Tippen da.
export const FOOTBALL_LEAGUES: League[] = [
  { id: '4331', name: 'Bundesliga', country: 'Deutschland' },
  { id: '4328', name: 'Premier League', country: 'England' },
  { id: '4335', name: 'La Liga', country: 'Spanien' },
  { id: '4332', name: 'Serie A', country: 'Italien' },
  { id: '4334', name: 'Ligue 1', country: 'Frankreich' },
  { id: '4337', name: 'Eredivisie', country: 'Niederlande' },
  { id: '4338', name: 'Liga Portugal', country: 'Portugal' },
  { id: '4480', name: 'UEFA Champions League', country: 'Europa' },
  { id: '4481', name: 'UEFA Europa League', country: 'Europa' },
  // Sommer-aktive Ligen:
  { id: '4346', name: 'MLS', country: 'USA' },
  { id: '4351', name: 'Brasileirão Série A', country: 'Brasilien' },
  { id: '4347', name: 'Eliteserien', country: 'Norwegen' },
  { id: '4330', name: 'Allsvenskan', country: 'Schweden' },
  { id: '4339', name: 'J1 League', country: 'Japan' },
  { id: '4356', name: 'A-League Men', country: 'Australien' },
  { id: '4344', name: 'Liga MX', country: 'Mexiko' },
  { id: '4406', name: 'Primera División', country: 'Argentinien' },
  { id: '4396', name: 'Indian Super League', country: 'Indien' },
  { id: '4391', name: 'Chinese Super League', country: 'China' }
];

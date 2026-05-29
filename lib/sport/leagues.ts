export interface League {
  id: string;
  name: string;
  country: string;
}

// TheSportsDB free league IDs. Major European top divisions + top European cups.
export const FOOTBALL_LEAGUES: League[] = [
  { id: '4331', name: 'Bundesliga', country: 'Deutschland' },
  { id: '4328', name: 'Premier League', country: 'England' },
  { id: '4335', name: 'La Liga', country: 'Spanien' },
  { id: '4332', name: 'Serie A', country: 'Italien' },
  { id: '4334', name: 'Ligue 1', country: 'Frankreich' },
  { id: '4337', name: 'Eredivisie', country: 'Niederlande' },
  { id: '4338', name: 'Liga Portugal', country: 'Portugal' },
  { id: '4480', name: 'UEFA Champions League', country: 'Europa' },
  { id: '4481', name: 'UEFA Europa League', country: 'Europa' }
];

// Pure Mapping von symbolischen leagueKeys (im Roster) auf die kanonischen
// Liga-Namen, mit denen TheSportsDB-Ligen gematcht werden. Keine I/O.

export const LEAGUE_KEY_LABEL: Record<string, string> = {
  BL:  'Bundesliga',
  PL:  'Premier League',
  LL:  'La Liga',
  SA:  'Serie A',
  UCL: 'UEFA Champions League'
};

// Wenn eine Liga zu mehreren Ländern existiert (z.B. „Bundesliga" Deutschland +
// Österreich), nehmen wir den deutschen Standard für „BL".
export const LEAGUE_KEY_COUNTRY_PREFERENCE: Record<string, string> = {
  BL:  'Deutschland',
  PL:  'England',
  LL:  'Spanien',
  SA:  'Italien',
  UCL: 'Europa'
};

export interface NamedLeague {
  name: string;
  country: string;
}

export function leagueLabelForKey(key: string): string | null {
  return LEAGUE_KEY_LABEL[key] ?? null;
}

// Liefert die Liga aus einer Liste, die zum leagueKey passt. Bei mehreren
// Kandidaten: bevorzuge das Land aus LEAGUE_KEY_COUNTRY_PREFERENCE.
export function matchLeagueForKey<T extends NamedLeague>(key: string, leagues: T[]): T | null {
  const label = LEAGUE_KEY_LABEL[key];
  if (!label) return null;
  const preferredCountry = LEAGUE_KEY_COUNTRY_PREFERENCE[key];
  const candidates = leagues.filter((l) => l.name === label);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  return candidates.find((c) => c.country === preferredCountry) ?? candidates[0];
}

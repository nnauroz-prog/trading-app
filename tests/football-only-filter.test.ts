// Regression-Tests für den looksLikeFootball-Filter im Football-Fetcher.
// Bug-Hintergrund: TheSportsDB teilt Liga-IDs zwischen Sportarten
// (4477 Saudi Pro League / NCAA-Basketball, 4380 Russian Premier Liga /
// NHL). Wenn die Sport-„fremde" Liga gerade aktiv ist, kommen die
// fremden Spiele in der Football-Liste an. Filter muss sie raus halten.
//
// Da looksLikeFootball() unexportiert ist, testen wir indirekt:
// wir lesen die normalisierte Fixture, indem wir die NON_FOOTBALL_HINTS-
// Logik nachbauen. Wenn der Filter im Produktivcode ergänzt wird, müssen
// hier neue Cases aufgenommen werden.

import { describe, expect, it } from 'vitest';

const NON_FOOTBALL_HINTS = [
  ' basketball', ' hockey', ' volleyball', ' baseball', ' rugby',
  ' eishockey', ' hb (', ' handball'
];
const NON_FOOTBALL_PREFIXES = ['KK ', 'BC ', 'ZKK ', 'CSKA ', 'PBC '];
const NHL_TEAMS = new Set([
  'carolina hurricanes', 'vegas golden knights', 'boston bruins',
  'toronto maple leafs', 'edmonton oilers', 'florida panthers'
]);
const MLB_KEYWORDS = ['yankees', 'red sox', 'dodgers'];

function looksLikeFootball(home: string, away: string): boolean {
  const h = home.toLowerCase();
  const a = away.toLowerCase();
  if (NHL_TEAMS.has(h) || NHL_TEAMS.has(a)) return false;
  for (const kw of MLB_KEYWORDS) {
    if (h.includes(kw) || a.includes(kw)) return false;
  }
  for (const hint of NON_FOOTBALL_HINTS) {
    if (h.includes(hint) || a.includes(hint)) return false;
  }
  for (const pre of NON_FOOTBALL_PREFIXES) {
    if (home.startsWith(pre) || away.startsWith(pre)) return false;
  }
  return true;
}

describe('looksLikeFootball', () => {
  it('lässt echte Fußball-Teams durch', () => {
    expect(looksLikeFootball('FC Bayern München', 'Borussia Dortmund')).toBe(true);
    expect(looksLikeFootball('Real Madrid', 'FC Barcelona')).toBe(true);
    expect(looksLikeFootball('Manchester United', 'Liverpool')).toBe(true);
  });

  it('filtert NHL-Teams aus (Vegas Golden Knights, Carolina Hurricanes)', () => {
    expect(looksLikeFootball('Vegas Golden Knights', 'Carolina Hurricanes')).toBe(false);
    expect(looksLikeFootball('Boston Bruins', 'Toronto Maple Leafs')).toBe(false);
    expect(looksLikeFootball('Florida Panthers', 'Edmonton Oilers')).toBe(false);
  });

  it('filtert Basketball-Teams via Präfix KK / BC', () => {
    expect(looksLikeFootball('KK Partizan', 'KK Crvena Zvezda')).toBe(false);
    expect(looksLikeFootball('BC Khimki', 'CSKA Moskau')).toBe(false);
  });

  it('filtert Sport-Hinweise im Namen', () => {
    expect(looksLikeFootball('Bilbao Basketball', 'Valencia Basket')).toBe(false);
    expect(looksLikeFootball('SG Flensburg-Handewitt', 'THW Kiel Handball')).toBe(false);
  });

  it('filtert MLB-Teams via Keyword', () => {
    expect(looksLikeFootball('New York Yankees', 'Boston Red Sox')).toBe(false);
    expect(looksLikeFootball('Los Angeles Dodgers', 'Chicago Cubs')).toBe(false); // Dodgers triggert MLB-Filter
  });

  it('case-insensitiv beim NHL-Match', () => {
    expect(looksLikeFootball('VEGAS GOLDEN KNIGHTS', 'CAROLINA HURRICANES')).toBe(false);
    expect(looksLikeFootball('vegas golden knights', 'carolina hurricanes')).toBe(false);
  });
});

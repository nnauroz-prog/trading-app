import { describe, expect, it } from 'vitest';
import { leagueLabelForKey, matchLeagueForKey, LEAGUE_KEY_LABEL } from '@/lib/sport/firma/league-key-mapping';

describe('leagueLabelForKey', () => {
  it('BL → Bundesliga', () => {
    expect(leagueLabelForKey('BL')).toBe('Bundesliga');
  });

  it('UCL → UEFA Champions League', () => {
    expect(leagueLabelForKey('UCL')).toBe('UEFA Champions League');
  });

  it('unbekannter Key → null', () => {
    expect(leagueLabelForKey('XX')).toBeNull();
  });

  it('alle bekannten Keys haben Labels', () => {
    for (const key of ['BL', 'PL', 'LL', 'SA', 'UCL']) {
      expect(LEAGUE_KEY_LABEL[key]).toBeDefined();
      expect(leagueLabelForKey(key)).not.toBeNull();
    }
  });
});

describe('matchLeagueForKey', () => {
  const allLeagues = [
    { name: 'Bundesliga', country: 'Deutschland' },
    { name: 'Bundesliga', country: 'Österreich' },
    { name: 'Premier League', country: 'England' },
    { name: 'La Liga', country: 'Spanien' },
    { name: 'Serie A', country: 'Italien' },
    { name: 'UEFA Champions League', country: 'Europa' }
  ];

  it('BL → bevorzugt Deutschland bei mehreren Bundesligas', () => {
    expect(matchLeagueForKey('BL', allLeagues)?.country).toBe('Deutschland');
  });

  it('einzigartige Liga → direkter Match', () => {
    expect(matchLeagueForKey('PL', allLeagues)?.country).toBe('England');
  });

  it('keine Liga gefunden → null', () => {
    expect(matchLeagueForKey('BL', [{ name: 'Premier League', country: 'England' }])).toBeNull();
  });

  it('unbekannter Key → null', () => {
    expect(matchLeagueForKey('XX', allLeagues)).toBeNull();
  });

  it('Wenn präferiertes Land nicht da: erste passende Liga', () => {
    const limited = [{ name: 'Bundesliga', country: 'Österreich' }];
    expect(matchLeagueForKey('BL', limited)?.country).toBe('Österreich');
  });
});

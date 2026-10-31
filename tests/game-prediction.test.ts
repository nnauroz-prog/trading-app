import { afterEach, describe, expect, it, vi } from 'vitest';
import { getGamePrediction, parsePredictionRequest, parseRecentScoring, parseScorerCandidates, remainingRegulationFraction } from '@/lib/sport/game-prediction';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

const teamResults = (teamId: string) => ({ team: { id: teamId }, events: [
  { id: `${teamId}1`, gameDate: '2026-10-01T12:00Z', gameResult: 'L', homeTeamId: '99', awayTeamId: teamId, homeTeamScore: '3', awayTeamScore: '1', score: '3-1' },
  { id: `${teamId}2`, gameDate: '2026-10-08T12:00Z', gameResult: 'W', homeTeamId: teamId, awayTeamId: '99', homeTeamScore: '2', awayTeamScore: '0', score: '2-0' },
  { id: `${teamId}3`, gameDate: '2026-10-15T12:00Z', gameResult: 'D', homeTeamId: teamId, awayTeamId: '99', homeTeamScore: '1', awayTeamScore: '1', score: '1-1' }
] });
const summary = (id: string, state = 'pre', extra: Record<string, unknown> = {}) => ({
  header: { id, season: { year: 2026, type: 123 }, competitions: [{ id, date: '2026-10-31T12:00Z', status: { displayClock: "65'", period: 2, type: { state, completed: state === 'post', name: state === 'post' ? 'STATUS_FINAL' : 'STATUS_SECOND_HALF' } }, competitors: [
    { id: '1', homeAway: 'home', team: { displayName: 'Heim' }, score: '2' }, { id: '2', homeAway: 'away', team: { displayName: 'Gast' }, score: '1' }
  ] }] }, lastFiveGames: [teamResults('1'), teamResults('2')], ...extra
});
const athlete = (id: string, goals = 3, extra: Record<string, unknown> = {}) => ({ id, displayName: `Spieler ${id}`, status: { type: 'active' }, injuries: [], statistics: { splits: { categories: [{ stats: [{ name: 'totalGoals', value: goals }, { name: 'appearances', value: 8 }] }] } }, ...extra });
const seasonRoster = { season: { year: 2026, type: 123 }, athletes: [athlete('10'), athlete('11'), athlete('12'), athlete('13'), athlete('14'), athlete('15', 3, { injuries: [{}] }), athlete('16', 0)] };

describe('prediction data guards', () => {
  it('only permits known sport/feed pairs and bounded numeric event IDs', () => {
    expect(parsePredictionRequest('football', 'soccer/ger.1:401234567')).toMatchObject({ feed: 'soccer/ger.1', eventId: '401234567' });
    for (const [sport, id] of [['hockey', 'soccer/ger.1:123'], ['football', 'soccer/../../api:123'], ['football', 'soccer/ger.1:abc'], ['football', 'soccer/ger.1:1234567890123'], ['__proto__', 'soccer/ger.1:123']]) expect(parsePredictionRequest(sport, id)).toBeNull();
  });
  it('uses explicit home/away results and excludes future, duplicate, current, unfinished and stale games', () => {
    const results = teamResults('1');
    results.events.push(results.events[0], { ...results.events[0], id: 'future', gameDate: '2026-11-01T12:00Z' }, { ...results.events[0], id: 'old', gameDate: '2025-01-01T12:00Z' }, { ...results.events[0], id: 'unfinished', gameResult: '' });
    expect(parseRecentScoring({ lastFiveGames: [results] }, '1', '12', '2026-10-31T12:00Z', 'football')).toEqual([{ for: 1, against: 1 }, { for: 1, against: 3 }]);
    expect(parseRecentScoring({ lastFiveGames: [results] }, '1', 'target', '2026-11-10T12:00Z', 'football', Date.parse('2026-10-31T12:00Z'))).toHaveLength(3);
  });
  it('recovers NHL regulation ties only from identifiable one-goal OT/SO finals', () => {
    const results = teamResults('1');
    results.events = [{ ...results.events[0], homeTeamScore: '3', awayTeamScore: '2', score: '3-2 OT' }, { ...results.events[1], homeTeamScore: '4', awayTeamScore: '3', score: '4-3 SO' }, { ...results.events[2], homeTeamScore: '4', awayTeamScore: '1', score: '4-1 OT' }];
    expect(parseRecentScoring({ lastFiveGames: [results] }, '1', 'target', '2026-10-31T12:00Z', 'hockey')).toEqual([{ for: 3, against: 3 }, { for: 2, against: 2 }]);
  });
  it('requires valid sport clocks and declines stoppage, overtime and missing clocks', () => {
    expect(remainingRegulationFraction({ displayClock: "65'", period: 2 }, 'football')).toBeCloseTo(25 / 90);
    expect(remainingRegulationFraction({ displayClock: "45'+2'", period: 1 }, 'football')).toBe(.5);
    expect(remainingRegulationFraction({ displayClock: '6:00', period: 3 }, 'basketball')).toBeCloseTo(18 / 48);
    expect(remainingRegulationFraction({ displayClock: '10:00', period: 3 }, 'hockey')).toBeCloseTo(10 / 60);
    for (const clock of [{ period: 2 }, { displayClock: "90'+3'", period: 2 }, { displayClock: "105'", period: 3 }, { displayClock: "65'", period: 2, type: { name: 'STATUS_SUSPENDED' } }]) expect(remainingRegulationFraction(clock, 'football')).toBeNull();
    expect(remainingRegulationFraction({ displayClock: '4:00', period: 5 }, 'basketball')).toBeNull();
  });
  it('only joins season scorers to eligible reported players, excluding bench, subbed out, injuries and red cards', () => {
    const data = summary('99', 'in', { rosters: [{ team: { id: '1' }, roster: [
      { athlete: { id: '10' }, starter: true, active: true },
      { athlete: { id: '11' }, starter: false, active: true },
      { athlete: { id: '12' }, starter: true, active: true, subbedOut: true },
      { athlete: { id: '13' }, starter: false, active: true, subbedIn: true },
      { athlete: { id: '14' }, starter: true, stats: [{ name: 'redCards', value: 1 }] },
      { athlete: { id: '15' }, starter: true }, { athlete: { id: '16' }, starter: true }
    ] }] });
    expect(parseScorerCandidates(seasonRoster, data, '1', 'Heim', 'in').map(p => p.name)).toEqual(['Spieler 10', 'Spieler 13']);
    expect(parseScorerCandidates({ ...seasonRoster, season: { year: 2025, type: 123 } }, data, '1', 'Heim', 'in')).toEqual([]);
    expect(parseScorerCandidates(seasonRoster, summary('99'), '1', 'Heim', 'in')).toEqual([]);
  });
});

describe('game forecast service', () => {
  it('deduplicates a game request and returns real-data math with individually unavailable scorers', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => ({ ok: true, json: async () => url.includes('/summary?') ? summary('910001') : { season: { year: 2026, type: 123 }, athletes: [] } }));
    vi.stubGlobal('fetch', fetchMock);
    const [a, b] = await Promise.all([getGamePrediction('football', 'soccer/ger.1:910001'), getGamePrediction('football', 'soccer/ger.1:910001')]);
    expect(a).toBe(b); expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(a.kind).toBe('forecast'); expect(a.score.probability).toBeGreaterThan(0); expect(a.goalscorers.available).toBe(false);
    expect(Object.values(a.winner.probabilities!).reduce((sum, n) => sum + n, 0)).toBeCloseTo(1, 9);
    await getGamePrediction('football', 'soccer/ger.1:910001'); expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it('returns actual completed results with no forecast probability or season candidates', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => summary('910002', 'post') }); vi.stubGlobal('fetch', fetchMock);
    const result = await getGamePrediction('football', 'soccer/ger.1:910002');
    expect(result.kind).toBe('actual'); expect(result.score).toEqual({ available: true, home: 2, away: 1, label: 'Endergebnis' });
    expect(result.winner).toEqual({ available: true, side: 'home', name: 'Heim' }); expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('declines a live forecast without fresh source time even if recent results exist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => summary('910003', 'in') }));
    const result = await getGamePrediction('football', 'soccer/ger.1:910003');
    expect(result.kind).toBe('unavailable'); expect(result.sourceUpdatedAt).toBeNull(); expect(result.score.reason).toMatch(/Zeitstempel/);
  });
  it('conditions a fresh live forecast on current score and remaining regulation time', async () => {
    vi.setSystemTime(new Date('2026-10-31T13:05Z'));
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => ({ ok: true, json: async () => url.includes('/summary?') ? summary('910004', 'in', { meta: { lastUpdatedAt: '2026-10-31T13:04:59Z' } }) : { season: { year: 2026, type: 123 }, athletes: [] } })));
    const result = await getGamePrediction('football', 'soccer/eng.1:910004');
    expect(result.kind).toBe('forecast'); expect(result.score.home).toBeGreaterThanOrEqual(2); expect(result.score.away).toBeGreaterThanOrEqual(1);
    expect(result.sourceScore).toEqual({ home: '2', away: '1' }); expect(result.analysis.join(' ')).toMatch(/verbleibende/);
  });
  it('allows observed football update gaps up to five minutes while preserving and explaining the source time', async () => {
    vi.setSystemTime(new Date('2026-10-31T13:05Z'));
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => ({ ok: true, json: async () => url.includes('/summary?') ? summary('910009', 'in', { meta: { lastUpdatedAt: '2026-10-31T13:02:00Z' } }) : { season: { year: 2026, type: 123 }, athletes: [] } })));
    const result = await getGamePrediction('football', 'soccer/eng.1:910009');
    expect(result.score.available).toBe(true); expect(result.sourceUpdatedAt).toBe('2026-10-31T13:02:00Z');
    expect(result.analysis.join(' ')).toMatch(/mehr als zwei Minuten/);
  });
  it('declines live football data older than five minutes without replacing its source timestamp', async () => {
    vi.setSystemTime(new Date('2026-10-31T13:05Z'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => summary('910010', 'in', { meta: { lastUpdatedAt: '2026-10-31T12:59:59Z' } }) }));
    const result = await getGamePrediction('football', 'soccer/eng.1:910010');
    expect(result.kind).toBe('unavailable'); expect(result.score.available).toBe(false); expect(result.sourceUpdatedAt).toBe('2026-10-31T12:59:59Z');
    expect(result.score.reason).toMatch(/fünf Minuten/);
  });
  it('never fetches for an invalid league or an injected event ID', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(getGamePrediction('football', 'soccer/evil:123')).rejects.toMatchObject({ status: 400 }); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects a provider response for a different league despite a valid input pair', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => summary('910005', 'pre', { meta: { gp_topic: 'gp-soccer-eng.1-910005' } }) }));
    await expect(getGamePrediction('football', 'soccer/ger.1:910005')).rejects.toMatchObject({ status: 400 });
  });
  it('does not label an abandoned or postponed game as an actual final result', async () => {
    const data = summary('910006', 'post');
    data.header.competitions[0].status.type.completed = false;
    data.header.competitions[0].status.type.name = 'STATUS_POSTPONED';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
    const result = await getGamePrediction('football', 'soccer/ger.1:910006');
    expect(result.kind).toBe('unavailable'); expect(result.score.available).toBe(false); expect(result.score.reason).toMatch(/nicht als beendet/);
  });
  it('declines artificial certainty from zero scoring rates in a small football history', async () => {
    const data = summary('910007');
    for (const team of data.lastFiveGames) for (const game of team.events) { game.homeTeamScore = '0'; game.awayTeamScore = '0'; }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
    const result = await getGamePrediction('football', 'soccer/ger.1:910007');
    expect(result.score.available).toBe(false); expect(result.winner.available).toBe(false); expect(result.score.probability).toBeUndefined();
    expect(result.score.reason).toMatch(/null erwartete Tore/);
  });
  it('declines a live football result forecast after a reported red card', async () => {
    vi.setSystemTime(new Date('2026-10-31T13:05Z'));
    const data = summary('910008', 'in', { meta: { lastUpdatedAt: '2026-10-31T13:04:59Z' }, rosters: [{ team: { id: '1' }, roster: [{ athlete: { id: '10' }, starter: true, stats: [{ name: 'redCards', value: 1 }] }] }] });
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => ({ ok: true, json: async () => url.includes('/summary?') ? data : seasonRoster })));
    const result = await getGamePrediction('football', 'soccer/fra.1:910008');
    expect(result.score.available).toBe(false); expect(result.winner.available).toBe(false); expect(result.score.reason).toMatch(/Platzverweis/);
    expect(result.goalscorers.players.some(p => p.name === 'Spieler 10' && p.team === 'Heim')).toBe(false);
  });
});

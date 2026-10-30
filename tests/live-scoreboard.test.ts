import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLiveScoreboard, parseLiveScoreboard } from '@/lib/sport/live-scoreboard';

const competition = { id: 'match1', date: '2026-10-30T19:30:00Z', status: { type: { state: 'in', shortDetail: '65′' } }, competitors: [
  { homeAway: 'away', team: { displayName: 'Gast' }, score: '0' },
  { homeAway: 'home', team: { displayName: 'Heim' }, score: '2' }
] };
const payload = { leagues: [{ name: 'Bundesliga' }], events: [{ id: 'event1', competitions: [competition] }] };
afterEach(() => vi.unstubAllGlobals());
describe('live sport results', () => {
  it('preserves home/away ordering, a real zero and the live clock', () => {
    expect(parseLiveScoreboard(payload, 'soccer/ger.1')[0]).toMatchObject({ home: 'Heim', away: 'Gast', homeScore: '2', awayScore: '0', state: 'in', detail: '65′' });
  });
  it('does not invent a 0:0 score before kickoff', () => {
    const data = { events: [{ competitions: [{ ...competition, status: { type: { state: 'pre' } } }] }] };
    expect(parseLiveScoreboard(data, 'test')[0].homeScore).toBeNull();
  });
  it('handles multiple tennis matches and athlete names', () => {
    const match = { ...competition, competitors: [{ athlete: { displayName: 'Spieler A' }, score: { displayValue: '1' } }, { athlete: { displayName: 'Spieler B' }, score: { displayValue: '0' } }] };
    const games = parseLiveScoreboard({ events: [{ competitions: [match, { ...match, id: 'match2' }] }] }, 'tennis/atp');
    expect(games).toHaveLength(2);
    expect(games[0].home).toBe('Spieler A');
    expect(games[0].homeScore).toBe('1');
  });
  it('distinguishes a malformed response from a successful empty day', () => {
    expect(() => parseLiveScoreboard({}, 'test')).toThrow('invalid_provider_response');
    expect(parseLiveScoreboard({ events: [] }, 'test')).toEqual([]);
  });
  it('reports total outage without claiming a successful data timestamp', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const result = await getLiveScoreboard('football', new Date('2026-10-30T23:30:00Z'));
    expect(result.fetchedAt).toBeNull();
    expect(result.failedFeeds).toBe(result.totalFeeds);
    expect(result.date).toBe('20261031');
  });
  it('keeps successful feeds while reporting partial failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => payload }).mockRejectedValue(new Error('network')));
    const result = await getLiveScoreboard('football');
    expect(result.games).toHaveLength(1);
    expect(result.failedFeeds).toBe(result.totalFeeds - 1);
    expect(result.fetchedAt).not.toBeNull();
  });
});

it('reads real grouped tournament matches and set scores', () => {
  const match = { ...competition, competitors: [
    { homeAway: 'home', athlete: { displayName: 'Spieler A' }, linescores: [{ value: 2, winner: false }, { value: 3 }] },
    { homeAway: 'away', athlete: { displayName: 'Spieler B' }, linescores: [{ value: 6, winner: true }, { value: 4 }] }
  ] };
  const games = parseLiveScoreboard({ events: [{ name: 'Wien', groupings: [{ competitions: [match] }] }] }, 'tennis/atp');
  expect(games).toHaveLength(1);
  expect(games[0]).toMatchObject({ homeScore: '0', awayScore: '1', scoreUnit: 'Sätze', scoreDetail: '2:6 · 3:4' });
  expect(games[0].league).toContain('Wien');
});

it('filters whole-tournament history and includes US-night games on the Berlin day', async () => {
  const matches = [
    { ...competition, id: 'old', date: '2026-10-24T19:00Z', status: { type: { state: 'post' } } },
    { ...competition, id: 'night', date: '2026-10-29T23:30Z', status: { type: { state: 'post' } } },
    { ...competition, id: 'tonight-us', date: '2026-10-30T23:30Z', status: { type: { state: 'pre' } } }
  ];
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ events: [{ competitions: matches }] }) });
  vi.stubGlobal('fetch', fetchMock);
  const result = await getLiveScoreboard('basketball', new Date('2026-10-30T12:00Z'));
  expect(result.games.map(g => g.id)).toEqual(['basketball/nba:night']);
  expect(fetchMock.mock.calls[0][0]).toContain('dates=20261029&');
  expect(fetchMock.mock.calls[1][0]).toContain('dates=20261030&');
  expect(fetchMock.mock.calls.every(([url]) => !url.includes('20261029-20261030'))).toBe(true);
});

import { describe, expect, it } from 'vitest';
import { computeWmTabTitle, type WmTabTitlePickInput } from '@/lib/sport/wm-tab-title';

const now = new Date('2026-06-11T18:00:00');

function p(over: Partial<WmTabTitlePickInput> = {}): WmTabTitlePickInput {
  return {
    homeTeam: 'Mexiko',
    awayTeam: 'Marokko',
    winnerTeam: 'Mexiko',
    fixtureDateIso: '2026-06-11',
    fixtureTime: '21:00',
    ...over
  };
}

describe('computeWmTabTitle', () => {
  it('Leere Liste -> kein Prefix', () => {
    expect(computeWmTabTitle([], now).prefix).toBeNull();
  });

  it('Nur vor-anstoss-Pick -> Countdown-Label', () => {
    const r = computeWmTabTitle([p({ fixtureTime: '18:22' })], now);
    expect(r.prefix).toContain('22m');
    expect(r.prefix).toContain('Mexiko-Marokko');
    expect(r.live).toBe(false);
    expect(r.minutesUntilKickoff).toBe(22);
  });

  it('Live-Spiel hat Vorrang vor kommendem', () => {
    const r = computeWmTabTitle([
      p({ homeTeam: 'A', awayTeam: 'B', fixtureTime: '17:50' }), // laeuft
      p({ homeTeam: 'C', awayTeam: 'D', fixtureTime: '21:00' })  // kommt
    ], now);
    expect(r.live).toBe(true);
    expect(r.prefix).toContain('LIVE');
    expect(r.prefix).toContain('A-B');
  });

  it('Frueheste vor-anstoss-Zeit gewinnt', () => {
    const r = computeWmTabTitle([
      p({ homeTeam: 'A', awayTeam: 'B', fixtureTime: '21:00' }),
      p({ homeTeam: 'C', awayTeam: 'D', fixtureTime: '19:00' })
    ], now);
    expect(r.prefix).toContain('C-D');
  });

  it('Mehr als 60 min -> "1h" Format', () => {
    const r = computeWmTabTitle([p({ fixtureTime: '19:30' })], now);
    expect(r.prefix).toContain('1h30m');
  });

  it('Exakt 60 min -> "1h" ohne Minuten', () => {
    const r = computeWmTabTitle([p({ fixtureTime: '19:00' })], now);
    expect(r.prefix).toContain('1h');
    expect(r.prefix).not.toContain('1h0m');
  });

  it('Langer Teamname wird gekuerzt', () => {
    const r = computeWmTabTitle([p({ homeTeam: 'Bosnien-Herzegowina', awayTeam: 'X', fixtureTime: '18:30' })], now);
    expect(r.prefix).toContain('…');
  });

  it('Wahrscheinlich-vorbei wird ignoriert', () => {
    const r = computeWmTabTitle([p({ fixtureTime: '15:00' })], now);
    expect(r.prefix).toBeNull();
  });

  it('Pick ohne Zeit wird ignoriert', () => {
    const r = computeWmTabTitle([p({ fixtureTime: null })], now);
    expect(r.prefix).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { computeWmAnstossWarnung, type WmAnstossWarnungInput } from '@/lib/sport/wm-anstoss-warnung';

const now = new Date('2026-06-11T18:00:00');

function pick(over: Partial<WmAnstossWarnungInput> = {}): WmAnstossWarnungInput {
  return {
    pickId: 'wm-x-home',
    winnerTeam: 'Spanien',
    opponentTeam: 'Kap Verde',
    fixtureDateIso: '2026-06-11',
    fixtureTime: '18:20',
    pflichtErledigt: false,
    ...over
  };
}

describe('computeWmAnstossWarnung', () => {
  it('Leere Liste -> leere Eintraege', () => {
    const r = computeWmAnstossWarnung([], now);
    expect(r.entries.length).toBe(0);
    expect(r.hasOpenToDo).toBe(false);
  });

  it('Pick in 20 min ist im Default-Fenster (30 min)', () => {
    const r = computeWmAnstossWarnung([pick({ fixtureTime: '18:20' })], now);
    expect(r.entries.length).toBe(1);
    expect(r.entries[0].minutesUntilKickoff).toBe(20);
    expect(r.entries[0].headline).toContain('Spanien');
    expect(r.entries[0].headline).toContain('Kap Verde');
  });

  it('Pick in 35 min liegt ausserhalb', () => {
    const r = computeWmAnstossWarnung([pick({ fixtureTime: '18:35' })], now);
    expect(r.entries.length).toBe(0);
  });

  it('Pick der schon laeuft wird nicht gewarnt', () => {
    const r = computeWmAnstossWarnung([pick({ fixtureTime: '17:50' })], now);
    expect(r.entries.length).toBe(0);
  });

  it('Eintraege werden nach Naehe zum Anstoss sortiert', () => {
    const r = computeWmAnstossWarnung([
      pick({ pickId: 'a', fixtureTime: '18:25', winnerTeam: 'A' }),
      pick({ pickId: 'b', fixtureTime: '18:10', winnerTeam: 'B' }),
      pick({ pickId: 'c', fixtureTime: '18:20', winnerTeam: 'C' })
    ], now);
    expect(r.entries.map((e) => e.pickId)).toEqual(['b', 'c', 'a']);
  });

  it('Pflicht erledigt = kein toDoHint', () => {
    const r = computeWmAnstossWarnung([pick({ pflichtErledigt: true })], now);
    expect(r.entries[0].toDoHint).toBeNull();
    expect(r.hasOpenToDo).toBe(false);
  });

  it('Pflicht offen = toDoHint vorhanden', () => {
    const r = computeWmAnstossWarnung([pick({ pflichtErledigt: false })], now);
    expect(r.entries[0].toDoHint).toContain('Stake');
    expect(r.hasOpenToDo).toBe(true);
  });

  it('Picks ohne Anstoss-Zeit fallen raus', () => {
    const r = computeWmAnstossWarnung([pick({ fixtureTime: null })], now);
    expect(r.entries.length).toBe(0);
  });

  it('windowMin anpassbar', () => {
    const r = computeWmAnstossWarnung([pick({ fixtureTime: '18:45' })], now, 60);
    expect(r.entries.length).toBe(1);
  });
});

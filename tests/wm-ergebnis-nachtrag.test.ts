import { describe, expect, it } from 'vitest';
import { computeWmErgebnisNachtrag, type WmErgebnisNachtragInput } from '@/lib/sport/wm-ergebnis-nachtrag';

const now = new Date('2026-06-11T22:00:00');

function pick(over: Partial<WmErgebnisNachtragInput> = {}): WmErgebnisNachtragInput {
  return {
    pickId: 'wm-x-home',
    fixtureId: 'wm-x',
    winnerTeam: 'Spanien',
    opponentTeam: 'Kap Verde',
    fixtureDateIso: '2026-06-11',
    fixtureTime: '18:00',
    hasResult: false,
    ...over
  };
}

describe('computeWmErgebnisNachtrag', () => {
  it('Leere Liste -> leeres Ergebnis', () => {
    expect(computeWmErgebnisNachtrag([], now).entries.length).toBe(0);
  });

  it('Spiel vorbei + kein Ergebnis -> wird gelistet', () => {
    const r = computeWmErgebnisNachtrag([pick({ fixtureTime: '18:00' })], now);
    expect(r.entries.length).toBe(1);
    expect(r.entries[0].headline).toContain('Spanien');
    expect(r.entries[0].headline).toContain('Endstand fehlt');
  });

  it('Spiel vorbei + Ergebnis vorhanden -> wird NICHT gelistet', () => {
    const r = computeWmErgebnisNachtrag([pick({ fixtureTime: '18:00', hasResult: true })], now);
    expect(r.entries.length).toBe(0);
  });

  it('Spiel laeuft -> wird nicht gelistet (zu frueh)', () => {
    const r = computeWmErgebnisNachtrag([pick({ fixtureTime: '21:30' })], now);
    expect(r.entries.length).toBe(0);
  });

  it('Spiel noch vor Anstoss -> nicht gelistet', () => {
    const future = new Date('2026-06-11T10:00:00');
    const r = computeWmErgebnisNachtrag([pick({ fixtureTime: '21:00' })], future);
    expect(r.entries.length).toBe(0);
  });

  it('Eintraege werden nach Alter (alt zuerst) sortiert', () => {
    const r = computeWmErgebnisNachtrag([
      pick({ pickId: 'neu', winnerTeam: 'Neu', fixtureDateIso: '2026-06-11', fixtureTime: '18:00' }),
      pick({ pickId: 'alt', winnerTeam: 'Alt', fixtureDateIso: '2026-06-09', fixtureTime: '18:00' })
    ], now);
    expect(r.entries.map((e) => e.pickId)).toEqual(['alt', 'neu']);
  });

  it('daysOld korrekt berechnet', () => {
    const r = computeWmErgebnisNachtrag([
      pick({ fixtureDateIso: '2026-06-09', fixtureTime: '20:00' })
    ], now);
    expect(r.entries[0].daysOld).toBeGreaterThanOrEqual(2);
  });

  it('Picks ohne Anstoss-Zeit fallen raus', () => {
    const r = computeWmErgebnisNachtrag([pick({ fixtureTime: null })], now);
    expect(r.entries.length).toBe(0);
  });
});

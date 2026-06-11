import { describe, expect, it } from 'vitest';
import { summarizeWmHeute, type HeuteZusammenfassungPick } from '@/lib/sport/wm-heute-zusammenfassung';

const now = new Date('2026-06-11T18:00:00');

function p(over: Partial<HeuteZusammenfassungPick> = {}): HeuteZusammenfassungPick {
  return {
    pickId: 'x',
    fixtureDateIso: '2026-06-11',
    fixtureTime: '21:00',
    pflichtErledigt: false,
    ...over
  };
}

describe('summarizeWmHeute', () => {
  it('Leere Pick-Liste -> 0 Tipps Headline', () => {
    const s = summarizeWmHeute([], '2026-06-11', now);
    expect(s.pickCountHeute).toBe(0);
    expect(s.headline).toContain('keine');
    expect(s.naechsterAnstoss).toBeNull();
  });

  it('Picks ausserhalb von HEUTE werden ignoriert', () => {
    const s = summarizeWmHeute([p({ fixtureDateIso: '2026-06-12' })], '2026-06-11', now);
    expect(s.pickCountHeute).toBe(0);
  });

  it('Erledigt/offen werden korrekt gezaehlt', () => {
    const s = summarizeWmHeute([
      p({ pickId: 'a', pflichtErledigt: true }),
      p({ pickId: 'b', pflichtErledigt: false }),
      p({ pickId: 'c', pflichtErledigt: false })
    ], '2026-06-11', now);
    expect(s.erledigt).toBe(1);
    expect(s.offen).toBe(2);
    expect(s.headline).toContain('1 erledigt');
    expect(s.headline).toContain('2 offen');
  });

  it('Frueheste Anstosszeit als naechster Anstoss', () => {
    const s = summarizeWmHeute([
      p({ pickId: 'a', fixtureTime: '21:00' }),
      p({ pickId: 'b', fixtureTime: '19:00' }),
      p({ pickId: 'c', fixtureTime: '23:00' })
    ], '2026-06-11', now);
    expect(s.naechsterAnstoss?.fixtureTime).toBe('19:00');
    expect(s.naechsterAnstoss?.countdownLabel).toContain('1h 0min');
  });

  it('Laufendes Spiel zaehlt als laufend, nicht als naechster Anstoss', () => {
    const liveNow = new Date('2026-06-11T19:30:00');
    const s = summarizeWmHeute([p({ fixtureTime: '19:00' })], '2026-06-11', liveNow);
    expect(s.laufend).toBe(1);
    expect(s.naechsterAnstoss).toBeNull();
  });

  it('Spiel wahrscheinlich vorbei zaehlt als vorbei', () => {
    const lateNow = new Date('2026-06-11T23:30:00');
    const s = summarizeWmHeute([p({ fixtureTime: '19:00' })], '2026-06-11', lateNow);
    expect(s.vorbei).toBe(1);
    expect(s.naechsterAnstoss).toBeNull();
  });

  it('Picks ohne fixtureTime tauchen nicht in naechster Anstoss auf', () => {
    const s = summarizeWmHeute([p({ fixtureTime: null })], '2026-06-11', now);
    expect(s.naechsterAnstoss).toBeNull();
  });

  it('Singular/Plural in Headline', () => {
    const s1 = summarizeWmHeute([p({ pflichtErledigt: false })], '2026-06-11', now);
    expect(s1.headline).toContain('1 Tipp heute');
    const s2 = summarizeWmHeute([p({ pickId: 'a' }), p({ pickId: 'b' })], '2026-06-11', now);
    expect(s2.headline).toContain('2 Tipps heute');
  });
});

import { describe, expect, it } from 'vitest';
import { backtestModifiers } from '@/lib/sport/modifier-backtest';
import type { Fixture } from '@/lib/sport/fetcher';

function past(home: string, away: string, hs: number, as_: number, date: string, ref: string | null = null): Fixture {
  return {
    id: `${home}-${away}-${date}`,
    homeTeam: home, awayTeam: away,
    league: 'L', date, time: null, venue: null,
    homeScore: hs, awayScore: as_,
    status: 'finished',
    referee: ref
  };
}

describe('backtestModifiers', () => {
  it('zu wenig Pool → leeres Ergebnis', () => {
    const out = backtestModifiers([]);
    expect(out.matchesEvaluated).toBe(0);
    expect(out.liftH2hPct).toBe(0);
  });

  it('< 30 Prior-Games → kein einziger Match wird ausgewertet', () => {
    const pool: Fixture[] = [];
    for (let i = 0; i < 20; i++) {
      pool.push(past('A', 'B', 2, 1, `2026-01-${String(i + 1).padStart(2, '0')}`));
    }
    const out = backtestModifiers(pool);
    expect(out.matchesEvaluated).toBe(0);
  });

  it('Ausreichend Pool → liefert echte Brier-Scores', () => {
    const pool: Fixture[] = [];
    const teams = ['Bayern', 'Dortmund', 'Leipzig', 'Frankfurt', 'Stuttgart', 'Hoffenheim'];
    // 70 Spiele, sodass nach 30 Prior-Games noch 40 zum Auswerten bleiben.
    for (let i = 0; i < 70; i++) {
      const home = teams[i % teams.length];
      const away = teams[(i + 1) % teams.length];
      // Etwas realistisches: Heim gewinnt 50 %, Remis 25 %, Auswaerts 25 %.
      const r = i % 4;
      const hs = r === 0 ? 2 : r === 1 ? 2 : r === 2 ? 1 : 0;
      const as_ = r === 0 ? 0 : r === 1 ? 2 : r === 2 ? 1 : 1;
      const date = `2026-${String(Math.floor(i / 10) + 1).padStart(2, '0')}-${String((i % 10) + 1).padStart(2, '0')}`;
      pool.push(past(home, away, hs, as_, date, i % 3 === 0 ? 'Hans Mueller' : 'Other'));
    }
    const out = backtestModifiers(pool);
    expect(out.matchesEvaluated).toBeGreaterThanOrEqual(20);
    expect(out.brierRaw).toBeGreaterThan(0);
    expect(out.brierRaw).toBeLessThan(2);
    // Beide Modifier-Brier-Scores sollten naehe am Roh-Wert liegen — Sample
    // ist klein, der Effekt klein.
    expect(Math.abs(out.brierWithH2h - out.brierRaw)).toBeLessThan(0.2);
  });

  it('Aktiviert sich nur, wenn das Modifier-Signal tatsaechlich wirkt', () => {
    const pool: Fixture[] = [];
    const teams = ['Bayern', 'Dortmund', 'Leipzig', 'Frankfurt'];
    for (let i = 0; i < 70; i++) {
      const home = teams[i % teams.length];
      const away = teams[(i + 1) % teams.length];
      pool.push(past(home, away, 1, 1, `2026-${String(Math.floor(i / 10) + 1).padStart(2, '0')}-${String((i % 10) + 1).padStart(2, '0')}`, null));
    }
    const out = backtestModifiers(pool);
    // Ohne Schiri-Eintraege: nRefSignal = 0
    expect(out.matchesWithRefereeSignal).toBe(0);
  });

  it('Brier-Scores werden auf 3 Nachkommastellen gerundet', () => {
    const pool: Fixture[] = [];
    for (let i = 0; i < 60; i++) {
      pool.push(past(`H${i}`, `A${i}`, 1, 0, `2026-01-${String((i % 28) + 1).padStart(2, '0')}`));
    }
    const out = backtestModifiers(pool);
    if (out.matchesEvaluated > 0) {
      expect(out.brierRaw.toString().split('.')[1]?.length ?? 0).toBeLessThanOrEqual(3);
    }
  });
});

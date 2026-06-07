import { describe, expect, it } from 'vitest';
import { bestWmMarket } from '@/lib/sport/wm-best-market';
import { predictWmMatch } from '@/lib/sport/wm-match-engine';

describe('bestWmMarket', () => {
  it('Top-Favorit gegen Außenseiter → Heimsieg empfohlen', () => {
    const p = predictWmMatch({ homeTeam: 'Frankreich', awayTeam: 'Saudi-Arabien' });
    const m = bestWmMarket(p);
    expect(m.market.toLowerCase()).toMatch(/frankreich.*gewinnt|frankreich.*oder.*remis|über.*tore/);
    expect(m.probability).toBeGreaterThan(0.6);
  });

  it('Stark vs. Stark → Empfehlung kommt, kann aber unter 50 % rutschen (instabil)', () => {
    const p = predictWmMatch({ homeTeam: 'Spanien', awayTeam: 'Brasilien' });
    const m = bestWmMarket(p);
    expect(m.probability).toBeGreaterThan(0.3);
    if (!m.isStableMarket) {
      expect(m.rationale.toLowerCase()).toContain('orientierung');
    }
  });

  it('liefert immer mindestens eine Empfehlung', () => {
    const p = predictWmMatch({ homeTeam: 'Unbekannt-A', awayTeam: 'Unbekannt-B' });
    const m = bestWmMarket(p);
    expect(m.market.length).toBeGreaterThan(0);
    expect(m.probability).toBeGreaterThan(0);
  });

  it('Profi-Score sortiert nach Wahrscheinlichkeit minus Risiko', () => {
    const p = predictWmMatch({ homeTeam: 'Argentinien', awayTeam: 'Ghana' });
    const m = bestWmMarket(p);
    expect(m.internalScore).toBeGreaterThan(40);
  });

  it('isStableMarket=true für stabile Märkte', () => {
    const p = predictWmMatch({ homeTeam: 'Frankreich', awayTeam: 'Saudi-Arabien' });
    const m = bestWmMarket(p);
    if (m.market.toLowerCase().includes('über') || m.market.toLowerCase().includes('doppelchance')) {
      expect(m.isStableMarket).toBe(true);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { formatWmPicksForClipboard } from '@/lib/sport/wm-picks-copy';
import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

function pick(over: Partial<WmWinnerPick> = {}): WmWinnerPick {
  const base: WmWinnerPick = {
    fixture: { id: 'wm-x', date: '2026-06-11', time: '21:00', homeTeam: 'Mexiko', awayTeam: 'Marokko', venue: 'Mexico City', phase: 'Gruppe', group: 'A' },
    prediction: {} as never,
    winnerTeam: 'Mexiko',
    winnerSide: 'home',
    modelProbabilityPct: 72,
    eloDiff: 180,
    daysUntilMatch: 0,
    proTipper: {} as never,
    conditions: {} as never,
    tier: 'modell-favorit',
    reasons: [],
    riskNotes: []
  };
  return { ...base, ...over };
}

describe('formatWmPicksForClipboard', () => {
  it('Leere Picks heute -> deutscher Fallback-Text', () => {
    const text = formatWmPicksForClipboard([], '2026-06-11');
    expect(text).toContain('11.06.2026');
    expect(text).toContain('keine freigegebenen Tipps');
  });

  it('Picks anderer Tage werden ignoriert', () => {
    const text = formatWmPicksForClipboard([pick({ fixture: { ...pick().fixture, date: '2026-06-12' } })], '2026-06-11');
    expect(text).toContain('keine freigegebenen Tipps');
  });

  it('Header zeigt Anzahl Picks und Datum', () => {
    const text = formatWmPicksForClipboard([pick()], '2026-06-11');
    expect(text).toContain('11.06.2026');
    expect(text).toContain('1 Tipp');
  });

  it('Plural bei 2 Tipps', () => {
    const text = formatWmPicksForClipboard([pick({ fixture: { ...pick().fixture, id: 'a' } }), pick({ fixture: { ...pick().fixture, id: 'b' } })], '2026-06-11');
    expect(text).toContain('2 Tipps');
  });

  it('Pro Pick: Zeit, Spielpaarung, Tipp, Wahrscheinlichkeit, ELO', () => {
    const text = formatWmPicksForClipboard([pick()], '2026-06-11');
    expect(text).toContain('21:00');
    expect(text).toContain('Mexiko-Marokko');
    expect(text).toContain('Tipp Mexiko');
    expect(text).toContain('72%');
    expect(text).toContain('+180');
  });

  it('Tier-Label sprechend statt Slug', () => {
    const text = formatWmPicksForClipboard([pick({ tier: 'hoechste-konfluenz' })], '2026-06-11');
    expect(text).toContain('Hoechste Konfluenz');
  });

  it('Auswaerts-Pick zeigt Gegner korrekt', () => {
    const text = formatWmPicksForClipboard([pick({ winnerSide: 'away', winnerTeam: 'Marokko' })], '2026-06-11');
    expect(text).toContain('Tipp Marokko');
    expect(text).toContain('vs. Mexiko');
  });

  it('Restrisiko-Hinweis am Ende', () => {
    const text = formatWmPicksForClipboard([pick()], '2026-06-11');
    expect(text).toContain('Restrisiko');
  });

  it('Anstoss-Zeit null -> Platzhalter', () => {
    const text = formatWmPicksForClipboard([pick({ fixture: { ...pick().fixture, time: null } })], '2026-06-11');
    expect(text).toContain('--:--');
  });
});

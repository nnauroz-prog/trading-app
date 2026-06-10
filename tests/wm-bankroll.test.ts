import { describe, expect, it } from 'vitest';
import { suggestBankroll } from '@/lib/sport/wm-bankroll';
import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

function pick(over: Partial<WmWinnerPick> = {}): WmWinnerPick {
  // Minimaler Mock — die Bankroll-Funktion braucht nur winnerSide, tier,
  // modelProbabilityPct, fixture.id.
  return {
    fixture: { id: 'f1', date: '2026-06-15', time: null, homeTeam: 'X', awayTeam: 'Y', venue: '', phase: 'Gruppe' },
    prediction: {} as never,
    winnerTeam: 'X',
    winnerSide: 'home',
    modelProbabilityPct: 70,
    eloDiff: 150,
    daysUntilMatch: 1,
    proTipper: {} as never,
    conditions: {} as never,
    tier: 'modell-favorit',
    reasons: [],
    riskNotes: [],
    ...over
  };
}

describe('suggestBankroll', () => {
  it('70 % Probability + Quote 2.0 → positiver Stake', () => {
    const s = suggestBankroll({ pick: pick() });
    expect(s.stakePct).toBeGreaterThan(0);
  });

  it('Hoechste Konfluenz hat hoeheren Cap (4 %)', () => {
    const s = suggestBankroll({ pick: pick({ tier: 'hoechste-konfluenz', modelProbabilityPct: 80 }) });
    expect(s.stakePct).toBeLessThanOrEqual(4);
  });

  it('Modell-Favorit gedeckelt bei 2 %', () => {
    const s = suggestBankroll({ pick: pick({ tier: 'modell-favorit', modelProbabilityPct: 80 }) });
    expect(s.stakePct).toBeLessThanOrEqual(2);
  });

  it('Bei niedriger Probability vs hoher Quote-Erwartung → kein Stake', () => {
    const s = suggestBankroll({ pick: pick({ modelProbabilityPct: 40 }), decimalOdds: 2.0 });
    expect(s.stakePct).toBe(0);
  });

  it('Konkrete EUR-Berechnung wenn bankrollEur uebergeben', () => {
    const s = suggestBankroll({ pick: pick({ modelProbabilityPct: 80 }), bankrollEur: 1000 });
    expect(s.stakeEur).not.toBeNull();
    expect(s.stakeEur).toBeGreaterThan(0);
    expect(s.stakeEur).toBeLessThanOrEqual(40);
  });

  it('Quote 1.5 (sehr knapper Favorit) reduziert Stake', () => {
    const wide = suggestBankroll({ pick: pick({ modelProbabilityPct: 70 }), decimalOdds: 2.0 });
    const narrow = suggestBankroll({ pick: pick({ modelProbabilityPct: 70 }), decimalOdds: 1.5 });
    expect(narrow.rawHalfKellyPct).toBeLessThan(wide.rawHalfKellyPct);
  });

  it('Wording frei von verbotenen Begriffen', () => {
    const s = suggestBankroll({ pick: pick() });
    const FORBIDDEN = ['sicher', 'bank-tipp', 'garantiert', 'todsicher', 'risikolos', 'muss kommen'];
    const lower = s.reason.toLowerCase();
    for (const w of FORBIDDEN) expect(lower.includes(w)).toBe(false);
  });
});

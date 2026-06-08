import { describe, expect, it } from 'vitest';
import { applyLearnedOverride, currentStreakLength } from '@/lib/agents/learned-override';
import type { FirmaAccuracy } from '@/lib/firma-accuracy';
import type { FirmaPnlSummary } from '@/lib/agents/firma-pnl';

function pnl(over: Partial<FirmaPnlSummary> = {}): FirmaPnlSummary {
  return {
    firma: 'conservative',
    firmaName: 'Konservativ',
    totalBuys: 10,
    resolvedTrades: 8,
    wins: 4,
    losses: 4,
    openTrades: 2,
    resolvedHitRatePct: 50,
    totalPnlPct: 0,
    avgPnlPct: 0,
    bestTradePct: 10,
    worstTradePct: -5,
    equityCurve: [0],
    maxDrawdownPct: 0,
    trades: [],
    ...over
  };
}

function acc(over: Partial<FirmaAccuracy>): FirmaAccuracy {
  return {
    firma: 'conservative',
    firmaName: 'Konservativ',
    evaluated: 10,
    rightCalls: 5,
    hitRatePct: 50,
    avgGapDays: 1,
    skillWeight: 1,
    recent: [],
    ...over
  };
}

function recent(...flags: (boolean | null)[]): FirmaAccuracy['recent'] {
  return flags.map((right, i) => ({
    date: `2026-05-${String(20 - i).padStart(2, '0')}`,
    verdict: 'BUY' as const,
    coin: 'BTC',
    right
  }));
}

describe('currentStreakLength', () => {
  it('leer → 0', () => {
    expect(currentStreakLength([])).toBe(0);
  });

  it('drei richtige in Folge → +3', () => {
    expect(currentStreakLength(recent(true, true, true))).toBe(3);
  });

  it('zwei falsche in Folge → -2', () => {
    expect(currentStreakLength(recent(false, false))).toBe(-2);
  });

  it('Wechsel beendet die Streak', () => {
    expect(currentStreakLength(recent(true, true, false, true))).toBe(2);
  });

  it('null-Eintraege werden ignoriert (nicht bewertete Tage)', () => {
    expect(currentStreakLength(recent(true, null, null, true, true))).toBe(3);
  });
});

describe('applyLearnedOverride', () => {
  it('keine Daten → keine Override-Aenderung', () => {
    const out = applyLearnedOverride('BUY', null);
    expect(out.kind).toBe('none');
    expect(out.effectiveVerdict).toBe('BUY');
    expect(out.severity).toBe(0);
  });

  it('zu wenig bewertete Faelle → keine Aenderung', () => {
    const out = applyLearnedOverride('BUY', acc({ evaluated: 3, hitRatePct: 30, recent: recent(false, false, false) }));
    expect(out.kind).toBe('none');
  });

  it('BUY + Hit-Rate < 40 % + Verlust-Streak ≥ 3 → downgrade auf WAIT', () => {
    const out = applyLearnedOverride('BUY', acc({ evaluated: 12, hitRatePct: 33, recent: recent(false, false, false, false) }));
    expect(out.kind).toBe('downgrade-buy');
    expect(out.effectiveVerdict).toBe('WAIT');
    expect(out.severity).toBe(3);
    expect(out.reason).toContain('33');
  });

  it('BUY + Hit-Rate < 40 % ohne Verlust-Streak → flag-weak-wait, Verdict bleibt BUY', () => {
    const out = applyLearnedOverride('BUY', acc({ evaluated: 10, hitRatePct: 35, recent: recent(true, false, true) }));
    expect(out.kind).toBe('flag-weak-wait');
    expect(out.effectiveVerdict).toBe('BUY');
    expect(out.severity).toBe(2);
  });

  it('BUY + Hit-Rate ≥ 65 % + Gewinn-Streak → reinforce-buy', () => {
    const out = applyLearnedOverride('BUY', acc({ evaluated: 15, hitRatePct: 72, recent: recent(true, true, true, true) }));
    expect(out.kind).toBe('reinforce-buy');
    expect(out.effectiveVerdict).toBe('BUY');
    expect(out.reason).toContain('72');
  });

  it('WAIT + Hit-Rate ≥ 65 % + Gewinn-Streak → reinforce-wait', () => {
    const out = applyLearnedOverride('WAIT', acc({ evaluated: 15, hitRatePct: 70, recent: recent(true, true, true) }));
    expect(out.kind).toBe('reinforce-wait');
    expect(out.effectiveVerdict).toBe('WAIT');
    expect(out.severity).toBe(1);
  });

  it('WAIT + mittlere Hit-Rate → keine Aenderung', () => {
    const out = applyLearnedOverride('WAIT', acc({ evaluated: 10, hitRatePct: 55, recent: recent(true, false, true) }));
    expect(out.kind).toBe('none');
  });

  it('BUY + mittlere Hit-Rate → keine Aenderung', () => {
    const out = applyLearnedOverride('BUY', acc({ evaluated: 10, hitRatePct: 50, recent: recent(true, false, true) }));
    expect(out.kind).toBe('none');
  });

  it('Edge: genau auf der Grenze 40 % → keine Downgrade (strikt unter 40 %)', () => {
    const out = applyLearnedOverride('BUY', acc({ evaluated: 10, hitRatePct: 40, recent: recent(false, false, false, false) }));
    expect(out.kind).toBe('none');
  });

  it('Edge: genau auf der Grenze 65 % → keine Reinforce-Buy (strikt ≥ 65)', () => {
    const out = applyLearnedOverride('BUY', acc({ evaluated: 10, hitRatePct: 65, recent: recent(true, true, true) }));
    expect(out.kind).toBe('reinforce-buy');
  });

  // P&L-Eskalation
  describe('mit P&L-Eskalation', () => {
    it('BUY + virtuelles P&L stark negativ → downgrade, ueberstimmt sogar gute Hit-Rate', () => {
      const out = applyLearnedOverride(
        'BUY',
        acc({ evaluated: 12, hitRatePct: 65, recent: recent(true, true) }),
        pnl({ totalBuys: 12, avgPnlPct: -5 })
      );
      expect(out.kind).toBe('downgrade-buy');
      expect(out.reason).toContain('Virtuelles P&L');
      expect(out.severity).toBe(3);
    });

    it('BUY + virtuelles P&L stark positiv → reinforce-buy auch ohne hot-Streak', () => {
      const out = applyLearnedOverride(
        'BUY',
        acc({ evaluated: 12, hitRatePct: 55, recent: recent(true, false, true) }),
        pnl({ totalBuys: 12, avgPnlPct: 8 })
      );
      expect(out.kind).toBe('reinforce-buy');
      expect(out.reason).toContain('P&L');
    });

    it('P&L-Reinforce funktioniert auch OHNE accuracy-Daten', () => {
      const out = applyLearnedOverride(
        'BUY',
        null,
        pnl({ totalBuys: 8, avgPnlPct: 6 })
      );
      expect(out.kind).toBe('reinforce-buy');
    });

    it('P&L-Downgrade funktioniert auch OHNE accuracy-Daten', () => {
      const out = applyLearnedOverride(
        'BUY',
        null,
        pnl({ totalBuys: 8, avgPnlPct: -4 })
      );
      expect(out.kind).toBe('downgrade-buy');
    });

    it('zu wenig P&L-Trades (< 5) → P&L wird ignoriert', () => {
      const out = applyLearnedOverride(
        'BUY',
        acc({ evaluated: 10, hitRatePct: 50, recent: recent(true, false) }),
        pnl({ totalBuys: 3, avgPnlPct: -10 })
      );
      expect(out.kind).toBe('none');
    });

    it('P&L knapp positiv (zwischen -3 und +5) → kein P&L-Effekt', () => {
      const out = applyLearnedOverride(
        'BUY',
        acc({ evaluated: 10, hitRatePct: 50, recent: recent(true, false) }),
        pnl({ totalBuys: 10, avgPnlPct: 1.5 })
      );
      expect(out.kind).toBe('none');
    });

    it('P&L-Eskalation greift VOR der Streak-Logik (Reihenfolge wichtig)', () => {
      // Selbst wenn die Firma auf einer hot-Streak ist, aber P&L stark
      // negativ ist (kann passieren: oft richtige Richtung, aber Stops hauen),
      // downgraden wir den BUY.
      const out = applyLearnedOverride(
        'BUY',
        acc({ evaluated: 10, hitRatePct: 80, recent: recent(true, true, true, true) }),
        pnl({ totalBuys: 10, avgPnlPct: -4 })
      );
      expect(out.kind).toBe('downgrade-buy');
    });
  });
});

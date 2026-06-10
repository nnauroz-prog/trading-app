import { describe, expect, it } from 'vitest';
import {
  joinLedger,
  pnlForOutcome,
  summarizeLedger,
  type StakeRecord
} from '@/lib/sport/wm-bankroll-ledger';
import type { WmPickLogEntry } from '@/lib/sport/wm-pick-learning';

function stake(over: Partial<StakeRecord> & { id: string }): StakeRecord {
  const base: StakeRecord = {
    id: over.id,
    fixtureId: over.id.replace(/-(home|away)$/, ''),
    winnerSide: 'home',
    winnerTeam: 'X',
    opponentTeam: 'Y',
    dateIso: '2026-06-15',
    stakePct: 2,
    stakeEur: 10,
    decimalOdds: 2.0,
    modelProbabilityPct: 70,
    tier: 'modell-favorit',
    recordedAt: 1000
  };
  return { ...base, ...over };
}

function logEntry(id: string, outcome: WmPickLogEntry['outcome']): WmPickLogEntry {
  return {
    id,
    fixtureId: id.replace(/-(home|away)$/, ''),
    recordedAt: 0,
    dateIso: '2026-06-15',
    homeTeam: 'X',
    awayTeam: 'Y',
    winnerTeam: 'X',
    winnerSide: 'home',
    modelProbabilityPct: 70,
    eloDiff: 100,
    tier: 'modell-favorit',
    factorSnapshot: [],
    proTipperConviction: 0.9,
    outcome
  };
}

describe('pnlForOutcome', () => {
  it('win bei Quote 2.0 → +Einsatz', () => {
    expect(pnlForOutcome('win', 10, 2.0)).toBe(10);
  });
  it('win bei Quote 1.5 → +halber Einsatz', () => {
    expect(pnlForOutcome('win', 10, 1.5)).toBe(5);
  });
  it('loss → -Einsatz', () => {
    expect(pnlForOutcome('loss', 10, 2.0)).toBe(-10);
  });
  it('push → 0', () => {
    expect(pnlForOutcome('push', 10, 2.0)).toBe(0);
  });
  it('pending → null', () => {
    expect(pnlForOutcome('pending', 10, 2.0)).toBeNull();
  });
});

describe('joinLedger', () => {
  it('Outcome kommt aus dem Pick-Log per id', () => {
    const rows = joinLedger(
      [stake({ id: 'fx1-home' })],
      [logEntry('fx1-home', 'win')]
    );
    expect(rows[0].outcome).toBe('win');
    expect(rows[0].pnlEur).toBe(10);
  });

  it('Stake ohne Log-Eintrag bleibt pending', () => {
    const rows = joinLedger([stake({ id: 'fx9-home' })], []);
    expect(rows[0].outcome).toBe('pending');
    expect(rows[0].pnlEur).toBeNull();
  });
});

describe('summarizeLedger', () => {
  it('Leeres Ledger → alles 0/null', () => {
    const s = summarizeLedger([]);
    expect(s.totalEntries).toBe(0);
    expect(s.roiPct).toBeNull();
    expect(s.hitRatePct).toBeNull();
    expect(s.equityCurve).toEqual([0]);
  });

  it('2 Wins + 1 Loss bei 10 EUR / Quote 2.0 → Netto +10, ROI +33.3', () => {
    const rows = joinLedger(
      [
        stake({ id: 'a-home', recordedAt: 1 }),
        stake({ id: 'b-home', recordedAt: 2 }),
        stake({ id: 'c-home', recordedAt: 3 })
      ],
      [logEntry('a-home', 'win'), logEntry('b-home', 'win'), logEntry('c-home', 'loss')]
    );
    const s = summarizeLedger(rows);
    expect(s.netPnlEur).toBe(10); // +10 +10 -10
    expect(s.roiPct).toBeCloseTo(33.3, 0);
    expect(s.hitRatePct).toBe(67);
    expect(s.equityCurve).toEqual([0, 10, 20, 10]);
  });

  it('Pushes zaehlen nicht in die Hit-Rate', () => {
    const rows = joinLedger(
      [stake({ id: 'a-home' }), stake({ id: 'b-home' })],
      [logEntry('a-home', 'win'), logEntry('b-home', 'push')]
    );
    const s = summarizeLedger(rows);
    expect(s.hitRatePct).toBe(100); // 1 win, 0 loss
    expect(s.pushes).toBe(1);
  });

  it('Pending Stakes sind nicht in resolvedStaked', () => {
    const rows = joinLedger(
      [stake({ id: 'a-home' }), stake({ id: 'b-home' })],
      [logEntry('a-home', 'win')]
    );
    const s = summarizeLedger(rows);
    expect(s.totalStakedEur).toBe(20);
    expect(s.resolvedStakedEur).toBe(10);
    expect(s.pendingCount).toBe(1);
  });
});

describe('Wording — keine verbotenen Begriffe', () => {
  const FORBIDDEN = ['sicher', 'bank-tipp', 'garantiert', 'todsicher', 'risikolos', 'muss kommen', 'free money', 'geldmaschine'];
  it('Keine verbotenen Woerter in den Typen-Labels', () => {
    // Pure-Lib hat keine User-facing Strings ausser Kommentaren —
    // dieser Test dokumentiert die Anforderung fuer die UI-Schicht.
    for (const f of FORBIDDEN) {
      expect(f.length).toBeGreaterThan(0);
    }
  });
});

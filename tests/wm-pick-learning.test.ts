import { describe, expect, it } from 'vitest';
import {
  deriveFactorWeights,
  evaluateFactorPerformance,
  evaluateTierPerformance,
  resolveOpenPicks,
  type WmFactorSnapshot,
  type WmPickLogEntry
} from '@/lib/sport/wm-pick-learning';

const NEUTRAL_FACTOR = (id: string): WmFactorSnapshot => ({
  id, homeGoalMultiplier: 1, awayGoalMultiplier: 1, homeEloDelta: 0, awayEloDelta: 0, confidenceShift: 0
});
const ACTIVE_FACTOR = (id: string, eloShift = 60): WmFactorSnapshot => ({
  id, homeGoalMultiplier: 0.95, awayGoalMultiplier: 1, homeEloDelta: -eloShift, awayEloDelta: 0, confidenceShift: -10
});

function entry(over: Partial<WmPickLogEntry> & { id: string }): WmPickLogEntry {
  const base: WmPickLogEntry = {
    id: over.id,
    fixtureId: 'fx-' + over.id,
    recordedAt: 0,
    dateIso: '2026-06-15',
    homeTeam: 'X',
    awayTeam: 'Y',
    winnerTeam: 'X',
    winnerSide: 'home',
    modelProbabilityPct: 70,
    eloDiff: 150,
    tier: 'modell-favorit',
    factorSnapshot: [],
    proTipperConviction: 0.9,
    outcome: 'pending'
  };
  return { ...base, ...over };
}

describe('evaluateFactorPerformance', () => {
  it('Leeres Log → UNKLAR, Weight 1.0', () => {
    const r = evaluateFactorPerformance([], 'altitude');
    expect(r.label).toBe('UNKLAR');
    expect(r.weightMultiplier).toBe(1.0);
    expect(r.liftPct).toBeNull();
  });

  it('Unter Mindest-Sample → UNKLAR', () => {
    const log = [
      entry({ id: '1', outcome: 'win', factorSnapshot: [ACTIVE_FACTOR('altitude')] }),
      entry({ id: '2', outcome: 'loss', factorSnapshot: [ACTIVE_FACTOR('altitude')] })
    ];
    expect(evaluateFactorPerformance(log, 'altitude').label).toBe('UNKLAR');
  });

  it('Faktor BESTAETIGT: aktiv 8/10 wins, inaktiv 5/10 wins → Lift +30 %', () => {
    const log: WmPickLogEntry[] = [];
    // 8 wins + 2 losses mit aktivem Faktor
    for (let i = 0; i < 8; i++) log.push(entry({ id: `w${i}`, outcome: 'win', factorSnapshot: [ACTIVE_FACTOR('altitude')] }));
    for (let i = 0; i < 2; i++) log.push(entry({ id: `l${i}`, outcome: 'loss', factorSnapshot: [ACTIVE_FACTOR('altitude')] }));
    // 5 wins + 5 losses ohne aktivem Faktor (Faktor neutral)
    for (let i = 0; i < 5; i++) log.push(entry({ id: `nw${i}`, outcome: 'win', factorSnapshot: [NEUTRAL_FACTOR('altitude')] }));
    for (let i = 0; i < 5; i++) log.push(entry({ id: `nl${i}`, outcome: 'loss', factorSnapshot: [NEUTRAL_FACTOR('altitude')] }));
    const r = evaluateFactorPerformance(log, 'altitude');
    expect(r.label).toBe('BESTAETIGT');
    expect(r.liftPct).toBe(30);
    expect(r.weightMultiplier).toBeGreaterThan(1);
    expect(r.weightMultiplier).toBeLessThanOrEqual(1.30);
  });

  it('Faktor KONTRA: aktiv 2/10 wins, inaktiv 7/10 → Weight < 1', () => {
    const log: WmPickLogEntry[] = [];
    for (let i = 0; i < 2; i++) log.push(entry({ id: `w${i}`, outcome: 'win', factorSnapshot: [ACTIVE_FACTOR('jetlag')] }));
    for (let i = 0; i < 8; i++) log.push(entry({ id: `l${i}`, outcome: 'loss', factorSnapshot: [ACTIVE_FACTOR('jetlag')] }));
    for (let i = 0; i < 7; i++) log.push(entry({ id: `nw${i}`, outcome: 'win', factorSnapshot: [NEUTRAL_FACTOR('jetlag')] }));
    for (let i = 0; i < 3; i++) log.push(entry({ id: `nl${i}`, outcome: 'loss', factorSnapshot: [NEUTRAL_FACTOR('jetlag')] }));
    const r = evaluateFactorPerformance(log, 'jetlag');
    expect(r.label).toBe('KONTRA');
    expect(r.weightMultiplier).toBeLessThan(1);
    expect(r.weightMultiplier).toBeGreaterThanOrEqual(0.5);
  });

  it('Push-Outcomes werden ignoriert', () => {
    const log = [
      entry({ id: '1', outcome: 'push', factorSnapshot: [ACTIVE_FACTOR('altitude')] }),
      entry({ id: '2', outcome: 'push', factorSnapshot: [ACTIVE_FACTOR('altitude')] })
    ];
    const r = evaluateFactorPerformance(log, 'altitude');
    expect(r.basedOnSample).toBe(0);
  });
});

describe('deriveFactorWeights', () => {
  it('Leeres Log → alle Weights 1.0, UNKLAR', () => {
    const r = deriveFactorWeights([]);
    expect(r.totalResolved).toBe(0);
    for (const id of Object.keys(r.weights)) {
      expect(r.weights[id]).toBe(1.0);
      expect(r.labels[id]).toBe('UNKLAR');
    }
  });

  it('Liefert Weights fuer alle bekannten Faktoren', () => {
    const r = deriveFactorWeights([entry({ id: '1', outcome: 'win', factorSnapshot: [] })]);
    const keys = Object.keys(r.weights);
    expect(keys).toContain('acclimatization');
    expect(keys).toContain('altitude');
    expect(keys).toContain('jetlag');
    expect(keys).toContain('host-advantage');
    expect(keys).toContain('regional-crowd');
    expect(keys).toContain('hot-midday');
    expect(keys).toContain('weather');
  });
});

describe('evaluateTierPerformance', () => {
  it('Bei leerem Log: alle Tiers null Hit-Rate', () => {
    const r = evaluateTierPerformance([]);
    expect(r[0].hitRatePct).toBeNull();
  });

  it('Tier-Aufschluesselung korrekt', () => {
    const log = [
      entry({ id: '1', outcome: 'win', tier: 'hoechste-konfluenz' }),
      entry({ id: '2', outcome: 'win', tier: 'hoechste-konfluenz' }),
      entry({ id: '3', outcome: 'loss', tier: 'hoechste-konfluenz' }),
      entry({ id: '4', outcome: 'loss', tier: 'modell-favorit' })
    ];
    const r = evaluateTierPerformance(log);
    const highest = r.find((t) => t.tier === 'hoechste-konfluenz')!;
    expect(highest.resolved).toBe(3);
    expect(highest.wins).toBe(2);
    expect(highest.hitRatePct).toBe(67);
  });
});

describe('resolveOpenPicks', () => {
  it('Bestaetigt pending Picks gegen Final-Scores', () => {
    const log = [
      entry({ id: '1', fixtureId: 'fx-1', winnerSide: 'home', outcome: 'pending' }),
      entry({ id: '2', fixtureId: 'fx-2', winnerSide: 'away', outcome: 'pending' })
    ];
    const { log: next, resolvedCount } = resolveOpenPicks(log, [
      { fixtureId: 'fx-1', homeScore: 2, awayScore: 0 }, // Heim-Sieg, Pick home → win
      { fixtureId: 'fx-2', homeScore: 2, awayScore: 0 }  // Heim-Sieg, Pick away → loss
    ]);
    expect(resolvedCount).toBe(2);
    expect(next[0].outcome).toBe('win');
    expect(next[1].outcome).toBe('loss');
  });

  it('Remis → push fuer beide Seiten', () => {
    const log = [entry({ id: '1', fixtureId: 'fx-1', winnerSide: 'home', outcome: 'pending' })];
    const { log: next } = resolveOpenPicks(log, [{ fixtureId: 'fx-1', homeScore: 1, awayScore: 1 }]);
    expect(next[0].outcome).toBe('push');
  });

  it('Bereits resolved Picks bleiben unveraendert', () => {
    const log = [entry({ id: '1', fixtureId: 'fx-1', outcome: 'win', resolvedAt: 1000 })];
    const { resolvedCount } = resolveOpenPicks(log, [{ fixtureId: 'fx-1', homeScore: 2, awayScore: 0 }]);
    expect(resolvedCount).toBe(0);
  });
});

describe('Wording — keine verbotenen Begriffe', () => {
  const FORBIDDEN = ['sicher', 'bank', 'garantiert', 'todsicher', 'risikolos', 'muss kommen', 'free money'];
  it('Labels frei von verbotenen Begriffen', () => {
    const labels = ['UNKLAR', 'BESTAETIGT', 'NEUTRAL', 'KONTRA'];
    for (const label of labels) {
      const lower = label.toLowerCase();
      for (const f of FORBIDDEN) expect(lower.includes(f)).toBe(false);
    }
  });
});

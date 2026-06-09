import { describe, expect, it } from 'vitest';
import {
  findMostCommonBlocker,
  selectTopPrecisionPicks,
  topBlockers
} from '@/lib/sport/sport-pick-selector';
import type {
  PrecisionPickResult,
  PrecisionVerdict
} from '@/lib/sport/sport-precision-gate';

function pick(over: Partial<PrecisionPickResult> & { matchId: string; verdict: PrecisionVerdict }): PrecisionPickResult {
  const base: PrecisionPickResult = {
    matchId: over.matchId,
    marketType: '1X2',
    verdict: over.verdict,
    precisionScore: 70,
    rawProbability: 0.75,
    displayProbability: 0.7,
    confidenceCap: 80,
    reasons: [],
    blockers: [],
    warnings: [],
    agentStatuses: [],
    shouldShowAsTopPick: over.verdict !== 'NICHT_VERWENDEN',
    riskLabel: 'LOW',
    dataLabel: 'VOLLSTAENDIG',
    calibrationLabel: 'KALIBRIERT'
  };
  return { ...base, ...over };
}

describe('selectTopPrecisionPicks', () => {
  it('FREIGABE vor BEOBACHTEN', () => {
    const picks = [
      pick({ matchId: 'a', verdict: 'BEOBACHTEN', precisionScore: 90 }),
      pick({ matchId: 'b', verdict: 'FREIGABE', precisionScore: 70 })
    ];
    const r = selectTopPrecisionPicks(picks);
    expect(r.picks[0].matchId).toBe('b');
    expect(r.picks[0].verdict).toBe('FREIGABE');
  });
  it('Pro matchId nur EIN Pick — staerkster Markt gewinnt', () => {
    const picks = [
      pick({ matchId: 'a', verdict: 'BEOBACHTEN', marketType: '1X2', precisionScore: 70 }),
      pick({ matchId: 'a', verdict: 'FREIGABE', marketType: 'Über 1,5', precisionScore: 85 }),
      pick({ matchId: 'a', verdict: 'BEOBACHTEN', marketType: 'Doppelchance', precisionScore: 75 })
    ];
    const r = selectTopPrecisionPicks(picks);
    expect(r.picks.length).toBe(1);
    expect(r.picks[0].marketType).toBe('Über 1,5');
    expect(r.picks[0].verdict).toBe('FREIGABE');
    expect(r.matchesEvaluated).toBe(1);
  });
  it('Limit 5 wird eingehalten', () => {
    const picks = Array.from({ length: 12 }, (_, i) =>
      pick({ matchId: `m${i}`, verdict: 'BEOBACHTEN', precisionScore: 80 - i })
    );
    const r = selectTopPrecisionPicks(picks);
    expect(r.picks.length).toBe(5);
  });
  it('Keine Duplikate', () => {
    const picks = [
      pick({ matchId: 'a', verdict: 'FREIGABE' }),
      pick({ matchId: 'b', verdict: 'BEOBACHTEN' }),
      pick({ matchId: 'c', verdict: 'BEOBACHTEN' })
    ];
    const r = selectTopPrecisionPicks(picks);
    const ids = r.picks.map((p) => p.matchId);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('NICHT_VERWENDEN nicht als Top-Pick im normalen Modus', () => {
    const picks = [
      pick({ matchId: 'a', verdict: 'FREIGABE', precisionScore: 90 }),
      pick({ matchId: 'b', verdict: 'NICHT_VERWENDEN', precisionScore: 95 })
    ];
    const r = selectTopPrecisionPicks(picks);
    expect(r.picks.length).toBe(1);
    expect(r.picks[0].matchId).toBe('a');
    expect(r.blockedCount).toBe(1);
  });
  it('Leerer Tag: nur NICHT_VERWENDEN → Erklaer-Pick im Output', () => {
    const picks = [
      pick({ matchId: 'a', verdict: 'NICHT_VERWENDEN', blockers: ['TBD'] }),
      pick({ matchId: 'b', verdict: 'NICHT_VERWENDEN', blockers: ['Daten zu schwach'] })
    ];
    const r = selectTopPrecisionPicks(picks);
    expect(r.emptyTopList).toBe(true);
    expect(r.picks.length).toBe(1); // Erklaer-Pick
    expect(r.freigabeCount).toBe(0);
    expect(r.beobachtenCount).toBe(0);
  });
  it('emptyTopList true wenn nichts FREIGABE/BEOBACHTEN existiert', () => {
    const picks: PrecisionPickResult[] = [];
    const r = selectTopPrecisionPicks(picks);
    expect(r.emptyTopList).toBe(true);
    expect(r.matchesEvaluated).toBe(0);
  });
  it('Ranking bei Gleichstand: Verdict > precisionScore > displayProbability', () => {
    const picks = [
      pick({ matchId: 'low', verdict: 'BEOBACHTEN', precisionScore: 80, displayProbability: 0.7 }),
      pick({ matchId: 'high', verdict: 'BEOBACHTEN', precisionScore: 80, displayProbability: 0.85 })
    ];
    const r = selectTopPrecisionPicks(picks);
    expect(r.picks[0].matchId).toBe('high');
  });
  it('Counts korrekt: 2 FREIGABE, 1 BEOBACHTEN, 1 NICHT_VERWENDEN', () => {
    const picks = [
      pick({ matchId: 'a', verdict: 'FREIGABE' }),
      pick({ matchId: 'b', verdict: 'FREIGABE' }),
      pick({ matchId: 'c', verdict: 'BEOBACHTEN' }),
      pick({ matchId: 'd', verdict: 'NICHT_VERWENDEN' })
    ];
    const r = selectTopPrecisionPicks(picks);
    expect(r.freigabeCount).toBe(2);
    expect(r.beobachtenCount).toBe(1);
    expect(r.blockedCount).toBe(1);
    expect(r.matchesEvaluated).toBe(4);
  });
});

describe('findMostCommonBlocker', () => {
  it('Findet haeufigsten Blocker', () => {
    const picks = [
      pick({ matchId: 'a', verdict: 'NICHT_VERWENDEN', blockers: ['TBD', 'Daten schwach'] }),
      pick({ matchId: 'b', verdict: 'NICHT_VERWENDEN', blockers: ['TBD'] }),
      pick({ matchId: 'c', verdict: 'NICHT_VERWENDEN', blockers: ['Daten schwach', 'TBD'] })
    ];
    expect(findMostCommonBlocker(picks)).toBe('TBD');
  });
  it('Keine Blocker → null', () => {
    expect(findMostCommonBlocker([])).toBeNull();
  });
});

describe('topBlockers', () => {
  it('Top 3 sortiert nach Haeufigkeit', () => {
    const picks = [
      pick({ matchId: 'a', verdict: 'NICHT_VERWENDEN', blockers: ['A', 'B'] }),
      pick({ matchId: 'b', verdict: 'NICHT_VERWENDEN', blockers: ['A', 'C'] }),
      pick({ matchId: 'c', verdict: 'NICHT_VERWENDEN', blockers: ['A', 'C', 'D'] })
    ];
    const top = topBlockers(picks, 3);
    expect(top[0].label).toBe('A');
    expect(top[0].count).toBe(3);
    expect(top.length).toBe(3);
  });
});

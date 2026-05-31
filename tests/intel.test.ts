import { describe, expect, it } from 'vitest';
import { chefredakteurSynthesis } from '@/lib/intel/chefredakteur';
import { stimmungsForscher, derivateAnalyst, pumpDetektiv, runAllEmployees } from '@/lib/intel/employees';
import { EmployeeReport, IntelContext } from '@/lib/intel/types';

function emptyCtx(over: Partial<IntelContext> = {}): IntelContext {
  return {
    fearGreed: null, fundingBtcPct: null, fundingEthPct: null, btcDominancePct: null,
    marketMood: 'neutral', btcRegime: 'sideways',
    topCandidates: [],
    newsTotal: 0, newsBullish: 0, newsBearish: 0, newsTopHeadline: null, topCoinSentiment: [],
    backtestPeriodDays: 0, backtestSafeTrades: 0, backtestSafeWinRatePct: null, backtestSafeNetReturnPct: 0,
    nextHighImpactEvent: null, cycleLabel: null, cycleProgressPct: null,
    recentBuyDays: 0, recentWaitDays: 0,
    ...over
  };
}

function r(over: Partial<EmployeeReport>): EmployeeReport {
  return {
    id: 'x', title: 't', department: 'd', expertise: 'e', finding: 'f',
    signal: 'neutral', confidence: 'sicher',
    ...over
  };
}

describe('chefredakteurSynthesis', () => {
  it('flips net signal to risk-on when 2+ more employees see risk-on', () => {
    const reports: EmployeeReport[] = [
      r({ id: '1', signal: 'risk-on' }),
      r({ id: '2', signal: 'risk-on' }),
      r({ id: '3', signal: 'risk-on' }),
      r({ id: '4', signal: 'risk-off' })
    ];
    const ceo = chefredakteurSynthesis(reports);
    expect(ceo.netSignal).toBe('risk-on');
    expect(ceo.riskOnCount).toBe(3);
    expect(ceo.riskOffCount).toBe(1);
    expect(ceo.conflicts.length).toBeGreaterThan(0);
  });

  it('marks neutral when team is evenly split', () => {
    const reports: EmployeeReport[] = [
      r({ id: '1', signal: 'risk-on' }),
      r({ id: '2', signal: 'risk-off' })
    ];
    expect(chefredakteurSynthesis(reports).netSignal).toBe('neutral');
  });

  it('ignores keine_daten employees in vote counting', () => {
    const reports: EmployeeReport[] = [
      r({ id: '1', signal: 'risk-on' }),
      r({ id: '2', signal: 'kein_signal', confidence: 'keine_daten' }),
      r({ id: '3', signal: 'kein_signal', confidence: 'keine_daten' })
    ];
    expect(chefredakteurSynthesis(reports).riskOnCount).toBe(1);
  });

  it('returns the trockene-Datenquellen lagebericht when everyone has no data', () => {
    const reports: EmployeeReport[] = [
      r({ signal: 'kein_signal', confidence: 'keine_daten' }),
      r({ signal: 'kein_signal', confidence: 'keine_daten' })
    ];
    expect(chefredakteurSynthesis(reports).lagebericht.toLowerCase()).toContain('trockenen datenquellen');
  });
});

describe('Stimmungs-Forscherin', () => {
  it('flags extreme greed as risk-off', () => {
    expect(stimmungsForscher(emptyCtx({ fearGreed: 85 })).signal).toBe('risk-off');
  });
  it('flags extreme fear as risk-on', () => {
    expect(stimmungsForscher(emptyCtx({ fearGreed: 20 })).signal).toBe('risk-on');
  });
  it('reports keine_daten without F&G', () => {
    expect(stimmungsForscher(emptyCtx()).confidence).toBe('keine_daten');
  });
});

describe('Derivate-Analyst', () => {
  it('marks risk-off when funding is crowded long', () => {
    expect(derivateAnalyst(emptyCtx({ fundingBtcPct: 40, fundingEthPct: 35 })).signal).toBe('risk-off');
  });
  it('marks risk-on when funding goes negative', () => {
    expect(derivateAnalyst(emptyCtx({ fundingBtcPct: -2, fundingEthPct: -1 })).signal).toBe('risk-on');
  });
});

describe('Pump-Detektivin', () => {
  it('flags any coin > 15% in 24h as risk-off', () => {
    const ctx = emptyCtx({
      topCandidates: [{
        symbol: 'XYZ', coinId: 'xyz', passedCount: 7, priceChangePct24h: 22, quoteVolume: 1e8,
        relStrengthVsBtc: 3, structure: 'uptrend'
      }]
    });
    expect(pumpDetektiv(ctx).signal).toBe('risk-off');
  });
});

describe('runAllEmployees', () => {
  it('produces a report from every employee even on an empty context', () => {
    const reports = runAllEmployees(emptyCtx());
    expect(reports).toHaveLength(12);
    expect(reports.every((r) => typeof r.finding === 'string' && r.finding.length > 0)).toBe(true);
  });
});

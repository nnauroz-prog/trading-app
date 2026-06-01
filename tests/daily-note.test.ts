import { describe, expect, it } from 'vitest';
import { composeDailyNote } from '@/lib/agents/daily-note';
import { AgentVerdict } from '@/lib/agents/personas';
import { RankedCandidate } from '@/lib/analysis/master-signal-engine';

function target(): RankedCandidate {
  return {
    symbol: 'ETH', coinId: 'eth',
    passedCount: 10, totalCount: 12, confidence: 0.85,
    entry: 3000, stopLoss: 2900, takeProfit1: 3200, takeProfit2: 3400,
    stopDistancePct: 3.33, rrTp1: 2,
    tier: 'strong', oneLineReason: '',
    brokers: ['Coinbase'], quoteVolume: 5e8,
    structure: 'uptrend', positionInRange: 0.3, nearSupport: true,
    confirmed: true, relStrengthVsBtc: 1, priceChangePct24h: 2
  };
}

function verdict(persona: 'conservative' | 'balanced' | 'aggressive', kind: 'BUY' | 'WAIT'): AgentVerdict {
  return {
    persona,
    name: persona === 'conservative' ? 'Konservativ' : persona === 'balanced' ? 'Balanciert' : 'Aggressiv',
    motto: '', manifest: '',
    verdict: kind,
    target: kind === 'BUY' ? target() : null,
    safety: kind === 'BUY' ? { score: 90, maxSafety: true, grade: 'A', criteria: [], passedHard: 8, totalHard: 8, residualRiskNote: '' } : null,
    rationale: kind === 'WAIT' ? 'Ich warte: schwaches Setup.' : 'Klar grün.',
    team: [],
    voteSummary: { total: 0, positiveVotes: 0, negativeVotes: 0, neutralVotes: 0, direction: 'mixed', confidence: 0 },
    ceoFinalWord: ''
  };
}

describe('composeDailyNote', () => {
  it('uses CEO name in the byline', () => {
    const n = composeDailyNote(verdict('conservative', 'BUY'));
    expect(n.ceoName).toBe('Dr. Hanna Lindgren');
  });

  it('has different tone per firma when BUY', () => {
    const c = composeDailyNote(verdict('conservative', 'BUY'));
    const b = composeDailyNote(verdict('balanced', 'BUY'));
    const a = composeDailyNote(verdict('aggressive', 'BUY'));
    expect(c.title).not.toBe(b.title);
    expect(b.title).not.toBe(a.title);
    expect(c.title.toLowerCase()).toContain('selten');
    expect(b.body.toLowerCase()).toMatch(/häkchen|kelly|stop/);
    expect(a.title.toLowerCase()).toContain('schnell');
  });

  it('produces wait-style narrative when WAIT', () => {
    const c = composeDailyNote(verdict('conservative', 'WAIT'));
    expect(c.title.toLowerCase()).toContain('warten');
    expect(c.body.toLowerCase()).toContain('cash');
  });

  it('mentions actual price levels in BUY body', () => {
    const n = composeDailyNote(verdict('balanced', 'BUY'));
    expect(n.body).toContain('2900');
    expect(n.body).toContain('3200');
  });
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CryptoBuySignals } from '@/components/crypto/crypto-buy-signals';
import type { CryptoPrecisionResult } from '@/lib/analysis/crypto-precision-gate';
import type { RankedCandidate } from '@/lib/analysis/master-signal-engine';

const now = Date.parse('2026-10-30T12:00:00Z');
const candidate: RankedCandidate = { symbol: 'BTC', coinId: 'btc', passedCount: 9, totalCount: 10, confidence: 90, entry: 100, stopLoss: 95, takeProfit1: 110, takeProfit2: 120, stopDistancePct: 5, rrTp1: 2, tier: 'strong', oneLineReason: 'Bestätigter Aufwärtstrend', brokers: [], quoteVolume: 1e9, structure: 'uptrend', positionInRange: 0.4, nearSupport: true, confirmed: true, relStrengthVsBtc: 0, priceChangePct24h: 2 };
const pick: CryptoPrecisionResult = { symbol: 'BTC', coinId: 'btc', verdict: 'FREIGABE', precisionScore: 90, reasons: ['Kriterien erfüllt'], blockers: [], warnings: [], agentStatuses: [], shouldShowAsTopPick: true, riskLabel: 'LOW' };
const render = (picks = [pick], candidates = [candidate], generatedAt = new Date(now).toISOString()) => renderToStaticMarkup(createElement(CryptoBuySignals, { picks, candidates, generatedAt, mode: 'swing', now }));
describe('clear crypto buy signals', () => {
  it('shows the approved coin with entry, stop and targets', () => {
    const html = render();
    expect(html).toContain('KAUF-SIGNAL');
    expect(html).toContain('BTC');
    expect(html).toContain('95 USDT');
    expect(html).toContain('Ziel 2');
  });
  it('never promotes an observation or blocked coin to a buy', () => {
    for (const verdict of ['BEOBACHTEN', 'NICHT_VERWENDEN'] as const) expect(render([{ ...pick, verdict }])).toContain('Heute kein Kauf-Signal');
  });
  it('withholds signals when data is stale, absent or prices are invalid', () => {
    expect(render([pick], [candidate], new Date(now - 360000).toISOString())).toContain('Heute kein Kauf-Signal');
    expect(render([], [])).toContain('Aktuelle Kurs- und Analysedaten fehlen');
    expect(render([pick], [{ ...candidate, stopLoss: 105 }])).toContain('Heute kein Kauf-Signal');
    expect(render([pick], [{ ...candidate, entry: NaN }])).toContain('Heute kein Kauf-Signal');
  });
  it('deduplicates coins and blocks picks carrying a veto', () => {
    expect((render([pick, pick]).match(/KAUF-SIGNAL/g) ?? [])).toHaveLength(1);
    expect(render([{ ...pick, blockers: ['Keine Daten'] }])).toContain('Heute kein Kauf-Signal');
  });
});

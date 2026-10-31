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
    expect(render([], [])).toContain('Aktuelle Kurse fehlen gerade');
    expect(render([pick], [{ ...candidate, stopLoss: 105 }])).toContain('Heute kein Kauf-Signal');
    expect(render([pick], [{ ...candidate, entry: NaN }])).toContain('Heute kein Kauf-Signal');
  });
  it('withholds even approved candidates while important market events require caution', () => {
    const html = renderToStaticMarkup(createElement(CryptoBuySignals, { picks: [pick], candidates: [candidate], generatedAt: new Date(now).toISOString(), mode: 'swing', now, pausedReason: 'Wichtige Wirtschaftszahlen stehen bevor.' }));
    expect(html).toContain('Heute kein Kauf-Signal');
    expect(html).toContain('Wichtige Wirtschaftszahlen stehen bevor.');
    expect(html).not.toContain('KAUF-SIGNAL');
  });
  it('does not claim prices are absent when prices are visible but a buy assessment is unavailable', () => {
    const html = renderToStaticMarkup(createElement(CryptoBuySignals, { picks: [], candidates: [], generatedAt: new Date(now).toISOString(), mode: 'swing', now, pricesAvailable: true }));
    expect(html).toContain('Die Preise sind da.');
    expect(html).not.toContain('Aktuelle Kurse fehlen');
  });
  it('keeps technical checks out of the normal user text', () => {
    const html = render([{ ...pick, reasons: ['Konfluenz 9/10 · FREIGABE · Modell-Score 90'] }]);
    expect(html).not.toMatch(/Konfluenz|FREIGABE|Modell-Score|90\/100/);
    expect(html).toContain('Geplanter Kaufpreis');
    expect(html).toContain('Ausstieg bei Verlust');
  });
  it('deduplicates coins and blocks picks carrying a veto', () => {
    expect((render([pick, pick]).match(/KAUF-SIGNAL/g) ?? [])).toHaveLength(1);
    expect(render([{ ...pick, blockers: ['Keine Daten'] }])).toContain('Heute kein Kauf-Signal');
  });
});

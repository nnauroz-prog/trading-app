import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SummerModeBanner } from '@/components/summer-mode-banner';
import { InstrumentPrecisionDesk } from '@/components/instruments/instrument-precision-desk';
import { DataRefreshIndicator } from '@/components/data-refresh-indicator';
import { StockSafetyBacktestCard } from '@/components/stock-safety-backtest-card';
import { CommoditySafetyBacktestCard } from '@/components/commodity-safety-backtest-card';
import { FOOTBALL_LEAGUES } from '@/lib/sport/leagues';

const summary = {
  available: true, totalTrades: 8, combinedWinRatePct: 50,
  combinedAvgPnlPct: 5, combinedStrategyReturnPct: 8, combinedBuyAndHoldPct: 20,
  perAsset: [], bestTradePct: 8, worstTradePct: -2, totalAssetsScanned: 10
};

describe('review regressions', () => {
  it('does not infer summer break from an empty October schedule', () => {
    const html = renderToStaticMarkup(createElement(SummerModeBanner, { leagues: [], todayIso: '2026-10-30' }));
    expect(html).toContain('Spielplandaten fehlen');
    expect(html).not.toContain('sind in Sommerpause');
  });
  it('does not give a clean bill of health when no instruments were checked', () => {
    const html = renderToStaticMarkup(createElement(InstrumentPrecisionDesk, { title: 'Aktien', hrefBase: '/aktien', picks: [] }));
    expect(html).toContain('Prüfung nicht möglich');
    expect(html).not.toContain('Werte sauber');
    expect(html).not.toContain('>OK<');
  });
  it('distinguishes page render time from provider freshness', () => {
    for (const hasData of [false, true]) {
      const html = renderToStaticMarkup(createElement(DataRefreshIndicator, { initialTimestamp: 1793365200000, refreshIntervalMs: 600000, hasData }));
      expect(html).not.toContain('Daten aktuell');
      expect(html).not.toContain('nächste Aktualisierung');
      expect(html).toContain(hasData ? 'Aktualität nicht bestätigt' : 'Keine Spielplandaten verfügbar');
    }
  });
  for (const [name, Card] of [['stocks', StockSafetyBacktestCard], ['commodities', CommoditySafetyBacktestCard]] as const) {
    it(`${name}: compares period returns rather than average trade profit or a twice-divided benchmark`, () => {
      const html = renderToStaticMarkup(createElement(Card, { summary }));
      expect(html).toContain('underperformed');
      expect(html).toContain('+8.0 %');
      expect(html).not.toContain('>geschlagen<');
      const winning = renderToStaticMarkup(createElement(Card, { summary: { ...summary, combinedStrategyReturnPct: 25 } }));
      expect(winning).toContain('>geschlagen<');
    });
    it(`${name}: unavailable history is not advertised as a running calculation`, () => {
      const html = renderToStaticMarkup(createElement(Card, { summary: { ...summary, available: false } }));
      expect(html).toContain('historische Kursdaten');
      expect(html).not.toContain('wird berechnet');
    });
  }
  it('keeps football league IDs unique', () => {
    expect(new Set(FOOTBALL_LEAGUES.map(l => l.id)).size).toBe(FOOTBALL_LEAGUES.length);
  });
});

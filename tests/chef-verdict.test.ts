import { describe, expect, it } from 'vitest';
import { buildChefVerdict, type ChefVerdictInput } from '@/lib/analysis/chef-verdict';

function base(): ChefVerdictInput {
  return {
    crypto: { dataAvailable: true, kind: 'no_trade', symbol: null, confidencePct: null, reason: null, marketMood: 'neutral', crowdCautious: false },
    stocks: { dataAvailable: true, topSymbol: null, topName: null, gradeACount: 0 },
    commodities: { dataAvailable: true, topSymbol: null, topName: null, gradeACount: 0 }
  };
}

describe('buildChefVerdict', () => {
  it('kein Daten-Provider → no_data, ehrlich ausgesetzt', () => {
    const inp = base();
    inp.crypto.dataAvailable = false;
    inp.stocks.dataAvailable = false;
    inp.commodities.dataAvailable = false;
    const v = buildChefVerdict(inp);
    expect(v.stance).toBe('no_data');
    expect(v.primary).toBeNull();
    expect(v.dataQualityNote).toBeTruthy();
  });

  it('Krypto-Trade-Signal wird zur primaeren Gelegenheit', () => {
    const inp = base();
    inp.crypto = { dataAvailable: true, kind: 'trade', symbol: 'ETH', confidencePct: 80, reason: 'Saubere Konfluenz', marketMood: 'risk-on', crowdCautious: false };
    const v = buildChefVerdict(inp);
    expect(v.stance).toBe('opportunity');
    expect(v.primary?.assetClass).toBe('Krypto');
    expect(v.primary?.href).toBe('/assets/eth');
    expect(v.confidence).toBe('hoch');
  });

  it('Risk-off macht aus einem Krypto-Trade ein selektives Verdict', () => {
    const inp = base();
    inp.crypto = { dataAvailable: true, kind: 'trade', symbol: 'BTC', confidencePct: 60, reason: 'ok', marketMood: 'risk-off', crowdCautious: false };
    const v = buildChefVerdict(inp);
    expect(v.stance).toBe('selective');
    expect(v.confidence).toBe('mittel');
    // Risk-off muss als Risiko benannt sein
    expect(v.risks.some((r) => /Risk-off/i.test(r))).toBe(true);
  });

  it('ohne Krypto-Signal fuehrt eine Grade-A-Aktie', () => {
    const inp = base();
    inp.stocks = { dataAvailable: true, topSymbol: 'AAPL', topName: 'Apple', gradeACount: 4 };
    const v = buildChefVerdict(inp);
    expect(v.primary?.assetClass).toBe('Aktien');
    expect(v.primary?.href).toBe('/aktien/AAPL');
    expect(v.confidence).toBe('mittel'); // >=3 Grade-A
  });

  it('nichts qualifiziert → patience, Cash-Botschaft', () => {
    const v = buildChefVerdict(base());
    expect(v.stance).toBe('patience');
    expect(v.primary).toBeNull();
    expect(v.headline.toLowerCase()).toContain('cash');
  });

  it('teilweise Datenlage wird ehrlich vermerkt', () => {
    const inp = base();
    inp.commodities.dataAvailable = false;
    const v = buildChefVerdict(inp);
    expect(v.dataQualityNote).toMatch(/Rohstoffe/);
  });

  it('Risiko-Hinweis ist immer gesetzt (kein Signal ist Garantie)', () => {
    const v = buildChefVerdict(base());
    expect(v.risks.length).toBeGreaterThan(0);
    expect(v.risks.some((r) => /Garantie/i.test(r))).toBe(true);
  });
});

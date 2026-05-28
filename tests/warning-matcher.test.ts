import { describe, expect, it } from 'vitest';
import { parseWarningText } from '@/lib/warnings/parse-warning-text';
import { matchWarningToPositions } from '@/lib/warnings/match-warning-to-positions';
import { Position } from '@/lib/types/positions';

function pos(overrides: Partial<Position>): Position {
  return {
    id: Math.random().toString(36).slice(2),
    underlying: 'BMW',
    instrumentType: 'stock',
    broker: 'Trade Republic',
    entryPrice: 75,
    entryDate: Date.now(),
    positionSize: 10,
    investmentQuote: 750,
    currency: 'EUR',
    stopLossPlanned: 70,
    takeProfitPlanned: 90,
    thesis: '',
    status: 'open',
    notes: '',
    ...overrides
  };
}

describe('parseWarningText', () => {
  it('detects BMW as underlying', () => {
    const w = parseWarningText('Verlustwarnung BMW: Setup ungültig, wenn BMW unter 72 € fällt.');
    expect(w.detectedUnderlyings).toContain('BMW');
  });
  it('detects mentioned WKNs', () => {
    const w = parseWarningText('Warnung: WKNs SY0N7Q und HT0N3C kritisch.');
    expect(w.detectedWkns).toContain('SY0N7Q');
    expect(w.detectedWkns).toContain('HT0N3C');
  });
});

describe('matchWarningToPositions', () => {
  it('matches BMW stock position by underlying name', () => {
    const w = parseWarningText('Verlustwarnung BMW: Setup ungültig wenn BMW unter 72 € fällt.');
    const result = matchWarningToPositions(w, [pos({})]);
    expect(result.affectedCount).toBe(1);
    expect(result.affectedPositions[0].matchType).toBe('underlying_name');
  });

  it('matches a WKN exactly as critical', () => {
    const w = parseWarningText('BMW Warnung: WKN HT0N3C kritisch, Risiko reduzieren.');
    const position = pos({ instrumentType: 'optionsschein', wkn: 'HT0N3C' });
    const result = matchWarningToPositions(w, [position]);
    expect(result.affectedCount).toBe(1);
    expect(result.affectedPositions[0].matchType).toBe('wkn_exact');
    expect(result.affectedPositions[0].severity).toBe('critical');
  });

  it('does not match unrelated position', () => {
    const w = parseWarningText('Verlustwarnung BMW unter 72 €.');
    const result = matchWarningToPositions(w, [pos({ underlying: 'SAP', ticker: undefined })]);
    expect(result.affectedCount).toBe(0);
  });

  it('matches crypto ticker', () => {
    const w = parseWarningText('Achtung BTC: Korrektur erwartet, Stop bei 90000.');
    const result = matchWarningToPositions(w, [pos({ underlying: 'BTC', ticker: 'BTC', instrumentType: 'crypto' })]);
    expect(result.affectedCount).toBe(1);
  });
});

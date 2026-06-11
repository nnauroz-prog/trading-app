import { describe, expect, it } from 'vitest';
import { manualOddsResult, manualOddsProvider } from '@/lib/sport/odds-providers/manual-odds';
import { tipicoStatus, tipicoFetchQuotes, tipicoOddsProvider } from '@/lib/sport/odds-providers/tipico-odds';
import { applyOddsRiskAdjustment, type SportOddsValueInput } from '@/lib/sport/sport-odds-value';

describe('manual odds provider', () => {
  it('Manuelle Quote wird als MANUAL_ONLY uebernommen', () => {
    const r = manualOddsResult([{ matchId: 'm1', marketType: '1X2-home', decimalOdds: 1.85 }]);
    expect(r.status).toBe('MANUAL_ONLY');
    expect(r.quotes.length).toBe(1);
    expect(r.quotes[0].provider).toBe('manual');
    expect(r.quotes[0].isManual).toBe(true);
    expect(r.quotes[0].sourceStatus).toBe('MANUAL_ONLY');
  });

  it('Quote <= 1 wird gefiltert (keine Fake-Quote, keine Dummy)', () => {
    const r = manualOddsResult([
      { matchId: 'm1', marketType: '1X2', decimalOdds: 1.0 },
      { matchId: 'm2', marketType: '1X2', decimalOdds: 0 },
      { matchId: 'm3', marketType: '1X2', decimalOdds: NaN }
    ]);
    expect(r.quotes.length).toBe(0);
  });

  it('manualOddsProvider.getStatus = MANUAL_ONLY', () => {
    expect(manualOddsProvider.getStatus()).toBe('MANUAL_ONLY');
  });

  it('manualOddsProvider.fetchQuotes liefert leere Liste (keine Server-Requests)', async () => {
    const r = await manualOddsProvider.fetchQuotes(['m1']);
    expect(r.status).toBe('MANUAL_ONLY');
    expect(r.quotes.length).toBe(0);
  });

  it('Manuelle Quote berechnet Value korrekt (Integration)', () => {
    const r = manualOddsResult([{ matchId: 'm1', marketType: '1X2-home', decimalOdds: 2.0 }]);
    const quote = r.quotes[0];
    const input: SportOddsValueInput = {
      modelProbability: 0.6,
      displayProbability: 0.58,
      decimalOdds: quote.decimalOdds,
      marketType: quote.marketType,
      dataConfidence: 90,
      qualityScore: 85,
      marketStability: 'STRONG',
      modelDisagreement: 'LOW',
      calibrationLabel: 'KALIBRIERT',
      baseVerdict: 'FREIGABE',
      hasOfficialFixture: true,
      isTbdTeam: false,
      isPairingVerified: true,
      sourceCompleteness: 90,
      hasHardBlocker: false,
      riskMode: 'BALANCED'
    };
    const o = applyOddsRiskAdjustment(input);
    expect(o.valueLabel).toBe('VALUE');
    expect(o.impliedProbability).toBeCloseTo(0.5, 3);
    expect(o.valueEdge).toBe(10);
  });
});

describe('tipico odds provider — Stub-Pflicht ohne offiziellen Zugang', () => {
  it('tipicoStatus default NOT_AVAILABLE (kein Feature-Flag gesetzt)', () => {
    const prev = process.env.TIPICO_OFFICIAL_PROVIDER;
    delete process.env.TIPICO_OFFICIAL_PROVIDER;
    expect(tipicoStatus()).toBe('NOT_AVAILABLE');
    if (prev !== undefined) process.env.TIPICO_OFFICIAL_PROVIDER = prev;
  });

  it('tipicoFetchQuotes liefert NOT_AVAILABLE und KEINE Quoten', async () => {
    const r = await tipicoFetchQuotes(['m1']);
    expect(r.status).toBe('NOT_AVAILABLE');
    expect(r.quotes.length).toBe(0);
    expect(r.reason).toContain('nicht angebunden');
  });

  it('tipicoOddsProvider.name korrekt', () => {
    expect(tipicoOddsProvider.name).toBe('tipico');
  });

  it('Auch mit Feature-Flag bleibt der Stub leer, solange keine echte Quelle gebaut ist', async () => {
    const prev = process.env.TIPICO_OFFICIAL_PROVIDER;
    process.env.TIPICO_OFFICIAL_PROVIDER = 'true';
    const r = await tipicoFetchQuotes(['m1']);
    // Schutz: Stub gibt auch mit Flag NIE erfundene Daten zurueck.
    expect(r.quotes.length).toBe(0);
    if (prev !== undefined) process.env.TIPICO_OFFICIAL_PROVIDER = prev;
    else delete process.env.TIPICO_OFFICIAL_PROVIDER;
  });
});

describe('Keine Fake-Quoten in der ganzen Pipeline', () => {
  it('Ohne Quote -> impliedProbability null, valueEdge null, expectedValue null', () => {
    const input: SportOddsValueInput = {
      modelProbability: 0.7,
      displayProbability: 0.65,
      decimalOdds: null,
      marketType: '1X2',
      dataConfidence: 90,
      qualityScore: 85,
      marketStability: 'STRONG',
      modelDisagreement: 'LOW',
      calibrationLabel: 'KALIBRIERT',
      baseVerdict: 'FREIGABE',
      hasOfficialFixture: true,
      isTbdTeam: false,
      isPairingVerified: true,
      sourceCompleteness: 90,
      hasHardBlocker: false,
      riskMode: 'BALANCED'
    };
    const o = applyOddsRiskAdjustment(input);
    expect(o.impliedProbability).toBeNull();
    expect(o.valueEdge).toBeNull();
    expect(o.expectedValue).toBeNull();
    expect(o.valueLabel).toBe('NO_QUOTE');
  });
});

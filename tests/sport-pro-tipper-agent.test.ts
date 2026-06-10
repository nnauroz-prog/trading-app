import { describe, expect, it } from 'vitest';
import { evaluateProTipperAgent, type ProTipperInput } from '@/lib/sport/sport-pro-tipper-agent';

function input(over: Partial<ProTipperInput> = {}): ProTipperInput {
  return {
    eloDiff: 150,
    pickClarity: 'strong',
    confidencePct: 70,
    expectedGoalsHome: 2.0,
    expectedGoalsAway: 0.9,
    winnerSide: 'home',
    daysUntilMatch: 2,
    isNeutralVenue: true,
    dataConfidence: 92,
    lineupAvailable: false,
    phase: 'Gruppe',
    ...over
  };
}

describe('evaluateProTipperAgent', () => {
  it('Voller Stack → OK, hohe Conviction', () => {
    const r = evaluateProTipperAgent(input());
    expect(r.status).toBe('OK');
    expect(r.conviction).toBeGreaterThan(0.9);
  });

  it('pickClarity leaning → BLOCKIERT', () => {
    expect(evaluateProTipperAgent(input({ pickClarity: 'leaning' })).status).toBe('BLOCKIERT');
  });

  it('pickClarity open → BLOCKIERT', () => {
    expect(evaluateProTipperAgent(input({ pickClarity: 'open' })).status).toBe('BLOCKIERT');
  });

  it('ELO widerspricht Sieger-Side → BLOCKIERT', () => {
    expect(evaluateProTipperAgent(input({ winnerSide: 'home', eloDiff: -50 })).status).toBe('BLOCKIERT');
  });

  it('xG widerspricht Pick → BLOCKIERT', () => {
    const r = evaluateProTipperAgent(input({ winnerSide: 'home', expectedGoalsHome: 1.0, expectedGoalsAway: 1.5 }));
    expect(r.status).toBe('BLOCKIERT');
  });

  it('Spiel 14 Tage entfernt → BLOCKIERT', () => {
    expect(evaluateProTipperAgent(input({ daysUntilMatch: 14 })).status).toBe('BLOCKIERT');
  });

  it('Spiel 7 Tage entfernt → WARNUNG', () => {
    expect(evaluateProTipperAgent(input({ daysUntilMatch: 7 })).status).toBe('WARNUNG');
  });

  it('Confidence 55 % → BLOCKIERT', () => {
    expect(evaluateProTipperAgent(input({ confidencePct: 55 })).status).toBe('BLOCKIERT');
  });

  it('Data-Confidence 70 → BLOCKIERT', () => {
    expect(evaluateProTipperAgent(input({ dataConfidence: 70 })).status).toBe('BLOCKIERT');
  });

  it('Knappe Engine + Heim auf neutralem Boden → WARNUNG', () => {
    const r = evaluateProTipperAgent(input({ confidencePct: 62, winnerSide: 'home', isNeutralVenue: true }));
    expect(r.status).toBe('WARNUNG');
  });

  it('Lineup fehlt einen Tag vor Anstoss → WARNUNG', () => {
    expect(evaluateProTipperAgent(input({ daysUntilMatch: 1, lineupAvailable: false })).status).toBe('WARNUNG');
  });

  it('Lineup vorhanden einen Tag vor Anstoss → OK', () => {
    expect(evaluateProTipperAgent(input({ daysUntilMatch: 1, lineupAvailable: true })).status).toBe('OK');
  });
});

describe('Wording — keine verbotenen Begriffe', () => {
  const FORBIDDEN = ['sicher', 'bank', 'garantiert', 'todsicher', 'risikolos', 'muss kommen', 'free money'];
  it('Reason-Strings frei von verbotenen Begriffen', () => {
    const cases = [
      input(),
      input({ pickClarity: 'open' }),
      input({ confidencePct: 50 }),
      input({ daysUntilMatch: 14 }),
      input({ dataConfidence: 50 })
    ];
    for (const c of cases) {
      const r = evaluateProTipperAgent(c);
      const text = r.reason.toLowerCase();
      for (const f of FORBIDDEN) {
        expect(text.includes(f), `Verbotenes "${f}" in: ${r.reason}`).toBe(false);
      }
    }
  });
});

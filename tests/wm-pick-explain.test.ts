import { describe, expect, it } from 'vitest';
import { explainWmPick } from '@/lib/sport/wm-pick-explain';
import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';
import type { WmConditionFactor } from '@/lib/sport/wm-conditions';

function condFactor(over: Partial<WmConditionFactor> = {}): WmConditionFactor {
  return {
    id: 'akklim',
    label: 'Akklimatisierung',
    homeGoalMultiplier: 1.0,
    awayGoalMultiplier: 0.95,
    homeEloDelta: 10,
    awayEloDelta: -10,
    confidenceShift: 0.3,
    ...over
  };
}

function buildPick(over: Partial<WmWinnerPick> = {}): WmWinnerPick {
  const base: WmWinnerPick = {
    fixture: { id: 'wm-x', date: '2026-06-15', time: '19:00', homeTeam: 'Spanien', awayTeam: 'Kap Verde', venue: 'Atlanta', phase: 'Gruppe', group: 'H' },
    prediction: {} as never,
    winnerTeam: 'Spanien',
    winnerSide: 'home',
    modelProbabilityPct: 72,
    eloDiff: 220,
    daysUntilMatch: 1,
    proTipper: { status: 'OK', reason: '', conviction: 0.95 } as never,
    conditions: {
      factors: [condFactor()],
      homeGoalMultiplierTotal: 1.0,
      awayGoalMultiplierTotal: 0.95,
      homeEloDeltaTotal: 10,
      awayEloDeltaTotal: -10,
      confidenceShiftTotal: 0.3,
      dataCoverage: 1,
      resolved: { venue: null, homeOrigin: null, awayOrigin: null }
    },
    tier: 'modell-favorit',
    reasons: [],
    riskNotes: ['Restrisiko: Pflicht.']
  };
  return { ...base, ...over };
}

describe('explainWmPick', () => {
  it('Erzeugt Headline und Pick-Label', () => {
    const ex = explainWmPick(buildPick());
    expect(ex.headline).toBe('Spanien gegen Kap Verde');
    expect(ex.pickLabel).toBe('Wir tippen auf Spanien gegen Kap Verde');
  });

  it('Auswaerts-Pick dreht Gegner-Label', () => {
    const ex = explainWmPick(buildPick({ winnerSide: 'away', winnerTeam: 'Kap Verde' }));
    expect(ex.pickLabel).toBe('Wir tippen auf Kap Verde gegen Spanien');
  });

  it('Liefert mindestens ELO-, Modell-, Conditions- und Profi-Tipper-Zeile', () => {
    const ex = explainWmPick(buildPick());
    const ids = ex.rows.map((r) => r.id);
    expect(ids).toContain('elo-basis');
    expect(ids).toContain('modell');
    expect(ids).toContain('profi-tipper');
    expect(ids.some((id) => id.startsWith('cond-'))).toBe(true);
  });

  it('ELO-Vorsprung-Zeile zeigt Punktdifferenz', () => {
    const ex = explainWmPick(buildPick({ eloDiff: 220 }));
    const row = ex.rows.find((r) => r.id === 'elo-basis')!;
    expect(row.valueLabel).toContain('+220');
    expect(row.direction).toBe('fuer');
  });

  it('Conditions-Faktor pro-Heim wirkt "fuer" wenn winnerSide=home', () => {
    const ex = explainWmPick(buildPick({
      winnerSide: 'home',
      conditions: {
        factors: [condFactor({ id: 'heim', label: 'Heimvorteil', confidenceShift: 0.6, homeEloDelta: 30, awayEloDelta: 0 })],
        homeGoalMultiplierTotal: 1, awayGoalMultiplierTotal: 1,
        homeEloDeltaTotal: 30, awayEloDeltaTotal: 0,
        confidenceShiftTotal: 0.6, dataCoverage: 1,
        resolved: { venue: null, homeOrigin: null, awayOrigin: null }
      }
    }));
    const row = ex.rows.find((r) => r.id === 'cond-heim')!;
    expect(row.direction).toBe('fuer');
    expect(row.weight).toBeGreaterThanOrEqual(2);
  });

  it('Conditions-Faktor pro-Heim wirkt "gegen" wenn winnerSide=away', () => {
    const ex = explainWmPick(buildPick({
      winnerSide: 'away',
      winnerTeam: 'Kap Verde',
      conditions: {
        factors: [condFactor({ id: 'heim', label: 'Heimvorteil', confidenceShift: 0.6, homeEloDelta: 30, awayEloDelta: 0 })],
        homeGoalMultiplierTotal: 1, awayGoalMultiplierTotal: 1,
        homeEloDeltaTotal: 30, awayEloDeltaTotal: 0,
        confidenceShiftTotal: 0.6, dataCoverage: 1,
        resolved: { venue: null, homeOrigin: null, awayOrigin: null }
      }
    }));
    const row = ex.rows.find((r) => r.id === 'cond-heim')!;
    expect(row.direction).toBe('gegen');
  });

  it('Sehr kleiner confidenceShift wird als neutral klassifiziert', () => {
    const ex = explainWmPick(buildPick({
      conditions: {
        factors: [condFactor({ id: 'mini', confidenceShift: 0.01, homeEloDelta: 0.2, awayEloDelta: 0 })],
        homeGoalMultiplierTotal: 1, awayGoalMultiplierTotal: 1,
        homeEloDeltaTotal: 0, awayEloDeltaTotal: 0,
        confidenceShiftTotal: 0.01, dataCoverage: 1,
        resolved: { venue: null, homeOrigin: null, awayOrigin: null }
      }
    }));
    const row = ex.rows.find((r) => r.id === 'cond-mini')!;
    expect(row.direction).toBe('neutral');
    expect(row.weight).toBe(0);
  });

  it('Profi-Tipper Conviction = 95 % gibt weight 3', () => {
    const ex = explainWmPick(buildPick());
    const row = ex.rows.find((r) => r.id === 'profi-tipper')!;
    expect(row.weight).toBe(3);
    expect(row.direction).toBe('fuer');
  });

  it('riskNotes werden uebernommen', () => {
    const ex = explainWmPick(buildPick());
    expect(ex.riskNotes).toContain('Restrisiko: Pflicht.');
  });

  it('Tier wird durchgereicht', () => {
    const ex = explainWmPick(buildPick({ tier: 'hoechste-konfluenz' }));
    expect(ex.tier).toBe('hoechste-konfluenz');
  });
});

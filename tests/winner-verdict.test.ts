import { describe, expect, it } from 'vitest';
import { predictWinner } from '@/lib/sport/winner-verdict';
import type { MatchPrediction, TeamForm5 } from '@/lib/sport/predictor';
import type { HeadToHeadResult } from '@/lib/sport/h2h';
import type { Fixture } from '@/lib/sport/fetcher';

const form: TeamForm5 = { results: [], goalsFor: 0, goalsAgainst: 0 };

function pred(over: Partial<MatchPrediction> = {}): MatchPrediction {
  return {
    lambdaHome: 1.5, lambdaAway: 1, pHome: 0.5, pDraw: 0.25, pAway: 0.25,
    likelyScore: { home: 2, away: 1 }, homeGames: 10, awayGames: 10,
    pickSide: 'home', pickConfidence: 0.5, pickLabel: 'leicht', pickPlain: '',
    homeForm: form, awayForm: form, ...over
  };
}

function fixt(home: string, away: string, hs: number, as: number, date = '2026-05-01'): Fixture {
  return {
    id: `${home}-${away}-${date}`, homeTeam: home, awayTeam: away, league: 'L',
    date, time: null, venue: null, homeScore: hs, awayScore: as, status: 'finished'
  };
}

describe('predictWinner — Modell-Quelle', () => {
  it('Heimsieg bei klarer Heim-Wahrscheinlichkeit', () => {
    const v = predictWinner({
      homeTeam: 'Bayern', awayTeam: 'Hoffenheim',
      prediction: pred({ pHome: 0.65, pDraw: 0.2, pAway: 0.15 }),
      h2h: null, finishedPool: []
    });
    expect(v.winner).toBe('home');
    expect(v.winnerName).toBe('Bayern');
    expect(v.source).toBe('model');
  });

  it('source=model wenn Prediction vorhanden', () => {
    const v = predictWinner({
      homeTeam: 'A', awayTeam: 'B',
      prediction: pred(), h2h: null, finishedPool: []
    });
    expect(v.source).toBe('model');
  });

  it('Heim + Remis + Auswärts summieren zu 100', () => {
    const v = predictWinner({
      homeTeam: 'A', awayTeam: 'B',
      prediction: pred({ pHome: 0.4, pDraw: 0.3, pAway: 0.3 }),
      h2h: null, finishedPool: []
    });
    expect(v.regular.homePct + v.regular.drawPct + v.regular.awayPct).toBe(100);
  });

  it('withExtraTime summiert zu 100, Heim-Vorteil bleibt', () => {
    const v = predictWinner({
      homeTeam: 'A', awayTeam: 'B',
      prediction: pred({ pHome: 0.5, pDraw: 0.25, pAway: 0.25 }),
      h2h: null, finishedPool: []
    });
    expect(v.withExtraTime.homePct + v.withExtraTime.awayPct).toBe(100);
    expect(v.withExtraTime.homePct).toBeGreaterThan(v.withExtraTime.awayPct);
  });

  it('H2H-Bonus drückt klaren historischen Sieger nach oben', () => {
    const h2h: HeadToHeadResult = {
      meetings: 5, homeTeam: 'Bayern', awayTeam: 'Schalke',
      winsForHome: 4, draws: 1, winsForAway: 0,
      goalsForHome: 10, goalsForAway: 2, lastMeeting: null
    };
    const withoutH2h = predictWinner({
      homeTeam: 'Bayern', awayTeam: 'Schalke',
      prediction: pred({ pHome: 0.45, pDraw: 0.25, pAway: 0.3 }),
      h2h: null, finishedPool: []
    });
    const withH2h = predictWinner({
      homeTeam: 'Bayern', awayTeam: 'Schalke',
      prediction: pred({ pHome: 0.45, pDraw: 0.25, pAway: 0.3 }),
      h2h, finishedPool: []
    });
    expect(withH2h.regular.homePct).toBeGreaterThan(withoutH2h.regular.homePct);
  });
});

describe('predictWinner — Heuristik ohne Pool', () => {
  it('liefert Heim-Default bei Fußball ohne Daten (~46 % statt 33 %)', () => {
    const v = predictWinner({
      homeTeam: 'A', awayTeam: 'B',
      prediction: null, h2h: null, finishedPool: [],
      sport: 'football'
    });
    expect(v.source).toBe('heuristic');
    expect(v.regular.homePct).toBeGreaterThanOrEqual(44);
    expect(v.regular.homePct).toBeLessThan(55);
    expect(v.regular.homePct).toBeGreaterThan(v.regular.awayPct);
  });

  it('Basketball-Default hat winzige Remis-Pct (≤ 5 %)', () => {
    const v = predictWinner({
      homeTeam: 'Bilbao Basket', awayTeam: 'Valencia Basket',
      prediction: null, h2h: null, finishedPool: [],
      sport: 'basketball'
    });
    expect(v.regular.drawPct).toBeLessThanOrEqual(5);
    expect(v.regular.homePct).toBeGreaterThan(55);
    expect(v.winner).toBe('home');
    expect(v.winnerName).toBe('Bilbao Basket');
  });

  it('Hockey-Default ähnlich Basketball', () => {
    const v = predictWinner({
      homeTeam: 'A', awayTeam: 'B',
      prediction: null, h2h: null, finishedPool: [],
      sport: 'hockey'
    });
    expect(v.regular.drawPct).toBeLessThanOrEqual(5);
    expect(v.regular.homePct).toBeGreaterThan(v.regular.awayPct);
  });

  it('Reasoning erwähnt Heimvorteil-Schätzung', () => {
    const v = predictWinner({
      homeTeam: 'A', awayTeam: 'B',
      prediction: null, h2h: null, finishedPool: [],
      sport: 'football'
    });
    expect(v.reasoning.some((r) => r.toLowerCase().includes('heimvorteil'))).toBe(true);
  });
});

describe('predictWinner — Form aus Pool', () => {
  it('starkes Heim-Team aus Pool führt zu Heim-Vorteil', () => {
    const pool: Fixture[] = [
      fixt('Bayern', 'Hertha', 4, 0),
      fixt('Bayern', 'Köln', 3, 1),
      fixt('Augsburg', 'Schalke', 1, 0),
      fixt('Schalke', 'Hoffenheim', 0, 2)
    ];
    const v = predictWinner({
      homeTeam: 'Bayern', awayTeam: 'Schalke',
      prediction: null, h2h: null, finishedPool: pool,
      sport: 'football'
    });
    expect(v.source).toBe('form');
    expect(v.winner).toBe('home');
    expect(v.regular.homePct).toBeGreaterThan(50);
  });

  it('Team-Name-Fuzzy: „Bayern" matched „FC Bayern München" nicht ohne Spiele', () => {
    // Eher: prüfen ob Pool mit Variante leer ist → Heimvorteil-Heuristik greift.
    const v = predictWinner({
      homeTeam: 'FC Bayern München', awayTeam: 'Borussia Dortmund',
      prediction: null, h2h: null, finishedPool: [],
      sport: 'football'
    });
    expect(v.source).toBe('heuristic');
  });

  it('1 Pool-Spiel zählt schon', () => {
    const pool: Fixture[] = [fixt('A', 'X', 3, 0)];
    const v = predictWinner({
      homeTeam: 'A', awayTeam: 'B',
      prediction: null, h2h: null, finishedPool: pool,
      sport: 'football'
    });
    expect(v.source).toBe('form');
  });
});

describe('predictWinner — Sport-spezifische Form-Beschriftung', () => {
  it('Basketball-Reasoning sagt „Punktediff" statt „Tordiff"', () => {
    const pool: Fixture[] = [
      fixt('Bilbao', 'Madrid', 85, 75),
      fixt('Bilbao', 'Barcelona', 92, 80),
      fixt('Valencia', 'Sevilla', 70, 90)
    ];
    const v = predictWinner({
      homeTeam: 'Bilbao', awayTeam: 'Valencia',
      prediction: null, h2h: null, finishedPool: pool,
      sport: 'basketball'
    });
    expect(v.source).toBe('form');
    const formLines = v.reasoning.filter((r) => r.includes('PPG'));
    expect(formLines.length).toBeGreaterThan(0);
    for (const line of formLines) {
      expect(line).toContain('Punktediff');
      expect(line).not.toContain('Tordiff');
    }
  });

  it('Fußball-Reasoning behält „Tordiff"', () => {
    const pool: Fixture[] = [
      fixt('Bayern', 'Hertha', 4, 0),
      fixt('Hertha', 'Schalke', 0, 2)
    ];
    const v = predictWinner({
      homeTeam: 'Bayern', awayTeam: 'Schalke',
      prediction: null, h2h: null, finishedPool: pool,
      sport: 'football'
    });
    const formLines = v.reasoning.filter((r) => r.includes('PPG'));
    for (const line of formLines) {
      expect(line).toContain('Tordiff');
    }
  });

  it('Basketball gdBoost-Skalierung verhindert Dauerclipping bei großen Punkte-Differenzen', () => {
    // Hohes Heim-PPG (alle Siege) aber wenig Punkt-Spread → Heim sollte
    // bevorzugt sein, aber nicht durch Punktediff alleine an die Decke
    // gezogen werden.
    const lowSpread: Fixture[] = [
      fixt('A', 'X1', 80, 78),
      fixt('A', 'X2', 82, 80),
      fixt('A', 'X3', 85, 83),
      fixt('B', 'Y1', 78, 80),
      fixt('B', 'Y2', 80, 82)
    ];
    const highSpread: Fixture[] = [
      fixt('A', 'X1', 100, 60),
      fixt('A', 'X2', 105, 65),
      fixt('A', 'X3', 110, 70),
      fixt('B', 'Y1', 60, 100),
      fixt('B', 'Y2', 65, 105)
    ];
    const vLow = predictWinner({ homeTeam: 'A', awayTeam: 'B', prediction: null, h2h: null, finishedPool: lowSpread, sport: 'basketball' });
    const vHigh = predictWinner({ homeTeam: 'A', awayTeam: 'B', prediction: null, h2h: null, finishedPool: highSpread, sport: 'basketball' });
    // Bei richtig skaliertem gdBoost: Hoher Spread zieht stärker, niedriger Spread weniger stark.
    expect(vHigh.regular.homePct).toBeGreaterThan(vLow.regular.homePct);
  });
});

describe('predictWinner — Sample-Confidence-Daempfung', () => {
  it('Einzelnes Pool-Spiel kippt die Prognose nicht über 70 %', () => {
    // Ein einzelnes 4:0-Heimspiel ist nicht genug, um die Heim-Wahrscheinlichkeit
    // an die Decke (>= 70 %) zu drücken.
    const pool: Fixture[] = [fixt('Bayern', 'Hertha', 4, 0)];
    const v = predictWinner({
      homeTeam: 'Bayern', awayTeam: 'Schalke',
      prediction: null, h2h: null, finishedPool: pool,
      sport: 'football'
    });
    expect(v.regular.homePct).toBeLessThan(70);
  });

  it('Mehr Pool-Spiele → stärkerer Effekt der gleichen PPG-Differenz', () => {
    const onePool: Fixture[] = [fixt('A', 'X', 3, 0)];
    const fivePool: Fixture[] = [
      fixt('A', 'X1', 3, 0), fixt('A', 'X2', 2, 0), fixt('A', 'X3', 4, 1),
      fixt('A', 'X4', 2, 1), fixt('A', 'X5', 3, 0),
      fixt('B', 'Y1', 0, 2), fixt('B', 'Y2', 1, 3), fixt('B', 'Y3', 0, 1),
      fixt('B', 'Y4', 1, 2), fixt('B', 'Y5', 0, 3)
    ];
    const vOne = predictWinner({ homeTeam: 'A', awayTeam: 'B', prediction: null, h2h: null, finishedPool: onePool, sport: 'football' });
    const vFive = predictWinner({ homeTeam: 'A', awayTeam: 'B', prediction: null, h2h: null, finishedPool: fivePool, sport: 'football' });
    // Mehr Spiele → höhere Konfidenz → stärkerer Heim-Anteil bei gleicher Tendenz.
    expect(vFive.regular.homePct).toBeGreaterThan(vOne.regular.homePct);
  });
});

describe('predictWinner — Klarheit + Kein-Favorit', () => {
  it('strong bei ≥ 58 %', () => {
    const v = predictWinner({
      homeTeam: 'A', awayTeam: 'B',
      prediction: pred({ pHome: 0.62, pDraw: 0.2, pAway: 0.18 }),
      h2h: null, finishedPool: []
    });
    expect(v.clarity).toBe('strong');
  });

  it('open bei breiter Verteilung', () => {
    const v = predictWinner({
      homeTeam: 'A', awayTeam: 'B',
      prediction: pred({ pHome: 0.33, pDraw: 0.34, pAway: 0.33 }),
      h2h: null, finishedPool: []
    });
    expect(v.clarity).toBe('open');
  });
});

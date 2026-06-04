import { describe, expect, it } from 'vitest';
import { predictWinner } from '@/lib/sport/winner-verdict';
import type { MatchPrediction, TeamForm5 } from '@/lib/sport/predictor';
import type { HeadToHeadResult } from '@/lib/sport/h2h';

const form: TeamForm5 = { results: [], goalsFor: 0, goalsAgainst: 0 };

function pred(over: Partial<MatchPrediction> = {}): MatchPrediction {
  return {
    lambdaHome: 1.5, lambdaAway: 1, pHome: 0.5, pDraw: 0.25, pAway: 0.25,
    likelyScore: { home: 2, away: 1 }, homeGames: 10, awayGames: 10,
    pickSide: 'home', pickConfidence: 0.5, pickLabel: 'leicht', pickPlain: '',
    homeForm: form, awayForm: form, ...over
  };
}

describe('predictWinner', () => {
  it('Heimsieg bei klarer Heim-Wahrscheinlichkeit', () => {
    const v = predictWinner({
      homeTeam: 'Bayern', awayTeam: 'Hoffenheim',
      prediction: pred({ pHome: 0.65, pDraw: 0.2, pAway: 0.15 }),
      h2h: null, finishedPool: []
    });
    expect(v.winner).toBe('home');
    expect(v.winnerName).toBe('Bayern');
    expect(v.confidencePct).toBeGreaterThanOrEqual(60);
    expect(v.clarity).toBe('strong');
  });

  it('Auswärtssieg', () => {
    const v = predictWinner({
      homeTeam: 'Mainz', awayTeam: 'Bayern',
      prediction: pred({ pHome: 0.15, pDraw: 0.2, pAway: 0.65 }),
      h2h: null, finishedPool: []
    });
    expect(v.winner).toBe('away');
    expect(v.winnerName).toBe('Bayern');
  });

  it('„kein Favorit" bei offener Lage', () => {
    const v = predictWinner({
      homeTeam: 'A', awayTeam: 'B',
      prediction: pred({ pHome: 0.32, pDraw: 0.36, pAway: 0.32 }),
      h2h: null, finishedPool: []
    });
    expect(v.clarity).toBe('open');
  });

  it('Heim-Pct + Remis-Pct + Auswärts-Pct = 100', () => {
    const v = predictWinner({
      homeTeam: 'A', awayTeam: 'B',
      prediction: pred({ pHome: 0.5, pDraw: 0.25, pAway: 0.25 }),
      h2h: null, finishedPool: []
    });
    expect(v.regular.homePct + v.regular.drawPct + v.regular.awayPct).toBe(100);
  });

  it('withExtraTime: Remis hälftig aufgeteilt, summiert zu 100', () => {
    const v = predictWinner({
      homeTeam: 'A', awayTeam: 'B',
      prediction: pred({ pHome: 0.4, pDraw: 0.3, pAway: 0.3 }),
      h2h: null, finishedPool: []
    });
    expect(v.withExtraTime.homePct + v.withExtraTime.awayPct).toBe(100);
    // Heim hat Vorteil (höhere reguläre Pct), also auch Vorteil in Verlängerung
    expect(v.withExtraTime.homePct).toBeGreaterThan(v.withExtraTime.awayPct);
  });

  it('H2H-Bonus drückt Heim-Wahrscheinlichkeit nach oben', () => {
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

  it('liefert auch ohne Prediction eine Antwort (Form-Heuristik)', () => {
    const v = predictWinner({
      homeTeam: 'A', awayTeam: 'B',
      prediction: null, h2h: null, finishedPool: []
    });
    expect(v.winner).toBeDefined();
    expect(v.reasoning.length).toBeGreaterThan(0);
  });

  it('reasoning enthält Modell-Prozente bei vorhandener Prediction', () => {
    const v = predictWinner({
      homeTeam: 'A', awayTeam: 'B',
      prediction: pred({ pHome: 0.6, pDraw: 0.2, pAway: 0.2 }),
      h2h: null, finishedPool: []
    });
    expect(v.reasoning.some((r) => r.includes('60'))).toBe(true);
  });
});

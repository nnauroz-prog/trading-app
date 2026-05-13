import { RecommendationAction } from '@/lib/types/domain';

export type ReviewVerdict = 'good' | 'bad' | 'neutral';

export function evaluateDirection(action: RecommendationAction, movePct: number): { correct: boolean; verdict: ReviewVerdict; learning: string } {
  if (action === 'WATCH' || action === 'HOLD') {
    return {
      correct: Math.abs(movePct) <= 2.5,
      verdict: Math.abs(movePct) <= 2.5 ? 'good' : 'neutral',
      learning: Math.abs(movePct) <= 2.5 ? 'Seitwärtsphase korrekt antizipiert.' : 'Bei höherem Impuls engeres Trigger-Setup definieren.'
    };
  }

  const expectedUp = action === 'BUY';
  const expectedDown = action === 'SELL' || action === 'AVOID';
  const correct = (expectedUp && movePct > 0) || (expectedDown && movePct < 0);

  return {
    correct,
    verdict: correct ? 'good' : Math.abs(movePct) < 1 ? 'neutral' : 'bad',
    learning: correct
      ? 'Signalrichtung war stimmig; Risikoregeln beibehalten.'
      : 'Signalrichtung verfehlt; Gewichtung von Trend/Momentum und Stop-Logik nachschärfen.'
  };
}

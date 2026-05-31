import { FirmaStats } from '@/lib/firma-memory';
import { PersonaId } from '@/lib/agents/personas';

export interface FirmaRanking {
  rank: number;
  firma: PersonaId;
  firmaName: string;
  score: number; // 0–100 composite
  activityScore: number; // share of days with BUY
  consensusScore: number; // agreement with other firmas
  disciplineScore: number; // share of WAIT days, capped (too few buys also drops)
  coinDiversity: number; // unique coins recommended (raw, for display)
  note: string;
}

// Composite firma score:
//   activity: how often the firma actually pulls the trigger (0..100)
//   consensus: how often it agrees with the other two firmas (0..100)
//   discipline: rewards being selective but not paralyzed.
//     ideal buy share is around 20–40 % of days. 0 buys → low; 100 % buys → low.
// Total = 0.40 * activity-fit + 0.35 * consensus + 0.25 * discipline-bonus.
export function rankFirmas(stats: FirmaStats[]): FirmaRanking[] {
  const rankings: FirmaRanking[] = stats.map((s) => {
    const buyShare = s.totalDays > 0 ? (s.buyDays / s.totalDays) * 100 : 0;
    const activityScore = Math.round(buyShare);

    // Discipline curve: peak at 30 % buy share, drops sharply at the edges.
    // Using a simple triangle: dist = abs(buyShare - 30), score = max(0, 100 - dist * 2.5).
    const dist = Math.abs(buyShare - 30);
    const disciplineScore = Math.max(0, Math.round(100 - dist * 2.5));

    const consensusScore = s.agreementWithOthers;

    const score = Math.round(0.40 * disciplineScore + 0.35 * consensusScore + 0.25 * activityScore);

    let note: string;
    if (s.totalDays < 3) {
      note = 'Zu wenige Tage für ein faires Ranking.';
    } else if (buyShare === 0) {
      note = 'Hat noch nie gekauft — zu vorsichtig.';
    } else if (buyShare > 70) {
      note = 'Kauft zu oft — wenig diszipliniert.';
    } else if (consensusScore >= 70) {
      note = 'Stark im Konsens — bestätigt die anderen Firmen.';
    } else if (disciplineScore >= 80) {
      note = 'Gute Trefferfrequenz, wirkt diszipliniert.';
    } else {
      note = 'Mittelfeld — solide, aber unauffällig.';
    }

    return {
      rank: 0, // filled after sort
      firma: s.firma,
      firmaName: s.firmaName,
      score,
      activityScore,
      consensusScore,
      disciplineScore,
      coinDiversity: s.uniqueCoins,
      note
    };
  });

  rankings.sort((a, b) => b.score - a.score);
  rankings.forEach((r, i) => { r.rank = i + 1; });
  return rankings;
}

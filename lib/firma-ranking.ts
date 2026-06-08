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
  // Track-record-Pillar: tatsächliche Treffer-Quote (BUY/WAIT vs. Markt).
  // null wenn noch zu wenig bewertete Entscheidungen vorliegen.
  accuracyScore: number | null;
  coinDiversity: number; // unique coins recommended (raw, for display)
  note: string;
}

// Composite firma score:
//   activity: how often the firma actually pulls the trigger (0..100)
//   consensus: how often it agrees with the other two firmas (0..100)
//   discipline: rewards being selective but not paralyzed.
//     ideal buy share is around 20–40 % of days. 0 buys → low; 100 % buys → low.
//   accuracy: tatsächliche Hit-Rate (BUY richtig wenn Markt stieg etc.). Wenn
//     verfügbar (≥ MIN_EVAL Bewertungen), zählt sie 50 % im Gesamt-Score —
//     die wichtigste Säule, weil sie misst, was die anderen drei nur
//     schätzen: war die Firma wirklich richtig?
//
// Ohne Accuracy-Daten: Total = 0.40 * discipline + 0.35 * consensus + 0.25 * activity.
// Mit Accuracy-Daten:  Total = 0.50 * accuracy + 0.20 * discipline + 0.18 * consensus + 0.12 * activity.
export function rankFirmas(stats: FirmaStats[], accuracyByFirma?: Map<PersonaId, number>): FirmaRanking[] {
  const rankings: FirmaRanking[] = stats.map((s) => {
    const buyShare = s.totalDays > 0 ? (s.buyDays / s.totalDays) * 100 : 0;
    const activityScore = Math.round(buyShare);

    // Discipline curve: peak at 30 % buy share, drops sharply at the edges.
    // Using a simple triangle: dist = abs(buyShare - 30), score = max(0, 100 - dist * 2.5).
    const dist = Math.abs(buyShare - 30);
    const disciplineScore = Math.max(0, Math.round(100 - dist * 2.5));

    const consensusScore = s.agreementWithOthers;
    const accuracyScore = accuracyByFirma?.get(s.firma) ?? null;

    const score = accuracyScore !== null
      ? Math.round(0.50 * accuracyScore + 0.20 * disciplineScore + 0.18 * consensusScore + 0.12 * activityScore)
      : Math.round(0.40 * disciplineScore + 0.35 * consensusScore + 0.25 * activityScore);

    let note: string;
    if (s.totalDays < 3) {
      note = 'Zu wenige Tage für ein faires Ranking.';
    } else if (buyShare === 0) {
      note = 'Hat noch nie gekauft — zu vorsichtig.';
    } else if (buyShare > 70) {
      note = 'Kauft zu oft — wenig diszipliniert.';
    } else if (accuracyScore !== null && accuracyScore >= 60) {
      note = `Trifft historisch ${accuracyScore} % — stärkste Säule im Ranking.`;
    } else if (accuracyScore !== null && accuracyScore < 40) {
      note = `Trifft historisch nur ${accuracyScore} % — Track-Record drückt das Ranking.`;
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
      accuracyScore,
      coinDiversity: s.uniqueCoins,
      note
    };
  });

  rankings.sort((a, b) => b.score - a.score);
  rankings.forEach((r, i) => { r.rank = i + 1; });
  return rankings;
}

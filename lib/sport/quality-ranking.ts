// Rangliste der heute/morgen anstehenden Spiele nach Quality-Score.
// Ranking nicht nach Roh-Wahrscheinlichkeit, sondern nach computePredictionQualityScore.

import type { LeagueFixtures, UpcomingFixture } from '@/lib/sport/fetcher';
import {
  computePredictionQualityScore,
  pickStablePrediction,
  type QualityScoreResult
} from '@/lib/sport/prediction-quality-score';

export interface RankedPrediction {
  fixture: UpcomingFixture;
  leagueName: string;
  leagueCountry: string;
  quality: QualityScoreResult;
}

interface RankInput {
  leagues: LeagueFixtures[];
  // Optional: nur Fixtures, die zu diesen Daten passen (z. B. heute + morgen).
  isoDateAllowList?: Set<string>;
}

export function rankPredictionsByQuality({ leagues, isoDateAllowList }: RankInput): RankedPrediction[] {
  const out: RankedPrediction[] = [];
  for (const lf of leagues) {
    for (const f of lf.next) {
      if (!f.prediction) continue;
      if (isoDateAllowList && !isoDateAllowList.has(f.date)) continue;
      const recommendation = pickStablePrediction(f.prediction, f.probabilities);
      const sampleSize =
        (f.probabilities?.homeGamesUsed ?? f.prediction.homeGames ?? 0) +
        (f.probabilities?.awayGamesUsed ?? f.prediction.awayGames ?? 0);
      const quality = computePredictionQualityScore({ fixture: f, recommendation, sampleSize });
      out.push({
        fixture: f,
        leagueName: lf.league.name,
        leagueCountry: lf.league.country,
        quality
      });
    }
  }
  out.sort((a, b) => b.quality.score - a.quality.score);
  return out;
}

// Hilfs-Map: pro Liga das beste Spiel + dessen Score (für Liga-Header).
export interface LeagueQualitySummary {
  leagueId: string;
  count: number;
  bestScore: number | null;
  bestLabel: string | null;
  bestMarketLabel: string | null;
}

export function summarizeLeagueQuality(leagues: LeagueFixtures[]): Map<string, LeagueQualitySummary> {
  const map = new Map<string, LeagueQualitySummary>();
  for (const lf of leagues) {
    let bestScore: number | null = null;
    let bestLabel: string | null = null;
    let bestMarketLabel: string | null = null;
    for (const f of lf.next) {
      if (!f.prediction) continue;
      const recommendation = pickStablePrediction(f.prediction, f.probabilities);
      const sampleSize =
        (f.probabilities?.homeGamesUsed ?? f.prediction.homeGames ?? 0) +
        (f.probabilities?.awayGamesUsed ?? f.prediction.awayGames ?? 0);
      const quality = computePredictionQualityScore({ fixture: f, recommendation, sampleSize });
      if (bestScore === null || quality.score > bestScore) {
        bestScore = quality.score;
        bestLabel = `${f.homeTeam} – ${f.awayTeam}`;
        bestMarketLabel = recommendation.label;
      }
    }
    map.set(lf.league.id, {
      leagueId: lf.league.id,
      count: lf.next.length,
      bestScore,
      bestLabel,
      bestMarketLabel
    });
  }
  return map;
}

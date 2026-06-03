// Pro Liga: wie verlässlich sind unsere Prognosen?
// Aggregiert Datenqualität und Confidence aller anstehenden Fixtures zu
// einer Liga-Note, die im Liga-Accordion oben angezeigt wird.

import type { LeagueFixtures } from '@/lib/sport/fetcher';

export interface LeagueDataQualityNote {
  leagueId: string;
  fixtures: number;
  goodDataPct: number;        // 0..100, Anteil Fixtures mit dataQuality='good'
  weakDataPct: number;        // 0..100
  clearPicksPct: number;      // 0..100, Anteil pickLabel='klar'
  averageSampleSize: number;  // Ø homeGamesUsed + awayGamesUsed
  grade: 'A' | 'B' | 'C' | 'D';
  gradeLabel: string;
}

function gradeFromShares(good: number, clear: number): { grade: LeagueDataQualityNote['grade']; gradeLabel: string } {
  // Note: 0-1-Skala; berücksichtigt Datenqualität und Klar-Picks.
  const score = good * 0.65 + clear * 0.35;
  if (score >= 0.75) return { grade: 'A', gradeLabel: 'Daten sehr verlässlich' };
  if (score >= 0.55) return { grade: 'B', gradeLabel: 'Daten brauchbar' };
  if (score >= 0.30) return { grade: 'C', gradeLabel: 'Datenlage dünn' };
  return { grade: 'D', gradeLabel: 'kaum Daten — nur Orientierung' };
}

export function leagueDataQuality(lf: LeagueFixtures): LeagueDataQualityNote {
  const next = lf.next;
  const fixtures = next.length;
  if (fixtures === 0) {
    return {
      leagueId: lf.league.id,
      fixtures: 0,
      goodDataPct: 0,
      weakDataPct: 0,
      clearPicksPct: 0,
      averageSampleSize: 0,
      grade: 'D',
      gradeLabel: 'keine anstehenden Spiele'
    };
  }
  let good = 0;
  let weak = 0;
  let clear = 0;
  let sampleSum = 0;
  for (const f of next) {
    const dq = f.probabilities?.dataQuality;
    if (dq === 'good') good += 1;
    else if (dq === 'weak') weak += 1;
    if (f.prediction?.pickLabel === 'klar') clear += 1;
    sampleSum += (f.probabilities?.homeGamesUsed ?? f.prediction?.homeGames ?? 0)
      + (f.probabilities?.awayGamesUsed ?? f.prediction?.awayGames ?? 0);
  }
  const goodShare = good / fixtures;
  const weakShare = weak / fixtures;
  const clearShare = clear / fixtures;
  const { grade, gradeLabel } = gradeFromShares(goodShare, clearShare);
  return {
    leagueId: lf.league.id,
    fixtures,
    goodDataPct: Math.round(goodShare * 100),
    weakDataPct: Math.round(weakShare * 100),
    clearPicksPct: Math.round(clearShare * 100),
    averageSampleSize: Math.round(sampleSum / fixtures),
    grade,
    gradeLabel
  };
}

export function summarizeAllLeagueDataQuality(leagues: LeagueFixtures[]): Map<string, LeagueDataQualityNote> {
  const map = new Map<string, LeagueDataQualityNote>();
  for (const lf of leagues) map.set(lf.league.id, leagueDataQuality(lf));
  return map;
}

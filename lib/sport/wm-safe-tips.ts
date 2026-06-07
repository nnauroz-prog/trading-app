// Sichere WM-Tipps quer durch alle Märkte (1X2, Doppelchance, Über/Unter,
// BTTS, Clean Sheet). Enumeriert jeden Markt jedes anstehenden Spiels,
// filtert auf Mindest-Wahrscheinlichkeit + Datenbasis-Sicherheit und
// liefert die Top-N — sortiert nach Profi-Score.

import { WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';
import { predictWmMatch, type WmMatchPrediction } from '@/lib/sport/wm-match-engine';
import { listWmMarkets, type WmMarketRecommendation } from '@/lib/sport/wm-best-market';

export interface SafeWmTip {
  fixture: WmFixture;
  prediction: WmMatchPrediction;
  market: WmMarketRecommendation;
  tier: 'maximal' | 'sehr-sicher' | 'sicher';
}

export interface RankSafeWmTipsOptions {
  todayIso: string;
  maxDays?: number;       // Horizont in Tagen (Default 14)
  minProbability?: number; // Mindest-Wahrscheinlichkeit 0..1 (Default 0.70)
  minDataConfidence?: number; // Mindest-Datenbasis 0..100 (Default 70)
  limit?: number;         // Maximale Anzahl Tipps (Default 15)
}

function tierFor(probability: number, dataConfidence: number): SafeWmTip['tier'] {
  if (probability >= 0.85 && dataConfidence >= 80) return 'maximal';
  if (probability >= 0.78) return 'sehr-sicher';
  return 'sicher';
}

// Filter: ein Tipp pro Spiel pro Markt-Kategorie. Verhindert, dass das gleiche
// Spiel die Liste flutet (Über 1,5 + Über 2,5 + BTTS wären sonst alle drin).
function marketCategory(label: string): string {
  if (label.includes('Über')) return 'over';
  if (label.includes('Unter')) return 'under';
  if (label.includes('BTTS') || label.includes('Beide Teams treffen')) return 'btts';
  if (label.includes('trifft nicht')) return 'no-btts';
  if (label.includes('Doppelchance')) return 'dc';
  if (label.includes('Kein Remis')) return 'no-draw';
  return '1x2';
}

export function rankSafeWmTips(opts: RankSafeWmTipsOptions): SafeWmTip[] {
  const {
    todayIso,
    maxDays = 14,
    minProbability = 0.70,
    minDataConfidence = 70,
    limit = 15
  } = opts;

  const today = new Date(`${todayIso}T00:00:00`).getTime();
  const horizon = today + maxDays * 24 * 60 * 60 * 1000;

  const out: SafeWmTip[] = [];
  for (const f of WM_2026_FIXTURES) {
    if (f.homeTeam.includes('TBD') || f.awayTeam.includes('TBD')) continue;
    if (f.homeTeam.startsWith('Sieger') || f.awayTeam.startsWith('Sieger')
      || f.homeTeam.startsWith('Verlierer') || f.awayTeam.startsWith('Verlierer')
      || f.homeTeam.startsWith('Zweiter') || f.awayTeam.startsWith('Zweiter')) continue;
    const fDate = new Date(`${f.date}T00:00:00`).getTime();
    if (fDate < today || fDate > horizon) continue;

    const prediction = predictWmMatch({
      homeTeam: f.homeTeam,
      awayTeam: f.awayTeam,
      venue: f.venue,
      phase: f.phase
    });
    if (prediction.dataConfidence < minDataConfidence) continue;

    const seenCategories = new Set<string>();
    for (const m of listWmMarkets(prediction)) {
      if (m.probability < minProbability) continue;
      const cat = marketCategory(m.market);
      if (seenCategories.has(cat)) continue;
      seenCategories.add(cat);
      out.push({ fixture: f, prediction, market: m, tier: tierFor(m.probability, prediction.dataConfidence) });
    }
  }

  // Sortiere nach Profi-Score: Wahrscheinlichkeit × 100 + Datenbasis-Bonus.
  out.sort((a, b) => {
    const aScore = a.market.probability * 100 + a.prediction.dataConfidence * 0.1;
    const bScore = b.market.probability * 100 + b.prediction.dataConfidence * 0.1;
    if (bScore !== aScore) return bScore - aScore;
    return a.fixture.date.localeCompare(b.fixture.date);
  });

  return out.slice(0, limit);
}

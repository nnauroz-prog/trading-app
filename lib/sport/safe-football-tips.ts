// Sichere Fußball-Tipps quer durch alle gefüllten Ligen. Identisches Muster wie
// für die WM, aber auf dem allgemeinen FootballProbabilityModel — d. h. Bundesliga,
// Premier League, La Liga, Serie A usw. Enumeriert pro Spiel alle Märkte (1X2,
// Doppelchance, Über/Unter, BTTS), filtert auf Mindest-Wahrscheinlichkeit und
// Datenqualität, sortiert nach Wahrscheinlichkeit.

import type { LeagueFixtures, UpcomingFixture } from '@/lib/sport/fetcher';
import type { FootballProbabilityModel, DataQuality } from '@/lib/sport/probabilities';

export interface SafeFootballMarket {
  market: string;
  probability: number;     // 0..1
  rationale: string;
}

export interface SafeFootballTip {
  fixture: UpcomingFixture;
  leagueName: string;
  market: SafeFootballMarket;
  tier: 'maximal' | 'sehr-sicher' | 'sicher';
}

export interface RankSafeFootballOptions {
  todayIso: string;
  horizonDays?: number;     // Default 14
  minProbability?: number;  // Default 0.70
  minQuality?: DataQuality; // Default 'medium'
  limit?: number;           // Default 20
}

function qualityRank(q: DataQuality): number {
  return q === 'good' ? 2 : q === 'medium' ? 1 : 0;
}

function tierFor(probability: number, quality: DataQuality): SafeFootballTip['tier'] {
  if (probability >= 0.85 && quality === 'good') return 'maximal';
  if (probability >= 0.78) return 'sehr-sicher';
  return 'sicher';
}

function listMarkets(p: FootballProbabilityModel, fixture: UpcomingFixture): SafeFootballMarket[] {
  const out: SafeFootballMarket[] = [];
  const ph = p.homeWin;
  const pd = p.draw;
  const pa = p.awayWin;

  // 1X2
  if (ph >= 0.55) out.push({
    market: `${fixture.homeTeam} gewinnt`,
    probability: ph,
    rationale: `Modell-Schätzung aus Form + xG (xG Heim ${p.expectedHomeGoals.toFixed(2)}).`
  });
  if (pa >= 0.55) out.push({
    market: `${fixture.awayTeam} gewinnt`,
    probability: pa,
    rationale: `Modell-Schätzung aus Form + xG (xG Auswärts ${p.expectedAwayGoals.toFixed(2)}).`
  });

  // Doppelchance
  const p1x = ph + pd;
  const px2 = pd + pa;
  const p12 = ph + pa;
  if (p1x >= 0.72) out.push({
    market: `Doppelchance ${fixture.homeTeam} oder Remis (1X)`,
    probability: p1x,
    rationale: 'Auswärts-Risiko entschärft.'
  });
  if (px2 >= 0.72) out.push({
    market: `Doppelchance ${fixture.awayTeam} oder Remis (X2)`,
    probability: px2,
    rationale: 'Heim-Risiko entschärft.'
  });
  if (p12 >= 0.82) out.push({
    market: 'Kein Remis (12)',
    probability: p12,
    rationale: 'Beide Offensiven gefährlich — Remis sehr unwahrscheinlich.'
  });

  // Tor-Märkte
  if (p.over15 >= 0.75) out.push({
    market: 'Über 1,5 Tore',
    probability: p.over15,
    rationale: `xG-Summe ${(p.expectedHomeGoals + p.expectedAwayGoals).toFixed(2)} — mindestens 2 sehr wahrscheinlich.`
  });
  if (p.over25 >= 0.65) out.push({
    market: 'Über 2,5 Tore',
    probability: p.over25,
    rationale: 'Hohe xG-Summe, offene Begegnung erwartet.'
  });
  if (p.under25 >= 0.65) out.push({
    market: 'Unter 2,5 Tore',
    probability: p.under25,
    rationale: 'Defensiv geprägte Begegnung, niedrige xG-Summe.'
  });
  if (p.bothTeamsToScore >= 0.60) out.push({
    market: 'Beide Teams treffen (BTTS)',
    probability: p.bothTeamsToScore,
    rationale: 'Beide Offensiven gefährlich genug für mindestens ein Tor.'
  });
  if (p.bothTeamsNotToScore >= 0.60) out.push({
    market: 'Mindestens ein Team trifft nicht',
    probability: p.bothTeamsNotToScore,
    rationale: 'Mindestens eine Mannschaft bleibt voraussichtlich ohne Tor.'
  });

  out.sort((a, b) => b.probability - a.probability);
  return out;
}

function marketCategory(label: string): string {
  if (label.includes('Über')) return 'over';
  if (label.includes('Unter')) return 'under';
  if (label.includes('BTTS') || label.includes('Beide Teams treffen')) return 'btts';
  if (label.includes('trifft nicht')) return 'no-btts';
  if (label.includes('Doppelchance')) return 'dc';
  if (label.includes('Kein Remis')) return 'no-draw';
  return '1x2';
}

export function rankSafeFootballTips(
  leagues: LeagueFixtures[],
  opts: RankSafeFootballOptions
): SafeFootballTip[] {
  const {
    todayIso,
    horizonDays = 14,
    minProbability = 0.70,
    minQuality = 'medium',
    limit = 20
  } = opts;

  const todayMs = new Date(`${todayIso}T00:00:00`).getTime();
  const horizonMs = todayMs + horizonDays * 24 * 60 * 60 * 1000;
  const minQualityRank = qualityRank(minQuality);

  const out: SafeFootballTip[] = [];

  for (const lf of leagues) {
    for (const fixture of lf.next) {
      if (!fixture.probabilities) continue;
      const prob = fixture.probabilities;
      if (qualityRank(prob.dataQuality) < minQualityRank) continue;

      const fixtureMs = new Date(`${fixture.date}T00:00:00`).getTime();
      if (fixtureMs < todayMs || fixtureMs > horizonMs) continue;

      const seenCategories = new Set<string>();
      for (const m of listMarkets(prob, fixture)) {
        if (m.probability < minProbability) continue;
        const cat = marketCategory(m.market);
        if (seenCategories.has(cat)) continue;
        seenCategories.add(cat);
        out.push({
          fixture,
          leagueName: lf.league.name,
          market: m,
          tier: tierFor(m.probability, prob.dataQuality)
        });
      }
    }
  }

  // Sortiere nach Wahrscheinlichkeit (primär) + Datenqualität (sekundär).
  out.sort((a, b) => {
    const aScore = a.market.probability + qualityRank(a.fixture.probabilities!.dataQuality) * 0.01;
    const bScore = b.market.probability + qualityRank(b.fixture.probabilities!.dataQuality) * 0.01;
    if (bScore !== aScore) return bScore - aScore;
    return a.fixture.date.localeCompare(b.fixture.date);
  });

  return out.slice(0, limit);
}

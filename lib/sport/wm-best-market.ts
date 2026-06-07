// Wählt für ein WM-Spiel den profitabelsten Tipp-Markt aus der Profi-
// Prognose. Schaut auf 1X2, Doppelchance, Tor-Märkte und BTTS und
// rangiert nach Wahrscheinlichkeit, abzüglich Markt-spezifischem Risiko.

import type { WmMatchPrediction } from '@/lib/sport/wm-match-engine';

export interface WmMarketRecommendation {
  market: string;             // „Über 1,5 Tore" / „Doppelchance 1X" / „Heimsieg"
  probability: number;        // 0..1
  rationale: string;
  isStableMarket: boolean;
  // Profi-Score 0–100 für interne Sortierung:
  //   probability × 100 − Risiko-Abschlag
  internalScore: number;
}

// Listet ALLE Markt-Kandidaten, die ihre jeweilige Mindestschwelle erfüllen,
// sortiert nach internalScore. bestWmMarket() ist nur ein Schmal-Wrapper.
export function listWmMarkets(p: WmMatchPrediction): WmMarketRecommendation[] {
  const candidates: WmMarketRecommendation[] = [];

  // 1X2 — nur wenn klar.
  const ph = p.regular.homePct / 100;
  const pd = p.regular.drawPct / 100;
  const pa = p.regular.awayPct / 100;
  if (ph >= 0.55) {
    candidates.push({
      market: `${p.homeTeam} gewinnt`,
      probability: ph,
      rationale: 'Klare Heim-Wahrscheinlichkeit aus ELO + xG.',
      isStableMarket: ph >= 0.65,
      internalScore: ph * 100 - 6
    });
  }
  if (pa >= 0.55) {
    candidates.push({
      market: `${p.awayTeam} gewinnt`,
      probability: pa,
      rationale: 'Klare Auswärts-Wahrscheinlichkeit aus ELO + xG.',
      isStableMarket: pa >= 0.65,
      internalScore: pa * 100 - 6
    });
  }

  // Doppelchance
  const p1x = ph + pd;
  const px2 = pd + pa;
  const p12 = ph + pa;
  if (p1x >= 0.72) {
    candidates.push({
      market: `Doppelchance ${p.homeTeam} oder Remis (1X)`,
      probability: p1x,
      rationale: 'Auswärts-Risiko entschärft, hohe Absicherung.',
      isStableMarket: true,
      internalScore: p1x * 100 - 1
    });
  }
  if (px2 >= 0.72) {
    candidates.push({
      market: `Doppelchance ${p.awayTeam} oder Remis (X2)`,
      probability: px2,
      rationale: 'Heim-Risiko entschärft, hohe Absicherung.',
      isStableMarket: true,
      internalScore: px2 * 100 - 1
    });
  }
  if (p12 >= 0.82) {
    candidates.push({
      market: 'Kein Remis (12)',
      probability: p12,
      rationale: 'Beide Teams offensiv, Remis-Anteil sehr klein.',
      isStableMarket: true,
      internalScore: p12 * 100 - 2
    });
  }

  // Tor-Märkte direkt aus Poisson.
  if (p.goalMarkets.over15 >= 75) {
    candidates.push({
      market: 'Über 1,5 Tore',
      probability: p.goalMarkets.over15 / 100,
      rationale: `xG-Modell ${p.expectedGoals.total.toFixed(2)} Tore erwartet — mindestens 2 ist sehr wahrscheinlich.`,
      isStableMarket: true,
      internalScore: p.goalMarkets.over15
    });
  }
  if (p.goalMarkets.over25 >= 65) {
    candidates.push({
      market: 'Über 2,5 Tore',
      probability: p.goalMarkets.over25 / 100,
      rationale: 'Hohe xG-Summe, beide Teams treffen voraussichtlich.',
      isStableMarket: true,
      internalScore: p.goalMarkets.over25 - 2
    });
  }
  const under25 = 100 - p.goalMarkets.over25;
  if (under25 >= 65) {
    candidates.push({
      market: 'Unter 2,5 Tore',
      probability: under25 / 100,
      rationale: 'Defensiv geprägte Begegnung — xG-Summe niedrig.',
      isStableMarket: true,
      internalScore: under25 - 2
    });
  }
  if (p.goalMarkets.btts >= 60) {
    candidates.push({
      market: 'Beide Teams treffen (BTTS)',
      probability: p.goalMarkets.btts / 100,
      rationale: 'Beide Offensiven gefährlich genug für mindestens ein Tor.',
      isStableMarket: true,
      internalScore: p.goalMarkets.btts - 3
    });
  }
  const noBtts = 100 - p.goalMarkets.btts;
  if (noBtts >= 60) {
    candidates.push({
      market: 'Mindestens ein Team trifft nicht',
      probability: noBtts / 100,
      rationale: 'Mindestens eine Mannschaft bleibt voraussichtlich ohne Tor.',
      isStableMarket: true,
      internalScore: noBtts - 3
    });
  }

  candidates.sort((a, b) => b.internalScore - a.internalScore);
  return candidates;
}

export function bestWmMarket(p: WmMatchPrediction): WmMarketRecommendation {
  const candidates = listWmMarkets(p);
  if (candidates.length > 0) return candidates[0];

  // Fallback: höchste 1X2-Wahrscheinlichkeit als Aussage, auch wenn unter 55 %.
  const ph = p.regular.homePct / 100;
  const pd = p.regular.drawPct / 100;
  const pa = p.regular.awayPct / 100;
  const max = Math.max(ph, pd, pa);
  const market = max === ph ? `${p.homeTeam} gewinnt`
    : max === pa ? `${p.awayTeam} gewinnt`
    : 'Remis';
  return {
    market,
    probability: max,
    rationale: 'Kein stabiler Markt schafft die Schwelle — beste 1X2-Aussage als Orientierung.',
    isStableMarket: false,
    internalScore: max * 100 - 18
  };
}

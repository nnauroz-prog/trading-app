// Fußball-Liga-Vorstand: drei Persönlichkeiten geben aus dem allgemeinen
// Liga-Multi-Markt-Scan ihren bevorzugten Tipp ab. Analog WM-Vorstand,
// aber auf den Bundesliga / Premier League / La Liga / Serie A-Daten.

import { rankSafeFootballTips, type SafeFootballTip } from '@/lib/sport/safe-football-tips';
import type { LeagueFixtures } from '@/lib/sport/fetcher';

export type FootballPersonaId = 'conservative' | 'balanced' | 'aggressive';

export interface FootballAgentVerdict {
  persona: FootballPersonaId;
  name: string;
  motto: string;
  manifest: string;
  verdict: 'TIPPEN' | 'BEOBACHTEN' | 'WARTEN';
  target: SafeFootballTip | null;
  rationale: string;
}

const PERSONAS: { id: FootballPersonaId; name: string; motto: string; manifest: string }[] = [
  {
    id: 'conservative', name: 'Konservativ',
    motto: 'Nur klare 1X2 in Top-Ligen',
    manifest: 'Liga-Daten sind oft dünner als bei der WM. Ich nehme nur Heim-/Auswärtssieg mit ≥78 % Modellwahrscheinlichkeit und nur in der guten Daten-Qualitätsklasse.'
  },
  {
    id: 'balanced', name: 'Balanciert',
    motto: 'Doppelchance und Über 1,5 ab 72 %',
    manifest: 'Klare Sieger, Doppelchance, Über 1,5 — alles ab 72 %. Datenqualität mindestens „medium". BTTS kann auch dazukommen.'
  },
  {
    id: 'aggressive', name: 'Aggressiv',
    motto: 'Jeder Markt ist erlaubt',
    manifest: 'Was das Modell ≥65 % vergibt, nehme ich. Auch schwache Datenqualität.'
  }
];

function isOneXTwo(market: string): boolean {
  return market.includes('gewinnt') || market === 'Remis';
}

function pickFor(leagues: LeagueFixtures[], persona: FootballPersonaId, todayIso: string): SafeFootballTip | null {
  if (persona === 'conservative') {
    const tips = rankSafeFootballTips(leagues, { todayIso, horizonDays: 14, minProbability: 0.78, minQuality: 'good', limit: 30 });
    return tips.find((t) => isOneXTwo(t.market.market)) ?? null;
  }
  if (persona === 'balanced') {
    const tips = rankSafeFootballTips(leagues, { todayIso, horizonDays: 14, minProbability: 0.72, minQuality: 'medium', limit: 30 });
    return tips[0] ?? null;
  }
  const tips = rankSafeFootballTips(leagues, { todayIso, horizonDays: 14, minProbability: 0.65, minQuality: 'weak', limit: 30 });
  return tips[0] ?? null;
}

export function evaluateFootballPersonas(leagues: LeagueFixtures[], todayIso: string): FootballAgentVerdict[] {
  return PERSONAS.map((p) => {
    const target = pickFor(leagues, p.id, todayIso);
    if (!target) {
      return {
        persona: p.id,
        name: p.name,
        motto: p.motto,
        manifest: p.manifest,
        verdict: 'WARTEN',
        target: null,
        rationale: p.id === 'conservative'
          ? 'Kein 1X2 erreicht 78 % bei guter Datenqualität.'
          : p.id === 'balanced'
            ? 'Kein Multi-Markt-Tipp erreicht 72 %.'
            : 'Sogar mein lockerer 65 %-Filter findet nichts.'
      };
    }
    const pct = Math.round(target.market.probability * 100);
    return {
      persona: p.id,
      name: p.name,
      motto: p.motto,
      manifest: p.manifest,
      verdict: pct >= 80 ? 'TIPPEN' : 'BEOBACHTEN',
      target,
      rationale: `${target.fixture.homeTeam} – ${target.fixture.awayTeam} · ${target.market.market} (${pct} %). ${target.leagueName}.`
    };
  });
}

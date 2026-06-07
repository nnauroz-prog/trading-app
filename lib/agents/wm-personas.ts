// WM-Vorstand: drei Persönlichkeiten geben aus dem 14-Tage-Multi-Markt-Scan
// ihren bevorzugten WM-Tipp ab. Analog Aktien-/Rohstoff-Vorstand, aber auf
// Tipp-Märkten statt Asset-Grades.

import { rankSafeWmTips, type SafeWmTip } from '@/lib/sport/wm-safe-tips';

export type WmPersonaId = 'conservative' | 'balanced' | 'aggressive';

export interface WmAgentVerdict {
  persona: WmPersonaId;
  name: string;
  motto: string;
  manifest: string;
  verdict: 'TIPPEN' | 'BEOBACHTEN' | 'WARTEN';
  target: SafeWmTip | null;
  rationale: string;
}

const PERSONAS: { id: WmPersonaId; name: string; motto: string; manifest: string }[] = [
  {
    id: 'conservative', name: 'Konservativ',
    motto: 'Nur klare 1X2 mit voller Datenbasis',
    manifest: 'Ich nehme nur den klaren Sieger-Tipp, wenn die Mannschaften beide in der ELO-Datenbasis stehen und die Modellwahrscheinlichkeit ≥78 % ist. Doppelchance und Tor-Märkte sind mir zu spekulativ.'
  },
  {
    id: 'balanced', name: 'Balanciert',
    motto: 'Doppelchance und Über 1,5 sind meine Freunde',
    manifest: 'Klare Sieger, Doppelchance, Über 1,5 — alles ab 72 %. Ich brauche Datenbasis ≥75. BTTS und Tor-Märkte mit hoher Wahrscheinlichkeit kommen auch in Frage.'
  },
  {
    id: 'aggressive', name: 'Aggressiv',
    motto: 'Jeder Markt ist erlaubt',
    manifest: 'Was die Modell-Engine vorne hinpackt, nehme ich. Ab 65 % Wahrscheinlichkeit bin ich dabei — alle Markt-Typen. Streuung gleicht aus.'
  }
];

function isOneXTwo(market: string): boolean {
  if (market.includes('gewinnt') || market === 'Remis') return true;
  return false;
}

function pickFor(persona: WmPersonaId, todayIso: string): SafeWmTip | null {
  // Erstmal alle vom WM-Multi-Markt-Scan ziehen — der filtert schon auf ≥70 %.
  if (persona === 'conservative') {
    const tips = rankSafeWmTips({ todayIso, maxDays: 14, minProbability: 0.78, minDataConfidence: 90, limit: 30 });
    return tips.find((t) => isOneXTwo(t.market.market)) ?? null;
  }
  if (persona === 'balanced') {
    const tips = rankSafeWmTips({ todayIso, maxDays: 14, minProbability: 0.72, minDataConfidence: 75, limit: 30 });
    return tips[0] ?? null;
  }
  // aggressive
  const tips = rankSafeWmTips({ todayIso, maxDays: 14, minProbability: 0.65, minDataConfidence: 60, limit: 30 });
  return tips[0] ?? null;
}

export function evaluateWmPersonas(todayIso: string): WmAgentVerdict[] {
  return PERSONAS.map((p) => {
    const target = pickFor(p.id, todayIso);
    if (!target) {
      return {
        persona: p.id,
        name: p.name,
        motto: p.motto,
        manifest: p.manifest,
        verdict: 'WARTEN',
        target: null,
        rationale: p.id === 'conservative'
          ? 'Kein 1X2 erreicht meine 78 %-Schwelle bei voller Datenbasis.'
          : p.id === 'balanced'
            ? 'Kein Multi-Markt-Tipp erreicht meine 72 %-Schwelle.'
            : 'Sogar mein lockerer 65 %-Filter findet nichts in den nächsten 14 Tagen.'
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
      rationale: `${target.fixture.homeTeam} – ${target.fixture.awayTeam} · ${target.market.market} (${pct} %). ${target.market.rationale}`
    };
  });
}

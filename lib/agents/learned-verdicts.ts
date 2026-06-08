// Wendet den Learned-Override auf alle drei Persona-Verdicts an und liefert
// die „gelernte" Version: ein angepasster AgentVerdict-Array, bei dem BUYs
// mit schlechtem Track-Record auf WAIT downgegraded sind. Damit kann
// vorstandMediation einmal mit den ROH-Verdicts und einmal mit den
// gelernten Verdicts gerechnet werden — und der User sieht, ob die
// Geschichte heute den Vorstand kippt.

import type { AgentVerdict, PersonaId } from '@/lib/agents/personas';
import type { FirmaAccuracy } from '@/lib/firma-accuracy';
import { applyLearnedOverride, type LearnedOverride } from '@/lib/agents/learned-override';

export interface LearnedVerdict extends AgentVerdict {
  // Original-Verdict vor Override (kann gleich oder verschieden sein).
  rawVerdict: 'BUY' | 'WAIT';
  override: LearnedOverride;
}

export function applyLearnedOverridesToVerdicts(
  verdicts: AgentVerdict[],
  accuracyMap: Map<PersonaId, FirmaAccuracy>
): LearnedVerdict[] {
  return verdicts.map((v) => {
    const acc = accuracyMap.get(v.persona) ?? null;
    const override = applyLearnedOverride(v.verdict, acc);
    return {
      ...v,
      rawVerdict: v.verdict,
      // Bei Downgrade: target raus, weil der „gelernte" Verdict WAIT ist und
      // dann gibt es kein Ziel mehr. Bei reinforce/flag bleibt das Target.
      target: override.kind === 'downgrade-buy' ? null : v.target,
      verdict: override.effectiveVerdict,
      override
    };
  });
}

// Wie viele Personas wurden tatsaechlich gefliptt? Nutzbar, um eine
// Lern-Hinweis-Zeile nur dann zu zeigen, wenn der Override etwas verschoben
// hat.
export function countFlips(learned: LearnedVerdict[]): number {
  return learned.filter((v) => v.rawVerdict !== v.verdict).length;
}

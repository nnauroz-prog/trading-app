import type { AgentVerdict } from '@/lib/agents/personas';

export interface TradeTier90Result {
  // True wenn alle Bedingungen für höchstes Vertrauen erfüllt sind
  qualified: boolean;
  // Aus wievielen der 5 Säulen kommt grünes Licht
  pillarsHit: number;
  pillarsTotal: number;
  // Detail-Begründung pro Säule
  pillars: TradeTier90Pillar[];
}

export interface TradeTier90Pillar {
  id: 'safety_grade' | 'conservative_buy' | 'balanced_buy' | 'aggressive_buy' | 'firma_consensus';
  label: string;
  passed: boolean;
  detail: string;
}

// Tier-90 für Crypto-Trades: gibt grünes Licht nur wenn ALLE fünf Säulen
// einig sind. Analog zum Sport-Tier-90, übertragen auf den Trading-Stack.
//
// Ehrlich: 90 % Treffer auf einen Einzel-Trade gibt es seriös nicht.
// Die Schwelle ist so eng, dass selten was durchkommt — exakt das ist
// gewollt. Lieber zwei Wochen warten als ein Fehlkauf.
export function evaluateTradeTier90(verdicts: AgentVerdict[]): TradeTier90Result {
  const pillars: TradeTier90Pillar[] = [];

  // Säule 1: Sicherheits-Grade A (vom konservativen Firma-Pick)
  const cons = verdicts.find((v) => v.persona === 'conservative');
  const consSafety = cons?.safety?.grade ?? null;
  pillars.push({
    id: 'safety_grade',
    label: 'Sicherheits-Grade A',
    passed: consSafety === 'A',
    detail: consSafety ? `Konservativ-Pick hat Grade ${consSafety}` : 'Kein Sicherheits-Grade verfügbar'
  });

  // Säule 2/3/4: Jede Firma muss KAUFEN sagen
  pillars.push({
    id: 'conservative_buy',
    label: 'Konservativ kauft',
    passed: cons?.verdict === 'BUY',
    detail: cons ? `Konservativ: ${cons.verdict}` : 'kein Konservativ-Verdikt'
  });

  const bal = verdicts.find((v) => v.persona === 'balanced');
  pillars.push({
    id: 'balanced_buy',
    label: 'Balanciert kauft',
    passed: bal?.verdict === 'BUY',
    detail: bal ? `Balanciert: ${bal.verdict}` : 'kein Balanciert-Verdikt'
  });

  const agg = verdicts.find((v) => v.persona === 'aggressive');
  pillars.push({
    id: 'aggressive_buy',
    label: 'Aggressiv kauft',
    passed: agg?.verdict === 'BUY',
    detail: agg ? `Aggressiv: ${agg.verdict}` : 'kein Aggressiv-Verdikt'
  });

  // Säule 5: Jede Firma muss intern einen klaren Konsens (kaufen) haben
  const allInternalConsensus = verdicts.length > 0 && verdicts.every(
    (v) => v.voteSummary.direction === 'kaufen' && v.voteSummary.confidence >= 0.65
  );
  const internalDetail = verdicts.length === 0
    ? 'keine Firmen-Verdikte'
    : `Konsens-Richtungen: ${verdicts.map((v) => `${v.name}:${v.voteSummary.direction}@${Math.round(v.voteSummary.confidence * 100)}%`).join(', ')}`;
  pillars.push({
    id: 'firma_consensus',
    label: 'Alle internen Konsens > 65 %',
    passed: allInternalConsensus,
    detail: internalDetail
  });

  const pillarsHit = pillars.filter((p) => p.passed).length;
  return {
    qualified: pillarsHit === pillars.length,
    pillarsHit,
    pillarsTotal: pillars.length,
    pillars
  };
}

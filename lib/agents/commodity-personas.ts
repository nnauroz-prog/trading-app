// Rohstoff-Vorstand analog Aktien-Vorstand. Drei Personas mit eigenen
// Risiko-Regeln, fünf Sub-Agenten pro Persona, kein I/O.

import type { CommoditySafetyEntry } from '@/lib/market/commodity-safety-scan';

export type CommodityPersonaId = 'conservative' | 'balanced' | 'aggressive';

export interface CommoditySubAgentReport {
  name: string;
  vote: 'POSITIV' | 'NEUTRAL' | 'NEGATIV';
  detail: string;
}

export interface CommodityAgentVerdict {
  persona: CommodityPersonaId;
  name: string;
  motto: string;
  manifest: string;
  verdict: 'KAUFEN' | 'BEOBACHTEN' | 'WARTEN';
  target: CommoditySafetyEntry | null;
  rationale: string;
  team: CommoditySubAgentReport[];
}

const PERSONAS: { id: CommodityPersonaId; name: string; motto: string; manifest: string }[] = [
  {
    id: 'conservative', name: 'Konservativ',
    motto: 'Lieber gar nichts handeln als zu früh',
    manifest: 'Rohstoffe sind Roll-Effekten und Gap-Risiken ausgesetzt. Ich kaufe nur, wenn alle acht Sicherheits-Kriterien stehen und der Trend mehrmonatig sauber ist.'
  },
  {
    id: 'balanced', name: 'Balanciert',
    motto: 'Trend plus Volumen reicht',
    manifest: 'Mindestens Grade B mit MA-Stack und ehrlichem Volumen — dann nehme ich den Trade. Ich brauche kein perfektes Setup, aber kein fallendes Messer.'
  },
  {
    id: 'aggressive', name: 'Aggressiv',
    motto: 'Volatilität ist Freund, kein Feind',
    manifest: 'Rohstoffe bewegen sich — ich nehme auch Grade C, wenn der Markt offen ist und das Volumen lebt. Stop eng, Position klein.'
  }
];

function trendAnalyst(entry: CommoditySafetyEntry): CommoditySubAgentReport {
  const aboveMa200 = entry.assessment.criteria.find((c) => c.id === 'above-ma200')?.passed ?? false;
  const aboveMa50 = entry.assessment.criteria.find((c) => c.id === 'above-ma50')?.passed ?? false;
  const maStack = entry.assessment.criteria.find((c) => c.id === 'ma-stack')?.passed ?? false;
  const hits = [aboveMa50, aboveMa200, maStack].filter(Boolean).length;
  if (hits === 3) return { name: 'Trend-Analyst', vote: 'POSITIV', detail: 'Sauberer MA-Stack: Preis > MA50 > MA200.' };
  if (hits >= 1) return { name: 'Trend-Analyst', vote: 'NEUTRAL', detail: `${hits} von 3 Trend-Kriterien.` };
  return { name: 'Trend-Analyst', vote: 'NEGATIV', detail: 'Rohstoff unter MA50 und MA200 — kein Aufwärtstrend.' };
}

function volatilityGuard(entry: CommoditySafetyEntry): CommoditySubAgentReport {
  const rsiOk = entry.assessment.criteria.find((c) => c.id === 'rsi-not-overbought')?.passed
    && entry.assessment.criteria.find((c) => c.id === 'rsi-not-falling-knife')?.passed;
  if (rsiOk) return { name: 'Volatilitäts-Wächter', vote: 'POSITIV', detail: 'RSI in gesunder Range.' };
  return { name: 'Volatilitäts-Wächter', vote: 'NEUTRAL', detail: 'RSI außerhalb der idealen Range.' };
}

function liquidityCheck(entry: CommoditySafetyEntry): CommoditySubAgentReport {
  const volPassed = entry.assessment.criteria.find((c) => c.id === 'volume-alive')?.passed ?? false;
  if (volPassed) return { name: 'Liquiditäts-Wächter', vote: 'POSITIV', detail: 'Volumen lebt — Future wird gehandelt.' };
  return { name: 'Liquiditäts-Wächter', vote: 'NEGATIV', detail: 'Volumen unter 50 % des 20-Tage-Schnitts — Spread-Risiko.' };
}

function rangeWatcher(entry: CommoditySafetyEntry): CommoditySubAgentReport {
  const posPassed = entry.assessment.criteria.find((c) => c.id === '52w-position')?.passed ?? false;
  if (posPassed) return { name: '52W-Range-Wächter', vote: 'POSITIV', detail: 'Rohstoff weder am Jahres-Tief noch -Hoch.' };
  return { name: '52W-Range-Wächter', vote: 'NEUTRAL', detail: 'Rohstoff nahe einem der 52W-Extreme.' };
}

function momentumCheck(entry: CommoditySafetyEntry): CommoditySubAgentReport {
  const momentumOk = entry.assessment.criteria.find((c) => c.id === 'momentum-1m')?.passed ?? false;
  if (momentumOk) return { name: 'Momentum-Watcher', vote: 'POSITIV', detail: '1-Monats-Performance besser als −5 %.' };
  return { name: 'Momentum-Watcher', vote: 'NEGATIV', detail: 'Scharfer Abverkauf im letzten Monat.' };
}

function pickTarget(entries: CommoditySafetyEntry[], persona: CommodityPersonaId): CommoditySafetyEntry | null {
  if (entries.length === 0) return null;
  if (persona === 'conservative') {
    const a = entries.filter((e) => e.assessment.grade === 'A').sort((x, y) => y.assessment.score - x.assessment.score);
    return a[0] ?? null;
  }
  if (persona === 'balanced') {
    const ab = entries.filter((e) => e.assessment.grade === 'A' || e.assessment.grade === 'B').sort((x, y) => y.assessment.score - x.assessment.score);
    return ab[0] ?? null;
  }
  const abc = entries.filter((e) => e.assessment.grade !== 'D').sort((x, y) => y.assessment.score - x.assessment.score);
  return abc[0] ?? null;
}

export function evaluateCommodityPersonas(entries: CommoditySafetyEntry[]): CommodityAgentVerdict[] {
  return PERSONAS.map((p) => {
    const target = pickTarget(entries, p.id);
    if (!target) {
      return {
        persona: p.id,
        name: p.name,
        motto: p.motto,
        manifest: p.manifest,
        verdict: 'WARTEN',
        target: null,
        rationale: p.id === 'conservative'
          ? 'Kein Rohstoff schafft heute Grade A.'
          : p.id === 'balanced'
            ? 'Kein Grade A oder B — abwarten.'
            : 'Sogar mein lockerer Filter findet kein Setup.',
        team: []
      };
    }
    const team: CommoditySubAgentReport[] = [
      trendAnalyst(target),
      volatilityGuard(target),
      liquidityCheck(target),
      rangeWatcher(target),
      momentumCheck(target)
    ];
    const negativeVotes = team.filter((t) => t.vote === 'NEGATIV').length;
    const positiveVotes = team.filter((t) => t.vote === 'POSITIV').length;

    let verdict: CommodityAgentVerdict['verdict'] = 'WARTEN';
    let rationale = '';

    if (p.id === 'conservative') {
      if (target.assessment.grade === 'A' && negativeVotes === 0) {
        verdict = 'KAUFEN';
        rationale = `Grade A, ${positiveVotes}/${team.length} Sub-Agenten positiv.`;
      } else {
        verdict = 'BEOBACHTEN';
        rationale = `Grade ${target.assessment.grade}, ${negativeVotes} negative Stimme${negativeVotes === 1 ? '' : 'n'} — warten.`;
      }
    } else if (p.id === 'balanced') {
      if ((target.assessment.grade === 'A' || target.assessment.grade === 'B') && negativeVotes <= 1) {
        verdict = 'KAUFEN';
        rationale = `Grade ${target.assessment.grade}, ${positiveVotes} positiv, ${negativeVotes} negativ — passt.`;
      } else {
        verdict = 'BEOBACHTEN';
        rationale = `Grade ${target.assessment.grade}, ${negativeVotes} negative Stimmen.`;
      }
    } else {
      const liquidityNeg = team.find((t) => t.name === 'Liquiditäts-Wächter')?.vote === 'NEGATIV';
      if (!liquidityNeg && target.assessment.grade !== 'D') {
        verdict = 'KAUFEN';
        rationale = `Grade ${target.assessment.grade}, Volumen lebt — nehme den Trade mit. Stop eng.`;
      } else {
        verdict = 'WARTEN';
        rationale = liquidityNeg ? 'Volumen tot — kein Tape, kein Trade.' : 'Sogar mir zu kaputt.';
      }
    }
    return { persona: p.id, name: p.name, motto: p.motto, manifest: p.manifest, verdict, target, rationale, team };
  });
}

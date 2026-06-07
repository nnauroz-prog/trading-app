// Aktien-Vorstand: drei Persönlichkeiten geben aus dem Stock-Safety-Scan
// ihr Verdict für die jeweils beste Aktie ab. Analog zur Krypto-Persona-
// Logik in lib/agents/personas.ts, aber auf den 8-Punkt-Sicherheits-Gates.

import type { StockSafetyEntry } from '@/lib/market/stock-safety-scan';

export type StockPersonaId = 'conservative' | 'balanced' | 'aggressive';

export interface StockSubAgentReport {
  name: string;
  vote: 'POSITIV' | 'NEUTRAL' | 'NEGATIV';
  detail: string;
}

export interface StockAgentVerdict {
  persona: StockPersonaId;
  name: string;
  motto: string;
  manifest: string;
  verdict: 'KAUFEN' | 'BEOBACHTEN' | 'WARTEN';
  target: StockSafetyEntry | null;
  rationale: string;
  team: StockSubAgentReport[];
}

const PERSONAS: { id: StockPersonaId; name: string; motto: string; manifest: string }[] = [
  {
    id: 'conservative', name: 'Konservativ',
    motto: 'Grade A oder gar nichts',
    manifest: 'Ich kaufe nur, wenn alle acht Sicherheits-Kriterien erfüllt sind. Lieber wochenlang Cash halten als eine zweifelhafte Aktie nehmen. Mein bester Trade ist der, den ich NICHT gemacht habe.'
  },
  {
    id: 'balanced', name: 'Balanciert',
    motto: 'Solide reicht — Perfektion ist Verzögerung',
    manifest: 'Mindestens Grade B mit klarem Trend und vernünftiger Liquidität reicht mir. Ich verlange keine perfekten Setups, aber das MA-Stack muss stimmen und der Sektor sollte nicht im freien Fall sein.'
  },
  {
    id: 'aggressive', name: 'Aggressiv',
    motto: 'Lieber dabei sein als nicht dabei',
    manifest: 'Wer auf Grade A wartet, verpasst die Bewegung. Ich nehme schon Grade C an, wenn der Kurs eindeutig nach oben steigt. Stop ist eng — wenn es nicht läuft, raus.'
  }
];

// Sub-Agenten bewerten die Eigenschaften des Targets.
function trendAnalyst(entry: StockSafetyEntry): StockSubAgentReport {
  const aboveMa200 = entry.assessment.criteria.find((c) => c.id === 'above-ma200')?.passed ?? false;
  const aboveMa50 = entry.assessment.criteria.find((c) => c.id === 'above-ma50')?.passed ?? false;
  const maStack = entry.assessment.criteria.find((c) => c.id === 'ma-stack')?.passed ?? false;
  const hits = [aboveMa50, aboveMa200, maStack].filter(Boolean).length;
  if (hits === 3) return { name: 'Trend-Analyst', vote: 'POSITIV', detail: 'Sauberer MA-Stack: Preis > MA50 > MA200.' };
  if (hits >= 1) return { name: 'Trend-Analyst', vote: 'NEUTRAL', detail: `${hits} von 3 Trend-Kriterien.` };
  return { name: 'Trend-Analyst', vote: 'NEGATIV', detail: 'Aktie unter MA50 und MA200 — kein Aufwärtstrend.' };
}

function volatilityGuard(entry: StockSafetyEntry): StockSubAgentReport {
  const rsiOk = entry.assessment.criteria.find((c) => c.id === 'rsi-not-overbought')?.passed
    && entry.assessment.criteria.find((c) => c.id === 'rsi-not-falling-knife')?.passed;
  if (rsiOk) return { name: 'Volatilitäts-Wächter', vote: 'POSITIV', detail: 'RSI in gesunder Range — weder überkauft noch ausverkauft.' };
  return { name: 'Volatilitäts-Wächter', vote: 'NEUTRAL', detail: 'RSI außerhalb der idealen Range.' };
}

function liquidityCheck(entry: StockSafetyEntry): StockSubAgentReport {
  const volPassed = entry.assessment.criteria.find((c) => c.id === 'volume-alive')?.passed ?? false;
  if (volPassed) return { name: 'Liquiditäts-Wächter', vote: 'POSITIV', detail: 'Volumen ist lebendig — Marktinteresse vorhanden.' };
  return { name: 'Liquiditäts-Wächter', vote: 'NEGATIV', detail: 'Volumen unter 50 % des 20-Tage-Schnitts.' };
}

function rangeWatcher(entry: StockSafetyEntry): StockSubAgentReport {
  const posPassed = entry.assessment.criteria.find((c) => c.id === '52w-position')?.passed ?? false;
  if (posPassed) return { name: '52W-Range-Wächter', vote: 'POSITIV', detail: 'Aktie weder am Jahres-Tief noch -Hoch — gesunder Spielraum.' };
  return { name: '52W-Range-Wächter', vote: 'NEUTRAL', detail: 'Aktie nahe einem der 52W-Extreme.' };
}

function momentumCheck(entry: StockSafetyEntry): StockSubAgentReport {
  const momentumOk = entry.assessment.criteria.find((c) => c.id === 'momentum-1m')?.passed ?? false;
  if (momentumOk) return { name: 'Momentum-Watcher', vote: 'POSITIV', detail: '1-Monats-Performance besser als −5 %.' };
  return { name: 'Momentum-Watcher', vote: 'NEGATIV', detail: 'Scharfer Abverkauf im letzten Monat.' };
}

function pickTarget(entries: StockSafetyEntry[], persona: StockPersonaId): StockSafetyEntry | null {
  if (entries.length === 0) return null;
  if (persona === 'conservative') {
    const a = entries.filter((e) => e.assessment.grade === 'A').sort((x, y) => y.assessment.score - x.assessment.score);
    return a[0] ?? null;
  }
  if (persona === 'balanced') {
    const ab = entries.filter((e) => e.assessment.grade === 'A' || e.assessment.grade === 'B').sort((x, y) => y.assessment.score - x.assessment.score);
    return ab[0] ?? null;
  }
  // aggressive: nimm das beste Setup, das mindestens Grade C ist
  const abc = entries.filter((e) => e.assessment.grade !== 'D').sort((x, y) => y.assessment.score - x.assessment.score);
  return abc[0] ?? null;
}

export function evaluateStockPersonas(entries: StockSafetyEntry[]): StockAgentVerdict[] {
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
          ? 'Keine Aktie schafft heute Grade A. Cash ist Position.'
          : p.id === 'balanced'
            ? 'Keine Aktie schafft Grade A oder B. Lieber abwarten.'
            : 'Sogar mein lockerer Filter findet kein Setup. Markt ist tot oder rot.',
        team: []
      };
    }

    const team: StockSubAgentReport[] = [
      trendAnalyst(target),
      volatilityGuard(target),
      liquidityCheck(target),
      rangeWatcher(target),
      momentumCheck(target)
    ];
    const negativeVotes = team.filter((t) => t.vote === 'NEGATIV').length;
    const positiveVotes = team.filter((t) => t.vote === 'POSITIV').length;

    let verdict: StockAgentVerdict['verdict'] = 'WARTEN';
    let rationale = '';

    if (p.id === 'conservative') {
      // Nur Kaufen, wenn Grade A UND keine negative Sub-Agent-Stimme.
      if (target.assessment.grade === 'A' && negativeVotes === 0) {
        verdict = 'KAUFEN';
        rationale = `Grade A bestätigt, ${positiveVotes} von ${team.length} Sub-Agenten positiv, keine Warnungen.`;
      } else {
        verdict = 'BEOBACHTEN';
        rationale = `Grade ${target.assessment.grade}, ${negativeVotes} negative Sub-Agent-Stimme${negativeVotes === 1 ? '' : 'n'} — abwarten.`;
      }
    } else if (p.id === 'balanced') {
      if ((target.assessment.grade === 'A' || target.assessment.grade === 'B') && negativeVotes <= 1) {
        verdict = 'KAUFEN';
        rationale = `Grade ${target.assessment.grade}, ${positiveVotes} positiv, ${negativeVotes} negativ — solide genug.`;
      } else {
        verdict = 'BEOBACHTEN';
        rationale = `Grade ${target.assessment.grade}, ${negativeVotes} negative Stimmen — noch nicht reif.`;
      }
    } else {
      // aggressive: kauft auch Grade C, solange Risk-OK
      const liquidityNeg = team.find((t) => t.name === 'Liquiditäts-Wächter')?.vote === 'NEGATIV';
      if (!liquidityNeg && target.assessment.grade !== 'D') {
        verdict = 'KAUFEN';
        rationale = `Grade ${target.assessment.grade}, Volumen lebt — ich nehme den Trade mit. Stop eng setzen.`;
      } else {
        verdict = 'WARTEN';
        rationale = liquidityNeg ? 'Volumen ist tot — kein Tape.' : 'Sogar mir zu kaputt.';
      }
    }

    return {
      persona: p.id,
      name: p.name,
      motto: p.motto,
      manifest: p.manifest,
      verdict,
      target,
      rationale,
      team
    };
  });
}

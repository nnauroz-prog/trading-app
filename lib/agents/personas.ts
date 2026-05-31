import { MasterSignalReport, RankedCandidate } from '@/lib/analysis/master-signal-engine';
import { BacktestSummary } from '@/lib/analysis/backtest-summary';
import { SafetyAssessment, evaluateSafety } from '@/lib/analysis/safety-gate';
import { SubAgentReport, analystVote, scoutVote, riskVote } from '@/lib/agents/sub-agents';

export type PersonaId = 'conservative' | 'balanced' | 'aggressive';

export interface AgentVerdict {
  persona: PersonaId;
  name: string;
  motto: string;
  verdict: 'BUY' | 'WAIT';
  target: RankedCandidate | null;
  safety: SafetyAssessment | null;
  rationale: string;
  team: SubAgentReport[];
  ceoFinalWord: string;
}

function safetyForCandidate(c: RankedCandidate, report: MasterSignalReport, backtest: BacktestSummary): SafetyAssessment {
  const userBrokerAvailable = c.brokers.includes('Coinbase') || c.brokers.includes('Scalable Capital');
  return evaluateSafety({
    passedCount: c.passedCount,
    marketMood: report.marketMood,
    btcRegime: report.btcRegime,
    isBtc: c.coinId === 'btc',
    structure: c.structure,
    nearSupport: c.nearSupport,
    crowdCautious: report.crowd.cautious,
    quoteVolume: c.quoteVolume,
    stopDistancePct: c.stopDistancePct,
    confirmed: c.confirmed,
    userBrokerAvailable,
    priceChangePct24h: c.priceChangePct24h,
    mode: report.mode,
    relStrengthVsBtc: c.relStrengthVsBtc,
    backtestEdge: backtest.perAssetEdge[c.coinId] ?? null
  });
}

// Pick the best target per persona: conservative goes by safety score,
// aggressive goes by raw passedCount, balanced averages the two.
function pickTarget(report: MasterSignalReport, backtest: BacktestSummary, persona: PersonaId): { target: RankedCandidate | null; safety: SafetyAssessment | null } {
  const scored = report.candidates.map((c) => ({ c, safety: safetyForCandidate(c, report, backtest) }));
  if (scored.length === 0) return { target: null, safety: null };
  scored.sort((a, b) => {
    if (persona === 'aggressive') return b.c.passedCount - a.c.passedCount || b.safety.score - a.safety.score;
    if (persona === 'conservative') return b.safety.score - a.safety.score || b.c.passedCount - a.c.passedCount;
    // balanced
    const sa = a.safety.score + a.c.passedCount * 5;
    const sb = b.safety.score + b.c.passedCount * 5;
    return sb - sa;
  });
  return { target: scored[0].c, safety: scored[0].safety };
}

export function evaluatePersonas(report: MasterSignalReport, backtest: BacktestSummary): AgentVerdict[] {
  const PERSONAS: { id: PersonaId; name: string; motto: string }[] = [
    { id: 'conservative', name: 'Konservativ', motto: 'Lieber gar nichts kaufen als zu früh' },
    { id: 'balanced', name: 'Balanciert', motto: 'Sicher, aber nicht überpingelig' },
    { id: 'aggressive', name: 'Aggressiv', motto: 'Mehr Signale, kleinere Größen' }
  ];

  return PERSONAS.map(({ id, name, motto }) => {
    const { target, safety } = pickTarget(report, backtest, id);
    const analyst = analystVote(report);
    const scout = scoutVote(target);
    const risk = riskVote(target);
    const team: SubAgentReport[] = [analyst, scout, risk];

    let verdict: 'BUY' | 'WAIT' = 'WAIT';
    let rationale = 'Keine Setups vorhanden.';

    if (target && safety) {
      if (id === 'conservative') {
        // Konservativ: nur kaufen, wenn Analyst nicht NEGATIV, Scout STARK, Risiko OK
        // UND alle harten Safety-Kriterien erfüllt.
        if (analyst.vote !== 'NEGATIV' && scout.vote === 'STARK' && risk.vote === 'OK' && safety.maxSafety) {
          verdict = 'BUY';
          rationale = `Team einstimmig grün: Analyst ${analyst.vote.toLowerCase()}, Scout sieht starkes Setup, Risiko-Manager gibt grünes Licht.`;
        } else {
          const blockers: string[] = [];
          if (analyst.vote === 'NEGATIV') blockers.push('Analyst sieht Markt negativ');
          if (scout.vote !== 'STARK') blockers.push(`Scout nur ${scout.vote.toLowerCase()}`);
          if (risk.vote === 'VETO') blockers.push('Risiko-Manager Veto');
          if (!safety.maxSafety) blockers.push(`Note ${safety.grade}`);
          rationale = blockers.length > 0 ? `Ich warte: ${blockers.join(', ')}.` : 'Ich warte — nicht alle Kriterien erfüllt.';
        }
      } else if (id === 'balanced') {
        // Balanciert: Scout mindestens MITTEL, Risiko OK, Analyst nicht NEGATIV.
        if (scout.vote !== 'SCHWACH' && risk.vote === 'OK' && analyst.vote !== 'NEGATIV' && target.passedCount >= 8) {
          verdict = 'BUY';
          rationale = `Scout ${scout.vote.toLowerCase()}, Risiko ok, Markt nicht negativ — solide genug. Note ${safety.grade} (${safety.passedHard}/${safety.totalHard}).`;
        } else {
          const blockers: string[] = [];
          if (scout.vote === 'SCHWACH') blockers.push('Scout-Setup schwach');
          if (risk.vote === 'VETO') blockers.push('Risiko-Veto');
          if (analyst.vote === 'NEGATIV') blockers.push('Markt negativ');
          if (target.passedCount < 8) blockers.push(`nur ${target.passedCount}/12 Bestätigungen`);
          rationale = blockers.length > 0 ? `Ich warte: ${blockers.join(', ')}.` : `Ich warte — Note ${safety.grade}.`;
        }
      } else {
        // Aggressiv: Scout mindestens MITTEL UND Risiko OK reichen mir.
        if (scout.vote !== 'SCHWACH' && risk.vote === 'OK' && report.marketMood !== 'risk-off') {
          verdict = 'BUY';
          rationale = `Scout ${scout.vote.toLowerCase()}, Risiko sauber — ich nehme den Trade (kleinere Position!). Analyst ist ${analyst.vote.toLowerCase()}.`;
        } else if (risk.vote === 'VETO') {
          rationale = `Sogar mir zu riskant: Risiko-Manager hat Veto eingelegt.`;
        } else if (report.marketMood === 'risk-off') {
          rationale = `${target.passedCount}/12 — aber Markt ist im Abverkauf, sogar mir zu riskant.`;
        } else {
          rationale = `Scout-Setup ist zu schwach — selbst mir zu wenig.`;
        }
      }
    }

    const ceoFinalWord = composeCeoFinalWord(id, name, verdict, team, target, safety);

    return { persona: id, name, motto, verdict, target, safety, rationale, team, ceoFinalWord };
  });
}

// CEO-Schlusswort: kurze Synthese der drei Sub-Agenten-Meinungen aus Sicht
// des jeweiligen Firmenchefs.
function composeCeoFinalWord(
  id: PersonaId,
  name: string,
  verdict: 'BUY' | 'WAIT',
  team: SubAgentReport[],
  target: RankedCandidate | null,
  safety: SafetyAssessment | null
): string {
  if (!target || !safety) {
    return `Heute kein Setup zum Diskutieren — Firma „${name}“ bleibt zu.`;
  }
  const [analyst, scout, risk] = team;
  if (verdict === 'BUY') {
    return `Team hat gesprochen: ${analyst.vote.toLowerCase()} im Markt, Setup ${scout.vote.toLowerCase()}, Risiko ${risk.vote.toLowerCase()}. ${id === 'aggressive' ? 'Position klein halten' : id === 'balanced' ? 'Position wie geplant' : 'Volle Konfidenz im Stop'} — ${target.symbol} läuft.`;
  }
  return `Wir lassen es. Lieber kein Trade als ein schlechter — bei drei Stimmen müssen mindestens zwei klar grün sein, sonst bleibt die Firma „${name}“ in Cash.`;
}

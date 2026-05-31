import { MasterSignalReport, RankedCandidate } from '@/lib/analysis/master-signal-engine';
import { BacktestSummary } from '@/lib/analysis/backtest-summary';
import { SafetyAssessment, evaluateSafety } from '@/lib/analysis/safety-gate';

export type PersonaId = 'conservative' | 'balanced' | 'aggressive';

export interface AgentVerdict {
  persona: PersonaId;
  name: string;
  motto: string;
  verdict: 'BUY' | 'WAIT';
  target: RankedCandidate | null;
  safety: SafetyAssessment | null;
  rationale: string;
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
    let verdict: 'BUY' | 'WAIT' = 'WAIT';
    let rationale = 'Keine Setups vorhanden.';

    if (target && safety) {
      if (id === 'conservative') {
        if (safety.maxSafety) {
          verdict = 'BUY';
          rationale = `Alle ${safety.totalHard} Sicherheits-Kriterien erfüllt — sicherer Kauf möglich.`;
        } else {
          rationale = `Note ${safety.grade} — nicht alle Kriterien erfüllt, also lieber warten.`;
        }
      } else if (id === 'balanced') {
        if (safety.passedHard >= safety.totalHard - 1 && target.passedCount >= 8) {
          verdict = 'BUY';
          rationale = `Note ${safety.grade} (${safety.passedHard}/${safety.totalHard}) und ${target.passedCount}/12 Bestätigungen — solide genug für mich.`;
        } else {
          rationale = `Note ${safety.grade} und ${target.passedCount}/12 — noch nicht solide genug für mich.`;
        }
      } else {
        // aggressive
        if (target.passedCount >= 7 && report.marketMood !== 'risk-off') {
          verdict = 'BUY';
          rationale = `${target.passedCount}/12 Bestätigungen, Markt nicht im Abverkauf — ich nehme den Trade (kleinere Größe!).`;
        } else if (target.passedCount >= 7 && report.marketMood === 'risk-off') {
          rationale = `${target.passedCount}/12 Bestätigungen, aber Markt ist risk-off — sogar mir zu riskant.`;
        } else {
          rationale = `Nur ${target.passedCount}/12 — selbst mir zu wenig.`;
        }
      }
    }

    return { persona: id, name, motto, verdict, target, safety, rationale };
  });
}

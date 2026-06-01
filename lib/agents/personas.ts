import { MasterSignalReport, RankedCandidate } from '@/lib/analysis/master-signal-engine';
import { BacktestSummary } from '@/lib/analysis/backtest-summary';
import { SafetyAssessment, evaluateSafety } from '@/lib/analysis/safety-gate';
import { SubAgentReport, analystVote, scoutVote, riskVote, newsVote, positionManagerVote, liquiditySpecialistVote, backtestAuditVote } from '@/lib/agents/sub-agents';
import { SpaeherReport } from '@/lib/akademie/spaeher';
import { EventWindowState } from '@/lib/calendar/event-window';
import { computeSetupSimilarity } from '@/lib/analysis/setup-similarity';
import { summariseFirmaVotes, type FirmaVoteSummary } from '@/lib/agents/firma-vote-aggregator';

export type PersonaId = 'conservative' | 'balanced' | 'aggressive';

export interface AgentVerdict {
  persona: PersonaId;
  name: string;
  motto: string;
  manifest: string;
  verdict: 'BUY' | 'WAIT';
  target: RankedCandidate | null;
  safety: SafetyAssessment | null;
  rationale: string;
  team: SubAgentReport[];
  // Aggregat aller Sub-Agent-Stimmen — Plus/Neutral/Minus + Konsens-Richtung.
  // Identisches Pattern wie die Sport-Firma-Votes.
  voteSummary: FirmaVoteSummary;
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

export function evaluatePersonas(
  report: MasterSignalReport,
  backtest: BacktestSummary,
  spaeher: SpaeherReport | null = null,
  eventWindow: EventWindowState | null = null
): AgentVerdict[] {
  const PERSONAS: { id: PersonaId; name: string; motto: string; manifest: string }[] = [
    {
      id: 'conservative', name: 'Konservativ', motto: 'Lieber gar nichts kaufen als zu früh',
      manifest: 'Erhalt des Kapitals geht vor Rendite. Ich kaufe nur, wenn alle harten Sicherheits-Kriterien erfüllt sind, die Liquidität tief ist, der Backtest das Setup bestätigt und kein hoch-impact Termin in den nächsten 24h liegt. Lieber wochenlang in Cash als ein zweifelhafter Trade.'
    },
    {
      id: 'balanced', name: 'Balanciert', motto: 'Sicher, aber nicht überpingelig',
      manifest: 'Solider Setup mit klarem Stop ist genug — ich brauche nicht jede Sterne aligned. Häkchen ≥ 8 plus saubere Konfluenz: Position auf. Eine Negativ-Stimme einzelner Sub-Agenten kippt mich nicht, aber zwei zusammen bremsen.'
    },
    {
      id: 'aggressive', name: 'Aggressiv', motto: 'Mehr Signale, kleinere Größen',
      manifest: 'Wer wartet, verpasst Bewegung. Ich nehme Setups schon ab 7 Häkchen mit, aber dann mit kleinerer Position. Auch bei dünneren Märkten — solange Risiko-Manager kein Veto einlegt. Sogar mir zu riskant ist nur: risk-off-Markt oder Risiko-Veto.'
    }
  ];

  return PERSONAS.map(({ id, name, motto, manifest }) => {
    const { target, safety } = pickTarget(report, backtest, id);
    const analyst = analystVote(report);
    const scout = scoutVote(target);
    const risk = riskVote(target);
    const news = newsVote(target, spaeher);
    const position = positionManagerVote(target, id);
    const liquidity = liquiditySpecialistVote(target, id);
    const similarity = target ? computeSetupSimilarity(backtest.safeTrades, { coinId: target.coinId, ticker: target.symbol, passedCount: target.passedCount }) : null;
    const backtestAudit = backtestAuditVote(target, similarity);
    const team: SubAgentReport[] = [analyst, scout, risk, news, position, liquidity, backtestAudit];

    let verdict: 'BUY' | 'WAIT' = 'WAIT';
    let rationale = 'Keine Setups vorhanden.';

    if (target && safety) {
      // Event-Window-Vorbehalt:
      // - Konservativ wartet 24h vor einem hoch-impact Event.
      // - Balanciert wartet 12h davor.
      // - Aggressiv ignoriert das (passend zum Charakter).
      const eventBlocksConservative = !!eventWindow?.imminent;
      const eventBlocksBalanced = !!eventWindow?.veryImminent;

      if (id === 'conservative') {
        // Konservativ: braucht jetzt zusätzlich tiefe Liquidität und keine
        // historische Widerlegung des Setups.
        const liquidityBlocksConservative = liquidity.vote === 'DUENN';
        const backtestBlocksConservative = backtestAudit.vote === 'WIDERSPRUCH';
        if (
          analyst.vote !== 'NEGATIV' &&
          scout.vote === 'STARK' &&
          risk.vote === 'OK' &&
          news.vote !== 'NEGATIV' &&
          safety.maxSafety &&
          !eventBlocksConservative &&
          !liquidityBlocksConservative &&
          !backtestBlocksConservative
        ) {
          verdict = 'BUY';
          const newsHint = news.vote === 'POSITIV' ? ', News bullisch' : '';
          const backtestHint = backtestAudit.vote === 'BESTÄTIGT' ? ', Vergangenheit bestätigt' : '';
          rationale = `Team einstimmig grün: Analyst ${analyst.vote.toLowerCase()}, Scout sieht starkes Setup, Risiko-Manager gibt grünes Licht${newsHint}${backtestHint}.`;
        } else {
          const blockers: string[] = [];
          if (eventBlocksConservative && eventWindow?.nextHighImpact) {
            blockers.push(`${eventWindow.nextHighImpact.title} in ${eventWindow.hoursUntilNextHighImpact}h`);
          }
          if (analyst.vote === 'NEGATIV') blockers.push('Analyst sieht Markt negativ');
          if (scout.vote !== 'STARK') blockers.push(`Scout nur ${scout.vote.toLowerCase()}`);
          if (risk.vote === 'VETO') blockers.push('Risiko-Manager Veto');
          if (news.vote === 'NEGATIV') blockers.push(`News-Watcher: ${target.symbol} bärisch`);
          if (!safety.maxSafety) blockers.push(`Note ${safety.grade}`);
          if (liquidityBlocksConservative) blockers.push('Liquidität zu dünn');
          if (backtestBlocksConservative) blockers.push('Backtest widerspricht');
          rationale = blockers.length > 0 ? `Ich warte: ${blockers.join(', ')}.` : 'Ich warte — nicht alle Kriterien erfüllt.';
        }
      } else if (id === 'balanced') {
        // Balanciert: Scout mindestens MITTEL, Risiko OK, Analyst nicht NEGATIV.
        // News-Watcher kann nicht veto'en, aber NEGATIV verlangt zusätzliche
        // Konfluenz (≥9). Hoch-impact Event ≤12h blockt zusätzlich.
        // Liquidität DUENN ist Bremse, Backtest WIDERSPRUCH ist Bremse.
        const newsBlocksBalanced = news.vote === 'NEGATIV' && target.passedCount < 9;
        const liquidityBlocksBalanced = liquidity.vote === 'DUENN';
        const backtestBlocksBalanced = backtestAudit.vote === 'WIDERSPRUCH' && target.passedCount < 10;
        if (scout.vote !== 'SCHWACH' && risk.vote === 'OK' && analyst.vote !== 'NEGATIV' && target.passedCount >= 8 && !newsBlocksBalanced && !eventBlocksBalanced && !liquidityBlocksBalanced && !backtestBlocksBalanced) {
          verdict = 'BUY';
          const newsHint = news.vote === 'POSITIV' ? ', News bullisch' : news.vote === 'NEGATIV' ? ', trotz bärischer News' : '';
          rationale = `Scout ${scout.vote.toLowerCase()}, Risiko ok, Markt nicht negativ — solide genug${newsHint}. Note ${safety.grade} (${safety.passedHard}/${safety.totalHard}).`;
        } else {
          const blockers: string[] = [];
          if (eventBlocksBalanced && eventWindow?.nextHighImpact) blockers.push(`${eventWindow.nextHighImpact.title} in ${eventWindow.hoursUntilNextHighImpact}h`);
          if (scout.vote === 'SCHWACH') blockers.push('Scout-Setup schwach');
          if (risk.vote === 'VETO') blockers.push('Risiko-Veto');
          if (analyst.vote === 'NEGATIV') blockers.push('Markt negativ');
          if (target.passedCount < 8) blockers.push(`nur ${target.passedCount} von 12 Häkchen`);
          if (newsBlocksBalanced) blockers.push('News-Watcher bärisch und Konfluenz < 9');
          if (liquidityBlocksBalanced) blockers.push('Liquidität zu dünn');
          if (backtestBlocksBalanced) blockers.push('Backtest widerspricht (und Konfluenz < 10)');
          rationale = blockers.length > 0 ? `Ich warte: ${blockers.join(', ')}.` : `Ich warte — Note ${safety.grade}.`;
        }
      } else {
        // Aggressiv: Scout mindestens MITTEL UND Risiko OK reichen mir. News informiert nur.
        if (scout.vote !== 'SCHWACH' && risk.vote === 'OK' && report.marketMood !== 'risk-off') {
          verdict = 'BUY';
          const newsHint = news.vote === 'NEGATIV' ? ` News-Watcher warnt zwar (${target.symbol} bärisch), aber Setup zählt mehr.` : news.vote === 'POSITIV' ? ` News-Watcher bestätigt: ${target.symbol} bullisch.` : '';
          rationale = `Scout ${scout.vote.toLowerCase()}, Risiko sauber — ich nehme den Trade (kleinere Position!). Analyst ist ${analyst.vote.toLowerCase()}.${newsHint}`;
        } else if (risk.vote === 'VETO') {
          rationale = `Sogar mir zu riskant: Risiko-Manager hat Veto eingelegt.`;
        } else if (report.marketMood === 'risk-off') {
          rationale = `${target.passedCount} von 12 Häkchen — aber Markt ist im Abverkauf, sogar mir zu riskant.`;
        } else {
          rationale = `Scout-Setup ist zu schwach — selbst mir zu wenig.`;
        }
      }
    }

    const ceoFinalWord = composeCeoFinalWord(id, name, verdict, team, target, safety);

    const voteSummary = summariseFirmaVotes(team);
    return { persona: id, name, motto, manifest, verdict, target, safety, rationale, team, voteSummary, ceoFinalWord };
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

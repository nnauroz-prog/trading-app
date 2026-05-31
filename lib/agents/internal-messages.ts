import { PersonaId } from '@/lib/agents/personas';
import {
  AnalystReport,
  BacktestAuditReport,
  LiquidityReport,
  NewsReport,
  PositionManagerReport,
  RiskReport,
  ScoutReport,
  SubAgentReport
} from '@/lib/agents/sub-agents';

export interface InternalMessage {
  from: 'analyst' | 'scout' | 'risk' | 'news' | 'position' | 'liquidity' | 'backtest' | 'ceo';
  fromTitle: string;
  to: 'analyst' | 'scout' | 'risk' | 'news' | 'position' | 'liquidity' | 'backtest' | 'ceo' | 'all';
  toTitle: string;
  body: string;
  tone: 'neutral' | 'warn' | 'agree';
}

function findAnalyst(team: SubAgentReport[]): AnalystReport | null {
  return (team.find((m) => m.role === 'analyst') as AnalystReport | undefined) ?? null;
}
function findScout(team: SubAgentReport[]): ScoutReport | null {
  return (team.find((m) => m.role === 'scout') as ScoutReport | undefined) ?? null;
}
function findRisk(team: SubAgentReport[]): RiskReport | null {
  return (team.find((m) => m.role === 'risk') as RiskReport | undefined) ?? null;
}
function findNews(team: SubAgentReport[]): NewsReport | null {
  return (team.find((m) => m.role === 'news') as NewsReport | undefined) ?? null;
}
function findPosition(team: SubAgentReport[]): PositionManagerReport | null {
  return (team.find((m) => m.role === 'position') as PositionManagerReport | undefined) ?? null;
}
function findLiquidity(team: SubAgentReport[]): LiquidityReport | null {
  return (team.find((m) => m.role === 'liquidity') as LiquidityReport | undefined) ?? null;
}
function findBacktest(team: SubAgentReport[]): BacktestAuditReport | null {
  return (team.find((m) => m.role === 'backtest') as BacktestAuditReport | undefined) ?? null;
}

// Build a small dialog between the three sub-agents and the CEO. Order:
// 1) Analyst opens with the macro picture, 2) Scout reacts about the setup,
// 3) Risk-Manager weighs in, 4) CEO closes with a one-liner.
export function buildInternalDialog(
  persona: PersonaId,
  ceoName: string,
  team: SubAgentReport[],
  verdict: 'BUY' | 'WAIT'
): InternalMessage[] {
  const analyst = findAnalyst(team);
  const scout = findScout(team);
  const risk = findRisk(team);
  const news = findNews(team);
  const position = findPosition(team);
  const liquidity = findLiquidity(team);
  const backtest = findBacktest(team);
  if (!analyst || !scout || !risk) return [];

  const messages: InternalMessage[] = [];

  messages.push({
    from: 'analyst',
    fromTitle: 'Markt-Analyst',
    to: 'all',
    toTitle: 'Team',
    body: `Marktlage: ${analyst.vote.toLowerCase()}. ${analyst.reason}`,
    tone: analyst.vote === 'NEGATIV' ? 'warn' : analyst.vote === 'POSITIV' ? 'agree' : 'neutral'
  });

  // Scout reacts to analyst.
  const scoutPrefix =
    analyst.vote === 'NEGATIV' && scout.vote === 'STARK' ? `Trotzdem — ${scout.reason.toLowerCase()}` :
    analyst.vote === 'POSITIV' && scout.vote === 'STARK' ? `Passt zur Lage: ${scout.reason.toLowerCase()}` :
    scout.reason;
  messages.push({
    from: 'scout',
    fromTitle: 'Setup-Scout',
    to: 'all',
    toTitle: 'Team',
    body: scoutPrefix,
    tone: scout.vote === 'STARK' ? 'agree' : scout.vote === 'SCHWACH' ? 'warn' : 'neutral'
  });

  // Risk reacts to scout.
  const riskPrefix =
    scout.vote === 'STARK' && risk.vote === 'VETO' ? `Bremse — ${risk.reason.toLowerCase()}` :
    risk.vote === 'OK' ? `Risiko-seitig sauber. ${risk.reason}` :
    risk.reason;
  messages.push({
    from: 'risk',
    fromTitle: 'Risiko-Manager',
    to: 'all',
    toTitle: 'Team',
    body: riskPrefix,
    tone: risk.vote === 'OK' ? 'agree' : 'warn'
  });

  if (news && news.vote !== 'KEINE_DATEN') {
    const newsPrefix =
      news.vote === 'NEGATIV' ? `Achtung — ${news.reason.toLowerCase()}` :
      news.vote === 'POSITIV' ? `Rückenwind: ${news.reason.toLowerCase()}` :
      news.reason;
    messages.push({
      from: 'news',
      fromTitle: 'News-Watcher',
      to: 'all',
      toTitle: 'Team',
      body: newsPrefix,
      tone: news.vote === 'POSITIV' ? 'agree' : news.vote === 'NEGATIV' ? 'warn' : 'neutral'
    });
  }

  if (liquidity && liquidity.vote !== 'KEINE_DATEN') {
    messages.push({
      from: 'liquidity',
      fromTitle: 'Liquiditäts-Spezialist',
      to: 'all', toTitle: 'Team',
      body: liquidity.reason,
      tone: liquidity.vote === 'TIEF' ? 'agree' : liquidity.vote === 'DUENN' ? 'warn' : 'neutral'
    });
  }

  if (backtest && backtest.vote !== 'KEINE_DATEN') {
    messages.push({
      from: 'backtest',
      fromTitle: 'Backtest-Auditor',
      to: 'all', toTitle: 'Team',
      body: backtest.reason,
      tone: backtest.vote === 'BESTÄTIGT' ? 'agree' : backtest.vote === 'WIDERSPRUCH' ? 'warn' : 'neutral'
    });
  }

  if (position && position.vote !== 'KEINE_POSITION' && verdict === 'BUY') {
    messages.push({
      from: 'position',
      fromTitle: 'Position-Manager',
      to: 'all', toTitle: 'Team',
      body: position.reason,
      tone: position.vote === 'KLEIN' ? 'neutral' : 'agree'
    });
  }

  // CEO closes.
  const ceoBody = composeCeoClose(persona, verdict, analyst, scout, risk, news);
  messages.push({
    from: 'ceo',
    fromTitle: `CEO ${ceoName}`,
    to: 'all',
    toTitle: 'Team',
    body: ceoBody,
    tone: verdict === 'BUY' ? 'agree' : 'neutral'
  });

  return messages;
}

function composeCeoClose(
  persona: PersonaId,
  verdict: 'BUY' | 'WAIT',
  analyst: AnalystReport,
  scout: ScoutReport,
  risk: RiskReport,
  news: NewsReport | null
): string {
  if (verdict === 'WAIT' && news && news.vote === 'NEGATIV' && persona === 'conservative') {
    return `News-Watcher meldet bärische Headlines — Konservativ bleibt heute draußen.`;
  }
  if (verdict === 'BUY') {
    if (persona === 'conservative') {
      return `Entschieden — wir kaufen. Vier grüne Stimmen, das reicht mir.`;
    }
    if (persona === 'aggressive') {
      return `Wir gehen rein. ${risk.vote === 'OK' ? 'Risiko ist sauber' : 'Mit reduzierter Größe'} — Position klein halten.`;
    }
    return `Wir kaufen. Solide Mehrheit im Team.`;
  }
  if (persona === 'conservative') {
    if (risk.vote === 'VETO') return `Risiko-Veto — Diskussion zu Ende. Kein Trade heute.`;
    if (scout.vote !== 'STARK') return `Scout sagt nicht „stark" — dann warten wir auf besser.`;
    if (analyst.vote === 'NEGATIV') return `Analyst sieht Markt negativ — wir bleiben in Cash.`;
    return `Nicht alle Kriterien erfüllt — wir warten.`;
  }
  if (persona === 'balanced') {
    if (risk.vote === 'VETO') return `Risiko-Manager hat das letzte Wort — kein Trade.`;
    return `Noch nicht reif genug — warten auf bessere Konfluenz.`;
  }
  // aggressive
  if (risk.vote === 'VETO') return `Sogar mir zu heiß — Risiko sagt nein.`;
  if (analyst.vote === 'NEGATIV') return `Markt ist im Abverkauf — heute nicht mal ich.`;
  return `Setup ist mir zu dünn — wir lassen es.`;
}

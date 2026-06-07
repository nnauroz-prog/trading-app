import { describe, expect, it } from 'vitest';
import { buildInternalDialog } from '@/lib/agents/internal-messages';
import {
  AnalystReport, BacktestAuditReport, LiquidityReport, NewsReport,
  PositionManagerReport, RiskReport, ScoutReport, SubAgentReport
} from '@/lib/agents/sub-agents';

const analystGood: AnalystReport = { role: 'analyst', title: 'Markt-Analyst', vote: 'POSITIV', voteTone: 'good', reason: 'Markt steigt.' };
const analystBad: AnalystReport = { role: 'analyst', title: 'Markt-Analyst', vote: 'NEGATIV', voteTone: 'bad', reason: 'Markt fällt.' };
const scoutGood: ScoutReport = { role: 'scout', title: 'Setup-Scout', vote: 'STARK', voteTone: 'good', reason: 'ETH 10/12.' };
const scoutBad: ScoutReport = { role: 'scout', title: 'Setup-Scout', vote: 'SCHWACH', voteTone: 'bad', reason: 'Keine Bestätigung.' };
const riskOk: RiskReport = { role: 'risk', title: 'Risiko-Manager', vote: 'OK', voteTone: 'good', reason: 'Stop sauber.' };
const riskVeto: RiskReport = { role: 'risk', title: 'Risiko-Manager', vote: 'VETO', voteTone: 'bad', reason: 'Liquidität niedrig.' };
const newsPositive: NewsReport = { role: 'news', title: 'News-Watcher', vote: 'POSITIV', voteTone: 'good', reason: 'ETF-Zuflüsse stark.' };
const newsNegative: NewsReport = { role: 'news', title: 'News-Watcher', vote: 'NEGATIV', voteTone: 'bad', reason: 'Regulierungs-Druck.' };
const newsNoData: NewsReport = { role: 'news', title: 'News-Watcher', vote: 'KEINE_DATEN', voteTone: 'neutral', reason: 'Keine Headlines.' };
const liquidityOk: LiquidityReport = { role: 'liquidity', title: 'Liquiditäts-Spezialist', vote: 'OK', voteTone: 'neutral', reason: 'Order-Book sauber.' };
const liquidityThin: LiquidityReport = { role: 'liquidity', title: 'Liquiditäts-Spezialist', vote: 'DUENN', voteTone: 'bad', reason: 'Spreads weit, dünnes Buch.' };
const liquidityNoData: LiquidityReport = { role: 'liquidity', title: 'Liquiditäts-Spezialist', vote: 'KEINE_DATEN', voteTone: 'neutral', reason: 'Keine Daten.' };
const backtestConfirmed: BacktestAuditReport = { role: 'backtest', title: 'Backtest-Auditor', vote: 'BESTÄTIGT', voteTone: 'good', reason: 'Setup hat 7/10 in Vergangenheit getroffen.' };
const backtestContradiction: BacktestAuditReport = { role: 'backtest', title: 'Backtest-Auditor', vote: 'WIDERSPRUCH', voteTone: 'bad', reason: '3/10 in Vergangenheit — schwach.' };
const positionNormal: PositionManagerReport = { role: 'position', title: 'Position-Manager', vote: 'NORMAL', voteTone: 'good', reason: 'Standard 2% Risiko.', suggestedAccountRiskPct: 2 };
const positionNone: PositionManagerReport = { role: 'position', title: 'Position-Manager', vote: 'KEINE_POSITION', voteTone: 'neutral', reason: 'Kein Buy → keine Position.', suggestedAccountRiskPct: 0 };

function team(...members: SubAgentReport[]): SubAgentReport[] { return members; }

describe('buildInternalDialog', () => {
  it('builds a 4-message dialog: analyst -> scout -> risk -> ceo', () => {
    const dialog = buildInternalDialog('balanced', 'Balanciert', team(analystGood, scoutGood, riskOk), 'BUY');
    expect(dialog).toHaveLength(4);
    expect(dialog[0].from).toBe('analyst');
    expect(dialog[1].from).toBe('scout');
    expect(dialog[2].from).toBe('risk');
    expect(dialog[3].from).toBe('ceo');
  });

  it('CEO closes with explicit veto note when risk-manager vetos', () => {
    const dialog = buildInternalDialog('conservative', 'Konservativ', team(analystGood, scoutGood, riskVeto), 'WAIT');
    const ceo = dialog.find((m) => m.from === 'ceo');
    expect(ceo?.body.toLowerCase()).toContain('veto');
  });

  it('marks negative-analyst message with warn tone', () => {
    const dialog = buildInternalDialog('aggressive', 'Aggressiv', team(analystBad, scoutBad, riskOk), 'WAIT');
    const analystMsg = dialog.find((m) => m.from === 'analyst');
    expect(analystMsg?.tone).toBe('warn');
  });

  it('returns empty if team is missing a role', () => {
    expect(buildInternalDialog('balanced', 'B', team(analystGood), 'WAIT')).toEqual([]);
  });

  it('positive News-Watcher meldet sich als „agree"-Ton', () => {
    const dialog = buildInternalDialog('balanced', 'B', team(analystGood, scoutGood, riskOk, newsPositive), 'BUY');
    const newsMsg = dialog.find((m) => m.from === 'news');
    expect(newsMsg).toBeDefined();
    expect(newsMsg!.tone).toBe('agree');
    expect(newsMsg!.body.toLowerCase()).toContain('rückenwind');
  });

  it('negative News-Watcher → warn-Ton + Achtungs-Präfix', () => {
    const dialog = buildInternalDialog('balanced', 'B', team(analystGood, scoutGood, riskOk, newsNegative), 'BUY');
    const newsMsg = dialog.find((m) => m.from === 'news');
    expect(newsMsg!.tone).toBe('warn');
    expect(newsMsg!.body.toLowerCase()).toContain('achtung');
  });

  it('KEINE_DATEN News-Watcher meldet sich gar nicht', () => {
    const dialog = buildInternalDialog('balanced', 'B', team(analystGood, scoutGood, riskOk, newsNoData), 'BUY');
    expect(dialog.find((m) => m.from === 'news')).toBeUndefined();
  });

  it('Liquidity-Spezialist erscheint nur, wenn er Daten hat', () => {
    const withData    = buildInternalDialog('balanced', 'B', team(analystGood, scoutGood, riskOk, liquidityOk), 'BUY');
    const withoutData = buildInternalDialog('balanced', 'B', team(analystGood, scoutGood, riskOk, liquidityNoData), 'BUY');
    expect(withData.find((m) => m.from === 'liquidity')).toBeDefined();
    expect(withoutData.find((m) => m.from === 'liquidity')).toBeUndefined();
  });

  it('DUENN-Liquidität → warn-Ton', () => {
    const dialog = buildInternalDialog('balanced', 'B', team(analystGood, scoutGood, riskOk, liquidityThin), 'BUY');
    const liqMsg = dialog.find((m) => m.from === 'liquidity');
    expect(liqMsg!.tone).toBe('warn');
  });

  it('Backtest-Auditor BESTÄTIGT → agree-Ton', () => {
    const dialog = buildInternalDialog('balanced', 'B', team(analystGood, scoutGood, riskOk, backtestConfirmed), 'BUY');
    const btMsg = dialog.find((m) => m.from === 'backtest');
    expect(btMsg!.tone).toBe('agree');
  });

  it('Backtest WIDERSPRUCH → warn-Ton', () => {
    const dialog = buildInternalDialog('balanced', 'B', team(analystGood, scoutGood, riskOk, backtestContradiction), 'BUY');
    const btMsg = dialog.find((m) => m.from === 'backtest');
    expect(btMsg!.tone).toBe('warn');
  });

  it('Position-Manager spricht nur bei BUY-Verdict und KEINE_POSITION schweigt', () => {
    const buy = buildInternalDialog('balanced', 'B', team(analystGood, scoutGood, riskOk, positionNormal), 'BUY');
    const wait = buildInternalDialog('balanced', 'B', team(analystGood, scoutGood, riskOk, positionNormal), 'WAIT');
    const noPosition = buildInternalDialog('balanced', 'B', team(analystGood, scoutGood, riskOk, positionNone), 'BUY');
    expect(buy.find((m) => m.from === 'position')).toBeDefined();
    expect(wait.find((m) => m.from === 'position')).toBeUndefined();
    expect(noPosition.find((m) => m.from === 'position')).toBeUndefined();
  });

  it('Scout-Reaktion: STARK bei NEGATIV-Analyst hat „Trotzdem"-Präfix', () => {
    const dialog = buildInternalDialog('balanced', 'B', team(analystBad, scoutGood, riskOk), 'BUY');
    const scoutMsg = dialog.find((m) => m.from === 'scout');
    expect(scoutMsg!.body.toLowerCase()).toContain('trotzdem');
  });

  it('Scout-Reaktion: STARK bei POSITIV-Analyst hat „Passt"-Präfix', () => {
    const dialog = buildInternalDialog('balanced', 'B', team(analystGood, scoutGood, riskOk), 'BUY');
    const scoutMsg = dialog.find((m) => m.from === 'scout');
    expect(scoutMsg!.body.toLowerCase()).toContain('passt');
  });

  it('Risk-Reaktion: STARK-Scout + VETO-Risk hat „Bremse"-Präfix', () => {
    const dialog = buildInternalDialog('balanced', 'B', team(analystGood, scoutGood, riskVeto), 'WAIT');
    const riskMsg = dialog.find((m) => m.from === 'risk');
    expect(riskMsg!.body.toLowerCase()).toContain('bremse');
  });

  it('Persona-spezifisches CEO-Schlusswort: Konservativ erwähnt News bei WAIT + NEGATIV-News', () => {
    const dialog = buildInternalDialog('conservative', 'K', team(analystGood, scoutGood, riskOk, newsNegative), 'WAIT');
    const ceoMsg = dialog.find((m) => m.from === 'ceo');
    expect(ceoMsg!.body.toLowerCase()).toContain('news-watcher');
  });

  it('alle 7 Subagenten anwesend → Dialog enthält alle plus CEO', () => {
    const full = team(analystGood, scoutGood, riskOk, newsPositive, liquidityOk, backtestConfirmed, positionNormal);
    const dialog = buildInternalDialog('balanced', 'B', full, 'BUY');
    const senders = new Set(dialog.map((m) => m.from));
    expect(senders.has('analyst')).toBe(true);
    expect(senders.has('scout')).toBe(true);
    expect(senders.has('risk')).toBe(true);
    expect(senders.has('news')).toBe(true);
    expect(senders.has('liquidity')).toBe(true);
    expect(senders.has('backtest')).toBe(true);
    expect(senders.has('position')).toBe(true);
    expect(senders.has('ceo')).toBe(true);
  });

  it('jede Nachricht hat fromTitle und nicht-leeren body', () => {
    const dialog = buildInternalDialog('balanced', 'B', team(analystGood, scoutGood, riskOk, newsPositive), 'BUY');
    for (const msg of dialog) {
      expect(msg.fromTitle.length).toBeGreaterThan(0);
      expect(msg.body.length).toBeGreaterThan(0);
    }
  });
});

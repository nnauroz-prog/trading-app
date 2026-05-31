import { describe, expect, it } from 'vitest';
import { buildInternalDialog } from '@/lib/agents/internal-messages';
import { AnalystReport, RiskReport, ScoutReport, SubAgentReport } from '@/lib/agents/sub-agents';

const analystGood: AnalystReport = { role: 'analyst', title: 'Markt-Analyst', vote: 'POSITIV', voteTone: 'good', reason: 'Markt steigt.' };
const analystBad: AnalystReport = { role: 'analyst', title: 'Markt-Analyst', vote: 'NEGATIV', voteTone: 'bad', reason: 'Markt fällt.' };
const scoutGood: ScoutReport = { role: 'scout', title: 'Setup-Scout', vote: 'STARK', voteTone: 'good', reason: 'ETH 10/12.' };
const scoutBad: ScoutReport = { role: 'scout', title: 'Setup-Scout', vote: 'SCHWACH', voteTone: 'bad', reason: 'Keine Bestätigung.' };
const riskOk: RiskReport = { role: 'risk', title: 'Risiko-Manager', vote: 'OK', voteTone: 'good', reason: 'Stop sauber.' };
const riskVeto: RiskReport = { role: 'risk', title: 'Risiko-Manager', vote: 'VETO', voteTone: 'bad', reason: 'Liquidität niedrig.' };

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
});

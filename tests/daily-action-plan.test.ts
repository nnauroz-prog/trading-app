import { describe, expect, it } from 'vitest';
import { buildActionPlan } from '@/lib/daily/daily-action-plan';
import type { ModeAssessment } from '@/lib/daily/daily-decision-engine';

function assessment(mode: ModeAssessment['mode']): ModeAssessment {
  return {
    mode,
    reason: 'test',
    metrics: {
      stocksGradeA: 0, stocksGradeB: 0,
      commoditiesGradeA: 0, commoditiesGradeB: 0,
      cryptoMaxSafety: false, cryptoGrade: null,
      maximalSportTips: 0, sehrSichereSportTips: 0,
      personaBuyCount: 0, personaTotal: 0
    }
  };
}

describe('buildActionPlan', () => {
  it('liefert immer einen Residual-Risk-Hinweis', () => {
    for (const mode of ['OFFENSIV', 'SELEKTIV', 'DEFENSIV', 'CASH'] as const) {
      const plan = buildActionPlan(assessment(mode));
      expect(plan.residualRisk.length).toBeGreaterThan(0);
    }
  });

  it('OFFENSIV → Pick-best zuerst', () => {
    const plan = buildActionPlan(assessment('OFFENSIV'));
    expect(plan.lines[0].id).toBe('pick-best');
  });

  it('DEFENSIV → Cash ist Position zuerst', () => {
    const plan = buildActionPlan(assessment('DEFENSIV'));
    expect(plan.lines[0].id).toBe('cash-is-position');
  });

  it('CASH → wait-for-data zuerst', () => {
    const plan = buildActionPlan(assessment('CASH'));
    expect(plan.lines[0].id).toBe('wait-for-data');
  });

  it('SELEKTIV → erste Zeile ist multi-system (Base)', () => {
    const plan = buildActionPlan(assessment('SELEKTIV'));
    expect(plan.lines[0].id).toBe('multi-system');
  });

  it('jede Zeile hat headline + detail', () => {
    const plan = buildActionPlan(assessment('OFFENSIV'));
    for (const line of plan.lines) {
      expect(line.headline.length).toBeGreaterThan(0);
      expect(line.detail.length).toBeGreaterThan(0);
    }
  });

  it('Basis-Regeln (Stop, Risiko-Cap, kein-Trade-ohne-Daten) sind in jedem Modus enthalten', () => {
    for (const mode of ['OFFENSIV', 'SELEKTIV', 'DEFENSIV', 'CASH'] as const) {
      const plan = buildActionPlan(assessment(mode));
      const ids = plan.lines.map((l) => l.id);
      expect(ids).toContain('always-stop');
      expect(ids).toContain('cap-risk');
      expect(ids).toContain('no-data-no-action');
    }
  });
});

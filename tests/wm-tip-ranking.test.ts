import { describe, expect, it } from 'vitest';
import { rankWmTips } from '@/lib/sport/wm-tip-ranking';

describe('rankWmTips', () => {
  it('liefert nur Spiele mit echten Mannschaften', () => {
    const list = rankWmTips('2026-06-03', 60);
    for (const item of list) {
      expect(item.fixture.homeTeam).not.toContain('TBD');
      expect(item.fixture.awayTeam).not.toContain('TBD');
    }
  });

  it('sortiert absteigend nach Confidence', () => {
    const list = rankWmTips('2026-06-03', 60);
    for (let i = 1; i < list.length; i++) {
      const aScore = list[i - 1].prediction.pick.confidencePct + list[i - 1].prediction.dataConfidence * 0.1;
      const bScore = list[i].prediction.pick.confidencePct + list[i].prediction.dataConfidence * 0.1;
      expect(aScore).toBeGreaterThanOrEqual(bScore);
    }
  });

  it('respektiert maxDays-Fenster', () => {
    const list = rankWmTips('2026-06-03', 5);
    const today = new Date('2026-06-03T00:00:00').getTime();
    const horizon = today + 5 * 24 * 60 * 60 * 1000;
    for (const item of list) {
      const d = new Date(`${item.fixture.date}T00:00:00`).getTime();
      expect(d).toBeLessThanOrEqual(horizon);
    }
  });

  it('liefert leer wenn weit vor Turnier', () => {
    const list = rankWmTips('2025-01-01', 14);
    expect(list).toEqual([]);
  });
});

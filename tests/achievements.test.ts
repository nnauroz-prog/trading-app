import { describe, expect, it } from 'vitest';
import { computeAchievements, achievementSummary } from '@/lib/sport/achievements';
import type { TipJournalEntry } from '@/lib/sport/tip-journal';

function entry(over: Partial<TipJournalEntry>): TipJournalEntry {
  return {
    id: 'x', fixtureId: 'fx', recordedAt: 0,
    league: 'Bundesliga', date: '2026-05-01', homeTeam: 'A', awayTeam: 'B',
    tier: 'standard', market: 'Heimsieg A', modelProbabilityPct: 60,
    outcome: 'pending',
    ...over
  };
}

function find(list: ReturnType<typeof computeAchievements>, id: string) {
  return list.find((a) => a.id === id)!;
}

describe('computeAchievements', () => {
  it('alle Achievements offen bei leerem Tagebuch', () => {
    const list = computeAchievements([]);
    expect(list.every((a) => !a.earned)).toBe(true);
  });

  it('Erster Tipp + erster Treffer', () => {
    const list = computeAchievements([entry({ id: '1', outcome: 'win', resolvedAt: 1 })]);
    expect(find(list, 'first-tip').earned).toBe(true);
    expect(find(list, 'first-win').earned).toBe(true);
  });

  it('3er-Streak nach drei aufeinander Wins', () => {
    const list = computeAchievements([
      entry({ id: '1', outcome: 'win', resolvedAt: 1 }),
      entry({ id: '2', outcome: 'win', resolvedAt: 2 }),
      entry({ id: '3', outcome: 'win', resolvedAt: 3 })
    ]);
    expect(find(list, 'three-streak').earned).toBe(true);
    expect(find(list, 'five-streak').earned).toBe(false);
  });

  it('Streak wird durch Loss zurückgesetzt', () => {
    const list = computeAchievements([
      entry({ id: '1', outcome: 'win', resolvedAt: 1 }),
      entry({ id: '2', outcome: 'win', resolvedAt: 2 }),
      entry({ id: '3', outcome: 'loss', resolvedAt: 3 }),
      entry({ id: '4', outcome: 'win', resolvedAt: 4 })
    ]);
    expect(find(list, 'three-streak').earned).toBe(false);
  });

  it('50 % Trefferquote braucht ≥ 10 ausgewertete', () => {
    const earlyWins = Array.from({ length: 5 }, (_, i) =>
      entry({ id: `${i}`, outcome: 'win', resolvedAt: i + 1 })
    );
    const list = computeAchievements(earlyWins);
    expect(find(list, 'fifty-percent').earned).toBe(false);
    const bigSet = [
      ...Array.from({ length: 6 }, (_, i) => entry({ id: `w${i}`, outcome: 'win', resolvedAt: i + 1 })),
      ...Array.from({ length: 5 }, (_, i) => entry({ id: `l${i}`, outcome: 'loss', resolvedAt: i + 10 }))
    ];
    const list2 = computeAchievements(bigSet);
    expect(find(list2, 'fifty-percent').earned).toBe(true);
  });

  it('WM-Tipper erkennt fixtureId-Prefix', () => {
    const list = computeAchievements([entry({ id: '1', fixtureId: 'wm-5', league: '' })]);
    expect(find(list, 'wm-tipster').earned).toBe(true);
  });

  it('Top-Band-Treffer berücksichtigt qualityBand', () => {
    const list = computeAchievements([
      entry({ id: '1', outcome: 'win', resolvedAt: 1, qualityBand: 'sehr_stark' }),
      entry({ id: '2', outcome: 'win', resolvedAt: 2, qualityBand: 'stark' }),
      entry({ id: '3', outcome: 'win', resolvedAt: 3, qualityBand: 'sehr_stark' })
    ]);
    expect(find(list, 'top-band-three').earned).toBe(true);
  });
});

describe('achievementSummary', () => {
  it('berechnet Prozent erfüllt', () => {
    const list = computeAchievements([
      entry({ id: '1', outcome: 'win', resolvedAt: 1 })
    ]);
    const s = achievementSummary(list);
    expect(s.earned).toBeGreaterThan(0);
    expect(s.total).toBe(list.length);
    expect(s.percent).toBe(Math.round((s.earned / s.total) * 100));
  });
});

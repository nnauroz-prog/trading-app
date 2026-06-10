import { describe, expect, it } from 'vitest';
import { effectiveConfidence, WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';
import { auditWmData } from '@/lib/sport/wm-data-integrity-agent';
import { rankWmWinnerPicks } from '@/lib/sport/wm-winner-picks';

function fixture(over: Partial<WmFixture> = {}): WmFixture {
  return {
    id: 'test-fx',
    date: '2026-06-15',
    time: '15:00',
    homeTeam: 'Frankreich',
    awayTeam: 'Deutschland',
    venue: 'MetLife Stadium',
    phase: 'Gruppe',
    group: 'A',
    ...over
  };
}

describe('effectiveConfidence', () => {
  it('Explizites sourceConfidence wird respektiert', () => {
    expect(effectiveConfidence(fixture({ sourceConfidence: 'placeholder' }))).toBe('placeholder');
    expect(effectiveConfidence(fixture({ sourceConfidence: 'official' }))).toBe('official');
  });

  it('Sieger/Verlierer-Slots → tbd', () => {
    expect(effectiveConfidence(fixture({ homeTeam: 'Sieger Gruppe A' }))).toBe('tbd');
    expect(effectiveConfidence(fixture({ awayTeam: 'Verlierer HF1' }))).toBe('tbd');
  });

  it('Default ohne sourceConfidence = auslosung', () => {
    expect(effectiveConfidence(fixture())).toBe('auslosung');
  });
});

describe('WM_2026_FIXTURES — Eroeffnung als placeholder markiert', () => {
  it('wm-1 (Mexiko-Eroeffnung) ist placeholder', () => {
    const opening = WM_2026_FIXTURES.find((f) => f.id === 'wm-1');
    expect(opening).toBeDefined();
    expect(effectiveConfidence(opening!)).toBe('placeholder');
  });

  it('Gastgeber-Eroeffnung Kanada + USA ebenfalls placeholder', () => {
    expect(effectiveConfidence(WM_2026_FIXTURES.find((f) => f.id === 'wm-2')!)).toBe('placeholder');
    expect(effectiveConfidence(WM_2026_FIXTURES.find((f) => f.id === 'wm-3')!)).toBe('placeholder');
  });
});

describe('Integritaets-Agent meldet placeholder als WARNUNG', () => {
  const issues = auditWmData();

  it('Mindestens ein PLACEHOLDER_FIXTURE-Issue', () => {
    const placeholders = issues.filter((i) => i.kind === 'PLACEHOLDER_FIXTURE');
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it('Placeholder-Issues haben Severity WARNUNG', () => {
    const placeholders = issues.filter((i) => i.kind === 'PLACEHOLDER_FIXTURE');
    for (const p of placeholders) expect(p.severity).toBe('WARNUNG');
  });
});

describe('rankWmWinnerPicks schliesst placeholder-Fixtures aus', () => {
  it('Eroeffnung erscheint nie als Sieger-Pick', () => {
    const picks = rankWmWinnerPicks({ todayIso: '2026-06-11', horizonDays: 1 });
    for (const p of picks) {
      expect(effectiveConfidence(p.fixture)).not.toBe('placeholder');
    }
  });
});

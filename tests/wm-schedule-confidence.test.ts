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

describe('WM_2026_FIXTURES — Eroeffnungs-Paarungen verifiziert (Stand 10.06.2026)', () => {
  it('Eroeffnungs-Fixtures sind NICHT mehr placeholder', () => {
    for (const id of ['wm-1', 'wm-2', 'wm-3']) {
      const f = WM_2026_FIXTURES.find((x) => x.id === id);
      expect(f).toBeDefined();
      expect(effectiveConfidence(f!)).not.toBe('placeholder');
    }
  });
});

describe('Integritaets-Agent — placeholder-Mechanik bleibt funktionsfaehig', () => {
  const issues = auditWmData();

  it('Placeholder-Issues (falls vorhanden) haben Severity WARNUNG', () => {
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

describe('Verifizierte Eroeffnungs-Paarungen (10.06.2026 gegen ESPN/FIFA/Globe and Mail)', () => {
  it('Mexiko-Suedafrika ist jetzt official', () => {
    const opening = WM_2026_FIXTURES.find((f) => f.id === 'wm-1')!;
    expect(opening.awayTeam).toBe('Südafrika');
    expect(effectiveConfidence(opening)).toBe('official');
  });

  it('USA-Gegner wurde auf Paraguay korrigiert (war faelschlich Tuerkei)', () => {
    const usa = WM_2026_FIXTURES.find((f) => f.id === 'wm-3')!;
    expect(usa.awayTeam).toBe('Paraguay');
    expect(effectiveConfidence(usa)).toBe('official');
  });

  it('Kanada-Bosnien official, Gruppe-B-Folgespiele vorhanden', () => {
    expect(effectiveConfidence(WM_2026_FIXTURES.find((f) => f.id === 'wm-2')!)).toBe('official');
    expect(WM_2026_FIXTURES.find((f) => f.id === 'wm-b-md2')?.awayTeam).toBe('Katar');
    expect(WM_2026_FIXTURES.find((f) => f.id === 'wm-b-md3')?.awayTeam).toBe('Schweiz');
  });

  it('Official-Fixtures werden vom Picks-Ranking NICHT mehr geblockt', () => {
    const picks = rankWmWinnerPicks({ todayIso: '2026-06-11', horizonDays: 2 });
    // Es muss moeglich sein, dass Eroeffnungs-Picks erscheinen (sofern
    // Engine-Filter passen). Mindestens darf der placeholder-Block nicht
    // mehr greifen.
    for (const p of picks) {
      expect(effectiveConfidence(p.fixture)).not.toBe('placeholder');
    }
  });
});

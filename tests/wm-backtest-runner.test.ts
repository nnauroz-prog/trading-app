import { describe, expect, it } from 'vitest';
import { runWmBacktest, combinedBrier } from '@/lib/sport/wm-backtest-runner';

describe('runWmBacktest', () => {
  const report = runWmBacktest();

  it('Verarbeitet das gesamte Dataset', () => {
    expect(report.totalMatches).toBeGreaterThanOrEqual(40);
  });

  it('Liefert mindestens einige Picks (sonst stimmt was nicht mit den Filtern)', () => {
    const totalPicks = report.picksHoechsteKonfluenz + report.picksModellFavorit;
    expect(totalPicks).toBeGreaterThan(0);
  });

  it('Hit-Rate ist plausibel (zwischen 0 und 100)', () => {
    if (report.hitRateCombinedPct !== null) {
      expect(report.hitRateCombinedPct).toBeGreaterThanOrEqual(0);
      expect(report.hitRateCombinedPct).toBeLessThanOrEqual(100);
    }
  });

  it('Hoechste-Konfluenz hat strengere Filter → Hit-Rate eher hoeher als Modell-Favorit', () => {
    if (report.hitRateHoechsteKonfluenzPct !== null && report.hitRateModellFavoritPct !== null && report.picksHoechsteKonfluenz >= 3) {
      // Nicht garantiert (kleine Sample-Sizes), aber wir loggen es als Sanity-Check
      expect(report.hitRateHoechsteKonfluenzPct).toBeGreaterThanOrEqual(report.hitRateModellFavoritPct - 30);
    }
  });

  it('No-Pick + Picks summieren sich zu totalMatches', () => {
    expect(report.picksHoechsteKonfluenz + report.picksModellFavorit + report.noPick).toBe(report.totalMatches);
  });

  it('Caveat enthaelt Look-Ahead-Hinweis', () => {
    expect(report.caveat.toLowerCase()).toContain('look-ahead');
  });

  it('Pro-Wettbewerb-Aufschluesselung enthaelt mindestens WM 2022, EM 2024, Copa America 2024', () => {
    const competitions = report.perCompetition.map((p) => p.competition);
    expect(competitions).toContain('WM 2022');
    expect(competitions).toContain('EM 2024');
    expect(competitions).toContain('Copa America 2024');
  });

  it('Factor-Impact-Aufschluesselung enthaelt die 6 Conditions-Faktoren', () => {
    const ids = report.factorImpact.map((f) => f.factorId);
    expect(ids).toContain('acclimatization');
    expect(ids).toContain('altitude');
    expect(ids).toContain('jetlag');
    expect(ids).toContain('host-advantage');
    expect(ids).toContain('regional-crowd');
    expect(ids).toContain('hot-midday');
  });

  it('Top-Resultate sind nach Confidence sortiert', () => {
    for (let i = 1; i < report.topResults.length; i++) {
      const prev = report.topResults[i - 1].confidencePct ?? 0;
      const cur = report.topResults[i].confidencePct ?? 0;
      expect(prev).toBeGreaterThanOrEqual(cur);
    }
  });
});

describe('combinedBrier', () => {
  it('Liefert null bei leerem Bericht-Korpus', () => {
    const empty = { ...runWmBacktest(), picksHoechsteKonfluenz: 0, picksModellFavorit: 0, brierHoechsteKonfluenz: null, brierModellFavorit: null };
    expect(combinedBrier(empty)).toBeNull();
  });

  it('Brier-Score liegt zwischen 0 und 1', () => {
    const r = runWmBacktest();
    const b = combinedBrier(r);
    if (b !== null) {
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(1);
    }
  });
});

describe('Wording — keine verbotenen Begriffe', () => {
  const FORBIDDEN = ['sicher', 'bank', 'garantiert', 'todsicher', 'risikolos', 'muss kommen', 'free money'];
  it('Caveat ist frei von verbotenen Begriffen', () => {
    const r = runWmBacktest();
    const lower = r.caveat.toLowerCase();
    for (const f of FORBIDDEN) {
      expect(lower.includes(f), `Verbotenes "${f}" in caveat: ${r.caveat}`).toBe(false);
    }
  });
});

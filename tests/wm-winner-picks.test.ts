import { describe, expect, it } from 'vitest';
import { rankWmWinnerPicks } from '@/lib/sport/wm-winner-picks';

describe('rankWmWinnerPicks', () => {
  it('Liefert nur 1X2-Sieger-Picks (kein Remis, keine TBD)', () => {
    const picks = rankWmWinnerPicks({ todayIso: '2026-06-11', horizonDays: 14 });
    for (const p of picks) {
      expect(['home', 'away']).toContain(p.winnerSide);
      expect(p.fixture.homeTeam.startsWith('Sieger')).toBe(false);
      expect(p.fixture.awayTeam.startsWith('Sieger')).toBe(false);
      expect(p.fixture.homeTeam.startsWith('Zweiter')).toBe(false);
      expect(p.fixture.awayTeam.startsWith('Zweiter')).toBe(false);
    }
  });

  it('Alle Picks haben Profi-Tipper-Status OK oder WARNUNG (nie BLOCKIERT)', () => {
    const picks = rankWmWinnerPicks({ todayIso: '2026-06-11', horizonDays: 14 });
    for (const p of picks) {
      expect(p.proTipper.status).not.toBe('BLOCKIERT');
    }
  });

  it('ELO-Mindestschwelle 80 wird respektiert', () => {
    const picks = rankWmWinnerPicks({ todayIso: '2026-06-11', horizonDays: 14 });
    for (const p of picks) {
      expect(Math.abs(p.eloDiff)).toBeGreaterThanOrEqual(80);
    }
  });

  it('Modell-Wahrscheinlichkeit >= 60 %', () => {
    const picks = rankWmWinnerPicks({ todayIso: '2026-06-11', horizonDays: 14 });
    for (const p of picks) {
      expect(p.modelProbabilityPct).toBeGreaterThanOrEqual(60);
    }
  });

  it('"Hoechste Konfluenz"-Tier verlangt strengere Schwellen', () => {
    const picks = rankWmWinnerPicks({ todayIso: '2026-06-11', horizonDays: 30 });
    for (const p of picks) {
      if (p.tier === 'hoechste-konfluenz') {
        expect(Math.abs(p.eloDiff)).toBeGreaterThanOrEqual(120);
        expect(p.modelProbabilityPct).toBeGreaterThanOrEqual(70);
        expect(p.proTipper.status).toBe('OK');
      }
    }
  });

  it('Horizont 1 Tag → nur Spiele heute/morgen', () => {
    const picks = rankWmWinnerPicks({ todayIso: '2026-06-11', horizonDays: 1 });
    for (const p of picks) {
      const t = new Date(`${p.fixture.date}T00:00:00`).getTime();
      const cutoff = new Date('2026-06-12T23:59:59').getTime();
      expect(t).toBeLessThanOrEqual(cutoff);
    }
  });
});

describe('Conditions sind im Pick enthalten', () => {
  it('Jeder Pick hat conditions.factors als Array', () => {
    const picks = rankWmWinnerPicks({ todayIso: '2026-06-11', horizonDays: 14 });
    for (const p of picks) {
      expect(Array.isArray(p.conditions.factors)).toBe(true);
      expect(p.conditions.dataCoverage).toBeGreaterThanOrEqual(0);
      expect(p.conditions.dataCoverage).toBeLessThanOrEqual(1);
    }
  });

  it('Wenn conditions vorhanden sind, taucht der erste Faktor in reasons auf', () => {
    const picks = rankWmWinnerPicks({ todayIso: '2026-06-11', horizonDays: 14 });
    for (const p of picks) {
      if (p.conditions.factors.length > 0) {
        const firstLabel = p.conditions.factors[0].label;
        expect(p.reasons).toContain(firstLabel);
      }
    }
  });
});

describe('Wording — keine verbotenen Begriffe', () => {
  const FORBIDDEN = ['sicher', 'bank', 'garantiert', 'todsicher', 'risikolos', 'muss kommen', 'free money'];
  it('reasons + riskNotes frei von verbotenen Begriffen', () => {
    const picks = rankWmWinnerPicks({ todayIso: '2026-06-11', horizonDays: 14 });
    for (const p of picks) {
      for (const text of [...p.reasons, ...p.riskNotes]) {
        const lower = text.toLowerCase();
        for (const f of FORBIDDEN) {
          expect(lower.includes(f), `Verbotenes "${f}" in: ${text}`).toBe(false);
        }
      }
    }
  });
});

describe('Dynamisches ELO im Pick-Ranking', () => {
  it('eloDeltaByTeam erzeugt dynamic-elo Faktor in den conditions', () => {
    const base = rankWmWinnerPicks({ todayIso: '2026-06-11', horizonDays: 14 });
    if (base.length === 0) return; // kein Pick heute → nichts zu pruefen
    const target = base[0];
    const withElo = rankWmWinnerPicks({
      todayIso: '2026-06-11',
      horizonDays: 14,
      eloDeltaByTeam: { [target.fixture.homeTeam]: 40 }
    });
    const samePick = withElo.find((p) => p.fixture.id === target.fixture.id);
    if (samePick) {
      const dyn = samePick.conditions.factors.find((f) => f.id === 'dynamic-elo');
      expect(dyn).toBeDefined();
      expect(dyn!.homeEloDelta).toBe(40);
    }
  });

  it('Delta wird bei +/-60 gedeckelt', () => {
    const base = rankWmWinnerPicks({ todayIso: '2026-06-11', horizonDays: 14 });
    if (base.length === 0) return;
    const target = base[0];
    const withElo = rankWmWinnerPicks({
      todayIso: '2026-06-11',
      horizonDays: 14,
      eloDeltaByTeam: { [target.fixture.homeTeam]: 250 }
    });
    const samePick = withElo.find((p) => p.fixture.id === target.fixture.id);
    if (samePick) {
      const dyn = samePick.conditions.factors.find((f) => f.id === 'dynamic-elo');
      expect(dyn!.homeEloDelta).toBe(60);
    }
  });

  it('Ohne Deltas → kein dynamic-elo Faktor', () => {
    const picks = rankWmWinnerPicks({ todayIso: '2026-06-11', horizonDays: 14 });
    for (const p of picks) {
      expect(p.conditions.factors.find((f) => f.id === 'dynamic-elo')).toBeUndefined();
    }
  });
});

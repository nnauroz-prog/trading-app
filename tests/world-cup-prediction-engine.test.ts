// Tests fuer die Pure-Lib world-cup-prediction-engine.
//
// Akzeptanz-Kriterien aus der Anforderung:
// - Wahrscheinlichkeiten ergeben logisch 100 % oder werden normalisiert
// - schwache Datenlage fuehrt zu niedriger Confidence
// - fehlende Matchdaten erzeugen ehrlichen Empty-State
// - Favorit wird nicht gesetzt, wenn Daten unzureichend sind
// - Ergebnisbereich wird nicht erfunden, wenn Inputdaten fehlen
// - Ranking sortiert korrekt nach Wahrscheinlichkeit
// - Warnings werden ausgegeben, wenn Daten alt oder unvollstaendig sind

import { describe, expect, it } from 'vitest';
import {
  buildWorldCupDashboard,
  predictMatch,
  rankWorldCupWinners
} from '@/lib/sports/world-cup-prediction-engine';
import { WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';

const NOW = '2026-06-14T08:00:00.000Z';

describe('rankWorldCupWinners', () => {
  const ranking = rankWorldCupWinners(NOW, 8);

  it('Liefert hoechstens 8 Teams', () => {
    expect(ranking.length).toBeLessThanOrEqual(8);
  });

  it('Sortiert absteigend nach winProbability', () => {
    for (let i = 1; i < ranking.length; i++) {
      expect(ranking[i - 1].winProbability).toBeGreaterThanOrEqual(ranking[i].winProbability);
    }
  });

  it('Jedes Team hat eine Wahrscheinlichkeit > 0 und <= 100', () => {
    for (const r of ranking) {
      expect.soft(r.winProbability, r.team).toBeGreaterThan(0);
      expect.soft(r.winProbability, r.team).toBeLessThanOrEqual(100);
    }
  });

  it('Top-Favorit hat nie Confidence "high" — Turniersieg ist breit', () => {
    if (ranking.length === 0) return;
    expect(ranking[0].confidence).not.toBe('high');
  });

  it('Reasons sind gefuellt fuer mindestens das Top-Team', () => {
    if (ranking.length === 0) return;
    expect(ranking[0].reasons.length).toBeGreaterThan(0);
  });

  it('limit=3 begrenzt die Anzahl', () => {
    const r3 = rankWorldCupWinners(NOW, 3);
    expect(r3.length).toBeLessThanOrEqual(3);
  });
});

describe('predictMatch — konkrete Paarung', () => {
  const fix = WM_2026_FIXTURES.find((f) => f.id === 'wm-4'); // Deutschland-Curaçao
  it('Fixture wm-4 existiert (Test-Setup)', () => {
    expect(fix).toBeDefined();
  });

  if (!fix) return;

  const pred = predictMatch(fix, NOW);

  it('Wahrscheinlichkeiten summieren sich auf ~100', () => {
    const sum = pred.probabilities.teamA + (pred.probabilities.draw ?? 0) + pred.probabilities.teamB;
    expect(sum).toBeGreaterThanOrEqual(99);
    expect(sum).toBeLessThanOrEqual(101);
  });

  it('predictedWinner ist gesetzt (teamA/teamB/draw, nicht unknown)', () => {
    expect(pred.predictedWinner).not.toBe('unknown');
  });

  it('Reasons enthalten mindestens einen Eintrag', () => {
    expect(pred.reasons.length).toBeGreaterThan(0);
  });

  it('expectedScoreRange ist gesetzt (Engine hat Top-Scorelines)', () => {
    expect(pred.expectedScoreRange).not.toBeNull();
  });

  it('lastUpdated == NOW', () => {
    expect(pred.lastUpdated).toBe(NOW);
  });
});

describe('predictMatch — TBD-Paarung (KO-Slot)', () => {
  const tbdFix: WmFixture = {
    id: 'test-tbd',
    date: '2026-06-28',
    time: '18:00',
    homeTeam: 'Sieger Gruppe A',
    awayTeam: 'Zweiter Gruppe B',
    venue: 'Test Stadium',
    phase: 'Achtelfinale'
  };

  const pred = predictMatch(tbdFix, NOW);

  it('predictedWinner === "unknown"', () => {
    expect(pred.predictedWinner).toBe('unknown');
  });

  it('Confidence === "low"', () => {
    expect(pred.confidence).toBe('low');
  });

  it('DataQuality === "weak"', () => {
    expect(pred.dataQuality).toBe('weak');
  });

  it('expectedScoreRange ist NULL (nichts erfinden)', () => {
    expect(pred.expectedScoreRange).toBeNull();
  });

  it('Reasons sind leer (nichts erfinden)', () => {
    expect(pred.reasons).toEqual([]);
  });

  it('Warnings nennen den Grund', () => {
    expect(pred.warnings.length).toBeGreaterThan(0);
    expect(pred.warnings.join(' ')).toMatch(/noch nicht fest/i);
  });
});

describe('predictMatch — Team ohne Strength-Daten', () => {
  const unknownFix: WmFixture = {
    id: 'test-unknown',
    date: '2026-07-04',
    time: '15:00',
    homeTeam: 'Atlantis',
    awayTeam: 'Lemuria',
    venue: 'Test Stadium',
    phase: 'Gruppe'
  };

  const pred = predictMatch(unknownFix, NOW);

  it('DataQuality === "weak" und Confidence === "low"', () => {
    expect(pred.dataQuality).toBe('weak');
    expect(pred.confidence).toBe('low');
  });

  it('expectedScoreRange ist NULL', () => {
    expect(pred.expectedScoreRange).toBeNull();
  });

  it('Warnings nennen fehlende Daten', () => {
    expect(pred.warnings.length).toBeGreaterThan(0);
    expect(pred.warnings.join(' ')).toMatch(/fehlen/i);
  });

  it('predictedWinner === "unknown"', () => {
    expect(pred.predictedWinner).toBe('unknown');
  });
});

describe('predictMatch — Team A bekannt, Team B unbekannt', () => {
  const halfFix: WmFixture = {
    id: 'test-half',
    date: '2026-07-04',
    time: '15:00',
    homeTeam: 'Deutschland',
    awayTeam: 'Atlantis',
    venue: 'Test Stadium',
    phase: 'Gruppe'
  };

  const pred = predictMatch(halfFix, NOW);

  it('DataQuality === "medium"', () => {
    expect(pred.dataQuality).toBe('medium');
  });

  it('Warnings nennen das unbekannte Team', () => {
    expect(pred.warnings.length).toBeGreaterThan(0);
    expect(pred.warnings.join(' ')).toMatch(/Atlantis/);
  });
});

describe('buildWorldCupDashboard', () => {
  const dashboard = buildWorldCupDashboard({ nowIso: NOW, upcomingLimit: 6 });

  it('topFavorite ist das Team mit der hoechsten Wahrscheinlichkeit', () => {
    expect(dashboard.topFavorite).not.toBeNull();
    expect(dashboard.topFavorite?.team).toBe(dashboard.ranking[0]?.team);
  });

  it('Ranking deckt alle WM-Teams ab', () => {
    expect(dashboard.ranking.length).toBeGreaterThan(8);
  });

  it('upcomingMatches respektiert das Limit', () => {
    expect(dashboard.upcomingMatches.length).toBeLessThanOrEqual(6);
  });

  it('upcomingMatches sind chronologisch sortiert', () => {
    for (let i = 1; i < dashboard.upcomingMatches.length; i++) {
      const prev = dashboard.upcomingMatches[i - 1].startTime ?? '';
      const cur = dashboard.upcomingMatches[i].startTime ?? '';
      if (prev && cur) {
        expect(prev <= cur).toBe(true);
      }
    }
  });

  it('upcomingMatches enthalten keine Spiele in der Vergangenheit', () => {
    const todayIso = NOW.slice(0, 10);
    for (const m of dashboard.upcomingMatches) {
      if (m.startTime) {
        expect.soft(m.startTime.slice(0, 10) >= todayIso, m.matchId).toBe(true);
      }
    }
  });

  it('lastUpdated entspricht der uebergebenen Zeit', () => {
    expect(dashboard.lastUpdated).toBe(NOW);
  });

  it('globalWarnings ist Array (auch wenn leer)', () => {
    expect(Array.isArray(dashboard.globalWarnings)).toBe(true);
  });
});

describe('Wahrscheinlichkeiten-Plausibilitaet', () => {
  it('Pro Match-Prognose mit konkreten Teams: Summe ist 99..101', () => {
    const sample = WM_2026_FIXTURES
      .filter((f) => f.phase === 'Gruppe')
      .slice(0, 10);
    for (const fix of sample) {
      const pred = predictMatch(fix, NOW);
      if (pred.predictedWinner === 'unknown') continue;
      const sum = pred.probabilities.teamA + (pred.probabilities.draw ?? 0) + pred.probabilities.teamB;
      expect.soft(sum, `${fix.id} sum`).toBeGreaterThanOrEqual(99);
      expect.soft(sum, `${fix.id} sum`).toBeLessThanOrEqual(101);
    }
  });

  it('Sieger-Ranking summiert sich nicht auf >100 fuer Top 8', () => {
    const ranking = rankWorldCupWinners(NOW, 8);
    const sum = ranking.reduce((s, r) => s + r.winProbability, 0);
    // Top 8 sollten zusammen unter 100 sein — sonst halluzinieren wir.
    expect(sum).toBeLessThanOrEqual(100);
  });

  it('Sieger-Ranking summiert sich (Top 8) auf eine signifikante Mehrheit (>= 50)', () => {
    const ranking = rankWorldCupWinners(NOW, 8);
    const sum = ranking.reduce((s, r) => s + r.winProbability, 0);
    expect(sum).toBeGreaterThanOrEqual(50);
  });
});

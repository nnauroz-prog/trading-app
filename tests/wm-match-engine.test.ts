import { describe, expect, it } from 'vitest';
import { predictWmMatch } from '@/lib/sport/wm-match-engine';
import { findTeamStrength } from '@/lib/sport/wm-team-strength';

describe('findTeamStrength', () => {
  it('findet Top-Teams direkt', () => {
    expect(findTeamStrength('Frankreich')?.elo).toBeGreaterThan(2050);
    expect(findTeamStrength('Argentinien')?.elo).toBeGreaterThan(2100);
  });

  it('findet Aliase (Englisch + Deutsch)', () => {
    expect(findTeamStrength('France')?.name).toBe('Frankreich');
    expect(findTeamStrength('Germany')?.name).toBe('Deutschland');
    expect(findTeamStrength('Mexico')?.name).toBe('Mexiko');
  });

  it('liefert null bei unbekanntem Team', () => {
    expect(findTeamStrength('Marsianer-XI')).toBe(null);
  });
});

describe('predictWmMatch — Basis-Logik', () => {
  it('Frankreich vs. Saudi-Arabien → Frankreich klarer Favorit', () => {
    const p = predictWmMatch({ homeTeam: 'Frankreich', awayTeam: 'Saudi-Arabien' });
    expect(p.pick.winner).toBe('home');
    expect(p.pick.winnerName).toBe('Frankreich');
    expect(p.regular.homePct).toBeGreaterThan(60);
    expect(p.pick.clarity).toBe('strong');
  });

  it('Saudi-Arabien vs. Frankreich → Auswärtssieg Frankreich klar', () => {
    const p = predictWmMatch({ homeTeam: 'Saudi-Arabien', awayTeam: 'Frankreich' });
    expect(p.pick.winner).toBe('away');
    expect(p.regular.awayPct).toBeGreaterThan(50);
  });

  it('Spanien vs. England → eng, klare Begründung', () => {
    const p = predictWmMatch({ homeTeam: 'Spanien', awayTeam: 'England' });
    expect(['leaning', 'open']).toContain(p.pick.clarity);
    expect(Math.abs(p.regular.homePct - p.regular.awayPct)).toBeLessThan(20);
  });

  it('Summe Heim + Remis + Auswärts = 100', () => {
    const p = predictWmMatch({ homeTeam: 'Brasilien', awayTeam: 'Marokko' });
    expect(p.regular.homePct + p.regular.drawPct + p.regular.awayPct).toBe(100);
  });

  it('withExtraTime summiert zu 100, stärkeres Team hat höhere OT-Quote', () => {
    const p = predictWmMatch({ homeTeam: 'Argentinien', awayTeam: 'Ghana' });
    expect(p.withExtraTime.homePct + p.withExtraTime.awayPct).toBe(100);
    expect(p.withExtraTime.homePct).toBeGreaterThan(p.withExtraTime.awayPct);
  });

  it('Erwartete Tore positiv, plausible Größenordnung (1–4)', () => {
    const p = predictWmMatch({ homeTeam: 'Deutschland', awayTeam: 'Japan' });
    expect(p.expectedGoals.home).toBeGreaterThan(0.5);
    expect(p.expectedGoals.away).toBeGreaterThan(0.3);
    expect(p.expectedGoals.total).toBeGreaterThan(1);
    expect(p.expectedGoals.total).toBeLessThan(5);
  });

  it('Over 0,5 → Over 1,5 → Over 2,5 monoton fallend', () => {
    const p = predictWmMatch({ homeTeam: 'Spanien', awayTeam: 'Brasilien' });
    expect(p.goalMarkets.over15).toBeGreaterThan(p.goalMarkets.over25);
    expect(p.goalMarkets.over25).toBeGreaterThan(p.goalMarkets.over35);
  });
});

describe('predictWmMatch — Spielort-Faktoren', () => {
  it('Azteca + Mexiko zu Hause: Höhen-Bonus +60 ELO', () => {
    const ohneVenue = predictWmMatch({ homeTeam: 'Mexiko', awayTeam: 'Frankreich' });
    const mitAzteca = predictWmMatch({ homeTeam: 'Mexiko', awayTeam: 'Frankreich', venue: 'Estadio Azteca, Mexico City' });
    expect(mitAzteca.regular.homePct).toBeGreaterThan(ohneVenue.regular.homePct);
    expect(mitAzteca.venueFactors.some((v) => v.toLowerCase().includes('höhe'))).toBe(true);
  });

  it('USA in USA-Stadion bekommt Host-Bonus', () => {
    const fern = predictWmMatch({ homeTeam: 'USA', awayTeam: 'Brasilien' });
    const heim = predictWmMatch({ homeTeam: 'USA', awayTeam: 'Brasilien', venue: 'SoFi Stadium, Los Angeles' });
    expect(heim.regular.homePct).toBeGreaterThanOrEqual(fern.regular.homePct);
  });
});

describe('predictWmMatch — Daten-Fallback', () => {
  it('unbekanntes Team senkt dataConfidence', () => {
    const p = predictWmMatch({ homeTeam: 'Wakanda', awayTeam: 'Atlantis' });
    expect(p.dataConfidence).toBeLessThan(60);
  });

  it('Top-Scorelines existieren immer', () => {
    const p = predictWmMatch({ homeTeam: 'Wakanda', awayTeam: 'Brasilien' });
    expect(p.topScorelines.length).toBeGreaterThan(0);
    expect(p.topScorelines[0].probability).toBeGreaterThan(0);
  });
});

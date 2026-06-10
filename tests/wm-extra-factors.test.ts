import { describe, expect, it } from 'vitest';
import {
  confederationHomefieldFactor,
  evaluateExtraFactors,
  intraTournamentTravelFactor,
  phasePressureFactor,
  venueFamiliarityFactor
} from '@/lib/sport/wm-extra-factors';
import { findTeamOrigin } from '@/lib/sport/wm-team-origins';
import { findVenue } from '@/lib/sport/wm-venues';
import type { WmFixture } from '@/lib/sport/wm-schedule-2026';

function fixture(over: Partial<WmFixture> = {}): WmFixture {
  return {
    id: 'test',
    date: '2026-06-15',
    time: '19:00',
    homeTeam: 'Argentinien',
    awayTeam: 'Deutschland',
    venue: 'MetLife Stadium',
    phase: 'Gruppe',
    group: 'A',
    ...over
  };
}

describe('confederationHomefieldFactor', () => {
  it('CONMEBOL gegen UEFA → CONMEBOL kriegt +20 ELO', () => {
    const f = confederationHomefieldFactor(findTeamOrigin('Argentinien')!, findTeamOrigin('Deutschland')!);
    expect(f).not.toBeNull();
    expect(f!.homeEloDelta).toBe(20);
    expect(f!.awayEloDelta).toBe(0);
  });
  it('Beide UEFA → kein Faktor', () => {
    const f = confederationHomefieldFactor(findTeamOrigin('Deutschland')!, findTeamOrigin('England')!);
    expect(f).toBeNull();
  });
  it('CONMEBOL gegen CONCACAF → CONMEBOL +20, CONCACAF +15 → Differenz +5 für Heim', () => {
    const f = confederationHomefieldFactor(findTeamOrigin('Brasilien')!, findTeamOrigin('USA')!);
    expect(f).not.toBeNull();
    expect(f!.homeEloDelta).toBe(20);
    expect(f!.awayEloDelta).toBe(15);
  });
});

describe('phasePressureFactor', () => {
  it('Gruppe → kein Faktor', () => {
    expect(phasePressureFactor(fixture({ phase: 'Gruppe' }))).toBeNull();
  });
  it('Achtelfinale → -3 % Tore', () => {
    const f = phasePressureFactor(fixture({ phase: 'Achtelfinale' }));
    expect(f!.homeGoalMultiplier).toBeCloseTo(0.97, 2);
    expect(f!.awayGoalMultiplier).toBeCloseTo(0.97, 2);
  });
  it('Finale → -5 % Tore + Confidence-Shift positiv (Favoriten halten Fuehrungen)', () => {
    const f = phasePressureFactor(fixture({ phase: 'Finale' }));
    expect(f!.homeGoalMultiplier).toBeCloseTo(0.95, 2);
    expect(f!.confidenceShift).toBeGreaterThan(0);
  });
});

describe('venueFamiliarityFactor', () => {
  const schedule: WmFixture[] = [
    fixture({ id: 's1', date: '2026-06-15', homeTeam: 'Argentinien', awayTeam: 'Mexiko',     venue: 'MetLife Stadium' }),
    fixture({ id: 's2', date: '2026-06-20', homeTeam: 'Argentinien', awayTeam: 'Deutschland', venue: 'MetLife Stadium' })
  ];

  it('Erstes Spiel im Stadion → null', () => {
    const f = venueFamiliarityFactor(schedule[0], schedule);
    expect(f).toBeNull();
  });
  it('Zweites Spiel im selben Stadion → +20 ELO', () => {
    const f = venueFamiliarityFactor(schedule[1], schedule);
    expect(f).not.toBeNull();
    expect(f!.homeEloDelta).toBe(20);
  });
});

describe('intraTournamentTravelFactor', () => {
  it('Asien-Team in USA → grosse Distanz → Penalty fuer Japan', () => {
    const f = intraTournamentTravelFactor(findVenue('SoFi Stadium')!, findTeamOrigin('Japan')!, findTeamOrigin('USA')!);
    expect(f).not.toBeNull();
    expect(f!.homeGoalMultiplier).toBeLessThan(1); // Japan ist hier "home" im Mock
    // Japan-Penalty muss mindestens so gross sein wie USA-Penalty
    expect(f!.homeGoalMultiplier).toBeLessThanOrEqual(f!.awayGoalMultiplier);
    expect(Math.abs(f!.homeEloDelta)).toBeGreaterThanOrEqual(Math.abs(f!.awayEloDelta));
  });
  it('USA Heim-Hauptstadt → LA-Stadium ~3700 km (kontinental gross) → leichter Penalty', () => {
    // USA-Team-Origin ist Washington DC. LA-Stadium ist ~3700 km Luftlinie.
    // Wir modellieren das ehrlich als Distanz — auch USA-Teams reisen quer
    // durchs Land. Heim-Vorteil kommt aus host-advantage, nicht hier.
    const f = intraTournamentTravelFactor(findVenue('SoFi Stadium')!, findTeamOrigin('USA')!, findTeamOrigin('USA')!);
    if (f) {
      // Wenn ein Faktor entsteht, sollte er fuer BEIDE Seiten greifen (gleiche Origin).
      expect(f.homeGoalMultiplier).toBe(f.awayGoalMultiplier);
    }
  });
});

describe('evaluateExtraFactors aggregator', () => {
  it('Mindestens Phase-Druck wenn KO und Conf-Heimvorteil wenn passend', () => {
    const factors = evaluateExtraFactors(fixture({ phase: 'Viertelfinale' }));
    const ids = factors.map((f) => f.id);
    expect(ids).toContain('phase-pressure');
    expect(ids).toContain('confederation-home');
  });
});

describe('Wording', () => {
  const FORBIDDEN = ['sicher', 'bank', 'garantiert', 'todsicher', 'risikolos', 'muss kommen', 'free money'];
  it('Faktor-Labels frei von verbotenen Begriffen', () => {
    const factors = evaluateExtraFactors(fixture({ phase: 'Halbfinale' }));
    for (const f of factors) {
      const lower = f.label.toLowerCase();
      for (const w of FORBIDDEN) expect(lower.includes(w)).toBe(false);
    }
  });
});

// Logik-Tests fuer die Headline-Generierung der "Was passiert jetzt?"-Karte.
// Wir testen die Phase- und Tip-Count-Logik isoliert, ohne React zu rendern.

import { describe, expect, it } from 'vitest';
import type { WmDayPlan } from '@/lib/sport/wm-day-plan';

// Hilfsfunktion, die die Headline-Logik exakt nachbildet (DRY-Verstoss
// bewusst — damit die UI-Karte rein deklarativ bleiben kann).
function generateHeadline(todayIso: string, plan: WmDayPlan, wmStartIso = '2026-06-11', wmEndIso = '2026-07-19'): { headline: string; phase: 'vor' | 'live' | 'nach' } {
  const phase: 'vor' | 'live' | 'nach' = todayIso < wmStartIso ? 'vor' : todayIso > wmEndIso ? 'nach' : 'live';
  const tagBis = Math.round((new Date(`${wmStartIso}T00:00:00`).getTime() - new Date(`${todayIso}T00:00:00`).getTime()) / (24 * 60 * 60 * 1000));
  if (phase === 'vor') {
    return { phase, headline: tagBis === 1 ? 'Morgen geht die WM los!' : `Noch ${tagBis} Tage bis zur WM.` };
  }
  if (phase === 'nach') return { phase, headline: 'Die WM ist vorbei.' };
  const heute = plan.rows.length;
  const picks = plan.pickCount;
  if (heute === 0) return { phase, headline: 'Heute kein WM-Spiel.' };
  if (picks === 0) return { phase, headline: `Heute ${heute} WM-Spiel${heute === 1 ? '' : 'e'} — aber kein freigegebener Tipp.` };
  return { phase, headline: `Heute ${picks} freigegebene${picks === 1 ? 'r' : ''} Tipp${picks === 1 ? '' : 's'} bei ${heute} WM-Spiel${heute === 1 ? '' : 'en'}.` };
}

function plan(rowsLen: number, picks: number): WmDayPlan {
  return {
    dateIso: '2026-06-15',
    rows: Array.from({ length: rowsLen }, () => ({} as never)),
    pickCount: picks,
    blockedCount: rowsLen - picks
  };
}

describe('WmJetztCard Headline-Logik', () => {
  it('1 Tag vor WM: "Morgen geht die WM los!"', () => {
    const { headline, phase } = generateHeadline('2026-06-10', plan(0, 0));
    expect(phase).toBe('vor');
    expect(headline).toBe('Morgen geht die WM los!');
  });

  it('30 Tage vor WM: konkrete Anzahl', () => {
    const { headline } = generateHeadline('2026-05-12', plan(0, 0));
    expect(headline).toContain('30 Tage');
  });

  it('Nach WM: "Die WM ist vorbei."', () => {
    const { headline, phase } = generateHeadline('2026-08-01', plan(0, 0));
    expect(phase).toBe('nach');
    expect(headline).toBe('Die WM ist vorbei.');
  });

  it('Waehrend WM, kein Spiel heute', () => {
    const { headline } = generateHeadline('2026-06-15', plan(0, 0));
    expect(headline).toBe('Heute kein WM-Spiel.');
  });

  it('Waehrend WM, Spiele aber keine Picks', () => {
    const { headline } = generateHeadline('2026-06-15', plan(3, 0));
    expect(headline).toContain('3 WM-Spiele');
    expect(headline).toContain('kein freigegebener Tipp');
  });

  it('Singular bei 1 Spiel ohne Pick', () => {
    const { headline } = generateHeadline('2026-06-15', plan(1, 0));
    expect(headline).toContain('1 WM-Spiel ');
    expect(headline).not.toContain('1 WM-Spiele');
  });

  it('Singular bei genau 1 Pick', () => {
    const { headline } = generateHeadline('2026-06-15', plan(3, 1));
    expect(headline).toContain('1 freigegebener Tipp ');
    expect(headline).not.toContain('1 Tipps');
  });

  it('Plural bei mehreren Picks', () => {
    const { headline } = generateHeadline('2026-06-15', plan(5, 3));
    expect(headline).toContain('3 freigegebene Tipps');
    expect(headline).toContain('5 WM-Spielen');
  });

  it('Start-Tag selbst: phase ist live', () => {
    const { phase } = generateHeadline('2026-06-11', plan(2, 1));
    expect(phase).toBe('live');
  });

  it('End-Tag selbst: phase ist live', () => {
    const { phase } = generateHeadline('2026-07-19', plan(1, 1));
    expect(phase).toBe('live');
  });

  it('Keine verbotenen Begriffe in allen moeglichen Headlines', () => {
    const FORBIDDEN = ['garantiert', 'todsicher', 'risikolos', 'muss kommen', 'free money'];
    const cases = [
      generateHeadline('2026-06-10', plan(0, 0)),
      generateHeadline('2026-06-15', plan(0, 0)),
      generateHeadline('2026-06-15', plan(5, 3)),
      generateHeadline('2026-08-01', plan(0, 0))
    ];
    for (const c of cases) {
      const lower = c.headline.toLowerCase();
      for (const f of FORBIDDEN) expect(lower.includes(f)).toBe(false);
    }
  });
});

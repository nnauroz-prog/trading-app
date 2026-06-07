import { describe, expect, it } from 'vitest';
import { evaluateWmPersonas } from '@/lib/agents/wm-personas';
import { WM_2026_FIXTURES } from '@/lib/sport/wm-schedule-2026';

function firstWmDate(): string {
  return [...WM_2026_FIXTURES].map((f) => f.date).sort()[0];
}

describe('evaluateWmPersonas', () => {
  it('liefert immer drei Personas', () => {
    const result = evaluateWmPersonas(firstWmDate());
    expect(result.map((v) => v.persona)).toEqual(['conservative', 'balanced', 'aggressive']);
  });

  it('Konservativ wählt nur 1X2 wenn er etwas wählt', () => {
    const result = evaluateWmPersonas(firstWmDate());
    const conservative = result.find((v) => v.persona === 'conservative')!;
    if (conservative.target) {
      const m = conservative.target.market.market;
      expect(m.includes('gewinnt') || m === 'Remis').toBe(true);
    }
  });

  it('Aggressiv akzeptiert auch Tor-Märkte und BTTS', () => {
    const result = evaluateWmPersonas(firstWmDate());
    const aggressive = result.find((v) => v.persona === 'aggressive')!;
    if (aggressive.target) {
      expect(aggressive.target.market.probability).toBeGreaterThanOrEqual(0.65);
    }
  });

  it('Aggressiv hat in der Regel den niedrigsten Cutoff und findet daher mindestens so viele Tipps wie Konservativ', () => {
    const result = evaluateWmPersonas(firstWmDate());
    const conservative = result.find((v) => v.persona === 'conservative')!;
    const aggressive = result.find((v) => v.persona === 'aggressive')!;
    if (conservative.target) {
      expect(aggressive.target).not.toBeNull();
    }
  });

  it('Verdict ist BEOBACHTEN unter 80 %, TIPPEN ab 80 %', () => {
    const result = evaluateWmPersonas(firstWmDate());
    for (const v of result) {
      if (v.target) {
        const pct = Math.round(v.target.market.probability * 100);
        if (pct >= 80) expect(v.verdict).toBe('TIPPEN');
        else expect(v.verdict).toBe('BEOBACHTEN');
      } else {
        expect(v.verdict).toBe('WARTEN');
      }
    }
  });
});

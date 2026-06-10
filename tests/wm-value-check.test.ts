import { describe, expect, it } from 'vitest';
import { evaluateWmValue } from '@/lib/sport/wm-value-check';

describe('evaluateWmValue', () => {
  it('Modell 60 %, Quote 1.67 -> nahe fair', () => {
    const v = evaluateWmValue(60, 1.67);
    expect(v.fairOdds).toBe(1.67);
    expect(v.edgePct).toBe(0.2);
    expect(v.verdict).toBe('fair');
  });

  it('Modell 60 %, Quote 2.00 -> value', () => {
    const v = evaluateWmValue(60, 2.0);
    expect(v.fairOdds).toBe(1.67);
    expect(v.edgePct).toBe(20);
    expect(v.verdict).toBe('value');
  });

  it('Modell 60 %, Quote 1.40 -> unter-quote', () => {
    const v = evaluateWmValue(60, 1.4);
    expect(v.edgePct).toBe(-16);
    expect(v.verdict).toBe('unter-quote');
  });

  it('Edge +1 % zaehlt noch als fair (Toleranz 1.5 ppt)', () => {
    const v = evaluateWmValue(60, 1.68);
    expect(v.verdict).toBe('fair');
  });

  it('Edge +2 % zaehlt als value', () => {
    const v = evaluateWmValue(60, 1.7);
    expect(v.edgePct).toBeGreaterThan(1.5);
    expect(v.verdict).toBe('value');
  });

  it('Wahrscheinlichkeit 0 -> ungueltig', () => {
    const v = evaluateWmValue(0, 2);
    expect(v.verdict).toBe('ungueltig');
    expect(v.fairOdds).toBeNull();
  });

  it('Wahrscheinlichkeit 100 -> ungueltig', () => {
    const v = evaluateWmValue(100, 1.01);
    expect(v.verdict).toBe('ungueltig');
  });

  it('Quote <= 1 -> ungueltig', () => {
    const v = evaluateWmValue(60, 1);
    expect(v.verdict).toBe('ungueltig');
  });

  it('Hint nennt faire Quote auf 2 Nachkommastellen', () => {
    const v = evaluateWmValue(72, 1.5);
    expect(v.hint).toContain('1.39');
  });

  it('Fair-Quote rundet auf 2 Nachkommastellen', () => {
    const v = evaluateWmValue(33, 3.0);
    expect(v.fairOdds).toBe(3.03);
  });
});

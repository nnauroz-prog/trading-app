import { describe, expect, it } from 'vitest';
import { evaluateDirection } from '@/lib/review/evaluator';

describe('evaluateDirection', () => {
  describe('BUY', () => {
    it('is correct when price moved up', () => {
      const result = evaluateDirection('BUY', 5);
      expect(result.correct).toBe(true);
      expect(result.verdict).toBe('good');
    });

    it('is bad when price dropped meaningfully', () => {
      const result = evaluateDirection('BUY', -3);
      expect(result.correct).toBe(false);
      expect(result.verdict).toBe('bad');
    });

    it('is neutral when price barely moved against the call', () => {
      const result = evaluateDirection('BUY', -0.5);
      expect(result.correct).toBe(false);
      expect(result.verdict).toBe('neutral');
    });
  });

  describe('SELL / AVOID', () => {
    it('SELL is correct when price dropped', () => {
      expect(evaluateDirection('SELL', -4).correct).toBe(true);
    });

    it('AVOID is correct when price dropped', () => {
      expect(evaluateDirection('AVOID', -4).correct).toBe(true);
    });

    it('SELL is bad when price climbed', () => {
      const result = evaluateDirection('SELL', 3);
      expect(result.correct).toBe(false);
      expect(result.verdict).toBe('bad');
    });
  });

  describe('HOLD / WATCH', () => {
    it('HOLD is good when price stayed within ±2.5%', () => {
      expect(evaluateDirection('HOLD', 1).verdict).toBe('good');
      expect(evaluateDirection('HOLD', -2).verdict).toBe('good');
      expect(evaluateDirection('HOLD', 2.5).verdict).toBe('good');
    });

    it('HOLD is neutral when the swing breached the band', () => {
      expect(evaluateDirection('HOLD', 5).verdict).toBe('neutral');
      expect(evaluateDirection('HOLD', -7).verdict).toBe('neutral');
    });

    it('WATCH behaves like HOLD for verdict mapping', () => {
      expect(evaluateDirection('WATCH', 1).verdict).toBe('good');
      expect(evaluateDirection('WATCH', 6).verdict).toBe('neutral');
    });
  });
});

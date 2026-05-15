import { describe, expect, it } from 'vitest';
import { classifyText } from '@/lib/providers/sentiment';

describe('classifyText', () => {
  it('returns neutral for empty input', () => {
    expect(classifyText('')).toBe('neutral');
    expect(classifyText('   ')).toBe('neutral');
  });

  it('returns neutral when no keywords match', () => {
    expect(classifyText('the company released its quarterly report')).toBe('neutral');
  });

  it('flags clearly positive English headlines', () => {
    expect(classifyText('stock surges after upgrade and record growth')).toBe('positive');
    expect(classifyText('company announces breakthrough partnership')).toBe('positive');
  });

  it('flags clearly negative English headlines', () => {
    expect(classifyText('shares plunge amid lawsuit and downgrade')).toBe('negative');
    expect(classifyText('analysts warn about weak earnings and fraud probe')).toBe('negative');
  });

  it('recognises German positive vocabulary', () => {
    expect(classifyText('aktie steigt nach starkem gewinn')).toBe('positive');
  });

  it('recognises German negative vocabulary', () => {
    expect(classifyText('verlust und einbruch sorgen für sorgen am markt')).toBe('negative');
  });

  it('returns neutral when positive and negative balance out', () => {
    expect(classifyText('growth offset by losses')).toBe('neutral');
  });

  it('is case-insensitive and tokenises by non-letter boundaries', () => {
    expect(classifyText('SURGE!!! Stock JUMPED 12%')).toBe('positive');
  });
});

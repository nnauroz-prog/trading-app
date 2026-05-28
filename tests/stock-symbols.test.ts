import { describe, expect, it } from 'vitest';
import { resolveStockSymbol } from '@/lib/data/stock-symbols';

describe('resolveStockSymbol', () => {
  it('maps known German stocks to XETRA symbols', () => {
    expect(resolveStockSymbol('BMW')).toBe('BMW.DE');
    expect(resolveStockSymbol('bmw')).toBe('BMW.DE');
    expect(resolveStockSymbol('Volkswagen')).toBe('VOW3.DE');
    expect(resolveStockSymbol('SAP')).toBe('SAP.DE');
  });
  it('maps known US stocks to plain tickers', () => {
    expect(resolveStockSymbol('Tesla')).toBe('TSLA');
    expect(resolveStockSymbol('NVIDIA')).toBe('NVDA');
  });
  it('passes through symbol-like inputs', () => {
    expect(resolveStockSymbol('AAPL')).toBe('AAPL');
    expect(resolveStockSymbol('XYZ.DE')).toBe('XYZ.DE');
  });
  it('returns null for non-symbol garbage', () => {
    expect(resolveStockSymbol('das ist ein langer satz')).toBeNull();
  });
});

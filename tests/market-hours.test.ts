import { describe, expect, it } from 'vitest';
import { usMarketState, xetraMarketState } from '@/lib/market/market-hours';

describe('usMarketState', () => {
  it('Wochenende → weekend', () => {
    const sat = new Date('2026-06-13T14:00:00Z'); // Samstag mittags
    const sun = new Date('2026-06-14T14:00:00Z');
    expect(usMarketState(sat).status).toBe('weekend');
    expect(usMarketState(sun).status).toBe('weekend');
  });

  it('Mo-Fr 10:00 ET (14:00 UTC im Sommer) → open', () => {
    // 14:00 UTC, in EDT (UTC-4 im Juni) → 10:00 ET
    const d = new Date('2026-06-15T14:00:00Z'); // Montag
    expect(usMarketState(d).status).toBe('open');
  });

  it('Mo-Fr 8:00 ET → pre-market', () => {
    // 12:00 UTC im Juni → 8:00 ET
    const d = new Date('2026-06-15T12:00:00Z');
    expect(usMarketState(d).status).toBe('pre');
  });

  it('Mo-Fr 17:00 ET → after-hours', () => {
    // 21:00 UTC im Juni → 17:00 ET
    const d = new Date('2026-06-15T21:00:00Z');
    expect(usMarketState(d).status).toBe('after');
  });

  it('Mo-Fr 23:00 ET → closed (außerhalb after)', () => {
    // 03:00 UTC am 16. → 23:00 ET am 15.
    const d = new Date('2026-06-16T03:00:00Z');
    expect(usMarketState(d).status).toBe('closed');
  });

  it('Label und Detail sind nicht leer', () => {
    const d = new Date('2026-06-15T14:00:00Z');
    const s = usMarketState(d);
    expect(s.label.length).toBeGreaterThan(0);
    expect(s.detail.length).toBeGreaterThan(0);
  });
});

describe('xetraMarketState', () => {
  it('Wochenende → weekend', () => {
    const sat = new Date('2026-06-13T10:00:00Z');
    expect(xetraMarketState(sat).status).toBe('weekend');
  });

  it('Mo-Fr 10:00 Berlin (8:00 UTC im Sommer) → open', () => {
    // 8:00 UTC im Juni in Berlin (CEST = UTC+2) → 10:00 Berlin
    const d = new Date('2026-06-15T08:00:00Z');
    expect(xetraMarketState(d).status).toBe('open');
  });

  it('Mo-Fr 22:00 Berlin → closed', () => {
    // 20:00 UTC im Juni → 22:00 Berlin
    const d = new Date('2026-06-15T20:00:00Z');
    expect(xetraMarketState(d).status).toBe('closed');
  });

  it('Mo-Fr 06:00 Berlin → closed', () => {
    // 4:00 UTC im Juni → 6:00 Berlin
    const d = new Date('2026-06-15T04:00:00Z');
    expect(xetraMarketState(d).status).toBe('closed');
  });
});

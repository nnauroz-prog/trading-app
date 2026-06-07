import { describe, expect, it } from 'vitest';
import { computeTaxStatusDe, TAX_FREE_HOLDING_DAYS } from '@/lib/gold/tax-status-de';

describe('computeTaxStatusDe', () => {
  it('unter 365 Tagen → noch steuerpflichtig', () => {
    const s = computeTaxStatusDe('2026-01-01', '2026-06-01');
    expect(s.isTaxFree).toBe(false);
    expect(s.label).toBe('noch steuerpflichtig');
    expect(s.daysToTaxFree).toBeGreaterThan(0);
    expect(s.holdingDays).toBe(151);
  });

  it('exakt 365 Tage → steuerfrei', () => {
    const s = computeTaxStatusDe('2025-06-09', '2026-06-09');
    expect(s.isTaxFree).toBe(true);
    expect(s.daysToTaxFree).toBe(0);
    expect(s.label).toBe('steuerfrei');
    expect(s.holdingDays).toBe(TAX_FREE_HOLDING_DAYS);
  });

  it('über 365 Tagen → steuerfrei', () => {
    const s = computeTaxStatusDe('2024-01-01', '2026-06-01');
    expect(s.isTaxFree).toBe(true);
    expect(s.daysToTaxFree).toBe(0);
  });

  it('Kauf in der Zukunft → 0 Tage Haltedauer (kein negative)', () => {
    const s = computeTaxStatusDe('2030-01-01', '2026-06-01');
    expect(s.holdingDays).toBe(0);
    expect(s.isTaxFree).toBe(false);
  });

  it('ungültiges Datum → label "kein Datum"', () => {
    const s = computeTaxStatusDe('not-a-date', '2026-06-09');
    expect(s.label).toBe('kein Datum');
    expect(s.isTaxFree).toBe(false);
  });

  it('daysToTaxFree ist 30 Tage vor Ablauf', () => {
    // 335 Tage Haltedauer → 30 Tage bis steuerfrei.
    const s = computeTaxStatusDe('2025-07-09', '2026-06-09');
    expect(s.holdingDays).toBe(335);
    expect(s.daysToTaxFree).toBe(30);
  });
});

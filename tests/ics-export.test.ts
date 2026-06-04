import { describe, expect, it } from 'vitest';
import { tipsToIcs } from '@/lib/sport/ics-export';
import type { TipJournalEntry } from '@/lib/sport/tip-journal';

function entry(over: Partial<TipJournalEntry>): TipJournalEntry {
  return {
    id: 'x', fixtureId: 'fx', recordedAt: 0,
    league: 'Bundesliga', date: '2026-08-21', homeTeam: 'Bayern', awayTeam: 'BVB',
    tier: 'standard', market: 'Heimsieg Bayern', modelProbabilityPct: 65,
    outcome: 'pending',
    ...over
  };
}

describe('tipsToIcs', () => {
  it('liefert gültigen VCALENDAR-Wrapper', () => {
    const ics = tipsToIcs([]);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
  });

  it('erzeugt VEVENT für jeden offenen Tipp', () => {
    const ics = tipsToIcs([
      entry({ id: '1' }),
      entry({ id: '2' })
    ]);
    expect(ics.split('BEGIN:VEVENT').length - 1).toBe(2);
  });

  it('ignoriert ausgewertete Tipps', () => {
    const ics = tipsToIcs([
      entry({ id: '1', outcome: 'pending' }),
      entry({ id: '2', outcome: 'win' })
    ]);
    expect(ics.split('BEGIN:VEVENT').length - 1).toBe(1);
  });

  it('escaped Kommata im Markt', () => {
    const ics = tipsToIcs([entry({ id: '1', market: 'Tipp, mit Komma' })]);
    expect(ics).toContain('Tipp\\, mit Komma');
  });

  it('hat ein VALARM mit -PT60M Trigger', () => {
    const ics = tipsToIcs([entry({ id: '1' })]);
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:-PT60M');
  });

  it('Datum wird in YYYYMMDD-Format umgewandelt', () => {
    const ics = tipsToIcs([entry({ id: '1', date: '2026-08-21' })]);
    expect(ics).toContain('20260821');
  });
});

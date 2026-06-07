import { describe, expect, it } from 'vitest';
import { personaHistoryToCsv, CSV_HEADERS } from '@/lib/agents/persona-history-export';
import type { HistoryEntry } from '@/lib/agents/persona-history';

function entry(dateIso: string, klass: string, personaId: string, verdict: string, targetLabel: string | null = null): HistoryEntry {
  return { dateIso, klass, personaId, verdict, targetLabel };
}

describe('personaHistoryToCsv', () => {
  it('leere Historie → nur Header', () => {
    const csv = personaHistoryToCsv([]);
    expect(csv).toBe(CSV_HEADERS.join(';') + '\r\n');
  });

  it('eine Zeile wird angehängt', () => {
    const csv = personaHistoryToCsv([entry('2026-06-09', 'Aktien', 'conservative', 'KAUFEN', 'Apple')]);
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('2026-06-09;Aktien;conservative;KAUFEN;Apple');
  });

  it('null targetLabel wird zu leerem String', () => {
    const csv = personaHistoryToCsv([entry('2026-06-09', 'Aktien', 'c', 'WARTEN', null)]);
    const fields = csv.trim().split('\r\n')[1].split(';');
    expect(fields[4]).toBe('');
  });

  it('Sortierung: chronologisch, dann Asset-Klasse, dann Persona-ID', () => {
    const csv = personaHistoryToCsv([
      entry('2026-06-09', 'Rohstoffe', 'c', 'KAUFEN'),
      entry('2026-06-09', 'Aktien', 'b', 'WARTEN'),
      entry('2026-06-08', 'Aktien', 'a', 'KAUFEN'),
      entry('2026-06-09', 'Aktien', 'a', 'BEOBACHTEN')
    ]);
    const lines = csv.trim().split('\r\n');
    // Erwartete Reihenfolge: 08-Aktien-a, 09-Aktien-a, 09-Aktien-b, 09-Rohstoffe-c
    expect(lines[1].startsWith('2026-06-08;Aktien;a')).toBe(true);
    expect(lines[2].startsWith('2026-06-09;Aktien;a')).toBe(true);
    expect(lines[3].startsWith('2026-06-09;Aktien;b')).toBe(true);
    expect(lines[4].startsWith('2026-06-09;Rohstoffe;c')).toBe(true);
  });

  it('Semikolon im targetLabel wird escaped', () => {
    const csv = personaHistoryToCsv([entry('2026-06-09', 'WM', 'a', 'TIPPEN', 'A; B')]);
    expect(csv).toContain('"A; B"');
  });

  it('mehrere Einträge erhalten ihre Datenintegrität', () => {
    const entries: HistoryEntry[] = [
      entry('2026-06-09', 'Krypto', 'c', 'BUY', 'BTC'),
      entry('2026-06-09', 'WM', 'a', 'TIPPEN', 'Argentinien'),
      entry('2026-06-09', 'Liga-Fußball', 'b', 'BEOBACHTEN', 'Bayern – Hertha')
    ];
    const csv = personaHistoryToCsv(entries);
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(4); // Header + 3
  });
});

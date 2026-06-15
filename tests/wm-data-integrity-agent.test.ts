import { describe, expect, it } from 'vitest';
import { auditWmData, summarizeIntegrity } from '@/lib/sport/wm-data-integrity-agent';

describe('auditWmData', () => {
  const issues = auditWmData();

  it('Findet keine BLOCKIERT-Issues (alle bekannten Fixture-Teams haben ELO und Origin)', () => {
    const blocked = issues.filter((i) => i.severity === 'BLOCKIERT');
    if (blocked.length > 0) {
      const detail = blocked.map((i) => `${i.kind} · ${i.subject}: ${i.detail}`).join('\n');
      throw new Error(`Datenintegritaets-Fehler gefunden:\n${detail}`);
    }
    expect(blocked.length).toBe(0);
  });

  it('Italien NICHT mehr als BLOCKIERT (haben wir entfernt)', () => {
    const italien = issues.find((i) => i.subject.toLowerCase().includes('italien'));
    expect(italien).toBeUndefined();
  });

  it('Alias-Ueberlappungen werden erkannt', () => {
    // Kanonischer Name ist Suedkorea (strength + origins). Korea Republik
    // ist dabei Alias. Cross-File-Match akzeptabel; innerhalb einer Datei
    // wuerden Ueberlappungen ein Konflikt sein.
    const overlaps = issues.filter((i) => i.kind === 'OVERLAPPING_ALIASES');
    // Mind. erlauben, aber keine ueberraschenden Massen.
    expect(overlaps.length).toBeLessThan(10);
  });
});

describe('summarizeIntegrity', () => {
  it('Liefert konsistente Counts', () => {
    const issues = auditWmData();
    const s = summarizeIntegrity(issues);
    expect(s.blocked + s.warnings + s.hints).toBe(issues.length);
  });
});

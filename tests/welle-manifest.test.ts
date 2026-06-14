// Lint-Gate: das Welle-Manifest muss zum aktuellen BUILD_MARKER passen
// und jeder Eintrag muss eine konkrete User-Wirkung beschreiben.
//
// Sinn: bricht den "Lieferung-als-Beruhigung"-Loop. Eine Welle, die
// nur interne Tests aendert, darf nicht als Wert-Welle vermarktet
// werden.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WELLEN, latestWelle, findWelleByMarker, isUserImpactConcrete } from '@/lib/sport/welle-manifest';

describe('Welle-Manifest', () => {
  it('Enthaelt mindestens einen Eintrag', () => {
    expect(WELLEN.length).toBeGreaterThan(0);
  });

  it('Jeder Eintrag hat range, userImpact, buildMarker, date', () => {
    for (const w of WELLEN) {
      expect.soft(w.range, 'range').toMatch(/^\d{5}-\d{5}$/);
      expect.soft(w.buildMarker, 'buildMarker').toMatch(/^welle-\d{5}-\d{5}-/);
      expect.soft(w.date, 'date').toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect.soft(w.userImpact.length, `userImpact "${w.range}"`).toBeGreaterThan(30);
    }
  });

  it('userImpact ist konkret (kein "interne Tests", "Refactor" o.ae.)', () => {
    for (const w of WELLEN) {
      expect(
        isUserImpactConcrete(w.userImpact),
        `Welle ${w.range}: userImpact zu vage — "${w.userImpact}"`
      ).toBe(true);
    }
  });

  it('Neueste Welle entspricht dem aktuellen BUILD_MARKER in next.config.ts', () => {
    const configPath = join(process.cwd(), 'next.config.ts');
    const config = readFileSync(configPath, 'utf-8');
    const m = config.match(/BUILD_MARKER\s*=\s*'([^']+)'/);
    expect(m, 'BUILD_MARKER in next.config.ts gefunden').not.toBeNull();
    const marker = m![1];
    const welle = findWelleByMarker(marker);
    expect(
      welle,
      `Welle-Manifest hat keinen Eintrag fuer BUILD_MARKER "${marker}". Fuege einen in lib/sport/welle-manifest.ts hinzu.`
    ).not.toBeNull();
  });

  it('Welle-Ranges sind eindeutig', () => {
    const ranges = WELLEN.map((w) => w.range);
    expect(new Set(ranges).size).toBe(ranges.length);
  });

  it('Neueste Welle zuerst — latestWelle() == WELLEN[0]', () => {
    // Range-Nummerierung kann je nach Liefer-Kontext unterschiedlich sein
    // (z.B. Auftrag mit explizitem Welle-Label). Wir pruefen nur dass die
    // erste Position semantisch die "neueste ausgelieferte" Welle ist.
    expect(latestWelle()).toBe(WELLEN[0]);
  });
});

describe('isUserImpactConcrete — vage Aussagen erkennen', () => {
  it('Akzeptiert konkrete End-User-Saetze', () => {
    expect(isUserImpactConcrete('Du siehst jetzt auf der Sport-Page pro Spiel den Modell-Gewinner mit Confidence-Prozent.')).toBe(true);
    expect(isUserImpactConcrete('Eine teilbare URL pro Match-Tipp existiert jetzt.')).toBe(true);
  });

  it('Lehnt leere oder zu kurze Aussagen ab', () => {
    expect(isUserImpactConcrete('')).toBe(false);
    expect(isUserImpactConcrete('mehr Tests')).toBe(false);
    expect(isUserImpactConcrete('   ')).toBe(false);
  });

  it('Lehnt Refactor/Cleanup/Wartung-Phrasen ab', () => {
    expect(isUserImpactConcrete('Refactor von X')).toBe(false);
    expect(isUserImpactConcrete('Code-Cleanup in lib/sport')).toBe(false);
    expect(isUserImpactConcrete('Interne Tests + Lint')).toBe(false);
    expect(isUserImpactConcrete('Aufraeumen')).toBe(false);
    expect(isUserImpactConcrete('Polish')).toBe(false);
    expect(isUserImpactConcrete('Wartung')).toBe(false);
    expect(isUserImpactConcrete('Bugfixes')).toBe(false);
  });
});

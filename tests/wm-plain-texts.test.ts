import { describe, expect, it } from 'vitest';
import { PLAIN_HINTS, PLAIN_BLOCK_REASONS } from '@/lib/sport/wm-plain-texts';
import { WM_GLOSSAR } from '@/lib/sport/wm-glossar';

const FORBIDDEN = ['sicher tipp', 'maximal sicher', 'sehr sicher', 'sicherer tipp', 'bank-tipp', 'garantiert', 'todsicher', 'free money', 'geldmaschine', '100 % treffer', 'risikolos', 'muss kommen'];

describe('PLAIN_HINTS', () => {
  it('Mindestens 10 Karten erklaert', () => {
    expect(Object.keys(PLAIN_HINTS).length).toBeGreaterThanOrEqual(10);
  });

  it('Jeder Hint ist kurz (max 200 Zeichen)', () => {
    for (const [id, text] of Object.entries(PLAIN_HINTS)) {
      expect(text.length, `${id} zu lang`).toBeLessThanOrEqual(200);
    }
  });

  it('Keine verbotenen Begriffe', () => {
    for (const [id, text] of Object.entries(PLAIN_HINTS)) {
      const lower = text.toLowerCase();
      for (const f of FORBIDDEN) {
        expect(lower.includes(f), `Verbotenes "${f}" in PLAIN_HINTS[${id}]: ${text}`).toBe(false);
      }
    }
  });

  it('Keine Technik-Begriffe ohne Erklaerung', () => {
    const techJargon = ['unstable_cache', 'localStorage', 'useEffect', 'useState', 'pure-lib', 'fixture-id', 'snapshot'];
    for (const [id, text] of Object.entries(PLAIN_HINTS)) {
      const lower = text.toLowerCase();
      for (const j of techJargon) {
        expect(lower.includes(j), `Technik-Begriff "${j}" in PLAIN_HINTS[${id}]: ${text}`).toBe(false);
      }
    }
  });
});

describe('PLAIN_BLOCK_REASONS', () => {
  it('Deckt die 4 Block-Status ab', () => {
    expect(PLAIN_BLOCK_REASONS['blocked-tbd']).toBeDefined();
    expect(PLAIN_BLOCK_REASONS['blocked-placeholder']).toBeDefined();
    expect(PLAIN_BLOCK_REASONS['blocked-mismatch']).toBeDefined();
    expect(PLAIN_BLOCK_REASONS['kein-pick-filter']).toBeDefined();
  });

  it('Keine verbotenen Begriffe', () => {
    for (const text of Object.values(PLAIN_BLOCK_REASONS)) {
      const lower = text.toLowerCase();
      for (const f of FORBIDDEN) expect(lower.includes(f)).toBe(false);
    }
  });
});

describe('WM_GLOSSAR', () => {
  it('Mindestens 25 Begriffe erklaert', () => {
    expect(WM_GLOSSAR.length).toBeGreaterThanOrEqual(25);
  });

  it('Alle 5 Kategorien vertreten', () => {
    const cats = new Set(WM_GLOSSAR.map((e) => e.category));
    expect(cats.has('pick')).toBe(true);
    expect(cats.has('lernen')).toBe(true);
    expect(cats.has('daten')).toBe(true);
    expect(cats.has('geld')).toBe(true);
    expect(cats.has('sicherheit')).toBe(true);
  });

  it('Jede Erklaerung max 200 Zeichen', () => {
    for (const e of WM_GLOSSAR) {
      expect(e.plain.length, `${e.term} zu lang`).toBeLessThanOrEqual(200);
    }
  });

  it('Keine doppelten Begriffe', () => {
    const terms = WM_GLOSSAR.map((e) => e.term.toLowerCase());
    expect(new Set(terms).size).toBe(terms.length);
  });

  it('Keine verbotenen Begriffe in Erklaerungen', () => {
    for (const e of WM_GLOSSAR) {
      const lower = e.plain.toLowerCase();
      for (const f of FORBIDDEN) {
        expect(lower.includes(f), `Verbotenes "${f}" bei "${e.term}"`).toBe(false);
      }
    }
  });

  it('Kernbegriffe vorhanden', () => {
    const terms = WM_GLOSSAR.map((e) => e.term);
    for (const t of ['Modell-Favorit', 'Hoechste Konfluenz', 'ELO-Punkte', 'Bankroll', 'Half-Kelly', 'Kalibrierung', 'MATCH', 'MISMATCH']) {
      expect(terms, `${t} fehlt`).toContain(t);
    }
  });
});

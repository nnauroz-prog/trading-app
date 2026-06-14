import { describe, expect, it } from 'vitest';
import {
  TIER1_SOURCES,
  TIER2_SOURCES,
  AGGREGATOR_SOURCES,
  tierOfDomain,
  isTier1Source,
  commentCitesTier1,
  reachableTier1Domains
} from '@/lib/sport/wm-source-tiers';

describe('Quellen-Tier-System', () => {
  it('FIFA ist Tier-1 und erreichbar', () => {
    const entry = TIER1_SOURCES.find((s) => s.domain === 'fifa.com');
    expect(entry).toBeDefined();
    expect(entry?.reachable).toBe(true);
    expect(isTier1Source('fifa.com')).toBe(true);
    expect(isTier1Source('www.fifa.com')).toBe(true);
  });

  it('ESPN, Sky und kicker sind Tier-1 und erreichbar', () => {
    for (const d of ['espn.com', 'skysports.com', 'kicker.de']) {
      const entry = TIER1_SOURCES.find((s) => s.domain === d);
      expect(entry?.reachable).toBe(true);
      expect(isTier1Source(d)).toBe(true);
    }
  });

  it('Yahoo Sports ist Tier-2 (nicht Tier-1)', () => {
    expect(tierOfDomain('sports.yahoo.com')).toBe('tier2');
    expect(isTier1Source('sports.yahoo.com')).toBe(false);
  });

  it('Aggregatoren sind als solche markiert', () => {
    for (const d of ['mappr.co', 'fwcmania.com', 'wikipedia.org']) {
      expect(tierOfDomain(d)).toBe('aggregator');
      expect(isTier1Source(d)).toBe(false);
    }
  });

  it('Unbekannte Domain liefert null', () => {
    expect(tierOfDomain('beispiel-irgendwas.invalid')).toBeNull();
  });

  it('reachableTier1Domains enthaelt die Verifikations-Quellen', () => {
    const dom = reachableTier1Domains();
    expect(dom).toContain('fifa.com');
    expect(dom).toContain('espn.com');
    expect(dom).toContain('skysports.com');
    expect(dom).toContain('kicker.de');
    expect(dom).not.toContain('bbc.com'); // aktuell blockiert
  });

  it('Tier-2 enthaelt mindestens NBC/FOX/CBS', () => {
    const t2 = TIER2_SOURCES.map((s) => s.domain);
    expect(t2).toContain('nbcsports.com');
    expect(t2).toContain('foxsports.com');
    expect(t2).toContain('cbssports.com');
  });

  it('Aggregator-Liste enthaelt typische Reisetraps (mappr, fwcmania)', () => {
    const agg = AGGREGATOR_SOURCES.map((s) => s.domain);
    expect(agg).toContain('mappr.co');
    expect(agg).toContain('fwcmania.com');
    expect(agg).toContain('wikipedia.org');
  });
});

describe('commentCitesTier1 — Schedule-Kommentare als Beleg', () => {
  it('Erkennt FIFA-Erwaehnung', () => {
    expect(commentCitesTier1('Verifiziert via fifa.com / ESPN')).toBe(true);
  });

  it('Erkennt Sky/ESPN/kicker im Klartext', () => {
    expect(commentCitesTier1('Quelle: Sky Sports')).toBe(true);
    expect(commentCitesTier1('per ESPN bestaetigt')).toBe(true);
    expect(commentCitesTier1('Stand: kicker')).toBe(true);
  });

  it('Lehnt Kommentar ohne Tier-1-Zitat ab', () => {
    expect(commentCitesTier1('Datum nach Auslosung')).toBe(false);
    expect(commentCitesTier1('Mappr listet das so')).toBe(false);
  });

  it('Erkennt deutsche Tier-1-Marken', () => {
    expect(commentCitesTier1('via tagesschau.de')).toBe(true);
    expect(commentCitesTier1('per Sportschau')).toBe(true);
    expect(commentCitesTier1('ZDF zeigte')).toBe(true);
  });
});

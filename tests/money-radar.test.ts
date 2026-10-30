import { describe, expect, it } from 'vitest';
import { scoreNewsItem, buildMoneyRadar } from '@/lib/news/money-radar';
import type { NewsItem } from '@/lib/news/news-agent';

const NOW = Date.UTC(2026, 9, 30, 12, 0, 0);

function item(partial: Partial<NewsItem> & { title: string }): NewsItem {
  return {
    id: partial.id ?? partial.title,
    title: partial.title,
    link: partial.link ?? `https://x/${encodeURIComponent(partial.title)}`,
    source: partial.source ?? 'TestFeed',
    publishedAt: partial.publishedAt ?? NOW - 2 * 3_600_000,
    description: partial.description ?? null
  };
}

describe('scoreNewsItem', () => {
  it('ordnet Krypto-Meldung korrekt ein', () => {
    const r = scoreNewsItem(item({ title: 'Bitcoin erreicht neues Rekordhoch über 100.000 Dollar' }), NOW);
    expect(r.category).toBe('krypto');
    expect(r.direction).toBe('chance');
    expect(r.signals).toContain('Rekordhoch');
    expect(r.moneyScore).toBeGreaterThan(30);
  });

  it('ordnet Aktien-Meldung korrekt ein', () => {
    const r = scoreNewsItem(item({ title: 'Nvidia-Aktie nach Quartalszahlen hochgestuft, Kurssprung an der Börse' }), NOW);
    expect(r.category).toBe('aktien');
    expect(r.direction).toBe('chance');
    expect(r.signals).toContain('hochgestuft');
  });

  it('erkennt Risiko-Richtung', () => {
    const r = scoreNewsItem(item({ title: 'DAX-Konzern meldet Gewinnwarnung, Aktie im freien Einbruch' }), NOW);
    expect(r.direction).toBe('risiko');
    expect(r.signals.some((s) => s === 'Gewinnwarnung' || s === 'Einbruch')).toBe(true);
    expect(r.whyRelevant.toLowerCase()).toContain('risiko');
  });

  it('frische Meldung bekommt höheren Score als alte gleiche', () => {
    const fresh = scoreNewsItem(item({ title: 'Gold mit Kurssprung auf Rekordhoch', publishedAt: NOW - 1 * 3_600_000 }), NOW);
    const old = scoreNewsItem(item({ title: 'Gold mit Kurssprung auf Rekordhoch', publishedAt: NOW - 90 * 3_600_000 }), NOW);
    expect(fresh.moneyScore).toBeGreaterThan(old.moneyScore);
  });

  it('Rohstoff-Kategorie wird erkannt', () => {
    const r = scoreNewsItem(item({ title: 'Ölpreis Brent steigt, Kupfer und Lithium gefragt' }), NOW);
    expect(r.category).toBe('rohstoffe');
  });

  it('nicht einzuordnende Meldung ist sonstiges/neutral', () => {
    const r = scoreNewsItem(item({ title: 'Wetterbericht für das Wochenende' }), NOW);
    expect(r.category).toBe('sonstiges');
    expect(r.direction).toBe('neutral');
  });
});

describe('buildMoneyRadar', () => {
  it('sortiert Top nach Score und gruppiert nach Kategorie', () => {
    const items = [
      item({ title: 'Wetterbericht für das Wochenende' }),
      item({ title: 'Bitcoin Allzeithoch, Kurssprung und Rally' }),
      item({ title: 'Nvidia-Aktie hochgestuft nach Gewinnsprung' })
    ];
    const r = buildMoneyRadar(items, NOW);
    expect(r.top[0].title.toLowerCase()).toContain('bitcoin');
    const cats = r.groups.map((g) => g.category);
    expect(cats).toContain('krypto');
    expect(cats).toContain('aktien');
    expect(r.note).toBeNull();
  });

  it('leere Eingabe → ehrlicher Hinweis', () => {
    const r = buildMoneyRadar([], NOW);
    expect(r.top).toHaveLength(0);
    expect(r.note).toBeTruthy();
  });
});

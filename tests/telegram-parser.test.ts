import { describe, expect, it } from 'vitest';
import { parseTelegramIdea } from '@/lib/telegram/parse-telegram-idea';

const BMW_MESSAGE = `Tradingidee BMW-OS

BMW behauptet sich in der Branchenkrise besser als die deutsche Konkurrenz. Entwicklungskosten sinken, Margen sollen geschützt werden.

75€ aktueller Kurs
71€ 52-Wochentief
98€ 52-Wochenhoch

Trade Republic
Sehr hohes Risiko: SY0N7Q 100€ Dez 2027
Hohes Risiko: FD1D9P 84€ Dez 2027
Mittleres Risiko: FE5RNN 70€ Dez 2027
Niedriges Risiko: HT0N3G 60€ Dez 2028
Niedrigstes Risiko: 519000 Aktie kaufen

Scalable
Sehr hohes Risiko: UN2W57 100€ Dez 2027
Hohes Risiko: HT0N3C 84€ Dez 2027
Niedrigstes Risiko: 519000 Aktie kaufen`;

describe('parseTelegramIdea — BMW example', () => {
  const parsed = parseTelegramIdea(BMW_MESSAGE);

  it('detects underlying BMW', () => {
    expect(parsed.underlying).toBe('BMW');
  });

  it('detects ideaType optionsschein', () => {
    expect(parsed.ideaType).toBe('optionsschein');
  });

  it('extracts current price 75', () => {
    expect(parsed.currentPriceMentioned).toBe(75);
  });

  it('extracts 52w low 71 and high 98', () => {
    expect(parsed.week52Low).toBe(71);
    expect(parsed.week52High).toBe(98);
  });

  it('detects both brokers', () => {
    expect(parsed.brokers).toContain('Trade Republic');
    expect(parsed.brokers).toContain('Scalable');
  });

  it('extracts the real WKNs', () => {
    const wkns = parsed.instruments.map((i) => i.wkn).filter(Boolean);
    expect(wkns).toContain('SY0N7Q');
    expect(wkns).toContain('FD1D9P');
    expect(wkns).toContain('HT0N3C');
    expect(wkns).toContain('519000');
  });

  it('does NOT treat BMW as a WKN', () => {
    const wkns = parsed.instruments.map((i) => i.wkn).filter(Boolean);
    expect(wkns).not.toContain('BMW');
  });

  it('parses strike 100 and expiry 2027-12 for SY0N7Q', () => {
    const inst = parsed.instruments.find((i) => i.wkn === 'SY0N7Q');
    expect(inst?.strike).toBe(100);
    expect(inst?.expiry).toBe('2027-12');
  });

  it('assigns risk levels from source', () => {
    const inst = parsed.instruments.find((i) => i.wkn === 'SY0N7Q');
    expect(inst?.riskLevelFromSource).toBe('Sehr hohes Risiko');
  });

  it('captures at least one thesis statement', () => {
    expect(parsed.thesis.length).toBeGreaterThan(0);
  });
});

describe('parseTelegramIdea — crypto example', () => {
  const parsed = parseTelegramIdea('Tradingidee SOL — Solana sieht stark aus, Breakout über 160$ möglich.');
  it('detects crypto type', () => {
    expect(parsed.ideaType).toBe('crypto');
    expect(parsed.underlying).toBe('SOL');
  });
  it('does not invent instruments', () => {
    expect(parsed.instruments.length).toBe(0);
  });
});

describe('parseTelegramIdea — false positive guard', () => {
  it('does not parse common words as WKNs', () => {
    const parsed = parseTelegramIdea('Trade Republic\nKAUFEN AKTIE STRIKE LIMIT');
    const wkns = parsed.instruments.map((i) => i.wkn).filter(Boolean);
    expect(wkns).not.toContain('KAUFEN');
    expect(wkns).not.toContain('AKTIE');
    expect(wkns).not.toContain('STRIKE');
  });
});

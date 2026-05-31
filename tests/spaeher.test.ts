import { describe, expect, it } from 'vitest';
import { runSpaeher, scoreNewsItem } from '@/lib/akademie/spaeher';
import { NewsItem } from '@/lib/news/news-agent';

const now = new Date('2026-05-31T12:00:00Z').getTime();

function news(over: Partial<NewsItem>): NewsItem {
  return {
    title: 'Generic news',
    link: 'https://example.com/' + Math.random(),
    source: 'BTC-ECHO',
    publishedAt: now - 1000 * 60 * 60, // 1h old
    ...over
  };
}

describe('scoreNewsItem', () => {
  it('detects coin mentions and bullish wording', () => {
    const s = scoreNewsItem(news({ title: 'Bitcoin Rallye treibt BTC auf neues Allzeithoch' }), now);
    expect(s.mentionedCoins).toContain('BTC');
    expect(s.impact).toBe('bullish');
    expect(s.score).toBeGreaterThan(40);
  });

  it('detects bearish wording', () => {
    const s = scoreNewsItem(news({ title: 'ETH stürzt ab — SEC-Klage gegen Ethereum-Stiftung' }), now);
    expect(s.mentionedCoins).toContain('ETH');
    expect(s.impact).toBe('bearish');
  });

  it('rewards high-impact macro keywords', () => {
    const macro = scoreNewsItem(news({ title: 'ETF-Genehmigung erwartet — Fed entscheidet morgen' }), now);
    const plain = scoreNewsItem(news({ title: 'Krypto-Markt heute leicht im Plus' }), now);
    expect(macro.score).toBeGreaterThan(plain.score);
  });

  it('older news scores lower than fresh news', () => {
    const fresh = scoreNewsItem(news({ title: 'Bitcoin Rallye', publishedAt: now - 1000 * 60 * 30 }), now);
    const old = scoreNewsItem(news({ title: 'Bitcoin Rallye', publishedAt: now - 1000 * 60 * 60 * 40 }), now);
    expect(fresh.score).toBeGreaterThanOrEqual(old.score);
  });
});

describe('runSpaeher', () => {
  it('sorts by score and picks top', () => {
    const items: NewsItem[] = [
      news({ title: 'Krypto-Markt heute neutral' }),
      news({ title: 'Bitcoin ETF-Genehmigung treibt Rallye, neues ATH' })
    ];
    const report = runSpaeher(items, now);
    expect(report.items[0].title).toContain('ETF');
    expect(report.topPick?.title).toContain('ETF');
  });

  it('summary reflects bullish bias', () => {
    const items: NewsItem[] = [
      news({ title: 'BTC Rallye Allzeithoch' }),
      news({ title: 'ETH steigt auf neues Hoch' }),
      news({ title: 'SOL Pump, breakout' }),
      news({ title: 'Markt heute neutral' })
    ];
    const report = runSpaeher(items, now);
    expect(report.summary.toLowerCase()).toContain('bullisch');
  });

  it('empty input produces an explicit empty summary', () => {
    const report = runSpaeher([], now);
    expect(report.items).toHaveLength(0);
    expect(report.topPick).toBeNull();
  });
});

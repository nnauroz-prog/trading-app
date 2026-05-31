import { unstable_cache } from 'next/cache';

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  publishedAt: number;
}

// Deutsche Krypto-Newsquellen (öffentliche RSS-Feeds, keine API-Keys).
const SOURCES: { name: string; url: string }[] = [
  { name: 'BTC-ECHO', url: 'https://www.btc-echo.de/feed/' },
  { name: 'CoinKurier', url: 'https://www.coinkurier.de/feed/' },
  { name: 'Kryptoszene', url: 'https://www.kryptoszene.de/feed/' },
  { name: 'BlockchainWelt', url: 'https://www.blockchainwelt.de/feed/' },
  { name: 'Cointelegraph DE', url: 'https://de.cointelegraph.com/rss' }
];

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

function getTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = re.exec(block);
  return m ? decodeEntities(m[1]) : null;
}

// Minimal RSS 2.0 / Atom parser — extracts <item> (or <entry>) blocks and pulls
// title / link / pubDate. Avoids adding an XML dependency.
function parseRss(xml: string, sourceName: string): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/g) ?? [];
  for (const block of blocks) {
    const title = getTag(block, 'title');
    let link = getTag(block, 'link');
    if (!link) {
      const hrefMatch = /<link[^>]*href=["']([^"']+)["']/i.exec(block);
      link = hrefMatch ? hrefMatch[1] : null;
    }
    const pubRaw = getTag(block, 'pubDate') ?? getTag(block, 'published') ?? getTag(block, 'updated');
    if (!title || !link) continue;
    const ts = pubRaw ? new Date(pubRaw).getTime() : Date.now();
    if (!Number.isFinite(ts)) continue;
    items.push({ title, link, source: sourceName, publishedAt: ts });
  }
  return items;
}

async function fetchOne(src: { name: string; url: string }): Promise<NewsItem[]> {
  try {
    const res = await fetch(src.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 trading-app-news-aggregator' },
      next: { revalidate: 600 }
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml, src.name);
  } catch {
    return [];
  }
}

async function compute(): Promise<NewsItem[]> {
  const all = (await Promise.all(SOURCES.map(fetchOne))).flat();
  const seen = new Set<string>();
  const unique: NewsItem[] = [];
  for (const item of all) {
    if (seen.has(item.link)) continue;
    seen.add(item.link);
    unique.push(item);
  }
  unique.sort((a, b) => b.publishedAt - a.publishedAt);
  return unique.slice(0, 8);
}

// Cached at 10 minutes — news doesn't change that fast and we don't want to
// hammer the feeds on every page render.
export const getCryptoNews = unstable_cache(compute, ['crypto-news-de-v1'], { revalidate: 600 });

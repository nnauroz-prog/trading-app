import { unstable_cache } from 'next/cache';

export interface NewsItem {
  id: string; // stable hash of link, used for in-app routing
  title: string;
  link: string; // original article URL (external)
  source: string;
  publishedAt: number;
  description: string | null; // RSS-provided summary, plain text
}

// Stable, URL-safe identifier derived from the article link. base64url so it
// fits cleanly into a Next.js dynamic route segment.
export function newsIdFromLink(link: string): string {
  return Buffer.from(link).toString('base64url');
}

export function linkFromNewsId(id: string): string {
  return Buffer.from(id, 'base64url').toString();
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

// Strip HTML tags from RSS description payloads. Many feeds embed
// <p>, <a>, image tags etc. — we want plain text only.
function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>(?!$)/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
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
    const descRaw = getTag(block, 'description') ?? getTag(block, 'summary') ?? getTag(block, 'content');
    const description = descRaw ? stripHtml(descRaw) : null;
    items.push({ id: newsIdFromLink(link), title, link, source: sourceName, publishedAt: ts, description });
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
export const getCryptoNews = unstable_cache(compute, ['crypto-news-de-v2'], { revalidate: 600 });

// Fetcher fuer den Geld-Radar: zieht breite deutschsprachige Finanz-
// Feeds (Boerse, Wirtschaft, Rohstoffe, Krypto) und baut daraus den
// bewerteten Radar. Keine API-Keys noetig — oeffentliche RSS-Feeds.
// Faellt ein Feed aus, wird er stillschweigend uebersprungen.

import { unstable_cache } from 'next/cache';
import { parseRss, type NewsItem } from '@/lib/news/news-agent';
import { buildMoneyRadar, type MoneyRadarResult } from '@/lib/news/money-radar';

const FEEDS: { name: string; url: string }[] = [
  // Boerse / Aktien / Maerkte (weltweit, auf Deutsch berichtet)
  { name: 'tagesschau Wirtschaft', url: 'https://www.tagesschau.de/wirtschaft/index~rss2.xml' },
  { name: 'Finanzen.net', url: 'https://www.finanzen.net/rss/news' },
  { name: 'boerse-online', url: 'https://www.boerse-online.de/rss/' },
  { name: 'wallstreet:online', url: 'https://www.wallstreet-online.de/rss/nachrichten-alle.xml' },
  { name: 'Der Aktionär', url: 'https://www.deraktionaer.de/rss/aktien.html' },
  { name: 'manager magazin', url: 'https://www.manager-magazin.de/finanzen/index.rss' },
  // Krypto (deutschsprachig)
  { name: 'BTC-ECHO', url: 'https://www.btc-echo.de/feed/' },
  { name: 'Cointelegraph DE', url: 'https://de.cointelegraph.com/rss' }
];

async function fetchOne(src: { name: string; url: string }): Promise<NewsItem[]> {
  try {
    const res = await fetch(src.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 trading-app-money-radar' },
      next: { revalidate: 600 }
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml, src.name);
  } catch {
    return [];
  }
}

async function compute(): Promise<MoneyRadarResult> {
  const all = (await Promise.all(FEEDS.map(fetchOne))).flat();
  const seen = new Set<string>();
  const unique: NewsItem[] = [];
  for (const item of all) {
    if (seen.has(item.link)) continue;
    seen.add(item.link);
    unique.push(item);
  }
  return buildMoneyRadar(unique, Date.now());
}

// 10-Minuten-Cache — News bewegen sich nicht sekuendlich, und wir wollen
// die Feeds nicht bei jedem Render hammern.
export const getMoneyRadar = unstable_cache(compute, ['money-radar-de-v1'], { revalidate: 600 });

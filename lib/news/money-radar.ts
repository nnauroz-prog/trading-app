// Geld-Radar: scannt breite Finanz-News und bewertet jedes Stueck nach
// "Geld-Relevanz" — wo bewegt sich gerade etwas, womit andere Geld
// machen. Klassifiziert nach Asset-Klasse, erkennt Chancen- und Risiko-
// Signale und liefert pro Meldung einen Klartext-Hinweis auf Deutsch.
//
// Reine, deterministische Logik (keine Netzwerkzugriffe) — voll testbar.
// Die Meldungen selbst kommen aus deutschsprachigen Finanz-Feeds, sind
// also bereits auf Deutsch.

import type { NewsItem } from '@/lib/news/news-agent';

export type RadarCategory = 'krypto' | 'aktien' | 'rohstoffe' | 'makro' | 'tech' | 'sonstiges';

export interface RadarItem {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: number;
  freshnessHours: number;
  category: RadarCategory;
  moneyScore: number;    // 0-100
  signals: string[];     // erkannte Schlagwort-Tags (deutsch)
  direction: 'chance' | 'risiko' | 'neutral';
  whyRelevant: string;   // ein Satz, deutsch
}

export interface RadarGroup {
  category: RadarCategory;
  label: string;
  emoji: string;
  items: RadarItem[];
}

export interface MoneyRadarResult {
  top: RadarItem[];
  groups: RadarGroup[];
  generatedAt: string;
  sourceCount: number;
  note: string | null;
}

export const CATEGORY_META: Record<RadarCategory, { label: string; emoji: string }> = {
  krypto: { label: 'Krypto', emoji: '₿' },
  aktien: { label: 'Aktien', emoji: '📈' },
  rohstoffe: { label: 'Rohstoffe & Energie', emoji: '🛢️' },
  makro: { label: 'Makro & Zinsen', emoji: '🌍' },
  tech: { label: 'Tech & Innovation', emoji: '💡' },
  sonstiges: { label: 'Sonstiges', emoji: '📰' }
};

const CATEGORY_KEYWORDS: Record<Exclude<RadarCategory, 'sonstiges'>, string[]> = {
  krypto: ['bitcoin', 'btc', 'ethereum', 'eth', 'krypto', 'crypto', 'coin', 'token', 'blockchain', 'altcoin', 'solana', 'xrp', 'stablecoin', 'etf', 'halving', 'defi', 'binance', 'memecoin'],
  aktien: ['aktie', 'aktien', 'dax', 'dow', 'nasdaq', 's&p', 'börse', 'boerse', 'dividende', 'quartalszahlen', 'gewinn', 'umsatz', 'ipo', 'börsengang', 'nvidia', 'apple', 'tesla', 'microsoft', 'sap', 'konzern', 'anleger'],
  rohstoffe: ['gold', 'silber', 'öl', 'oel', 'brent', 'wti', 'gas', 'kupfer', 'rohstoff', 'rohstoffe', 'lithium', 'uran', 'edelmetall', 'weizen'],
  makro: ['zins', 'zinsen', 'ezb', 'fed', 'inflation', 'leitzins', 'konjunktur', 'rezession', 'arbeitsmarkt', 'bip', 'notenbank', 'wirtschaft', 'handelskrieg', 'zölle', 'zoll'],
  tech: ['ki', 'künstliche intelligenz', 'kuenstliche intelligenz', 'ai', 'chip', 'halbleiter', 'start-up', 'startup', 'tech', 'robotik', 'quanten', 'innovation']
};

// Chancen-/Risiko-Signale mit Gewicht. Deutsche Tags fuer die Anzeige.
const SIGNAL_KEYWORDS: { kw: string; tag: string; weight: number; dir: 'chance' | 'risiko' }[] = [
  { kw: 'rekordhoch', tag: 'Rekordhoch', weight: 18, dir: 'chance' },
  { kw: 'allzeithoch', tag: 'Allzeithoch', weight: 18, dir: 'chance' },
  { kw: 'kurssprung', tag: 'Kurssprung', weight: 16, dir: 'chance' },
  { kw: 'kursrally', tag: 'Rally', weight: 16, dir: 'chance' },
  { kw: 'rallye', tag: 'Rally', weight: 16, dir: 'chance' },
  { kw: 'verdoppelt', tag: 'verdoppelt', weight: 16, dir: 'chance' },
  { kw: 'ausbruch', tag: 'Ausbruch', weight: 12, dir: 'chance' },
  { kw: 'hochgestuft', tag: 'hochgestuft', weight: 14, dir: 'chance' },
  { kw: 'kaufempfehlung', tag: 'Kaufempfehlung', weight: 14, dir: 'chance' },
  { kw: 'übernahme', tag: 'Übernahme', weight: 13, dir: 'chance' },
  { kw: 'uebernahme', tag: 'Übernahme', weight: 13, dir: 'chance' },
  { kw: 'fusion', tag: 'Fusion', weight: 11, dir: 'chance' },
  { kw: 'ipo', tag: 'IPO', weight: 12, dir: 'chance' },
  { kw: 'börsengang', tag: 'Börsengang', weight: 12, dir: 'chance' },
  { kw: 'dividende', tag: 'Dividende', weight: 9, dir: 'chance' },
  { kw: 'milliard', tag: 'Milliarden', weight: 8, dir: 'chance' },
  { kw: 'gewinnsprung', tag: 'Gewinnsprung', weight: 14, dir: 'chance' },
  { kw: 'prognose angehoben', tag: 'Prognose angehoben', weight: 13, dir: 'chance' },
  { kw: 'boom', tag: 'Boom', weight: 10, dir: 'chance' },
  { kw: 'nachfrage', tag: 'Nachfrageschub', weight: 7, dir: 'chance' },
  // Risiko-Seite — ebenfalls geld-relevant (Short/Meiden/Absichern)
  { kw: 'crash', tag: 'Crash', weight: 15, dir: 'risiko' },
  { kw: 'einbruch', tag: 'Einbruch', weight: 13, dir: 'risiko' },
  { kw: 'absturz', tag: 'Absturz', weight: 13, dir: 'risiko' },
  { kw: 'gewinnwarnung', tag: 'Gewinnwarnung', weight: 14, dir: 'risiko' },
  { kw: 'insolvenz', tag: 'Insolvenz', weight: 14, dir: 'risiko' },
  { kw: 'abgestuft', tag: 'abgestuft', weight: 12, dir: 'risiko' },
  { kw: 'skandal', tag: 'Skandal', weight: 10, dir: 'risiko' },
  { kw: 'verkaufen', tag: 'Verkaufssignal', weight: 9, dir: 'risiko' }
];

function classifyCategory(text: string): RadarCategory {
  let best: RadarCategory = 'sonstiges';
  let bestHits = 0;
  (Object.keys(CATEGORY_KEYWORDS) as Exclude<RadarCategory, 'sonstiges'>[]).forEach((cat) => {
    const hits = CATEGORY_KEYWORDS[cat].reduce((n, kw) => (text.includes(kw) ? n + 1 : n), 0);
    if (hits > bestHits) { bestHits = hits; best = cat; }
  });
  return best;
}

export function scoreNewsItem(item: NewsItem, nowMs: number): RadarItem {
  const text = `${item.title} ${item.description ?? ''}`.toLowerCase();
  const category = classifyCategory(text);

  const signals: string[] = [];
  let signalScore = 0;
  let chanceW = 0;
  let risikoW = 0;
  for (const s of SIGNAL_KEYWORDS) {
    if (text.includes(s.kw)) {
      if (!signals.includes(s.tag)) signals.push(s.tag);
      signalScore += s.weight;
      if (s.dir === 'chance') chanceW += s.weight; else risikoW += s.weight;
    }
  }

  // Frische: je neuer, desto relevanter. Linear bis 48h, danach stark ab.
  const ageHours = Math.max(0, (nowMs - item.publishedAt) / 3_600_000);
  const freshnessBoost = ageHours <= 6 ? 20 : ageHours <= 24 ? 14 : ageHours <= 48 ? 7 : 0;

  // Kategorie-Bonus: eingeordnete (nicht "sonstiges") Meldungen sind
  // relevanter fuers Geldverdienen.
  const categoryBonus = category === 'sonstiges' ? 0 : 10;

  const moneyScore = Math.max(0, Math.min(100, signalScore + freshnessBoost + categoryBonus));

  const direction: RadarItem['direction'] =
    chanceW === 0 && risikoW === 0 ? 'neutral' : risikoW > chanceW ? 'risiko' : 'chance';

  const catLabel = CATEGORY_META[category].label;
  let whyRelevant: string;
  if (direction === 'chance' && signals.length > 0) {
    whyRelevant = `${catLabel} · mögliche Kurschance (${signals.slice(0, 3).join(', ')}).`;
  } else if (direction === 'risiko' && signals.length > 0) {
    whyRelevant = `${catLabel} · Risiko im Blick (${signals.slice(0, 3).join(', ')}) — eher absichern/meiden.`;
  } else if (category !== 'sonstiges') {
    whyRelevant = `${catLabel} · relevante Marktnachricht, noch ohne klares Signal.`;
  } else {
    whyRelevant = 'Allgemeine Nachricht — Geld-Bezug unklar.';
  }

  return {
    id: item.id,
    title: item.title,
    link: item.link,
    source: item.source,
    publishedAt: item.publishedAt,
    freshnessHours: Math.round(ageHours),
    category,
    moneyScore,
    signals,
    direction,
    whyRelevant
  };
}

export function buildMoneyRadar(items: NewsItem[], nowMs: number): MoneyRadarResult {
  const scored = items
    .map((it) => scoreNewsItem(it, nowMs))
    .sort((a, b) => b.moneyScore - a.moneyScore || b.publishedAt - a.publishedAt);

  const top = scored.slice(0, 8);

  // Gruppieren nach Kategorie, nur Kategorien mit Inhalt, intern nach Score.
  const order: RadarCategory[] = ['krypto', 'aktien', 'rohstoffe', 'makro', 'tech', 'sonstiges'];
  const groups: RadarGroup[] = order
    .map((cat) => ({
      category: cat,
      label: CATEGORY_META[cat].label,
      emoji: CATEGORY_META[cat].emoji,
      items: scored.filter((s) => s.category === cat).slice(0, 5)
    }))
    .filter((g) => g.items.length > 0);

  const note = scored.length === 0
    ? 'Aktuell keine News-Feeds erreichbar — der Radar meldet sich, sobald wieder Meldungen reinkommen.'
    : null;

  const sourceCount = new Set(items.map((i) => i.source)).size;

  return { top, groups, generatedAt: new Date(nowMs).toISOString(), sourceCount, note };
}

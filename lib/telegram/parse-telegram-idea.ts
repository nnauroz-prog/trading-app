import { InstrumentType, ParsedTelegramIdea } from '@/lib/types/ideas';
import { extractLinks } from './extract-links';
import { extractBrokers } from './extract-broker-availability';
import { extractAllInstruments } from './extract-instruments';
import { extractThesis } from './extract-thesis';

const PRICE_AKTUELL_PATTERN = /(\d+(?:[.,]\d+)?)\s*€?\s*aktueller\s*kurs/i;
const PRICE_AKTUELL_PATTERN2 = /aktuell(?:er)?\s*kurs[:\s]*(\d+(?:[.,]\d+)?)\s*€?/i;
const W52_LOW_PATTERN = /(\d+(?:[.,]\d+)?)\s*€?\s*52[\s-]?wochen?[\s-]?tief/i;
const W52_LOW_PATTERN2 = /52[\s-]?wochen?[\s-]?tief[:\s]*(\d+(?:[.,]\d+)?)\s*€?/i;
const W52_HIGH_PATTERN = /(\d+(?:[.,]\d+)?)\s*€?\s*52[\s-]?wochen?[\s-]?hoch/i;
const W52_HIGH_PATTERN2 = /52[\s-]?wochen?[\s-]?hoch[:\s]*(\d+(?:[.,]\d+)?)\s*€?/i;
const TARGET_PRICE_PATTERN = /(?:kursziel|target|ziel(?:kurs)?)[:\s]*(\d+(?:[.,]\d+)?)\s*€?/i;

const TITLE_KEYWORDS = [
  /tradingidee\s+(.+)/i,
  /trading[\s-]?idea\s+(.+)/i,
  /idee[:\s]+(.+)/i,
  /setup[:\s]+(.+)/i
];

function parseNumber(s: string): number | null {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function findFirst(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = re.exec(text);
    if (m && m[1]) return m[1];
  }
  return null;
}

function detectTitle(text: string): string {
  const firstLine = text.split(/\n/)[0]?.trim() ?? '';
  for (const re of TITLE_KEYWORDS) {
    const m = re.exec(text);
    if (m) return m[0].trim();
  }
  if (firstLine.length > 0 && firstLine.length < 100) return firstLine;
  return 'Unbenannte Idee';
}

function detectUnderlyingFromTitle(title: string): { underlying: string; ideaType: InstrumentType; underlyingType: InstrumentType } {
  const cleaned = title
    .replace(/tradingidee\s+/i, '')
    .replace(/trading[\s-]?idea\s+/i, '')
    .replace(/idee[:\s]+/i, '');
  // Underlying steht am Anfang. Bei Satz-Trennern (— : , .) abschneiden,
  // damit lange Beschreibungstexte nicht als Basiswert geparst werden.
  const stripped = cleaned.split(/\s*[—:,.]\s*|\s{2,}/)[0].trim() || cleaned;
  const tokens = stripped.split(/[\s\-_/]+/).filter((t) => t.length > 0).slice(0, 4);

  let ideaType: InstrumentType = 'unknown';
  let underlyingType: InstrumentType = 'unknown';
  const underlyingTokens: string[] = [];

  for (const t of tokens) {
    const lower = t.toLowerCase();
    if (['os', 'optionsschein', 'warrant'].includes(lower)) {
      ideaType = 'optionsschein';
      underlyingType = 'stock';
    } else if (['ko', 'knock', 'knockout'].includes(lower)) {
      ideaType = 'knockout';
      underlyingType = 'stock';
    } else if (['zertifikat', 'certificate'].includes(lower)) {
      ideaType = 'certificate';
      underlyingType = 'stock';
    } else if (['etf'].includes(lower)) {
      ideaType = 'etf';
      underlyingType = 'etf';
    } else if (['call', 'put', 'long', 'short'].includes(lower)) {
      continue;
    } else if (lower === 'aktie' || lower === 'stock') {
      ideaType = 'stock';
      underlyingType = 'stock';
    } else {
      underlyingTokens.push(t);
    }
  }
  if (ideaType === 'unknown') {
    if (/\b(BTC|ETH|SOL|XRP|ADA|DOGE|PEPE|SHIB|JTO|WIF|BONK|BNB|AVAX|LINK|DOT)\b/i.test(title)) {
      ideaType = 'crypto';
      underlyingType = 'crypto';
    } else {
      ideaType = 'stock';
      underlyingType = 'stock';
    }
  }
  const underlying = underlyingTokens.join(' ').trim() || stripped.split(' ')[0] || 'UNKNOWN';
  return { underlying: underlying.toUpperCase(), ideaType, underlyingType };
}

export function parseTelegramIdea(rawText: string): ParsedTelegramIdea {
  const text = rawText.trim();
  const title = detectTitle(text);
  const { underlying, ideaType, underlyingType } = detectUnderlyingFromTitle(title);

  const currentPriceStr = findFirst(text, [PRICE_AKTUELL_PATTERN, PRICE_AKTUELL_PATTERN2]);
  const w52LowStr = findFirst(text, [W52_LOW_PATTERN, W52_LOW_PATTERN2]);
  const w52HighStr = findFirst(text, [W52_HIGH_PATTERN, W52_HIGH_PATTERN2]);
  const targetPriceStr = findFirst(text, [TARGET_PRICE_PATTERN]);

  const brokers = extractBrokers(text);
  const instruments = extractAllInstruments(text);
  const thesis = extractThesis(text);
  const links = extractLinks(text);

  const warningsMentioned: string[] = [];
  if (/verlustwarnung/i.test(text)) warningsMentioned.push('Verlustwarnung im Text erwähnt');
  if (/totalverlust/i.test(text)) warningsMentioned.push('Totalverlust-Risiko erwähnt');
  if (/sehr\s*hohes?\s*risiko/i.test(text)) warningsMentioned.push('Sehr hohes Risiko erwähnt');

  const holdMatch = /(?:halt(?:e|en|dauer)|hold(?:ing)?)\s*(?:für|for)?\s*(\d+\s*(?:tage?|wochen?|monate?|jahre?|days?|weeks?|months?|years?))/i.exec(text);
  const holdDurationMentioned = holdMatch?.[1] ?? null;

  return {
    title,
    underlying,
    underlyingType,
    ideaType,
    currentPriceMentioned: currentPriceStr ? parseNumber(currentPriceStr) : null,
    week52Low: w52LowStr ? parseNumber(w52LowStr) : null,
    week52High: w52HighStr ? parseNumber(w52HighStr) : null,
    brokers,
    instruments,
    thesis,
    links,
    warningsMentioned,
    targetPrice: targetPriceStr ? parseNumber(targetPriceStr) : null,
    holdDurationMentioned,
    rawText,
    parsedAt: new Date().toISOString()
  };
}

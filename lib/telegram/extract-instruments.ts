import { Broker, InstrumentType, ParsedInstrument, UserIntent } from '@/lib/types/ideas';
import { extractRiskLevel } from './extract-risk-levels';
import { splitByBrokerSections } from './extract-broker-availability';

const WKN_PATTERN = /\b([A-Z]{2}[A-Z0-9]{4}|[A-Z0-9]{6})\b/g;
const ISIN_PATTERN = /\b([A-Z]{2}[A-Z0-9]{9}\d)\b/g;
const STRIKE_PATTERN = /(\d+(?:[.,]\d+)?)\s*(?:€|EUR|\$|USD)\b/i;
const STRIKE_NUMBER_PATTERN = /(?:^|\s)(\d{2,4}(?:[.,]\d+)?)\s*€/;
const EXPIRY_PATTERN = /(jan|feb|mär|maerz|apr|mai|jun|jul|aug|sep|okt|nov|dez|jan|march|april|june|july|august|september|october|november|december)\.?\s*(20\d{2})/i;
const EXPIRY_MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mär: '03', maerz: '03', march: '03', apr: '04', april: '04',
  mai: '05', jun: '06', june: '06', jul: '07', july: '07', aug: '08', august: '08',
  sep: '09', september: '09', okt: '10', october: '10', nov: '11', november: '11',
  dez: '12', december: '12', feb_: '02'
};

const USER_INTENT_PATTERNS: Array<{ intent: UserIntent; pattern: RegExp }> = [
  { intent: 'will_buy', pattern: /\b(werde\s+(?:ich\s+)?(?:kaufen|nehmen)|(?:ich\s+)?will\s+(?:ich\s+)?kaufen|(?:ich\s+)?kaufe|gekauft)\b/i },
  { intent: 'similar_instrument_planned', pattern: /\b(ähnlich(?:es|e)?|alternative|alternativ)\b/i },
  { intent: 'considering', pattern: /\b(überlege|denke[\s_-]?(?:dar)?über|in\s+betracht)\b/i },
  { intent: 'rejected', pattern: /\b(zu\s+riskant|nicht\s+kaufen|finger\s+weg)\b/i }
];

function detectUserIntent(line: string): UserIntent {
  for (const { intent, pattern } of USER_INTENT_PATTERNS) {
    if (pattern.test(line)) return intent;
  }
  return 'none';
}

function detectInstrumentType(line: string, broker: Broker): InstrumentType {
  const lower = line.toLowerCase();
  if (lower.includes('aktie kaufen') || /\baktie\b/.test(lower)) return 'stock';
  if (lower.includes('etf')) return 'etf';
  if (lower.includes('knock') || lower.includes('ko ')) return 'knockout';
  if (lower.includes('zertifikat') || lower.includes('certificate')) return 'certificate';
  if (lower.includes('os ') || lower.includes('optionsschein') || lower.includes('warrant')) return 'optionsschein';
  const hasStrike = STRIKE_NUMBER_PATTERN.test(line) || STRIKE_PATTERN.test(line);
  const hasExpiry = EXPIRY_PATTERN.test(line);
  if (hasStrike && hasExpiry) return 'optionsschein';
  if (broker === 'Coinbase' || broker === 'Bitpanda') return 'crypto';
  return 'unknown';
}

function parseStrike(line: string): number | undefined {
  const m1 = STRIKE_NUMBER_PATTERN.exec(line);
  if (m1) return parseFloat(m1[1].replace(',', '.'));
  const m2 = STRIKE_PATTERN.exec(line);
  if (m2) return parseFloat(m2[1].replace(',', '.'));
  return undefined;
}

function parseExpiry(line: string): string | undefined {
  const m = EXPIRY_PATTERN.exec(line);
  if (!m) return undefined;
  const monthKey = m[1].toLowerCase().replace('.', '');
  const month = EXPIRY_MONTH_MAP[monthKey] ?? EXPIRY_MONTH_MAP[monthKey.slice(0, 3)] ?? '12';
  return `${m[2]}-${month}`;
}

function parseDirection(line: string): 'call' | 'put' | undefined {
  if (/\bput\b|short\b|bear\b/i.test(line)) return 'put';
  if (/\bcall\b|long\b|bull\b/i.test(line)) return 'call';
  return undefined;
}

export function extractInstrumentsFromSection(section: { broker: Broker; text: string }): ParsedInstrument[] {
  const lines = section.text.split(/\n/).filter((l) => l.trim().length > 0);
  const out: ParsedInstrument[] = [];
  for (const line of lines) {
    const wknMatches = Array.from(line.matchAll(WKN_PATTERN));
    const isinMatches = Array.from(line.matchAll(ISIN_PATTERN));
    if (wknMatches.length === 0 && isinMatches.length === 0) continue;
    const risk = extractRiskLevel(line);
    const strike = parseStrike(line);
    const expiry = parseExpiry(line);
    const direction = parseDirection(line);
    const intent = detectUserIntent(line);
    const type = detectInstrumentType(line, section.broker);
    for (const wm of wknMatches) {
      const wkn = wm[1];
      if (isinMatches.some((i) => i[1].includes(wkn))) continue;
      out.push({
        broker: section.broker,
        wkn,
        instrumentType: type,
        riskLevelFromSource: risk,
        strike: type === 'optionsschein' || type === 'knockout' ? strike : undefined,
        expiry: type === 'optionsschein' || type === 'knockout' ? expiry : undefined,
        direction,
        userIntent: intent,
        rawLine: line.trim()
      });
    }
    for (const im of isinMatches) {
      out.push({
        broker: section.broker,
        isin: im[1],
        instrumentType: type,
        riskLevelFromSource: risk,
        strike: type === 'optionsschein' || type === 'knockout' ? strike : undefined,
        expiry: type === 'optionsschein' || type === 'knockout' ? expiry : undefined,
        direction,
        userIntent: intent,
        rawLine: line.trim()
      });
    }
  }
  return out;
}

export function extractAllInstruments(text: string): ParsedInstrument[] {
  const sections = splitByBrokerSections(text);
  const all: ParsedInstrument[] = [];
  for (const s of sections) {
    all.push(...extractInstrumentsFromSection(s));
  }
  return all;
}

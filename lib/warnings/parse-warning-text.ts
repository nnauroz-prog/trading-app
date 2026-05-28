export interface ParsedWarning {
  rawText: string;
  detectedUnderlyings: string[];
  detectedWkns: string[];
  detectedTickers: string[];
  invalidationLevels: Array<{ asset: string; level: number; condition: string }>;
  stopLevels: Array<{ asset: string; level: number }>;
  mentionsHebelprodukte: boolean;
  mentionsRiskReduction: boolean;
  generalRiskNote: string | null;
  parsedAt: string;
}

const WKN_PATTERN = /\b([A-Z]{2}[A-Z0-9]{4})\b/g;
const TICKER_PATTERN = /\b(BTC|ETH|SOL|XRP|ADA|DOGE|AVAX|LINK|DOT|BNB|MATIC|POL|PEPE|SHIB|WIF|BONK|FLOKI|BOME|MEW|NEAR|ATOM|SUI|TIA|APT|SEI|INJ|JTO|JUP|RENDER|AAVE|UNI|MKR|RUNE|CRV|FET|GRT)\b/gi;
const STOCK_NAME_PATTERN = /\b(BMW|VW|VOLKSWAGEN|MERCEDES|DAIMLER|SAP|SIEMENS|ALLIANZ|DEUTSCHE\s+BANK|COMMERZBANK|TESLA|APPLE|NVIDIA|MICROSOFT|GOOGLE|ALPHABET|META|AMAZON|NETFLIX|INTEL|AMD|PORSCHE|ADIDAS|PUMA|BASF|BAYER|MUNICH\s+RE|ZALANDO|DELIVERY\s+HERO|HELLOFRESH)\b/gi;


function parseNumber(s: string): number {
  return parseFloat(s.replace(',', '.'));
}

export function parseWarningText(text: string): ParsedWarning {
  const normalized = text.trim();

  const wknSet = new Set<string>();
  for (const m of normalized.matchAll(WKN_PATTERN)) {
    wknSet.add(m[1]);
  }

  const tickerSet = new Set<string>();
  for (const m of normalized.matchAll(TICKER_PATTERN)) {
    tickerSet.add(m[1].toUpperCase());
  }

  const underlyingSet = new Set<string>();
  for (const m of normalized.matchAll(STOCK_NAME_PATTERN)) {
    underlyingSet.add(m[1].toUpperCase().replace(/\s+/g, ' '));
  }
  for (const t of tickerSet) underlyingSet.add(t);

  const invalidationLevels: ParsedWarning['invalidationLevels'] = [];
  const lines = normalized.split(/\n+/);
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (/invalid|setup\s+ungültig|stop|bricht/.test(lower)) {
      const numMatches = line.match(/\d+(?:[.,]\d+)?\s*€/g);
      if (numMatches) {
        const assets = Array.from(line.matchAll(STOCK_NAME_PATTERN)).map((m) => m[1].toUpperCase());
        const asset = assets[0] ?? Array.from(underlyingSet)[0] ?? '—';
        for (const nm of numMatches) {
          const v = parseNumber(nm.replace('€', '').trim());
          if (Number.isFinite(v)) {
            invalidationLevels.push({ asset, level: v, condition: line.trim().slice(0, 120) });
          }
        }
      }
    }
  }

  const stopLevels: ParsedWarning['stopLevels'] = [];
  for (const m of normalized.matchAll(/stop[\s:]+(?:bei|auf)\s*(\d+(?:[.,]\d+)?)\s*€/gi)) {
    const v = parseNumber(m[1]);
    if (Number.isFinite(v)) {
      stopLevels.push({ asset: Array.from(underlyingSet)[0] ?? '—', level: v });
    }
  }

  const mentionsHebelprodukte = /\b(optionsschein|os|knockout|knock[\s-]?out|hebel|zertifikat|warrant)\b/i.test(normalized);
  const mentionsRiskReduction = /\b(risiko\s+reduzieren|reduzieren|teilverkauf|exit|verlust\s+begrenzen|gewinn\s+sichern)\b/i.test(normalized);

  let generalRiskNote: string | null = null;
  const firstLine = lines[0]?.trim();
  if (firstLine && firstLine.length < 200) generalRiskNote = firstLine;

  return {
    rawText: normalized,
    detectedUnderlyings: Array.from(underlyingSet),
    detectedWkns: Array.from(wknSet),
    detectedTickers: Array.from(tickerSet),
    invalidationLevels,
    stopLevels,
    mentionsHebelprodukte,
    mentionsRiskReduction,
    generalRiskNote,
    parsedAt: new Date().toISOString()
  };
}

// Mapping von Basiswert-Namen (wie im Idee-Text) auf Finnhub-Symbole.
// Deutsche Aktien nutzen das XETRA-Suffix .DE. US-Aktien das nackte Ticker.
// Finnhub Free-Tier deckt US-Aktien zuverlässig ab; .DE teils nur im Paid-Tier
// — daher immer graceful fallback auf 'nicht verifiziert'.
export const STOCK_SYMBOL_MAP: Record<string, string> = {
  BMW: 'BMW.DE',
  VW: 'VOW3.DE',
  VOLKSWAGEN: 'VOW3.DE',
  MERCEDES: 'MBG.DE',
  DAIMLER: 'MBG.DE',
  PORSCHE: 'P911.DE',
  SAP: 'SAP.DE',
  SIEMENS: 'SIE.DE',
  ALLIANZ: 'ALV.DE',
  BASF: 'BAS.DE',
  BAYER: 'BAYN.DE',
  ADIDAS: 'ADS.DE',
  DEUTSCHE: 'DBK.DE',
  COMMERZBANK: 'CBK.DE',
  ZALANDO: 'ZAL.DE',
  TESLA: 'TSLA',
  APPLE: 'AAPL',
  NVIDIA: 'NVDA',
  MICROSOFT: 'MSFT',
  GOOGLE: 'GOOGL',
  ALPHABET: 'GOOGL',
  META: 'META',
  AMAZON: 'AMZN',
  NETFLIX: 'NFLX',
  INTEL: 'INTC',
  AMD: 'AMD'
};

export function resolveStockSymbol(underlying: string): string | null {
  const key = underlying.toUpperCase().trim();
  if (STOCK_SYMBOL_MAP[key]) return STOCK_SYMBOL_MAP[key];
  // Already looks like a Finnhub symbol (e.g. 'AAPL' or 'BMW.DE')
  if (/^[A-Z0-9]{1,6}(\.[A-Z]{1,3})?$/.test(key)) return key;
  return null;
}

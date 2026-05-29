export const SCALABLE_LAST_VERIFIED = '2026-05-27';

export const SCALABLE_KNOWN_STOCKS_WKN: ReadonlySet<string> = new Set([
  '519000', 'A1EWWW', '710000', '716460', '514000', '623100',
  '870747', '703712', 'A0D9PT', 'A0LR4P', 'A14R7U', '865985',
  'A1JX52', '850663', 'A2PSR2', 'A0M4W9', '870737', '852009',
  'A2P4DU', '850160', '855705', 'A14R7H', 'A12CX1', '853260'
]);

export const SCALABLE_KNOWN_CRYPTO_TICKERS: ReadonlySet<string> = new Set([
  'BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOT', 'AVAX', 'LINK', 'LTC',
  'BCH', 'MATIC', 'POL', 'UNI', 'AAVE', 'ATOM', 'NEAR', 'FIL', 'ALGO'
]);

export const SCALABLE_DERIVATIVE_ISSUERS = ['HSBC', 'Société Générale', 'BNP Paribas', 'UniCredit', 'Citi', 'DZ BANK'];

export function isWknOnScalable(wkn: string): { available: boolean; verified: boolean; lastVerified: string } {
  const normalized = wkn.toUpperCase().trim();
  if (SCALABLE_KNOWN_STOCKS_WKN.has(normalized)) {
    return { available: true, verified: true, lastVerified: SCALABLE_LAST_VERIFIED };
  }
  return { available: false, verified: false, lastVerified: SCALABLE_LAST_VERIFIED };
}

export function isTickerOnScalable(symbol: string): { available: boolean } {
  return { available: SCALABLE_KNOWN_CRYPTO_TICKERS.has(symbol.toUpperCase().trim()) };
}

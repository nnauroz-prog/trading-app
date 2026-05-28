export const COINBASE_LAST_VERIFIED = '2026-05-27';

export const COINBASE_KNOWN_TICKERS: ReadonlySet<string> = new Set([
  'BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'LINK', 'DOT',
  'LTC', 'BCH', 'MATIC', 'POL', 'UNI', 'AAVE', 'ATOM', 'NEAR', 'FIL',
  'ALGO', 'XLM', 'AAVE', 'GRT', 'SHIB', 'PEPE', 'CRV', 'MKR', 'COMP',
  'SUSHI', 'YFI', 'RNDR', 'RENDER', 'INJ', 'TIA', 'SUI', 'APT', 'SEI',
  'JTO', 'JUP', 'WIF', 'BONK', 'FLOKI'
]);

export function isTickerOnCoinbase(ticker: string): { available: boolean; verified: boolean; lastVerified: string } {
  const normalized = ticker.toUpperCase().trim();
  if (COINBASE_KNOWN_TICKERS.has(normalized)) {
    return { available: true, verified: true, lastVerified: COINBASE_LAST_VERIFIED };
  }
  return { available: false, verified: false, lastVerified: COINBASE_LAST_VERIFIED };
}

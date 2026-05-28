export type CoinCategory = 'major' | 'midcap' | 'meme' | 'defi' | 'l1' | 'ai' | 'commodity';

export interface UniverseCoin {
  id: string;
  symbol: string;
  binanceSymbol: string;
  name: string;
  category: CoinCategory;
}

export const TOP_50: UniverseCoin[] = [
  { id: 'btc', symbol: 'BTC', binanceSymbol: 'BTCUSDT', name: 'Bitcoin', category: 'major' },
  { id: 'eth', symbol: 'ETH', binanceSymbol: 'ETHUSDT', name: 'Ethereum', category: 'major' },
  { id: 'sol', symbol: 'SOL', binanceSymbol: 'SOLUSDT', name: 'Solana', category: 'major' },
  { id: 'bnb', symbol: 'BNB', binanceSymbol: 'BNBUSDT', name: 'BNB', category: 'major' },
  { id: 'xrp', symbol: 'XRP', binanceSymbol: 'XRPUSDT', name: 'XRP', category: 'major' },
  { id: 'ada', symbol: 'ADA', binanceSymbol: 'ADAUSDT', name: 'Cardano', category: 'major' },
  { id: 'doge', symbol: 'DOGE', binanceSymbol: 'DOGEUSDT', name: 'Dogecoin', category: 'meme' },
  { id: 'avax', symbol: 'AVAX', binanceSymbol: 'AVAXUSDT', name: 'Avalanche', category: 'l1' },
  { id: 'link', symbol: 'LINK', binanceSymbol: 'LINKUSDT', name: 'Chainlink', category: 'midcap' },
  { id: 'dot', symbol: 'DOT', binanceSymbol: 'DOTUSDT', name: 'Polkadot', category: 'l1' },
  { id: 'trx', symbol: 'TRX', binanceSymbol: 'TRXUSDT', name: 'Tron', category: 'l1' },
  { id: 'ltc', symbol: 'LTC', binanceSymbol: 'LTCUSDT', name: 'Litecoin', category: 'midcap' },
  { id: 'bch', symbol: 'BCH', binanceSymbol: 'BCHUSDT', name: 'Bitcoin Cash', category: 'midcap' },
  { id: 'near', symbol: 'NEAR', binanceSymbol: 'NEARUSDT', name: 'NEAR Protocol', category: 'l1' },
  { id: 'atom', symbol: 'ATOM', binanceSymbol: 'ATOMUSDT', name: 'Cosmos', category: 'l1' },
  { id: 'uni', symbol: 'UNI', binanceSymbol: 'UNIUSDT', name: 'Uniswap', category: 'defi' },
  { id: 'fil', symbol: 'FIL', binanceSymbol: 'FILUSDT', name: 'Filecoin', category: 'midcap' },
  { id: 'arb', symbol: 'ARB', binanceSymbol: 'ARBUSDT', name: 'Arbitrum', category: 'midcap' },
  { id: 'op', symbol: 'OP', binanceSymbol: 'OPUSDT', name: 'Optimism', category: 'midcap' },
  { id: 'inj', symbol: 'INJ', binanceSymbol: 'INJUSDT', name: 'Injective', category: 'l1' },
  { id: 'apt', symbol: 'APT', binanceSymbol: 'APTUSDT', name: 'Aptos', category: 'l1' },
  { id: 'sui', symbol: 'SUI', binanceSymbol: 'SUIUSDT', name: 'Sui', category: 'l1' },
  { id: 'tia', symbol: 'TIA', binanceSymbol: 'TIAUSDT', name: 'Celestia', category: 'l1' },
  { id: 'sei', symbol: 'SEI', binanceSymbol: 'SEIUSDT', name: 'Sei', category: 'l1' },
  { id: 'pyth', symbol: 'PYTH', binanceSymbol: 'PYTHUSDT', name: 'Pyth Network', category: 'defi' },
  { id: 'jup', symbol: 'JUP', binanceSymbol: 'JUPUSDT', name: 'Jupiter', category: 'defi' },
  { id: 'jto', symbol: 'JTO', binanceSymbol: 'JTOUSDT', name: 'Jito', category: 'defi' },
  { id: 'pepe', symbol: 'PEPE', binanceSymbol: 'PEPEUSDT', name: 'Pepe', category: 'meme' },
  { id: 'shib', symbol: 'SHIB', binanceSymbol: 'SHIBUSDT', name: 'Shiba Inu', category: 'meme' },
  { id: 'wif', symbol: 'WIF', binanceSymbol: 'WIFUSDT', name: 'dogwifhat', category: 'meme' },
  { id: 'bonk', symbol: 'BONK', binanceSymbol: 'BONKUSDT', name: 'Bonk', category: 'meme' },
  { id: 'floki', symbol: 'FLOKI', binanceSymbol: 'FLOKIUSDT', name: 'Floki', category: 'meme' },
  { id: 'bome', symbol: 'BOME', binanceSymbol: 'BOMEUSDT', name: 'Book of Meme', category: 'meme' },
  { id: 'mew', symbol: 'MEW', binanceSymbol: 'MEWUSDT', name: 'cat in a dogs world', category: 'meme' },
  { id: 'aave', symbol: 'AAVE', binanceSymbol: 'AAVEUSDT', name: 'Aave', category: 'defi' },
  { id: 'mkr', symbol: 'MKR', binanceSymbol: 'MKRUSDT', name: 'Maker', category: 'defi' },
  { id: 'rune', symbol: 'RUNE', binanceSymbol: 'RUNEUSDT', name: 'THORChain', category: 'defi' },
  { id: 'crv', symbol: 'CRV', binanceSymbol: 'CRVUSDT', name: 'Curve DAO', category: 'defi' },
  { id: 'render', symbol: 'RENDER', binanceSymbol: 'RENDERUSDT', name: 'Render', category: 'ai' },
  { id: 'fet', symbol: 'FET', binanceSymbol: 'FETUSDT', name: 'Fetch.ai', category: 'ai' },
  { id: 'imx', symbol: 'IMX', binanceSymbol: 'IMXUSDT', name: 'Immutable', category: 'midcap' },
  { id: 'mina', symbol: 'MINA', binanceSymbol: 'MINAUSDT', name: 'Mina', category: 'midcap' },
  { id: 'kas', symbol: 'KAS', binanceSymbol: 'KASUSDT', name: 'Kaspa', category: 'midcap' },
  { id: 'stx', symbol: 'STX', binanceSymbol: 'STXUSDT', name: 'Stacks', category: 'midcap' },
  { id: 'theta', symbol: 'THETA', binanceSymbol: 'THETAUSDT', name: 'Theta', category: 'midcap' },
  { id: 'grt', symbol: 'GRT', binanceSymbol: 'GRTUSDT', name: 'The Graph', category: 'midcap' },
  { id: 'algo', symbol: 'ALGO', binanceSymbol: 'ALGOUSDT', name: 'Algorand', category: 'midcap' },
  { id: 'ftm', symbol: 'FTM', binanceSymbol: 'FTMUSDT', name: 'Fantom', category: 'midcap' },
  { id: 'hbar', symbol: 'HBAR', binanceSymbol: 'HBARUSDT', name: 'Hedera', category: 'midcap' },
  { id: 'pol', symbol: 'POL', binanceSymbol: 'POLUSDT', name: 'Polygon', category: 'midcap' },
  { id: 'paxg', symbol: 'PAXG', binanceSymbol: 'PAXGUSDT', name: 'PAX Gold (Gold 1:1)', category: 'commodity' }
];

export function getCoinById(id: string): UniverseCoin | undefined {
  return TOP_50.find((c) => c.id === id);
}

export function getCoinBySymbol(symbol: string): UniverseCoin | undefined {
  const up = symbol.toUpperCase();
  return TOP_50.find((c) => c.symbol === up || c.binanceSymbol === up);
}

export function getCoinByBinanceSymbol(symbol: string): UniverseCoin | undefined {
  return TOP_50.find((c) => c.binanceSymbol === symbol);
}

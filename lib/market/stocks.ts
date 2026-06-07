// Top-Aktien-Universum. Bewusst kuratiert, kein Such-Index — User-Fokus
// auf die Mega-Caps + DAX-Top.

export interface StockSymbol {
  symbol: string;       // Yahoo Symbol (z. B. AAPL, SAP.DE)
  name: string;
  group: 'US Tech' | 'US Finanz' | 'US Health' | 'US Industrie' | 'US Konsum' | 'US Auto/EV' | 'Deutschland';
}

export const STOCK_UNIVERSE: StockSymbol[] = [
  // US Tech
  { symbol: 'AAPL', name: 'Apple', group: 'US Tech' },
  { symbol: 'MSFT', name: 'Microsoft', group: 'US Tech' },
  { symbol: 'GOOGL', name: 'Alphabet (Google)', group: 'US Tech' },
  { symbol: 'AMZN', name: 'Amazon', group: 'US Tech' },
  { symbol: 'META', name: 'Meta Platforms', group: 'US Tech' },
  { symbol: 'NVDA', name: 'Nvidia', group: 'US Tech' },
  { symbol: 'NFLX', name: 'Netflix', group: 'US Tech' },
  // US Finanz
  { symbol: 'BRK-B', name: 'Berkshire Hathaway B', group: 'US Finanz' },
  { symbol: 'JPM', name: 'JPMorgan Chase', group: 'US Finanz' },
  { symbol: 'V', name: 'Visa', group: 'US Finanz' },
  { symbol: 'MA', name: 'Mastercard', group: 'US Finanz' },
  // US Health
  { symbol: 'JNJ', name: 'Johnson & Johnson', group: 'US Health' },
  { symbol: 'UNH', name: 'UnitedHealth', group: 'US Health' },
  { symbol: 'LLY', name: 'Eli Lilly', group: 'US Health' },
  // US Industrie / Konsum
  { symbol: 'XOM', name: 'ExxonMobil', group: 'US Industrie' },
  { symbol: 'PG', name: 'Procter & Gamble', group: 'US Konsum' },
  { symbol: 'KO', name: 'Coca-Cola', group: 'US Konsum' },
  { symbol: 'WMT', name: 'Walmart', group: 'US Konsum' },
  // EV / Auto
  { symbol: 'TSLA', name: 'Tesla', group: 'US Auto/EV' },
  // Deutschland — Top-DAX (Yahoo-Suffix .DE)
  { symbol: 'SAP.DE', name: 'SAP', group: 'Deutschland' },
  { symbol: 'SIE.DE', name: 'Siemens', group: 'Deutschland' },
  { symbol: 'ALV.DE', name: 'Allianz', group: 'Deutschland' },
  { symbol: 'DTE.DE', name: 'Deutsche Telekom', group: 'Deutschland' },
  { symbol: 'MBG.DE', name: 'Mercedes-Benz', group: 'Deutschland' },
  { symbol: 'BMW.DE', name: 'BMW', group: 'Deutschland' },
  { symbol: 'BAS.DE', name: 'BASF', group: 'Deutschland' },
  { symbol: 'BAYN.DE', name: 'Bayer', group: 'Deutschland' },
  { symbol: 'DBK.DE', name: 'Deutsche Bank', group: 'Deutschland' },
  { symbol: 'ADS.DE', name: 'Adidas', group: 'Deutschland' }
];

export const STOCK_INDEX_SYMBOLS = [
  { symbol: '^GSPC', name: 'S&P 500' },
  { symbol: '^NDX', name: 'Nasdaq 100' },
  { symbol: '^DJI', name: 'Dow Jones' },
  { symbol: '^GDAXI', name: 'DAX' },
  { symbol: '^STOXX50E', name: 'EURO STOXX 50' }
];

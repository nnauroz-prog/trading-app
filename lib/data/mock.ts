import { Asset, PriceSnapshot } from '@/lib/types/domain';

export const mockAssets: Asset[] = [
  { id: 'btc', name: 'Bitcoin', ticker: 'BTC', category: 'crypto', venueAvailability: ['Bitpanda', 'Scalable'] },
  { id: 'eth', name: 'Ethereum', ticker: 'ETH', category: 'crypto', venueAvailability: ['Bitpanda', 'Scalable'] },
  { id: 'sol', name: 'Solana', ticker: 'SOL', category: 'crypto', venueAvailability: ['Bitpanda'] },
  { id: 'nvda', name: 'NVIDIA', ticker: 'NVDA', category: 'stock', venueAvailability: ['Xetra via broker'] },
  { id: 'sap', name: 'SAP', ticker: 'SAP', category: 'stock', venueAvailability: ['Xetra'] },
  { id: 'msft', name: 'Microsoft', ticker: 'MSFT', category: 'stock', venueAvailability: ['Nasdaq via broker'] }
];

export const mockSnapshots: Record<string, PriceSnapshot> = {
  btc: { assetId: 'btc', price: 66350, change24h: 1.2, change7d: 5.1, change30d: 12.3, volume: 32000000000, source: 'mock' },
  eth: { assetId: 'eth', price: 3160, change24h: 0.7, change7d: 4.4, change30d: 10.1, volume: 15000000000, source: 'mock' },
  sol: { assetId: 'sol', price: 158, change24h: -1.8, change7d: 11.3, change30d: 24.5, volume: 4200000000, source: 'mock' },
  nvda: { assetId: 'nvda', price: 1088, change24h: -0.9, change7d: 1.5, change30d: 9.7, volume: 44000000000, source: 'mock' },
  sap: { assetId: 'sap', price: 183, change24h: 0.2, change7d: 2.1, change30d: 6.2, volume: 460000000, source: 'mock' },
  msft: { assetId: 'msft', price: 425, change24h: 0.6, change7d: 1.2, change30d: 3.9, volume: 25000000000, source: 'mock' }
};

export const coingeckoIdByAssetId: Record<string, string> = {
  btc: 'bitcoin',
  eth: 'ethereum',
  sol: 'solana'
};

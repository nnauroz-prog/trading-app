import { Broker } from '@/lib/types/ideas';
import { isWknOnScalable } from './scalable-assets';
import { isWknOnTradeRepublic } from './trade-republic-assets';
import { isTickerOnCoinbase } from './coinbase-assets';

export interface BrokerAvailability {
  broker: Broker;
  available: boolean;
  verified: boolean;
  lastVerified: string;
}

export function checkInstrumentAvailability(
  broker: Broker,
  wknOrTicker: string
): BrokerAvailability {
  const norm = wknOrTicker.toUpperCase().trim();
  switch (broker) {
    case 'Scalable': {
      const r = isWknOnScalable(norm);
      return { broker, ...r };
    }
    case 'Trade Republic': {
      const r = isWknOnTradeRepublic(norm);
      return { broker, ...r };
    }
    case 'Coinbase': {
      const r = isTickerOnCoinbase(norm);
      return { broker, ...r };
    }
    default:
      return { broker, available: false, verified: false, lastVerified: '—' };
  }
}

export const KNOWN_WKN_PATTERN_DERIVATIVE = /^[A-Z]{2}[A-Z0-9]{4}$/;
export const KNOWN_WKN_PATTERN_STOCK = /^[A-Z0-9]{6}$/;

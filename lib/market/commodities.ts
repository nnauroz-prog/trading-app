// Rohstoff-Universum für /rohstoffe. Nutzt Yahoo-Continuous-Futures-Symbole.
// =F-Suffix steht für „Continuous Front-Month Future".

export interface CommoditySymbol {
  symbol: string;
  name: string;
  unit: string;
  group: 'Edelmetalle' | 'Energie' | 'Industriemetalle' | 'Agrar';
  emoji?: string;
}

export const COMMODITY_UNIVERSE: CommoditySymbol[] = [
  // Edelmetalle
  { symbol: 'GC=F', name: 'Gold', unit: 'USD / Unze', group: 'Edelmetalle', emoji: '🥇' },
  { symbol: 'SI=F', name: 'Silber', unit: 'USD / Unze', group: 'Edelmetalle', emoji: '🥈' },
  { symbol: 'PL=F', name: 'Platin', unit: 'USD / Unze', group: 'Edelmetalle', emoji: '⚪' },
  { symbol: 'PA=F', name: 'Palladium', unit: 'USD / Unze', group: 'Edelmetalle', emoji: '⚪' },
  // Energie
  { symbol: 'CL=F', name: 'WTI Rohöl', unit: 'USD / Barrel', group: 'Energie', emoji: '🛢️' },
  { symbol: 'BZ=F', name: 'Brent Rohöl', unit: 'USD / Barrel', group: 'Energie', emoji: '🛢️' },
  { symbol: 'NG=F', name: 'Erdgas (Henry Hub)', unit: 'USD / mmBtu', group: 'Energie', emoji: '🔥' },
  { symbol: 'RB=F', name: 'Benzin RBOB', unit: 'USD / Gallone', group: 'Energie', emoji: '⛽' },
  // Industriemetalle
  { symbol: 'HG=F', name: 'Kupfer', unit: 'USD / Pfund', group: 'Industriemetalle', emoji: '🟫' },
  // Agrar
  { symbol: 'ZW=F', name: 'Weizen', unit: 'US¢ / Bushel', group: 'Agrar', emoji: '🌾' },
  { symbol: 'ZC=F', name: 'Mais', unit: 'US¢ / Bushel', group: 'Agrar', emoji: '🌽' },
  { symbol: 'ZS=F', name: 'Sojabohnen', unit: 'US¢ / Bushel', group: 'Agrar', emoji: '🫘' },
  { symbol: 'KC=F', name: 'Kaffee Arabica', unit: 'US¢ / Pfund', group: 'Agrar', emoji: '☕' },
  { symbol: 'SB=F', name: 'Zucker', unit: 'US¢ / Pfund', group: 'Agrar', emoji: '🧂' }
];

export function commoditiesByGroup(): Record<CommoditySymbol['group'], CommoditySymbol[]> {
  return {
    Edelmetalle: COMMODITY_UNIVERSE.filter((c) => c.group === 'Edelmetalle'),
    Energie: COMMODITY_UNIVERSE.filter((c) => c.group === 'Energie'),
    Industriemetalle: COMMODITY_UNIVERSE.filter((c) => c.group === 'Industriemetalle'),
    Agrar: COMMODITY_UNIVERSE.filter((c) => c.group === 'Agrar')
  };
}

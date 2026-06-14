// Quellen-Tier-System: nur renommierte Tier-1-Quellen liefern Daten,
// die als 'official'-Confidence in den WM-Spielplan einfliessen duerfen.
//
// Hintergrund: Die Modell-Vorhersagen basieren direkt auf den Schedule-
// Daten (Datum, Anstoss, Stadion). Wenn die Quelle falsch ist, wird auch
// die Vorhersage falsch — egal wie gut das Modell.
//
// Reine Daten + Pure-Funktion. Keine Netzwerk-Zugriffe.

export type SourceTier = 'tier1' | 'tier2' | 'aggregator';

export interface SourceTierEntry {
  domain: string;
  tier: SourceTier;
  // true = von der laufenden Sandbox erreichbar (per WebSearch).
  // false = blockiert (entweder Anthropic-Policy oder Network-Egress).
  reachable: boolean;
  notes?: string;
}

// Renommierte Tier-1-Quellen — eigene Redaktion, eigene Verifikation.
// Reihenfolge = Prioritaet bei Konflikten.
export const TIER1_SOURCES: SourceTierEntry[] = [
  { domain: 'fifa.com', tier: 'tier1', reachable: true, notes: 'Offizielle FIFA-Daten, hoechste Prioritaet bei WM-Spielplan' },
  { domain: 'espn.com', tier: 'tier1', reachable: true, notes: 'Disney-Sport-Redaktion, kapitalstaerkster Sport-Outlet weltweit' },
  { domain: 'skysports.com', tier: 'tier1', reachable: true, notes: 'Sky-UK-Redaktion, eigene Korrespondenten' },
  { domain: 'kicker.de', tier: 'tier1', reachable: true, notes: 'Deutscher Fussball-Fachmagazin-Standard seit 1920' },
  // Folgende sind Tier-1, aber von der Sandbox aktuell nicht erreichbar:
  { domain: 'bbc.com', tier: 'tier1', reachable: false, notes: 'Public-service broadcasting, von Anthropic-WebSearch blockiert' },
  { domain: 'bbc.co.uk', tier: 'tier1', reachable: false, notes: 'siehe bbc.com' },
  { domain: 'reuters.com', tier: 'tier1', reachable: false, notes: 'Internationale Nachrichtenagentur, von Anthropic-WebSearch blockiert' },
  { domain: 'apnews.com', tier: 'tier1', reachable: false, notes: 'Associated Press' },
  { domain: 'tagesschau.de', tier: 'tier1', reachable: false, notes: 'Oeffentlich-rechtlich D, von Anthropic-WebSearch blockiert' },
  { domain: 'sportschau.de', tier: 'tier1', reachable: false, notes: 'ARD-Sport, Sandbox-Egress blockiert' },
  { domain: 'zdf.de', tier: 'tier1', reachable: false, notes: 'Oeffentlich-rechtlich D' },
  { domain: 'theguardian.com', tier: 'tier1', reachable: false, notes: 'Eigene Sport-Redaktion UK' },
  { domain: 'nytimes.com', tier: 'tier1', reachable: false, notes: 'Liberale US-Tageszeitung' },
  { domain: 'theglobeandmail.com', tier: 'tier1', reachable: false, notes: 'Kanadische Standard-Tageszeitung' }
];

// Tier-2: anerkannte Sport-Outlets, aber starkes Aggregator-Element
// (kann Tier-1-Daten neu publishen, manchmal fehlerhaft).
export const TIER2_SOURCES: SourceTierEntry[] = [
  { domain: 'nbcsports.com', tier: 'tier2', reachable: true },
  { domain: 'foxsports.com', tier: 'tier2', reachable: true },
  { domain: 'yahoo.com', tier: 'tier2', reachable: true, notes: 'Sport-Aggregator, gelegentlich Zeit-Fehler' },
  { domain: 'sports.yahoo.com', tier: 'tier2', reachable: true },
  { domain: 'cbssports.com', tier: 'tier2', reachable: true },
  { domain: 'mlssoccer.com', tier: 'tier2', reachable: true },
  { domain: 'aljazeera.com', tier: 'tier2', reachable: true }
];

// Aggregator/Tertiaer: NICHT als alleinige Quelle fuer 'official'-
// Confidence verwenden. Inhalt muss durch eine Tier-1-Quelle bestaetigt
// werden.
export const AGGREGATOR_SOURCES: SourceTierEntry[] = [
  { domain: 'mappr.co', tier: 'aggregator', reachable: true, notes: 'Reiner Aggregator' },
  { domain: 'fwcmania.com', tier: 'aggregator', reachable: true },
  { domain: 'outlookindia.com', tier: 'aggregator', reachable: true },
  { domain: 'theblazingmusket.com', tier: 'aggregator', reachable: true },
  { domain: 'wikipedia.org', tier: 'aggregator', reachable: true, notes: 'Kann veraltet sein; gut als Cross-Check, schlecht als Primaerquelle' },
  { domain: 't-online.de', tier: 'aggregator', reachable: true },
  { domain: 'fussballdaten.de', tier: 'aggregator', reachable: true },
  { domain: 'joyn.de', tier: 'aggregator', reachable: true },
  { domain: 'ran.de', tier: 'aggregator', reachable: true },
  { domain: 'wettbasis.com', tier: 'aggregator', reachable: true }
];

const ALL_SOURCES = [...TIER1_SOURCES, ...TIER2_SOURCES, ...AGGREGATOR_SOURCES];

export function tierOfDomain(domain: string): SourceTier | null {
  const norm = domain.toLowerCase().replace(/^www\./, '');
  for (const s of ALL_SOURCES) {
    if (norm === s.domain || norm.endsWith('.' + s.domain)) return s.tier;
  }
  return null;
}

export function isTier1Source(domain: string): boolean {
  return tierOfDomain(domain) === 'tier1';
}

// Pruefe ob ein Free-Text-Kommentar eine bekannte Tier-1-Quelle erwaehnt.
// Akzeptiert Markennamen (z.B. "Sky", "ESPN") oder Domain-Substrings.
const TIER1_KEYWORDS = [
  'fifa.com', 'fifa', 'espn', 'sky sports', 'skysports', 'sky',
  'kicker', 'bbc', 'reuters', 'ap news', 'apnews', 'associated press',
  'tagesschau', 'sportschau', 'zdf', 'ard',
  'globe and mail', 'theglobeandmail', 'guardian', 'theguardian',
  'new york times', 'nytimes'
];

export function commentCitesTier1(text: string): boolean {
  const norm = text.toLowerCase();
  return TIER1_KEYWORDS.some((kw) => norm.includes(kw));
}

// Reachable-Tier-1: das sind die Quellen, die der Agent aktuell tatsaechlich
// abfragen kann. Wird vom Fetcher/Vitest als Whitelist benutzt.
export function reachableTier1Domains(): string[] {
  return TIER1_SOURCES.filter((s) => s.reachable).map((s) => s.domain);
}

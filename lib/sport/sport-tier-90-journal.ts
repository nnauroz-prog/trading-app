// Sport-Tier-90-Tagebuch: jeder Tag, an dem ein Spiel den 10/11-Signal-Konsens
// schafft, wird festgehalten. Outcome wird aufgelöst, wenn das Spiel beendet
// ist (via SportTipJournal-Auflöser-Pattern).

export interface SportTier90Entry {
  fixtureId: string;
  date: string; // YYYY-MM-DD (Berlin) — Anstoßdatum
  recordedAt: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  pickPlain: string;
  pickSide: 'home' | 'away' | 'draw';
  confidence: number; // 0..1
  likelyScoreHome: number;
  likelyScoreAway: number;
  outcome: 'pending' | 'win' | 'loss' | 'push';
  resolvedAt?: number;
  finalHomeScore?: number;
  finalAwayScore?: number;
}

const STORAGE_KEY = 'trading-app.sport-tier-90-journal-v1';
export const SPORT_TIER_90_JOURNAL_CHANGED_EVENT = 'trading-app:sport-tier-90-journal-changed';

export function loadSportTier90Journal(): SportTier90Entry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SportTier90Entry[];
  } catch {
    return [];
  }
}

function save(entries: SportTier90Entry[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent(SPORT_TIER_90_JOURNAL_CHANGED_EVENT));
}

export function recordSportTier90(entry: Omit<SportTier90Entry, 'recordedAt' | 'outcome'>): void {
  const log = loadSportTier90Journal();
  if (log.some((e) => e.fixtureId === entry.fixtureId)) return;
  log.push({ ...entry, recordedAt: Date.now(), outcome: 'pending' });
  save(log);
}

// Pure Auflöser: vergleicht den Pick gegen den echten Endstand.
export function resolveSportTier90(entry: SportTier90Entry, finalHome: number, finalAway: number): SportTier90Entry {
  if (entry.outcome !== 'pending') return entry;
  const actualSide: 'home' | 'away' | 'draw' = finalHome > finalAway ? 'home' : finalHome < finalAway ? 'away' : 'draw';
  const won = actualSide === entry.pickSide;
  return {
    ...entry,
    outcome: won ? 'win' : 'loss',
    resolvedAt: Date.now(),
    finalHomeScore: finalHome,
    finalAwayScore: finalAway
  };
}

export interface SportTier90Stats {
  total: number;
  pending: number;
  wins: number;
  losses: number;
  hitRatePct: number | null;
}

export function summariseSportTier90(log: SportTier90Entry[]): SportTier90Stats {
  const total = log.length;
  const pending = log.filter((e) => e.outcome === 'pending').length;
  const wins = log.filter((e) => e.outcome === 'win').length;
  const losses = log.filter((e) => e.outcome === 'loss').length;
  const resolved = wins + losses;
  return {
    total, pending, wins, losses,
    hitRatePct: resolved > 0 ? Math.round((wins / resolved) * 1000) / 10 : null
  };
}

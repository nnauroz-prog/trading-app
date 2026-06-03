import { TipTier } from '@/lib/sport/tip-selection';

export interface TipJournalEntry {
  id: string;                  // fixture id + market
  fixtureId: string;
  recordedAt: number;
  league: string;
  date: string;                // fixture date
  homeTeam: string;
  awayTeam: string;
  tier: TipTier | 'custom';
  market: string;              // e.g. "Heimsieg Bayern" / "Over 2.5 Tore" / "1:1"
  modelProbabilityPct: number; // 0-100, what the model said
  // Optionaler Quality-Score-Kontext (Welle 406-415): wird beim Speichern aus
  // computePredictionQualityScore mitgegeben, damit Auswertungen zeigen, wie
  // gut sich Tipps mit hohem Score gegenüber niedrigen schlagen.
  qualityScore?: number;             // 0-100
  qualityBand?: 'sehr_stark' | 'stark' | 'brauchbar' | 'orientierung' | 'nicht_verwenden';
  dataQuality?: 'good' | 'medium' | 'weak';
  isStableMarket?: boolean;
  outcome: 'pending' | 'win' | 'loss' | 'push';
  resolvedAt?: number;
  // Stored homeScore/awayScore once the match is over so the journal becomes
  // a true record even if the result drops out of the fixture cache.
  finalHomeScore?: number;
  finalAwayScore?: number;
}

const STORAGE_KEY = 'trading-app.sport-tip-journal-v1';
const MAX_ENTRIES = 500;

export const SPORT_TIP_JOURNAL_CHANGED_EVENT = 'trading-app:sport-tip-journal-changed';

export function loadTipJournal(): TipJournalEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as TipJournalEntry[];
  } catch {
    return [];
  }
}

function save(entries: TipJournalEntry[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  window.dispatchEvent(new CustomEvent(SPORT_TIP_JOURNAL_CHANGED_EVENT));
}

export function addTip(entry: Omit<TipJournalEntry, 'id' | 'recordedAt' | 'outcome'>): TipJournalEntry {
  const id = `${entry.fixtureId}-${entry.market}`.replace(/\s+/g, '_');
  const log = loadTipJournal();
  if (log.some((e) => e.id === id)) return log.find((e) => e.id === id)!;
  const newEntry: TipJournalEntry = { ...entry, id, recordedAt: Date.now(), outcome: 'pending' };
  log.push(newEntry);
  save(log);
  return newEntry;
}

export function removeTip(id: string): void {
  save(loadTipJournal().filter((e) => e.id !== id));
}

export function clearTipJournal(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(SPORT_TIP_JOURNAL_CHANGED_EVENT));
}

export function isTipped(fixtureId: string, market: string): boolean {
  return loadTipJournal().some((e) => e.fixtureId === fixtureId && e.market === market);
}

// Evaluate whether a market outcome (e.g. "Heimsieg Bayern", "Over 2.5 Tore",
// "1:1") was right given a final score.
export function evaluateTip(market: string, homeTeam: string, awayTeam: string, homeScore: number, awayScore: number): 'win' | 'loss' | 'push' {
  const m = market.toLowerCase();
  // Exact score "X:Y"
  const exact = m.match(/(\d+)\s*:\s*(\d+)/);
  if (exact) {
    const eh = parseInt(exact[1], 10);
    const ea = parseInt(exact[2], 10);
    return eh === homeScore && ea === awayScore ? 'win' : 'loss';
  }
  // Over / Under N.5 Tore
  const over = m.match(/over\s+(\d+(?:\.\d+)?)\s*tore/);
  if (over) {
    const threshold = parseFloat(over[1]);
    return (homeScore + awayScore) > threshold ? 'win' : 'loss';
  }
  const under = m.match(/under\s+(\d+(?:\.\d+)?)\s*tore/);
  if (under) {
    const threshold = parseFloat(under[1]);
    return (homeScore + awayScore) < threshold ? 'win' : 'loss';
  }
  // BTTS
  if (m.includes('beide teams treffen nicht')) {
    return (homeScore === 0 || awayScore === 0) ? 'win' : 'loss';
  }
  if (m.includes('beide teams treffen')) {
    return (homeScore > 0 && awayScore > 0) ? 'win' : 'loss';
  }
  // 1X / X2 / 12 / Unentschieden / Heimsieg / Auswärtssieg.
  // Check explicit market keywords FIRST — team-name substring matching
  // is a fallback because short names like "A" or "FC" would match by accident.
  const isHomeWin = homeScore > awayScore;
  const isDraw = homeScore === awayScore;
  const isAwayWin = awayScore > homeScore;
  if (m.includes('1x')) return (isHomeWin || isDraw) ? 'win' : 'loss';
  if (m.includes('x2')) return (isAwayWin || isDraw) ? 'win' : 'loss';
  if (m.startsWith('12') || m.includes('kein unentschieden')) return (isHomeWin || isAwayWin) ? 'win' : 'loss';
  if (m.includes('unentschieden')) return isDraw ? 'win' : 'loss';
  if (m.includes('auswärtssieg')) return isAwayWin ? 'win' : 'loss';
  if (m.includes('heimsieg')) return isHomeWin ? 'win' : 'loss';
  // Fallback to team-name detection only if no keyword matched.
  if (homeTeam.length >= 3 && m.includes(homeTeam.toLowerCase())) return isHomeWin ? 'win' : 'loss';
  if (awayTeam.length >= 3 && m.includes(awayTeam.toLowerCase())) return isAwayWin ? 'win' : 'loss';
  return 'push'; // unknown market
}

// Resolves any pending tips against a list of finished fixtures. Returns the
// updated journal.
export interface FinishedFixtureLite {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
}

export function resolvePendingTips(finished: FinishedFixtureLite[]): TipJournalEntry[] {
  const log = loadTipJournal();
  let changed = false;
  for (const entry of log) {
    if (entry.outcome !== 'pending') continue;
    const fixture = finished.find((f) => f.id === entry.fixtureId);
    if (!fixture) continue;
    const outcome = evaluateTip(entry.market, fixture.homeTeam, fixture.awayTeam, fixture.homeScore, fixture.awayScore);
    entry.outcome = outcome;
    entry.resolvedAt = Date.now();
    entry.finalHomeScore = fixture.homeScore;
    entry.finalAwayScore = fixture.awayScore;
    changed = true;
  }
  if (changed) save(log);
  return log;
}

export interface TipStats {
  total: number;
  pending: number;
  resolved: number;
  wins: number;
  losses: number;
  pushes: number;
  hitRatePct: number | null;
  byTier: Record<TipTier | 'custom', { resolved: number; wins: number; hitRatePct: number | null }>;
  // Auswertung nach Quality-Score-Band — zeigt, ob „sehr stark"-Tipps
  // tatsächlich öfter aufgehen als „orientierung"-Tipps.
  byQualityBand: Record<string, { resolved: number; wins: number; hitRatePct: number | null }>;
}

export function summariseTips(log: TipJournalEntry[]): TipStats {
  const total = log.length;
  const pending = log.filter((e) => e.outcome === 'pending').length;
  const resolved = log.filter((e) => e.outcome !== 'pending').length;
  const wins = log.filter((e) => e.outcome === 'win').length;
  const losses = log.filter((e) => e.outcome === 'loss').length;
  const pushes = log.filter((e) => e.outcome === 'push').length;
  const decisive = wins + losses;
  const hitRatePct = decisive > 0 ? Math.round((wins / decisive) * 100) : null;

  const tiers: Array<TipTier | 'custom'> = ['konservativ', 'standard', 'risiko', 'custom'];
  const byTier: TipStats['byTier'] = {
    konservativ: { resolved: 0, wins: 0, hitRatePct: null },
    standard: { resolved: 0, wins: 0, hitRatePct: null },
    risiko: { resolved: 0, wins: 0, hitRatePct: null },
    custom: { resolved: 0, wins: 0, hitRatePct: null }
  };
  for (const tier of tiers) {
    const tierLog = log.filter((e) => e.tier === tier && e.outcome !== 'pending');
    const tierWins = tierLog.filter((e) => e.outcome === 'win').length;
    const tierDecisive = tierLog.filter((e) => e.outcome !== 'push').length;
    byTier[tier] = {
      resolved: tierLog.length,
      wins: tierWins,
      hitRatePct: tierDecisive > 0 ? Math.round((tierWins / tierDecisive) * 100) : null
    };
  }

  const bands: Array<NonNullable<TipJournalEntry['qualityBand']>> = ['sehr_stark', 'stark', 'brauchbar', 'orientierung', 'nicht_verwenden'];
  const byQualityBand: TipStats['byQualityBand'] = {};
  for (const band of bands) {
    const bandLog = log.filter((e) => e.qualityBand === band && e.outcome !== 'pending');
    const bandWins = bandLog.filter((e) => e.outcome === 'win').length;
    const bandDecisive = bandLog.filter((e) => e.outcome !== 'push').length;
    byQualityBand[band] = {
      resolved: bandLog.length,
      wins: bandWins,
      hitRatePct: bandDecisive > 0 ? Math.round((bandWins / bandDecisive) * 100) : null
    };
  }

  return { total, pending, resolved, wins, losses, pushes, hitRatePct, byTier, byQualityBand };
}

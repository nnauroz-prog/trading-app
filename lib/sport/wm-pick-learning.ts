// WM Pick-Lern-System (Pure-Lib).
//
// Jeder WM-Sieger-Pick, den die App anzeigt, wird zusammen mit seinen
// Profi-Conditions-Faktoren in einem Append-Only-Log gespeichert. Nach
// dem Spiel matchen wir das echte Ergebnis dazu — die Agenten lernen
// auf Basis der wirklichen Trefferquote pro Faktor:
//
//   - Wenn der Akklimatisierungs-Faktor aktiv war und 70 % der Picks
//     getroffen haben (vs. 60 % wenn er aus war), kriegt der Faktor in
//     der naechsten Pick-Runde mehr Gewicht.
//   - Wenn ein Faktor historisch unter Erwartung liefert, wird er
//     gedaempft — bis hin zur Deaktivierung.
//
// Reine Funktionen. Der localStorage-Wrapper liegt separat.
// Wording strikt ohne verbotene Begriffe.

export type WmPickOutcome = 'pending' | 'win' | 'loss' | 'push';

export interface WmFactorSnapshot {
  // Stabiler Faktor-Schluessel: acclimatization | altitude | jetlag |
  // host-advantage | regional-crowd | hot-midday | weather (kommt
  // spaeter mit Live-Wetter).
  id: string;
  homeGoalMultiplier: number;
  awayGoalMultiplier: number;
  homeEloDelta: number;
  awayEloDelta: number;
  confidenceShift: number;
}

export interface WmPickLogEntry {
  // Stabiler Identifier (fixtureId + market).
  id: string;
  fixtureId: string;
  recordedAt: number;
  dateIso: string;             // Spieldatum YYYY-MM-DD
  homeTeam: string;
  awayTeam: string;
  winnerTeam: string;
  winnerSide: 'home' | 'away';
  modelProbabilityPct: number;
  eloDiff: number;
  // Tier-Stempel aus dem ranking — fuer eine Outcome-Aufschluesselung
  // nach Tier.
  tier: 'hoechste-konfluenz' | 'modell-favorit';
  factorSnapshot: WmFactorSnapshot[];
  proTipperConviction: number; // 0..1
  outcome: WmPickOutcome;
  resolvedAt?: number;
  finalHomeScore?: number;
  finalAwayScore?: number;
}

// Mindest-Stichprobe, ab der wir ueberhaupt eine empirische Aussage
// pro Faktor zulassen. Darunter bleibt der Standard-Faktor in Kraft.
export const MIN_SAMPLE_FOR_LEARNING = 8;
// Schwelle (in Prozentpunkten Hit-Rate-Unterschied), unter der wir
// eine Faktor-Anpassung als signifikant betrachten.
export const SIGNIFICANT_LIFT_PCT = 5;

export interface FactorPerformance {
  factorId: string;
  // Picks bei denen DIESER Faktor aktiv war (Multiplier != 1.0 oder
  // ELO-Delta != 0).
  picksWithFactor: number;
  winsWithFactor: number;
  hitRateWithFactor: number | null;
  // Picks bei denen der Faktor NICHT aktiv war.
  picksWithoutFactor: number;
  winsWithoutFactor: number;
  hitRateWithoutFactor: number | null;
  // Differenz (positive = Faktor hilft).
  liftPct: number | null;
  // Empirisch abgeleiteter Gewichts-Multiplier zwischen 0.5 (deaktiviert)
  // und 1.3 (verstaerkt). Bei UNKLAR bleibt 1.0.
  weightMultiplier: number;
  label: 'UNKLAR' | 'BESTAETIGT' | 'NEUTRAL' | 'KONTRA';
  basedOnSample: number;
}

// Aktiv = Faktor hatte einen messbaren Einfluss auf den Pick (Multiplier
// nicht 1.0 oder ELO-Delta != 0).
function factorWasActive(snapshot: WmFactorSnapshot[], id: string): boolean {
  const f = snapshot.find((s) => s.id === id);
  if (!f) return false;
  return (
    Math.abs(f.homeGoalMultiplier - 1) > 0.001 ||
    Math.abs(f.awayGoalMultiplier - 1) > 0.001 ||
    Math.abs(f.homeEloDelta) > 0.001 ||
    Math.abs(f.awayEloDelta) > 0.001 ||
    Math.abs(f.confidenceShift) > 0.001
  );
}

function deriveLabel(liftPct: number | null, sampleWith: number, sampleWithout: number): FactorPerformance['label'] {
  if (sampleWith < MIN_SAMPLE_FOR_LEARNING || sampleWithout < MIN_SAMPLE_FOR_LEARNING) return 'UNKLAR';
  if (liftPct === null) return 'UNKLAR';
  if (liftPct >= SIGNIFICANT_LIFT_PCT) return 'BESTAETIGT';
  if (liftPct <= -SIGNIFICANT_LIFT_PCT) return 'KONTRA';
  return 'NEUTRAL';
}

function deriveWeight(label: FactorPerformance['label'], liftPct: number | null): number {
  if (label === 'UNKLAR' || liftPct === null) return 1.0;
  if (label === 'BESTAETIGT') return Math.min(1.30, 1.0 + (liftPct / 100));
  if (label === 'KONTRA') return Math.max(0.50, 1.0 + (liftPct / 100));
  return 1.0;
}

// Berechnet pro Faktor-ID die historische Performance.
export function evaluateFactorPerformance(log: WmPickLogEntry[], factorId: string): FactorPerformance {
  const resolved = log.filter((e) => e.outcome === 'win' || e.outcome === 'loss');
  const withFactor = resolved.filter((e) => factorWasActive(e.factorSnapshot, factorId));
  const withoutFactor = resolved.filter((e) => !factorWasActive(e.factorSnapshot, factorId));
  const winsWith = withFactor.filter((e) => e.outcome === 'win').length;
  const winsWithout = withoutFactor.filter((e) => e.outcome === 'win').length;
  const hitRateWith = withFactor.length > 0 ? winsWith / withFactor.length : null;
  const hitRateWithout = withoutFactor.length > 0 ? winsWithout / withoutFactor.length : null;
  const liftPct = (hitRateWith !== null && hitRateWithout !== null)
    ? Math.round((hitRateWith - hitRateWithout) * 100)
    : null;
  const label = deriveLabel(liftPct, withFactor.length, withoutFactor.length);
  const weight = deriveWeight(label, liftPct);
  return {
    factorId,
    picksWithFactor: withFactor.length,
    winsWithFactor: winsWith,
    hitRateWithFactor: hitRateWith,
    picksWithoutFactor: withoutFactor.length,
    winsWithoutFactor: winsWithout,
    hitRateWithoutFactor: hitRateWithout,
    liftPct,
    weightMultiplier: weight,
    label,
    basedOnSample: resolved.length
  };
}

// Aggregiert alle bekannten Faktoren in einer Map fuer den Picks-Rang-
// Algorithmus.
export const KNOWN_FACTOR_IDS = [
  'acclimatization',
  'altitude',
  'jetlag',
  'host-advantage',
  'regional-crowd',
  'hot-midday',
  'rest-days',
  'weather',
  'confederation-home',
  'phase-pressure',
  'venue-familiarity',
  'travel-distance'
] as const;
export type WmFactorId = typeof KNOWN_FACTOR_IDS[number];

export interface FactorWeightMap {
  // Gewicht 0.5..1.3 pro Faktor.
  weights: Record<string, number>;
  // Label pro Faktor fuer UI.
  labels: Record<string, FactorPerformance['label']>;
  // Anzahl resolved Picks insgesamt.
  totalResolved: number;
}

export function deriveFactorWeights(log: WmPickLogEntry[]): FactorWeightMap {
  const weights: Record<string, number> = {};
  const labels: Record<string, FactorPerformance['label']> = {};
  for (const id of KNOWN_FACTOR_IDS) {
    const perf = evaluateFactorPerformance(log, id);
    weights[id] = perf.weightMultiplier;
    labels[id] = perf.label;
  }
  const totalResolved = log.filter((e) => e.outcome === 'win' || e.outcome === 'loss').length;
  return { weights, labels, totalResolved };
}

// Tier-Aufschluesselung — fuer ein "lebendes" Confidence-Display.
export interface TierPerformance {
  tier: 'hoechste-konfluenz' | 'modell-favorit';
  total: number;
  resolved: number;
  wins: number;
  hitRatePct: number | null;
}

export function evaluateTierPerformance(log: WmPickLogEntry[]): TierPerformance[] {
  const tiers: TierPerformance['tier'][] = ['hoechste-konfluenz', 'modell-favorit'];
  return tiers.map((tier) => {
    const all = log.filter((e) => e.tier === tier);
    const resolved = all.filter((e) => e.outcome === 'win' || e.outcome === 'loss');
    const wins = resolved.filter((e) => e.outcome === 'win').length;
    const decisive = resolved.length;
    return {
      tier,
      total: all.length,
      resolved: decisive,
      wins,
      hitRatePct: decisive > 0 ? Math.round((wins / decisive) * 100) : null
    };
  });
}

// Resolve: matched ausstehende Picks gegen Final-Scores.
export interface FinishedFixtureLite {
  fixtureId: string;
  homeScore: number;
  awayScore: number;
}

function outcomeForPick(entry: WmPickLogEntry, home: number, away: number): WmPickOutcome {
  if (home === away) return 'push'; // Sieger-Pick auf Remis = push (kein klares Ergebnis)
  const homeWon = home > away;
  if (entry.winnerSide === 'home' && homeWon) return 'win';
  if (entry.winnerSide === 'away' && !homeWon) return 'win';
  return 'loss';
}

export function resolveOpenPicks(log: WmPickLogEntry[], finished: FinishedFixtureLite[], now: number = Date.now()): { log: WmPickLogEntry[]; resolvedCount: number } {
  let resolvedCount = 0;
  const next = log.map((entry) => {
    if (entry.outcome !== 'pending') return entry;
    const finish = finished.find((f) => f.fixtureId === entry.fixtureId);
    if (!finish) return entry;
    const outcome = outcomeForPick(entry, finish.homeScore, finish.awayScore);
    resolvedCount += 1;
    return {
      ...entry,
      outcome,
      resolvedAt: now,
      finalHomeScore: finish.homeScore,
      finalAwayScore: finish.awayScore
    };
  });
  return { log: next, resolvedCount };
}

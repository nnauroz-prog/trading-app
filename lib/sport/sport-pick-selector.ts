// Sport Precision Desk — Top-Pick-Selector.
//
// Waehlt aus einer Liste evaluierter Picks die maximal 5, die der User oben
// sieht. Regeln:
//   * pro matchId nur ein Pick (staerkster gewinnt)
//   * keine doppelten (matchId + marketType) Eintraege
//   * FREIGABE vor BEOBACHTEN
//   * NICHT_VERWENDEN wird nur fuer den leeren-Tag-Empty-State zugelassen,
//     nie als Top-Pick im normalen Modus.
//
// Reine Funktion, keine I/O.

import type {
  PrecisionPickResult,
  PrecisionVerdict
} from '@/lib/sport/sport-precision-gate';

const VERDICT_RANK: Record<PrecisionVerdict, number> = {
  FREIGABE: 3,
  BEOBACHTEN: 2,
  NICHT_VERWENDEN: 1
};

export interface SelectTopPicksOptions {
  // Maximalanzahl Top-Picks (Default 5).
  limit?: number;
  // Wenn true, werden auch NICHT_VERWENDEN-Picks ausgegeben (z. B. Empty-State-
  // Erklaerung). Default false.
  includeRejected?: boolean;
  // Wenn ueber alle Picks gar keine FREIGABE/BEOBACHTEN vorliegt und
  // includeRejected false ist, wird trotzdem ein einziger NICHT_VERWENDEN-Pick
  // als „Erklaer-Pick" zurueckgegeben, damit das UI den Empty-State sauber
  // begruenden kann. Default true.
  allowExplainerWhenEmpty?: boolean;
}

// Picks pro matchId zusammenfassen — staerkster Markt gewinnt. Innerhalb
// eines Matches bestimmen Verdict-Rank > precisionScore > displayProbability
// die Wahl.
function pickBestPerMatch<T extends PrecisionPickResult>(picks: T[]): T[] {
  const byMatch = new Map<string, T>();
  for (const p of picks) {
    const existing = byMatch.get(p.matchId);
    if (!existing) {
      byMatch.set(p.matchId, p);
      continue;
    }
    if (comparePicks(p, existing) < 0) byMatch.set(p.matchId, p);
  }
  return [...byMatch.values()];
}

// Negative -> a besser, positive -> b besser. Sort-konform.
function comparePicks(a: PrecisionPickResult, b: PrecisionPickResult): number {
  const verdictDiff = VERDICT_RANK[b.verdict] - VERDICT_RANK[a.verdict];
  if (verdictDiff !== 0) return verdictDiff;
  if (b.precisionScore !== a.precisionScore) return b.precisionScore - a.precisionScore;
  if (b.displayProbability !== a.displayProbability) return b.displayProbability - a.displayProbability;
  if (b.confidenceCap !== a.confidenceCap) return b.confidenceCap - a.confidenceCap;
  // Tie-Break ueber matchId fuer Deterministik.
  return a.matchId.localeCompare(b.matchId);
}

export interface TopPicksSummary<T extends PrecisionPickResult = PrecisionPickResult> {
  picks: T[];
  // Anzahl unique Matches, die ueberhaupt geprueft wurden.
  matchesEvaluated: number;
  // Anzahl FREIGABE-Picks (nach Dedup pro Match).
  freigabeCount: number;
  // Anzahl BEOBACHTEN-Picks (nach Dedup pro Match).
  beobachtenCount: number;
  // Anzahl NICHT_VERWENDEN-Picks (nach Dedup pro Match).
  blockedCount: number;
  // True wenn keine echten FREIGABE-/BEOBACHTEN-Picks vorhanden sind und
  // der „Erklaer-Pick" fuer den Empty-State angezeigt werden sollte.
  emptyTopList: boolean;
}

export function selectTopPrecisionPicks<T extends PrecisionPickResult>(
  picks: T[],
  options: SelectTopPicksOptions = {}
): TopPicksSummary<T> {
  const { limit = 5, includeRejected = false, allowExplainerWhenEmpty = true } = options;

  // Schritt 1: Pro Match staerkster Markt.
  const dedupedPerMatch = pickBestPerMatch(picks);
  // Schritt 2: Vollstaendige Deterministik im Tie-Break.
  dedupedPerMatch.sort(comparePicks);

  const matchesEvaluated = dedupedPerMatch.length;
  const freigabeCount = dedupedPerMatch.filter((p) => p.verdict === 'FREIGABE').length;
  const beobachtenCount = dedupedPerMatch.filter((p) => p.verdict === 'BEOBACHTEN').length;
  const blockedCount = dedupedPerMatch.filter((p) => p.verdict === 'NICHT_VERWENDEN').length;

  const showable = includeRejected
    ? dedupedPerMatch
    : dedupedPerMatch.filter((p) => p.verdict !== 'NICHT_VERWENDEN');

  let top = showable.slice(0, limit);
  let emptyTopList = false;

  if (top.length === 0) {
    emptyTopList = true;
    if (allowExplainerWhenEmpty) {
      // Wir geben den am wenigsten ueberzeugenden Empty-Hinweis-Pick aus,
      // damit das UI „warum nichts freigegeben" einfaerben kann.
      const explainer = dedupedPerMatch[0];
      if (explainer) top = [explainer];
    }
  }

  return {
    picks: top,
    matchesEvaluated,
    freigabeCount,
    beobachtenCount,
    blockedCount,
    emptyTopList
  };
}

// Findet den wichtigsten Blocker quer ueber alle Picks — fuer den Status-
// Karten-Header („wichtigster Blocker"). Wir nehmen den haeufigsten Blocker,
// bei Gleichstand den ersten in der Reihenfolge.
export function findMostCommonBlocker(picks: PrecisionPickResult[]): string | null {
  const counts = new Map<string, number>();
  for (const p of picks) {
    for (const b of p.blockers) counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  let best: string | null = null;
  let bestCount = 0;
  for (const [b, c] of counts.entries()) {
    if (c > bestCount) {
      bestCount = c;
      best = b;
    }
  }
  return best;
}

// Top-N haeufigste Blocker fuer den Empty-State.
export function topBlockers(picks: PrecisionPickResult[], n: number = 3): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const p of picks) {
    for (const b of p.blockers) counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

import { Position } from '@/lib/types/positions';
import { ParsedWarning } from './parse-warning-text';

export type WarningMatchSeverity = 'info' | 'warning' | 'danger' | 'critical';

export interface WarningMatch {
  position: Position;
  matchType: 'wkn_exact' | 'ticker' | 'underlying_name' | 'hebel_class';
  severity: WarningMatchSeverity;
  reasons: string[];
  invalidationHit: boolean;
  stopHit: boolean;
  recommendation: string;
}

export interface WarningSummary {
  warning: ParsedWarning;
  totalPositions: number;
  affectedPositions: WarningMatch[];
  affectedCount: number;
  highestSeverity: WarningMatchSeverity;
}

function severityFromMatchType(matchType: WarningMatch['matchType']): WarningMatchSeverity {
  switch (matchType) {
    case 'wkn_exact': return 'critical';
    case 'ticker': return 'danger';
    case 'underlying_name': return 'warning';
    case 'hebel_class': return 'info';
  }
}

function recommendForMatch(match: Omit<WarningMatch, 'recommendation'>): string {
  if (match.stopHit) {
    return 'Stop wurde laut Warnung schon erreicht oder unterschritten. Exit-Regel sofort prüfen und Risiko nicht ignorieren.';
  }
  if (match.invalidationHit) {
    return 'Invalidierungs-Level laut Warnung wurde erreicht — die ursprüngliche These ist gebrochen. Position prüfen, nicht hoffen.';
  }
  if (match.matchType === 'wkn_exact') {
    return 'Genau diese WKN wird in der Warnung genannt. Kritisch beobachten, Reduktion oder Exit prüfen.';
  }
  if (match.matchType === 'ticker') {
    return 'Coin/Ticker wird in der Warnung genannt. Setup-Bedingungen erneut prüfen.';
  }
  if (match.matchType === 'underlying_name') {
    return 'Basiswert wird in der Warnung genannt. Effekt auf deine Position prüfen.';
  }
  return 'Warnung betrifft Produkt-Klasse — Position ist nur indirekt betroffen, aber Aufmerksamkeit lohnt sich.';
}

function checkLevelsAgainstPosition(warning: ParsedWarning, position: Position): { invalidationHit: boolean; stopHit: boolean; levelNotes: string[] } {
  const notes: string[] = [];
  let invalidationHit = false;
  let stopHit = false;

  const assetKeys = new Set<string>([
    position.underlying.toUpperCase(),
    position.ticker?.toUpperCase() ?? '',
    position.wkn?.toUpperCase() ?? ''
  ].filter(Boolean));

  for (const inv of warning.invalidationLevels) {
    if (assetKeys.has(inv.asset.toUpperCase()) || warning.detectedUnderlyings.length <= 1) {
      if (position.entryPrice <= inv.level + 0.01) {
        invalidationHit = true;
        notes.push(`Invalidierungs-Level (${inv.level}€) liegt bei oder über Einstiegspreis (${position.entryPrice}€) — These bröckelt.`);
      } else {
        notes.push(`Invalidierung laut Warnung bei ${inv.level}€ — Entry ist bei ${position.entryPrice}€.`);
      }
    }
  }

  for (const sl of warning.stopLevels) {
    if (assetKeys.has(sl.asset.toUpperCase()) || warning.detectedUnderlyings.length <= 1) {
      if (position.stopLossPlanned !== null && Math.abs(position.stopLossPlanned - sl.level) / sl.level < 0.05) {
        notes.push(`Dein Stop (${position.stopLossPlanned}€) deckt sich grob mit dem Warnungs-Stop (${sl.level}€) — konsistent.`);
      } else if (position.stopLossPlanned !== null && position.stopLossPlanned < sl.level) {
        notes.push(`Dein Stop (${position.stopLossPlanned}€) liegt unter dem Warnungs-Stop (${sl.level}€) — riskanter als Source.`);
      } else if (position.stopLossPlanned !== null) {
        notes.push(`Dein Stop (${position.stopLossPlanned}€) liegt über dem Warnungs-Stop (${sl.level}€) — du würdest früher exit.`);
      } else {
        notes.push(`Warnung nennt Stop bei ${sl.level}€ — du hast keinen Stop hinterlegt.`);
        stopHit = true;
      }
    }
  }

  return { invalidationHit, stopHit, levelNotes: notes };
}

export function matchWarningToPositions(warning: ParsedWarning, positions: Position[]): WarningSummary {
  const open = positions.filter((p) => p.status === 'open');
  const matches: WarningMatch[] = [];

  for (const p of open) {
    const reasons: string[] = [];
    let matchType: WarningMatch['matchType'] | null = null;

    if (p.wkn && warning.detectedWkns.includes(p.wkn.toUpperCase())) {
      matchType = 'wkn_exact';
      reasons.push(`WKN ${p.wkn} wird in der Warnung exakt genannt.`);
    } else if (p.ticker && warning.detectedTickers.includes(p.ticker.toUpperCase())) {
      matchType = 'ticker';
      reasons.push(`Ticker ${p.ticker} wird in der Warnung genannt.`);
    } else if (warning.detectedUnderlyings.includes(p.underlying.toUpperCase())) {
      matchType = 'underlying_name';
      reasons.push(`Basiswert ${p.underlying} wird in der Warnung genannt.`);
    } else if (warning.mentionsHebelprodukte && (p.instrumentType === 'optionsschein' || p.instrumentType === 'knockout' || p.instrumentType === 'certificate')) {
      const underlyingsCount = warning.detectedUnderlyings.length;
      if (underlyingsCount === 0) {
        matchType = 'hebel_class';
        reasons.push('Warnung betrifft Hebelprodukte allgemein — deine Position ist ein Hebelprodukt.');
      }
    }

    if (matchType === null) continue;

    const levels = checkLevelsAgainstPosition(warning, p);
    reasons.push(...levels.levelNotes);

    let severity = severityFromMatchType(matchType);
    if (levels.stopHit) severity = 'critical';
    else if (levels.invalidationHit) severity = 'critical';

    const baseMatch: Omit<WarningMatch, 'recommendation'> = {
      position: p,
      matchType,
      severity,
      reasons,
      invalidationHit: levels.invalidationHit,
      stopHit: levels.stopHit
    };
    matches.push({
      ...baseMatch,
      recommendation: recommendForMatch(baseMatch)
    });
  }

  const severityWeight: Record<WarningMatchSeverity, number> = { critical: 0, danger: 1, warning: 2, info: 3 };
  matches.sort((a, b) => severityWeight[a.severity] - severityWeight[b.severity]);
  const highestSeverity = matches[0]?.severity ?? 'info';

  return {
    warning,
    totalPositions: open.length,
    affectedPositions: matches,
    affectedCount: matches.length,
    highestSeverity
  };
}

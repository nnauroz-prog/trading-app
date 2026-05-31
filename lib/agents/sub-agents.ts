import { MasterSignalReport, RankedCandidate } from '@/lib/analysis/master-signal-engine';
import { SpaeherReport } from '@/lib/akademie/spaeher';
import { SetupSimilarity } from '@/lib/analysis/setup-similarity';

// PersonaId duplicated here to avoid a circular import with personas.ts —
// keep these literal strings in sync.
type FirmaId = 'conservative' | 'balanced' | 'aggressive';

export type VoteTone = 'good' | 'neutral' | 'bad';

export interface AnalystReport {
  role: 'analyst';
  title: 'Markt-Analyst';
  vote: 'POSITIV' | 'NEUTRAL' | 'NEGATIV';
  voteTone: VoteTone;
  reason: string;
}

export interface ScoutReport {
  role: 'scout';
  title: 'Setup-Scout';
  vote: 'STARK' | 'MITTEL' | 'SCHWACH';
  voteTone: VoteTone;
  reason: string;
}

export interface RiskReport {
  role: 'risk';
  title: 'Risiko-Manager';
  vote: 'OK' | 'VETO';
  voteTone: VoteTone;
  reason: string;
}

export interface NewsReport {
  role: 'news';
  title: 'News-Watcher';
  vote: 'POSITIV' | 'NEUTRAL' | 'NEGATIV' | 'KEINE_DATEN';
  voteTone: VoteTone;
  reason: string;
}

export interface PositionManagerReport {
  role: 'position';
  title: 'Position-Manager';
  vote: 'KLEIN' | 'NORMAL' | 'GROSS' | 'KEINE_POSITION';
  voteTone: VoteTone;
  reason: string;
  suggestedAccountRiskPct: number; // 0..5
}

export interface LiquidityReport {
  role: 'liquidity';
  title: 'Liquiditäts-Spezialist';
  vote: 'TIEF' | 'OK' | 'DUENN' | 'KEINE_DATEN';
  voteTone: VoteTone;
  reason: string;
}

export interface BacktestAuditReport {
  role: 'backtest';
  title: 'Backtest-Auditor';
  vote: 'BESTÄTIGT' | 'GEMISCHT' | 'WIDERSPRUCH' | 'KEINE_DATEN';
  voteTone: VoteTone;
  reason: string;
}

export type SubAgentReport =
  | AnalystReport
  | ScoutReport
  | RiskReport
  | NewsReport
  | PositionManagerReport
  | LiquidityReport
  | BacktestAuditReport;

// Markt-Analyst: liest die übergeordnete Marktlage (Stimmung, BTC, Crowd) und
// votet positiv/neutral/negativ unabhängig vom konkreten Setup.
export function analystVote(report: MasterSignalReport): AnalystReport {
  const positives: string[] = [];
  const negatives: string[] = [];
  if (report.marketMood === 'risk-on') positives.push('breiter Markt steigt');
  else if (report.marketMood === 'risk-off') negatives.push('breiter Markt fällt (risk-off)');
  if (report.btcRegime === 'bull') positives.push('Bitcoin bullisch');
  else if (report.btcRegime === 'bear') negatives.push('Bitcoin bärisch');
  if (report.crowd.cautious) negatives.push('Stimmung extrem gierig');
  else if (report.crowd.state === 'fear') positives.push('Angst im Markt (oft gute Einstiege)');

  let vote: AnalystReport['vote'];
  let voteTone: VoteTone;
  if (negatives.length > 0) { vote = 'NEGATIV'; voteTone = 'bad'; }
  else if (positives.length >= 2) { vote = 'POSITIV'; voteTone = 'good'; }
  else { vote = 'NEUTRAL'; voteTone = 'neutral'; }

  const reason =
    negatives.length > 0 ? `Probleme: ${negatives.join(', ')}.` :
    positives.length > 0 ? `Pluspunkte: ${positives.join(', ')}.` :
    'Markt zeigt kein klares Bild.';

  return { role: 'analyst', title: 'Markt-Analyst', vote, voteTone, reason };
}

// Setup-Scout: bewertet das beste Setup nach Konfluenz und Struktur.
export function scoutVote(target: RankedCandidate | null): ScoutReport {
  if (!target) {
    return { role: 'scout', title: 'Setup-Scout', vote: 'SCHWACH', voteTone: 'bad', reason: 'Kein Kandidat im Universum gefunden.' };
  }
  const structureNote =
    target.structure === 'uptrend' ? 'im Aufwärtstrend' :
    target.structure === 'downtrend' ? 'in Abwärtsstruktur' :
    'seitwärts';
  const supportNote = target.nearSupport ? ', nahe Unterstützung' : '';

  let vote: ScoutReport['vote'];
  let voteTone: VoteTone;
  if (target.passedCount >= 9 && target.structure === 'uptrend' && target.nearSupport) {
    vote = 'STARK'; voteTone = 'good';
  } else if (target.passedCount >= 7) {
    vote = 'MITTEL'; voteTone = 'neutral';
  } else {
    vote = 'SCHWACH'; voteTone = 'bad';
  }
  return {
    role: 'scout',
    title: 'Setup-Scout',
    vote,
    voteTone,
    reason: `${target.symbol} hat ${target.passedCount} von 12 Häkchen, Kurs ${structureNote}${supportNote}.`
  };
}

// Risiko-Manager: prüft harte Risiko-Hygiene (Stop-Abstand, Liquidität, Broker,
// Anti-Pump, Mehrfach-Bestätigung). Veto wenn etwas grob schiefläuft.
export function riskVote(target: RankedCandidate | null): RiskReport {
  if (!target) {
    return { role: 'risk', title: 'Risiko-Manager', vote: 'VETO', voteTone: 'bad', reason: 'Kein Setup zum Bewerten.' };
  }
  const issues: string[] = [];
  if (target.stopDistancePct < 1) issues.push(`Stop nur ${target.stopDistancePct.toFixed(1)}% entfernt (Whipsaw)`);
  else if (target.stopDistancePct > 6) issues.push(`Stop ${target.stopDistancePct.toFixed(1)}% entfernt (zu viel Risiko)`);
  const hasBroker = target.brokers.includes('Coinbase') || target.brokers.includes('Scalable Capital');
  if (!hasBroker) issues.push('nicht auf Coinbase/Scalable handelbar');
  if (target.quoteVolume < 50_000_000) issues.push(`Liquidität niedrig (${Math.round(target.quoteVolume / 1_000_000)} Mio.)`);
  if (target.priceChangePct24h > 15) issues.push(`schon +${target.priceChangePct24h.toFixed(1)}% in 24h (Pump)`);
  if (!target.confirmed) issues.push('Momentum noch nicht über mehrere Kerzen bestätigt');

  if (issues.length === 0) {
    return {
      role: 'risk', title: 'Risiko-Manager', vote: 'OK', voteTone: 'good',
      reason: `Stop ${target.stopDistancePct.toFixed(1)}%, Liquidität ${Math.round(target.quoteVolume / 1_000_000)} Mio., Broker ok — Setup ist sauber.`
    };
  }
  return {
    role: 'risk', title: 'Risiko-Manager', vote: 'VETO', voteTone: 'bad',
    reason: `${issues.length === 1 ? 'Problem' : `${issues.length} Probleme`}: ${issues.join(' · ')}.`
  };
}

// News-Watcher: prüft, was der Späher zum Ziel-Coin sagt. Hat KEIN Veto-Recht
// (News allein soll keinen guten Trade kippen), aber die anderen Agenten
// (vor allem der konservative CEO) ziehen sein Votum in die Entscheidung ein.
export function newsVote(target: RankedCandidate | null, spaeher: SpaeherReport | null): NewsReport {
  if (!target) {
    return { role: 'news', title: 'News-Watcher', vote: 'KEINE_DATEN', voteTone: 'neutral', reason: 'Kein Ziel-Coin zum Prüfen.' };
  }
  if (!spaeher || spaeher.items.length === 0) {
    return { role: 'news', title: 'News-Watcher', vote: 'KEINE_DATEN', voteTone: 'neutral', reason: 'Späher hat heute keine News zum Auswerten.' };
  }
  const symbolUpper = target.symbol.toUpperCase();
  const coinNews = spaeher.perCoin.find((c) => c.coin === symbolUpper);
  if (!coinNews) {
    return {
      role: 'news', title: 'News-Watcher', vote: 'NEUTRAL', voteTone: 'neutral',
      reason: `Heute keine ${symbolUpper}-News im Späher — keine Auffälligkeiten.`
    };
  }
  const bull = coinNews.bullishCount;
  const bear = coinNews.bearishCount;
  if (coinNews.tilt === 'bullisch') {
    return {
      role: 'news', title: 'News-Watcher', vote: 'POSITIV', voteTone: 'good',
      reason: `${symbolUpper}-News bullisch (${bull} bullisch vs ${bear} bärisch).`
    };
  }
  if (coinNews.tilt === 'bärisch') {
    return {
      role: 'news', title: 'News-Watcher', vote: 'NEGATIV', voteTone: 'bad',
      reason: `${symbolUpper}-News bärisch (${bear} bärisch vs ${bull} bullisch) — Vorsicht.`
    };
  }
  return {
    role: 'news', title: 'News-Watcher', vote: 'NEUTRAL', voteTone: 'neutral',
    reason: `${symbolUpper}-News gemischt (${bull}↑ / ${bear}↓) — keine klare Richtung.`
  };
}

// Position-Manager: schlägt eine Position-Größe für die jeweilige Firma vor.
// Konservativ: maximal 1% Account-Risk, nur bei sauberem Stop.
// Balanciert: 2% bei guter Konfluenz.
// Aggressiv: 3% bei hoher Volatilität, aber kleinere Position bei dünnem Stop.
export function positionManagerVote(target: RankedCandidate | null, firma: FirmaId): PositionManagerReport {
  if (!target) {
    return {
      role: 'position', title: 'Position-Manager', vote: 'KEINE_POSITION', voteTone: 'neutral',
      reason: 'Kein Setup zum Sizen.', suggestedAccountRiskPct: 0
    };
  }
  const stop = target.stopDistancePct;
  let basePct: number;
  if (firma === 'conservative') basePct = 1;
  else if (firma === 'balanced') basePct = 2;
  else basePct = 3;

  // Wenn Stop sehr weit ist, Position-Risk drosseln.
  if (stop > 5) basePct = Math.max(0.5, basePct - 0.5);
  // Wenn Häkchen sehr hoch sind, leicht erhöhen (bei aggressiv bis max 5%).
  if (target.passedCount >= 10 && firma === 'aggressive') basePct = Math.min(5, basePct + 1);

  let vote: PositionManagerReport['vote'];
  let voteTone: VoteTone;
  if (basePct < 1) { vote = 'KLEIN'; voteTone = 'neutral'; }
  else if (basePct <= 2) { vote = 'NORMAL'; voteTone = 'good'; }
  else { vote = 'GROSS'; voteTone = 'good'; }

  return {
    role: 'position', title: 'Position-Manager',
    vote, voteTone,
    suggestedAccountRiskPct: basePct,
    reason: `Bei ${stop.toFixed(1)}% Stop-Distanz schlage ich ${basePct.toFixed(1)}% Account-Risk vor — passt zum ${firma === 'conservative' ? 'konservativen' : firma === 'balanced' ? 'balancierten' : 'aggressiven'} Profil.`
  };
}

// Liquiditäts-Spezialist: bewertet die Tiefe des Marktes für die geplante
// Position-Größe. Konservativ braucht tiefe Märkte, aggressiv toleriert dünner.
export function liquiditySpecialistVote(target: RankedCandidate | null, firma: FirmaId): LiquidityReport {
  if (!target) {
    return { role: 'liquidity', title: 'Liquiditäts-Spezialist', vote: 'KEINE_DATEN', voteTone: 'neutral', reason: 'Kein Setup zu bewerten.' };
  }
  const vol = target.quoteVolume;
  const volMio = Math.round(vol / 1_000_000);

  // Konservativ braucht ≥200 Mio, balanced ≥75 Mio, aggressiv ≥30 Mio
  const minRequired = firma === 'conservative' ? 200_000_000 : firma === 'balanced' ? 75_000_000 : 30_000_000;
  const comfortable = firma === 'conservative' ? 500_000_000 : firma === 'balanced' ? 200_000_000 : 100_000_000;

  if (vol >= comfortable) {
    return { role: 'liquidity', title: 'Liquiditäts-Spezialist', vote: 'TIEF', voteTone: 'good',
      reason: `${volMio} Mio. USD 24h-Volumen — tiefe Liquidität, Slippage praktisch null.` };
  }
  if (vol >= minRequired) {
    return { role: 'liquidity', title: 'Liquiditäts-Spezialist', vote: 'OK', voteTone: 'neutral',
      reason: `${volMio} Mio. USD 24h-Volumen — ausreichend für ${firma === 'conservative' ? 'konservative' : firma === 'balanced' ? 'balancierte' : 'aggressive'} Position-Größen.` };
  }
  return { role: 'liquidity', title: 'Liquiditäts-Spezialist', vote: 'DUENN', voteTone: 'bad',
    reason: `Nur ${volMio} Mio. USD 24h-Volumen — für ${firma === 'conservative' ? 'mich' : firma === 'balanced' ? 'mich' : 'mich'} zu dünn (Mindestens ${Math.round(minRequired / 1_000_000)} Mio. nötig).` };
}

// Backtest-Auditor: prüft historisch vergleichbare Setups für genau diesen Coin
// und meldet, ob die Vergangenheit das aktuelle Verdikt unterstützt.
export function backtestAuditVote(target: RankedCandidate | null, similarity: SetupSimilarity | null): BacktestAuditReport {
  if (!target || !similarity) {
    return { role: 'backtest', title: 'Backtest-Auditor', vote: 'KEINE_DATEN', voteTone: 'neutral',
      reason: 'Keine historisch vergleichbaren Daten verfügbar.' };
  }
  if (similarity.sampleSize === 'too_small' || similarity.sampleSize === 'small') {
    return { role: 'backtest', title: 'Backtest-Auditor', vote: 'KEINE_DATEN', voteTone: 'neutral',
      reason: `Nur ${similarity.matchCount} vergleichbare ${target.symbol}-Setups — Stichprobe zu klein für eine harte Aussage.` };
  }
  const hit = similarity.hitRatePct ?? 0;
  if (hit >= 60) {
    return { role: 'backtest', title: 'Backtest-Auditor', vote: 'BESTÄTIGT', voteTone: 'good',
      reason: `${similarity.matchCount} vergleichbare Setups historisch, ${hit.toFixed(0)}% Trefferquote — Vergangenheit stützt das Setup.` };
  }
  if (hit >= 45) {
    return { role: 'backtest', title: 'Backtest-Auditor', vote: 'GEMISCHT', voteTone: 'neutral',
      reason: `${similarity.matchCount} vergleichbare Setups, ${hit.toFixed(0)}% Trefferquote — Vergangenheit ist gemischt.` };
  }
  return { role: 'backtest', title: 'Backtest-Auditor', vote: 'WIDERSPRUCH', voteTone: 'bad',
    reason: `${similarity.matchCount} vergleichbare Setups, nur ${hit.toFixed(0)}% Trefferquote — Vergangenheit spricht gegen das Setup.` };
}

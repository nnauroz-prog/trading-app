import { MasterSignalReport, RankedCandidate } from '@/lib/analysis/master-signal-engine';

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

export type SubAgentReport = AnalystReport | ScoutReport | RiskReport;

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
    reason: `${target.symbol} hat ${target.passedCount}/12 Bestätigungen, Kurs ${structureNote}${supportNote}.`
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

import {
  IdeaValidation,
  ParsedTelegramIdea,
  SignalDecision,
  UserRiskProfile,
  ValidationScoreBreakdown,
  DerivativeAnalysis
} from '@/lib/types/ideas';
import { analyzeOptionsschein, pickBestForProfile } from '@/lib/derivatives/optionsschein-risk';
import { checkInstrumentAvailability } from '@/lib/data/brokers/manual-instrument-allowlist';

function scoreThesis(idea: ParsedTelegramIdea): number {
  if (idea.thesis.length === 0) return 4;
  const total = idea.thesis.length;
  let score = Math.min(20, 4 + total * 2);
  const text = idea.thesis.join(' ').toLowerCase();
  if (/(katalysator|earnings|margen|wachstum|guidance|umsatz)/.test(text)) score += 3;
  if (/(hoffnung|hoffe|spekulativ|gefühl)/.test(text)) score -= 4;
  if (idea.thesis.length === 1) score -= 2;
  return Math.max(0, Math.min(20, score));
}

function scoreTechnical(idea: ParsedTelegramIdea): number {
  let score = 8;
  const price = idea.currentPriceMentioned;
  const low = idea.week52Low;
  const high = idea.week52High;
  if (price === null || low === null || high === null) return 6;
  const range = high - low;
  if (range <= 0) return 6;
  const pos = (price - low) / range;
  if (idea.underlyingType === 'stock' || idea.ideaType === 'optionsschein') {
    if (pos < 0.2) score += 4;
    else if (pos < 0.4) score += 6;
    else if (pos < 0.6) score += 8;
    else if (pos < 0.8) score += 4;
    else score += 2;
  } else {
    score = 10;
  }
  return Math.max(0, Math.min(20, score));
}

function scoreRiskReward(idea: ParsedTelegramIdea, derivativeAnalyses: DerivativeAnalysis[]): number {
  let score = 8;
  if (idea.targetPrice && idea.currentPriceMentioned && idea.week52Low) {
    const upside = idea.targetPrice - idea.currentPriceMentioned;
    const downside = idea.currentPriceMentioned - idea.week52Low;
    if (downside > 0 && upside > 0) {
      const rr = upside / downside;
      if (rr >= 2) score = 14;
      else if (rr >= 1.5) score = 12;
      else if (rr >= 1) score = 9;
      else score = 5;
    }
  }
  const hasReasonableOption = derivativeAnalyses.some(
    (d) => d.riskClass === 'Mittleres Risiko' || d.riskClass === 'Niedriges Risiko'
  );
  if (hasReasonableOption) score += 1;
  return Math.max(0, Math.min(15, score));
}

function scoreInstrumentQuality(idea: ParsedTelegramIdea, derivativeAnalyses: DerivativeAnalysis[]): number {
  let score = 8;
  const hasStock = idea.instruments.some((i) => i.instrumentType === 'stock');
  const onlyDerivatives = idea.instruments.length > 0 && idea.instruments.every((i) => i.instrumentType !== 'stock');
  if (hasStock) score += 3;
  if (onlyDerivatives) score -= 2;
  const sehrHoch = derivativeAnalyses.filter((d) => d.riskClass === 'Sehr hohes Risiko').length;
  if (sehrHoch > 0) score -= 1;
  const deepOTM = derivativeAnalyses.filter((d) => d.moneyness.classification === 'deep_otm').length;
  score -= deepOTM;
  return Math.max(0, Math.min(15, score));
}

function scoreMarketContext(idea: ParsedTelegramIdea): { score: number; note: string } {
  if (idea.ideaType === 'crypto') {
    return { score: 6, note: 'Krypto-Marktphase nicht automatisch validiert — eigene Marktphasen-Engine prüft kurzfristig.' };
  }
  return {
    score: 6,
    note: 'Aktienmarkt-Kontext (Volatilität, Sektor-Trend) wurde nicht automatisch geprüft. Vor Einstieg manuell verifizieren.'
  };
}

function scoreBrokerAvailability(idea: ParsedTelegramIdea): { score: number; available: boolean; verified: boolean } {
  if (idea.instruments.length === 0) return { score: 2, available: false, verified: false };
  let verifiedCount = 0;
  let availableCount = 0;
  for (const inst of idea.instruments) {
    if (!inst.wkn && !inst.ticker && !inst.isin) continue;
    const key = inst.wkn ?? inst.ticker ?? inst.isin ?? '';
    const r = checkInstrumentAvailability(inst.broker, key);
    if (r.available) availableCount += 1;
    if (r.verified) verifiedCount += 1;
  }
  const score = Math.min(5, Math.max(0, verifiedCount + Math.floor(availableCount / 2)));
  return { score, available: availableCount > 0, verified: verifiedCount > 0 };
}

function scoreSourceQuality(idea: ParsedTelegramIdea): number {
  let score = 1;
  const newsLinks = idea.links.filter((l) => l.kind === 'news').length;
  const analystLinks = idea.links.filter((l) => l.kind === 'analyst_rating').length;
  const youtubeLinks = idea.links.filter((l) => l.kind === 'youtube').length;
  score += Math.min(2, newsLinks);
  score += Math.min(2, analystLinks);
  if (newsLinks === 0 && analystLinks === 0 && youtubeLinks === 0) score = 1;
  return Math.max(0, Math.min(5, score));
}

function scoreUserFit(idea: ParsedTelegramIdea, profile: UserRiskProfile, derivativeAnalyses: DerivativeAnalysis[]): number {
  const onlyHighRisk =
    derivativeAnalyses.length > 0 &&
    derivativeAnalyses.every((d) => d.riskClass === 'Hohes Risiko' || d.riskClass === 'Sehr hohes Risiko');
  const hasStock = idea.instruments.some((i) => i.instrumentType === 'stock');

  switch (profile) {
    case 'beginner':
      if (idea.ideaType === 'optionsschein' && !hasStock) return 2;
      if (idea.ideaType === 'knockout') return 0;
      if (onlyHighRisk) return 3;
      if (idea.ideaType === 'stock') return 9;
      if (idea.ideaType === 'crypto') return 5;
      return 6;
    case 'intermediate':
      if (idea.ideaType === 'knockout' && onlyHighRisk) return 3;
      if (onlyHighRisk) return 5;
      return 8;
    case 'speculative':
      return onlyHighRisk ? 8 : 9;
    case 'very_speculative':
      return 10;
  }
}

function decideFromScore(total: number): { decision: SignalDecision; label: string } {
  if (total < 40) return { decision: 'AVOID', label: 'AVOID — Risiko zu hoch oder Idee zu schwach' };
  if (total < 55) return { decision: 'WATCH', label: 'WATCH — noch kein Kauf' };
  if (total < 70) return { decision: 'BUY_CAUTIOUS', label: 'CAUTIOUS BUY — nur kleine Position' };
  if (total < 85) return { decision: 'BUY_CAUTIOUS', label: 'VALID IDEA — Setup tragfähig, Stop-Plan einhalten' };
  return { decision: 'BUY_STRONG', label: 'STRONG VALIDATED IDEA' };
}

export function validateIdea(idea: ParsedTelegramIdea, profile: UserRiskProfile): IdeaValidation {
  const derivativeAnalyses: DerivativeAnalysis[] = [];
  const underlyingPrice = idea.currentPriceMentioned ?? 0;
  for (const inst of idea.instruments) {
    const r = analyzeOptionsschein(inst, underlyingPrice);
    if (r) derivativeAnalyses.push(r);
  }

  const thesisScore = scoreThesis(idea);
  const technicalScore = scoreTechnical(idea);
  const riskRewardScore = scoreRiskReward(idea, derivativeAnalyses);
  const instrumentQualityScore = scoreInstrumentQuality(idea, derivativeAnalyses);
  const marketContext = scoreMarketContext(idea);
  const brokerAvailability = scoreBrokerAvailability(idea);
  const sourceQualityScore = scoreSourceQuality(idea);
  const userFitScore = scoreUserFit(idea, profile, derivativeAnalyses);

  const scoreBreakdown: ValidationScoreBreakdown = {
    thesisScore,
    technicalScore,
    riskRewardScore,
    instrumentQualityScore,
    marketContextScore: marketContext.score,
    brokerAvailabilityScore: brokerAvailability.score,
    sourceQualityScore,
    userFitScore
  };

  const totalScore =
    thesisScore +
    technicalScore +
    riskRewardScore +
    instrumentQualityScore +
    marketContext.score +
    brokerAvailability.score +
    sourceQualityScore +
    userFitScore;

  let { decision, label } = decideFromScore(totalScore);

  if (profile === 'beginner' && (idea.ideaType === 'optionsschein' || idea.ideaType === 'knockout')) {
    const hasStock = idea.instruments.some((i) => i.instrumentType === 'stock');
    if (decision === 'BUY_STRONG' || decision === 'BUY_CAUTIOUS') {
      label = hasStock
        ? 'WATCH — Optionsschein für Anfänger ungeeignet. Stock-Variante prüfen.'
        : 'AVOID — Hebelprodukt nicht für Anfänger-Profil.';
      decision = hasStock ? 'WATCH' : 'AVOID';
    }
  }

  const reasoning: string[] = [];
  if (idea.currentPriceMentioned !== null && idea.week52Low !== null && idea.week52High !== null) {
    const range = idea.week52High - idea.week52Low;
    if (range > 0) {
      const pos = ((idea.currentPriceMentioned - idea.week52Low) / range) * 100;
      reasoning.push(
        pos < 25
          ? `Basiswert nahe am 52-Wochentief (${pos.toFixed(0)}% der Range) — Rebound möglich, Trendwende muss bestätigt werden.`
          : pos > 75
          ? `Basiswert nahe am 52-Wochenhoch (${pos.toFixed(0)}% der Range) — wenig Sicherheitspuffer, FOMO-Risiko.`
          : `Basiswert mittig in 52W-Range (${pos.toFixed(0)}%) — neutrale Ausgangslage.`
      );
    }
  }
  if (idea.thesis.length > 0) {
    reasoning.push(`Investment-Story mit ${idea.thesis.length} Argument(en). Bewertet als ${thesisScore}/20.`);
  } else {
    reasoning.push('Keine erkennbare These im Text — Idee hat schwache argumentative Basis.');
  }
  if (derivativeAnalyses.length > 0) {
    const sehrHoch = derivativeAnalyses.filter((d) => d.riskClass === 'Sehr hohes Risiko').length;
    if (sehrHoch > 0) {
      reasoning.push(`${sehrHoch} Optionsschein(e) mit sehr hohem Risiko — spekulativ, Totalverlustrisiko.`);
    }
  }
  if (!brokerAvailability.verified && idea.instruments.length > 0) {
    reasoning.push('Broker-Verfügbarkeit nicht verifiziert — vor Kauf manuell prüfen ob WKN im Broker handelbar ist.');
  }

  const warnings: string[] = [];
  if (idea.ideaType === 'optionsschein' || idea.ideaType === 'knockout') {
    warnings.push('Hebelprodukt: Totalverlust möglich. Stop-Loss ist keine Garantie gegen schnelle Verluste.');
  }
  if (idea.warningsMentioned.length > 0) warnings.push(...idea.warningsMentioned);

  const unverifiedFlags: string[] = [];
  if (idea.targetPrice === null && idea.ideaType !== 'crypto') unverifiedFlags.push('Kein Kursziel im Text — eigene Bewertung schwierig.');
  if (idea.currentPriceMentioned === null) unverifiedFlags.push('Kein aktueller Kurs im Text genannt — Bewertung basiert nur auf qualitativen Argumenten.');
  if (idea.links.length === 0) unverifiedFlags.push('Keine Quellen / Links im Text — Behauptungen nicht überprüfbar.');

  const bestForProfile = pickBestForProfile(derivativeAnalyses, idea.instruments, profile);

  return {
    totalScore,
    scoreBreakdown,
    decision,
    decisionLabel: label,
    reasoning,
    warnings,
    derivativeAnalysis: derivativeAnalyses,
    bestInstrumentForProfile: bestForProfile,
    brokerAvailable: brokerAvailability.available,
    brokerVerified: brokerAvailability.verified,
    marketContextNote: marketContext.note,
    unverifiedFlags,
    generatedAt: new Date().toISOString()
  };
}

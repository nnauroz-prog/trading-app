// Qualitäts-Score 0–100 für Fußball-Prognosen. Kombiniert Modell-Wahrschein-
// lichkeit, Confidence, Datenqualität, Marktart-Risiko und Aktualität — damit
// nicht einfach der höchste Prozentwert gewinnt.
//
// Bewertungsstufen:
//   0–39  → nicht verwenden
//  40–54  → nur grobe Orientierung
//  55–69  → brauchbare Prognose
//  70–84  → starke Prognose
//  85–100 → sehr starke Prognose

import type { MatchPrediction } from '@/lib/sport/predictor';
import type { FootballProbabilityModel } from '@/lib/sport/probabilities';
import type { UpcomingFixture } from '@/lib/sport/fetcher';

export type TipMarket = '1' | 'X' | '2' | '1X' | 'X2' | '12' | 'Over 1.5' | 'Over 2.5' | 'Under 4.5' | 'BTTS ja' | 'BTTS nein' | 'exakt';

export interface PredictionRecommendation {
  market: TipMarket;
  probability: number; // 0..1
  label: string; // z. B. "Over 1.5 Tore"
  rationale: string; // Kurzbegründung
  isStableMarket: boolean; // Doppel-Chance, Tor-Märkte = stabil; exakt = nicht
}

export interface QualityScoreResult {
  score: number; // 0..100
  band: 'sehr_stark' | 'stark' | 'brauchbar' | 'orientierung' | 'nicht_verwenden';
  bandLabel: string;
  recommendation: PredictionRecommendation;
  // Aufschlüsselung der Punkte für Transparenz im UI
  parts: {
    probability: number;
    confidence: number;
    dataQuality: number;
    marketRisk: number;
    actuality: number;
  };
  warnings: string[];
}

const BAND_LABEL: Record<QualityScoreResult['band'], string> = {
  sehr_stark: 'sehr starke Prognose',
  stark: 'starke Prognose',
  brauchbar: 'brauchbare Prognose',
  orientierung: 'nur grobe Orientierung',
  nicht_verwenden: 'nicht verwenden'
};

function bandFromScore(score: number): QualityScoreResult['band'] {
  if (score >= 85) return 'sehr_stark';
  if (score >= 70) return 'stark';
  if (score >= 55) return 'brauchbar';
  if (score >= 40) return 'orientierung';
  return 'nicht_verwenden';
}

// Wählt den stabilsten verfügbaren Markt aus dem Modell — Tor-Märkte und
// Doppel-Chance liegen vor 1X2; exakte Ergebnisse landen ganz hinten.
export function pickStablePrediction(prediction: MatchPrediction, probs: FootballProbabilityModel | null): PredictionRecommendation {
  // Doppel-Chance-Wahrscheinlichkeiten
  const p1X = prediction.pHome + prediction.pDraw;
  const pX2 = prediction.pDraw + prediction.pAway;
  const p12 = prediction.pHome + prediction.pAway;

  const candidates: PredictionRecommendation[] = [];

  // Tor-Märkte (stabil)
  if (probs) {
    if (probs.over15 >= 0.75) {
      candidates.push({
        market: 'Over 1.5',
        probability: probs.over15,
        label: 'Über 1,5 Tore',
        rationale: 'Tor-Markt ist stabiler als 1X2.',
        isStableMarket: true
      });
    }
    if (probs.over25 >= 0.65) {
      candidates.push({
        market: 'Over 2.5',
        probability: probs.over25,
        label: 'Über 2,5 Tore',
        rationale: 'Beide Teams treffen meist regelmäßig.',
        isStableMarket: true
      });
    }
    const under45 = 1 - (probs.over25 + Math.max(0, 1 - probs.over25 - 0.3)); // approximierte Schätzung
    if (under45 >= 0.85) {
      candidates.push({
        market: 'Under 4.5',
        probability: under45,
        label: 'Unter 4,5 Tore',
        rationale: 'Tor-Quote in beiden Mannschaften eher niedrig.',
        isStableMarket: true
      });
    }
    if (probs.bothTeamsToScore >= 0.65) {
      candidates.push({
        market: 'BTTS ja',
        probability: probs.bothTeamsToScore,
        label: 'Beide Teams treffen',
        rationale: 'Beide Offensiven liefern Tore.',
        isStableMarket: true
      });
    }
    if (1 - probs.bothTeamsToScore >= 0.65) {
      candidates.push({
        market: 'BTTS nein',
        probability: 1 - probs.bothTeamsToScore,
        label: 'Mindestens 1 Team trifft nicht',
        rationale: 'Eine Defensive deutlich besser als die Offensive der anderen.',
        isStableMarket: true
      });
    }
  }

  // Doppel-Chance (stabil)
  if (p1X >= 0.7) candidates.push({ market: '1X', probability: p1X, label: 'Heimsieg oder Remis', rationale: 'Doppel-Chance entschärft das Auswärts-Risiko.', isStableMarket: true });
  if (pX2 >= 0.7) candidates.push({ market: 'X2', probability: pX2, label: 'Auswärtssieg oder Remis', rationale: 'Doppel-Chance entschärft das Heim-Risiko.', isStableMarket: true });
  if (p12 >= 0.8) candidates.push({ market: '12', probability: p12, label: 'Heim- oder Auswärtssieg', rationale: 'Remis-Wahrscheinlichkeit niedrig.', isStableMarket: true });

  // 1X2 nur bei klarer Wahrscheinlichkeit
  if (prediction.pHome >= 0.6) candidates.push({ market: '1', probability: prediction.pHome, label: 'Heimsieg', rationale: 'Klare Heim-Tendenz.', isStableMarket: prediction.pHome >= 0.65 });
  if (prediction.pAway >= 0.6) candidates.push({ market: '2', probability: prediction.pAway, label: 'Auswärtssieg', rationale: 'Klare Auswärts-Tendenz.', isStableMarket: prediction.pAway >= 0.65 });

  if (candidates.length === 0) {
    // Fallback: 1X2-Pick aus dem Modell, aber als instabil markiert
    return {
      market: prediction.pickSide === 'home' ? '1' : prediction.pickSide === 'away' ? '2' : 'X',
      probability: prediction.pickConfidence,
      label: prediction.pickPlain,
      rationale: 'Kein stabiler Markt gefunden — nur grobe Orientierung.',
      isStableMarket: false
    };
  }

  // Bester Pick = höchste Wahrscheinlichkeit unter den stabilen Märkten
  candidates.sort((a, b) => b.probability - a.probability);
  return candidates[0];
}

interface ScoreInput {
  fixture: UpcomingFixture;
  recommendation: PredictionRecommendation;
  sampleSize: number; // Anzahl ausgewerteter Spiele im Form-Pool
}

// Hauptfunktion: liefert Score + Band + Warnings.
export function computePredictionQualityScore(input: ScoreInput): QualityScoreResult {
  const warnings: string[] = [];
  const { fixture, recommendation, sampleSize } = input;

  // Modell-Wahrscheinlichkeit (0–45)
  // Linear ab 50 % aufwärts; <50 % gibt es kaum Punkte.
  const probabilityPart = Math.max(0, Math.min(45, Math.round((recommendation.probability - 0.5) / 0.5 * 45)));

  // Confidence (0–20) — abhängig vom Pick-Label des Poisson-Modells
  const conf = fixture.prediction?.pickLabel === 'klar' ? 20 : fixture.prediction?.pickLabel === 'leicht' ? 12 : 5;
  if (conf <= 5) warnings.push('Confidence des Modells niedrig.');

  // Datenqualität (0–20) — basiert auf Sample-Größe und probabilities.dataQuality.
  let dataPart: number;
  const probsDQ = fixture.probabilities?.dataQuality;
  if (probsDQ === 'good' && sampleSize >= 80) dataPart = 20;
  else if (probsDQ === 'good' || sampleSize >= 50) dataPart = 15;
  else if (probsDQ === 'medium' || sampleSize >= 25) dataPart = 10;
  else { dataPart = 4; warnings.push('Datenlage schwach — Prognose nur als grobe Orientierung.'); }

  // Marktart-Risiko (0–10) — stabile Märkte bekommen volle Punkte, exakt = 0.
  const marketPart = recommendation.market === 'exakt' ? 0 : recommendation.isStableMarket ? 10 : 4;
  if (!recommendation.isStableMarket) warnings.push('Markt instabil (z. B. enger 1X2-Pick) — Quality-Score gedeckelt.');

  // Aktualität (0–5) — solange das Spiel noch nicht gestartet ist, voll.
  // Schon beendet → 0 Punkte und Override.
  let actualityPart = 5;
  if (fixture.status === 'finished') {
    actualityPart = 0;
    warnings.push('Spiel bereits beendet — keine aktive Prognose mehr.');
  }

  let score = probabilityPart + conf + dataPart + marketPart + actualityPart;

  // Harte Deckel:
  //   schwache Datenqualität → max 60
  //   instabiler Markt → max 70 (außer Datenqualität ist top)
  if (dataPart <= 4) score = Math.min(score, 60);
  if (!recommendation.isStableMarket && dataPart < 20) score = Math.min(score, 70);
  if (fixture.status === 'finished') score = 0;

  score = Math.max(0, Math.min(100, score));
  const band = bandFromScore(score);

  return {
    score,
    band,
    bandLabel: BAND_LABEL[band],
    recommendation,
    parts: {
      probability: probabilityPart,
      confidence: conf,
      dataQuality: dataPart,
      marketRisk: marketPart,
      actuality: actualityPart
    },
    warnings
  };
}

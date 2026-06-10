// WM-Sieger-Picks — die strengste Auswahl-Schicht ueber dem normalen
// Precision-Gate. Hier geht es ausschliesslich um 1X2-Sieger-Tipps
// ("wer gewinnt das Spiel"), nicht um Tor-Markt oder Doppelchance.
//
// Profi-Tipper-Logik:
//   - Nur Spiele mit klarem ELO-Favorit (>= 80 Punkte Differenz).
//   - Engine selbst muss pick.clarity = 'strong' liefern.
//   - Sieger-Wahrscheinlichkeit muss >= 60 % sein (Realitaet: 1X2 mit
//     Remis-Anteil deckelt bei ~72-75 %).
//   - dataConfidence >= 85 (beide Teams in ELO-Datenbank).
//   - Maximal 7 Tage entfernt — Form-Lage muss bewertbar sein.
//   - Keine TBD-Teams, kein "Spiel um Platz 3" (Motivation oft schwach).
//   - Profi-Tipper-Agent (siehe sport-pro-tipper-agent) muss zustimmen.
//
// Reine Funktion. Wording strikt ohne verbotene Begriffe.

import { WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';
import { predictWmMatch, type WmMatchPrediction } from '@/lib/sport/wm-match-engine';
import { evaluateProTipperAgent, type ProTipperResult } from '@/lib/sport/sport-pro-tipper-agent';
import { evaluateWmConditions, eloDiffShift, type WmConditionFactor, type WmConditionsReport } from '@/lib/sport/wm-conditions';
import { evaluateRestDays } from '@/lib/sport/wm-rest-days';
import { weatherFactor } from '@/lib/sport/wm-live-weather';
import { evaluateExtraFactors } from '@/lib/sport/wm-extra-factors';
import { evaluateIntegrityAction, isTeamBlocked } from '@/lib/sport/wm-data-integrity-action';
import type { WeatherSnapshot } from '@/lib/providers/open-meteo';
import type { FactorWeightMap } from '@/lib/sport/wm-pick-learning';

export interface WmWinnerPick {
  fixture: WmFixture;
  prediction: WmMatchPrediction;
  winnerTeam: string;
  winnerSide: 'home' | 'away';
  modelProbabilityPct: number;
  eloDiff: number;
  daysUntilMatch: number;
  proTipper: ProTipperResult;
  // Umfeld-Faktoren (Akklimatisierung, Hoehe, Jetlag, Heimvorteil,
  // Publikum, Mittagshitze). Jeder Faktor mit konkretem ELO-/Tor-Delta.
  conditions: WmConditionsReport;
  // Tier nach Profi-Tipper-Klassifikation. Streng aufsteigend:
  //   'kein-freigabe-pick' wird nicht in die UI uebernommen.
  //   'modell-favorit'      = Standard-Profi-Pick.
  //   'hoechste-konfluenz'  = Alle Pflicht-Kriterien + zusaetzliche Stuetzen.
  tier: 'hoechste-konfluenz' | 'modell-favorit';
  reasons: string[];
  riskNotes: string[];
}

interface BuildOptions {
  todayIso: string;
  horizonDays?: number; // Default 7 — Profi-Tipps sind kein Langzeit-Tipp.
  minProbability?: number; // Default 0.60 (1X2-Sieger).
  minEloDiff?: number;     // Default 80.
  // Optional: empirisch gelernte Faktor-Gewichte aus dem WM-Pick-Log.
  // Wenn gesetzt, werden die Conditions-ELO-Deltas pro Faktor mit dem
  // gelernten Multiplier skaliert (BESTAETIGT verstaerkt, KONTRA daempft).
  // Reine Pure-Lib bleibt — der Caller liefert die Map.
  factorWeights?: FactorWeightMap | null;
  // Optional: Live-Wetter-Snapshots pro fixtureId. Wenn vorhanden,
  // fliesst der Wetter-Faktor in conditions ein.
  weatherByFixtureId?: Record<string, WeatherSnapshot | null>;
  // Optional: gelernte ELO-Deltas pro Team aus echten Spielergebnissen
  // (wm-dynamic-elo). Fliessen als 'dynamic-elo' Conditions-Faktor in
  // jeden Pick ein — gedeckelt bei +/-60 ELO, damit ein einzelnes
  // Ausreisser-Resultat nicht alles kippt.
  eloDeltaByTeam?: Record<string, number>;
}

// Cap fuer den dynamischen ELO-Einfluss pro Team.
const DYNAMIC_ELO_CAP = 60;

function daysBetween(todayIso: string, fixtureIso: string): number {
  const t = new Date(`${todayIso}T00:00:00`).getTime();
  const f = new Date(`${fixtureIso}T00:00:00`).getTime();
  return Math.round((f - t) / (24 * 60 * 60 * 1000));
}

function isTbd(team: string): boolean {
  const t = team.trim();
  if (t.includes('TBD')) return true;
  if (/^(Sieger|Verlierer|Zweiter|Erster)\s/i.test(t)) return true;
  return false;
}

function blacklistedPhase(phase: WmFixture['phase']): boolean {
  // Spiel um Platz 3: beide Teams meist demoralisiert, Resultate
  // historisch verzerrt — wir nehmen es aus der Profi-Auswahl raus.
  return phase === 'Spiel um Platz 3';
}

export function rankWmWinnerPicks(opts: BuildOptions): WmWinnerPick[] {
  const {
    todayIso,
    horizonDays = 7,
    minProbability = 0.60,
    minEloDiff = 80
  } = opts;
  const todayMs = new Date(`${todayIso}T00:00:00`).getTime();
  const horizonMs = todayMs + horizonDays * 24 * 60 * 60 * 1000;
  const out: WmWinnerPick[] = [];
  // Datenintegritaets-Agent live: blockierte Teams/Stadien sofort
  // aus dem Pick-Universum entfernen. Damit handelt der Agent — nicht
  // nur anzeigen.
  const integrity = evaluateIntegrityAction();

  for (const f of WM_2026_FIXTURES) {
    if (isTbd(f.homeTeam) || isTbd(f.awayTeam)) continue;
    if (blacklistedPhase(f.phase)) continue;
    // Hartes Veto durch Datenintegritaets-Agent
    if (isTeamBlocked(f.homeTeam, integrity.blockedTeams) || isTeamBlocked(f.awayTeam, integrity.blockedTeams)) continue;
    if (f.venue && integrity.blockedVenues.has(f.venue)) continue;
    const fMs = new Date(`${f.date}T00:00:00`).getTime();
    if (fMs < todayMs || fMs > horizonMs) continue;

    const prediction = predictWmMatch({ homeTeam: f.homeTeam, awayTeam: f.awayTeam, venue: f.venue, phase: f.phase });
    if (prediction.pick.clarity !== 'strong') continue;
    if (prediction.pick.winner !== 'home' && prediction.pick.winner !== 'away') continue;
    if (prediction.pick.confidencePct < minProbability * 100) continue;
    if (Math.abs(prediction.eloDiff) < minEloDiff) continue;
    if (prediction.dataConfidence < 85) continue;

    const winnerSide: 'home' | 'away' = prediction.pick.winner;
    const winnerTeam = winnerSide === 'home' ? f.homeTeam : f.awayTeam;
    const daysUntilMatch = daysBetween(todayIso, f.date);

    // Profi-Conditions zuerst — dann fliessen ihre Werte in den
    // Profi-Tipper-Agenten und in die Reasons. Wenn gelernte Faktor-
    // Gewichte uebergeben wurden, skalieren wir die ELO-Deltas pro
    // Faktor entsprechend. Erweiterte Faktoren (Erholungstage,
    // Live-Wetter) werden hier aggregiert.
    const extra: WmConditionFactor[] = [];
    const rest = evaluateRestDays({ fixture: f });
    if (rest.homeRestDays !== null || rest.awayRestDays !== null) {
      const restFactorActive = rest.homeEloDelta !== 0 || rest.awayEloDelta !== 0 || rest.homeGoalMultiplier !== 1 || rest.awayGoalMultiplier !== 1;
      if (restFactorActive) {
        extra.push({
          id: 'rest-days',
          label: rest.label,
          homeGoalMultiplier: rest.homeGoalMultiplier,
          awayGoalMultiplier: rest.awayGoalMultiplier,
          homeEloDelta: rest.homeEloDelta,
          awayEloDelta: rest.awayEloDelta,
          confidenceShift: rest.confidenceShift
        });
      }
    }
    const weather = opts.weatherByFixtureId?.[f.id] ?? null;
    const wf = weatherFactor(weather);
    if (wf) extra.push(wf);
    // Zusatzfaktoren: Konfoederations-Heimvorteil, Phase-Druck,
    // Stadion-Vertrautheit, Reisedistanz.
    extra.push(...evaluateExtraFactors(f));
    // Dynamisches ELO aus echten Spielergebnissen — das System handelt
    // nach dem was es gelernt hat, nicht nur Anzeige.
    if (opts.eloDeltaByTeam) {
      const rawHome = opts.eloDeltaByTeam[f.homeTeam] ?? 0;
      const rawAway = opts.eloDeltaByTeam[f.awayTeam] ?? 0;
      const homeDelta = Math.max(-DYNAMIC_ELO_CAP, Math.min(DYNAMIC_ELO_CAP, rawHome));
      const awayDelta = Math.max(-DYNAMIC_ELO_CAP, Math.min(DYNAMIC_ELO_CAP, rawAway));
      if (homeDelta !== 0 || awayDelta !== 0) {
        const parts: string[] = [];
        if (homeDelta !== 0) parts.push(`${f.homeTeam} ${homeDelta > 0 ? '+' : ''}${homeDelta}`);
        if (awayDelta !== 0) parts.push(`${f.awayTeam} ${awayDelta > 0 ? '+' : ''}${awayDelta}`);
        extra.push({
          id: 'dynamic-elo',
          label: `Dynamisches ELO aus Turnier-Ergebnissen: ${parts.join(', ')}`,
          homeGoalMultiplier: 1,
          awayGoalMultiplier: 1,
          homeEloDelta: homeDelta,
          awayEloDelta: awayDelta,
          confidenceShift: (homeDelta - awayDelta) / 6
        });
      }
    }

    const rawConditions = evaluateWmConditions({ fixture: f, extraFactors: extra });
    const conditions = applyFactorWeights(rawConditions, opts.factorWeights ?? null);
    const condEloShift = eloDiffShift(conditions);

    // Profi-Tipper-Agent muss zustimmen — sonst gibt es keinen Pick.
    const proTipper = evaluateProTipperAgent({
      eloDiff: prediction.eloDiff,
      pickClarity: prediction.pick.clarity,
      confidencePct: prediction.pick.confidencePct,
      expectedGoalsHome: prediction.expectedGoals.home,
      expectedGoalsAway: prediction.expectedGoals.away,
      winnerSide,
      daysUntilMatch,
      isNeutralVenue: true,
      dataConfidence: prediction.dataConfidence,
      lineupAvailable: false,
      phase: f.phase,
      conditionsEloShift: condEloShift,
      conditionsConfidenceShift: conditions.confidenceShiftTotal,
      conditionsDataCoverage: conditions.dataCoverage
    });
    if (proTipper.status === 'BLOCKIERT') continue;

    const reasons: string[] = [];
    reasons.push(`ELO-Vorteil ${winnerTeam} +${Math.abs(prediction.eloDiff)} Punkte.`);
    reasons.push(`Modell sieht ${prediction.pick.confidencePct} % Sieger-Quote.`);
    if (prediction.reasoning.length > 0) reasons.push(prediction.reasoning[0]);
    // Profi-Conditions: jeder konkrete Faktor in die Reasons aufnehmen.
    for (const c of conditions.factors) {
      reasons.push(c.label);
    }

    const riskNotes: string[] = [];
    riskNotes.push('Lineup und Verletzungen unbekannt — kurz vor Anstoss pruefen.');
    if (daysUntilMatch > 3) riskNotes.push('Form-Lage kann sich bis zum Anstoss noch aendern.');
    if (proTipper.status === 'WARNUNG') riskNotes.push(proTipper.reason);
    if (conditions.dataCoverage < 1) {
      riskNotes.push(`Conditions-Daten unvollstaendig: ${Math.round(conditions.dataCoverage * 100)} % Quellen verfuegbar.`);
    }

    const tier: WmWinnerPick['tier'] = (
      proTipper.status === 'OK' &&
      Math.abs(prediction.eloDiff) >= 120 &&
      prediction.pick.confidencePct >= 70 &&
      prediction.dataConfidence >= 90
    ) ? 'hoechste-konfluenz' : 'modell-favorit';

    out.push({
      fixture: f,
      prediction,
      winnerTeam,
      winnerSide,
      modelProbabilityPct: prediction.pick.confidencePct,
      eloDiff: prediction.eloDiff,
      daysUntilMatch,
      proTipper,
      conditions,
      tier,
      reasons,
      riskNotes
    });
  }

  out.sort((a, b) => {
    // Hoechste Konfluenz vor Modell-Favorit, dann nach Wahrscheinlichkeit.
    const tierRank = { 'hoechste-konfluenz': 2, 'modell-favorit': 1 };
    if (tierRank[b.tier] !== tierRank[a.tier]) return tierRank[b.tier] - tierRank[a.tier];
    if (b.modelProbabilityPct !== a.modelProbabilityPct) return b.modelProbabilityPct - a.modelProbabilityPct;
    return Math.abs(b.eloDiff) - Math.abs(a.eloDiff);
  });

  return out;
}


// Skaliert die ELO-Deltas pro Faktor mit den empirisch gelernten Gewichten.
// BESTAETIGT (Weight > 1) verstaerkt die Wirkung; KONTRA (Weight < 1) daempft sie.
// Tor-Multiplier bleiben unveraendert (sind physiologisch gerechnete Werte).
function applyFactorWeights(report: WmConditionsReport, weights: FactorWeightMap | null): WmConditionsReport {
  if (!weights) return report;
  const adjustedFactors = report.factors.map((f) => {
    const w = weights.weights[f.id];
    if (typeof w !== "number" || w === 1) return f;
    return {
      ...f,
      homeEloDelta: f.homeEloDelta * w,
      awayEloDelta: f.awayEloDelta * w,
      confidenceShift: f.confidenceShift * w
    };
  });
  return {
    ...report,
    factors: adjustedFactors,
    homeEloDeltaTotal: adjustedFactors.reduce((s, f) => s + f.homeEloDelta, 0),
    awayEloDeltaTotal: adjustedFactors.reduce((s, f) => s + f.awayEloDelta, 0),
    confidenceShiftTotal: adjustedFactors.reduce((s, f) => s + f.confidenceShift, 0)
  };
}

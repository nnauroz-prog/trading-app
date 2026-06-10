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

export interface WmWinnerPick {
  fixture: WmFixture;
  prediction: WmMatchPrediction;
  winnerTeam: string;
  winnerSide: 'home' | 'away';
  modelProbabilityPct: number;
  eloDiff: number;
  daysUntilMatch: number;
  proTipper: ProTipperResult;
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
}

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

  for (const f of WM_2026_FIXTURES) {
    if (isTbd(f.homeTeam) || isTbd(f.awayTeam)) continue;
    if (blacklistedPhase(f.phase)) continue;
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
      phase: f.phase
    });
    if (proTipper.status === 'BLOCKIERT') continue;

    const reasons: string[] = [];
    reasons.push(`ELO-Vorteil ${winnerTeam} +${Math.abs(prediction.eloDiff)} Punkte.`);
    reasons.push(`Modell sieht ${prediction.pick.confidencePct} % Sieger-Quote.`);
    if (prediction.reasoning.length > 0) reasons.push(prediction.reasoning[0]);

    const riskNotes: string[] = [];
    riskNotes.push('Lineup und Verletzungen unbekannt — kurz vor Anstoss pruefen.');
    if (daysUntilMatch > 3) riskNotes.push('Form-Lage kann sich bis zum Anstoss noch aendern.');
    if (proTipper.status === 'WARNUNG') riskNotes.push(proTipper.reason);

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

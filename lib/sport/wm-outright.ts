// WM-Outright-Berechnung: Wer wird Weltmeister?
//
// Methode:
//   • Monte-Carlo-freier Ansatz: ELO-basierte Rundenüberlebens-
//     Wahrscheinlichkeiten gegen ein gewichtetes Mittel aller Gegner
//     gleicher Stärkeklasse.
//   • 6 Runden bis zum Titel: Gruppenphase (Top-2 + 8 beste Dritte
//     aus 12 Gruppen = 32 Teams im Sechzehntel), dann 1/16, 1/8,
//     1/4, 1/2, Finale.
//   • Quote für Gruppenüberleben aus historischen WM-Daten: Top-8
//     ~97 %, Top-16 ~90 %, Top-24 ~75 %, Rest ~45 %.
//   • Pro KO-Runde: ELO-Sieg-Wahrscheinlichkeit gegen einen
//     repräsentativen Gegner (Median der ELO-Werte der Teams, die
//     diese Runde realistisch erreichen).

import { WM_2026_TEAMS, type TeamStrength } from '@/lib/sport/wm-team-strength';

export interface OutrightTeam {
  team: TeamStrength;
  groupAdvance: number;       // 0..1, Wahrscheinlichkeit Gruppenphase zu überleben
  round16: number;            // 0..1, kumuliert: Achtelfinale erreicht
  quarter: number;            // kumuliert: Viertelfinale erreicht
  semi: number;
  final: number;
  champion: number;
}

function rankByElo(teams: TeamStrength[]): TeamStrength[] {
  return [...teams].sort((a, b) => b.elo - a.elo);
}

// ELO-Sieg-Wahrscheinlichkeit gegen einen Gegner mit gegebener ELO.
function winProbVs(elo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - elo) / 400));
}

// In KO-Runden wird Remis durch Verlängerung/Elfmeter aufgelöst → keine
// Draw-Korrektur nötig.

// Gruppenüberlebens-Quote nach ELO-Rang im Teilnehmer-Feld (48 Teams,
// 32 ziehen ein).
function groupAdvanceProb(eloRank: number, totalTeams: number): number {
  // Ränge 1–10: ~97 %
  // Ränge 11–20: linear runter zu 88 %
  // Ränge 21–30: 75 %
  // Ränge 31–40: 55 %
  // Ränge 41+: 35 %
  if (eloRank <= 10) return 0.97;
  if (eloRank <= 20) return 0.97 - (eloRank - 10) * 0.009; // 0.97 → 0.88
  if (eloRank <= 30) return 0.85 - (eloRank - 20) * 0.010; // 0.85 → 0.75
  if (eloRank <= 40) return 0.75 - (eloRank - 30) * 0.020; // 0.75 → 0.55
  void totalTeams;
  return 0.35;
}

export function computeOutright(teams: TeamStrength[] = WM_2026_TEAMS): OutrightTeam[] {
  const ranked = rankByElo(teams);
  const out: OutrightTeam[] = [];

  for (let i = 0; i < ranked.length; i++) {
    const team = ranked[i];
    // Form-Index-Gewichtung 06/2026 erhöht auf ×15 (vorher ×8). Markt-
    // Konsens-Vergleich zeigt: Tipico-Quoten gewichten aktuelle Form
    // stärker als reine ELO. Eine Form-Differenz von +5 vs. +1 zwischen
    // Spanien und Niederlande macht so 60 ELO-Punkte aus statt 32.
    const myElo = team.elo + team.formIndex * 15 + (team.isHost ? 20 : 0);

    // 1) Gruppenphase
    const groupAdvance = groupAdvanceProb(i + 1, ranked.length);

    // 2) Pro KO-Runde: repräsentativer Gegner aus dem aktuell verbleibenden
    //    Pool. In Runde X verbleiben grob die Top-(64/2^x) Teams nach ELO,
    //    plus etwas Streuung. Wir nehmen den Median-ELO der Top-N Teams.
    const koRounds = [
      { name: 'round16', topN: 32 },
      { name: 'quarter', topN: 16 },
      { name: 'semi', topN: 8 },
      { name: 'final', topN: 4 },
      { name: 'champion', topN: 2 }
    ] as const;

    const koProbs: Record<typeof koRounds[number]['name'], number> = {
      round16: 0, quarter: 0, semi: 0, final: 0, champion: 0
    };

    let cumulative = groupAdvance;
    for (const round of koRounds) {
      // Median-ELO der angenommenen verbleibenden Top-N Teams,
      // dabei das eigene Team rausnehmen.
      const cohort = ranked.slice(0, round.topN).filter((t) => t.name !== team.name);
      const medianElo = cohort.length > 0
        ? cohort[Math.floor(cohort.length / 2)].elo
        : 1800;
      const matchProb = winProbVs(myElo, medianElo);
      cumulative *= matchProb;
      koProbs[round.name] = cumulative;
    }

    out.push({
      team,
      groupAdvance,
      round16: groupAdvance,            // = nach Gruppenphase
      quarter: koProbs.round16,
      semi: koProbs.quarter,
      final: koProbs.semi,
      champion: koProbs.final
    });
  }

  return out.sort((a, b) => b.champion - a.champion);
}

// Hilfsfunktion: Top-N Anwärter mit Round-Probabilities.
export function topChampionContenders(n = 8): OutrightTeam[] {
  return computeOutright().slice(0, n);
}

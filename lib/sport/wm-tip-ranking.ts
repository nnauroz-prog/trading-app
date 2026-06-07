// Rangliste aller anstehenden WM-Spiele nach Profi-Tipp-Klarheit.
// Nutzt predictWmMatch und liefert nur die wirklich tippbaren Spiele.

import { WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';
import { predictWmMatch, type WmMatchPrediction } from '@/lib/sport/wm-match-engine';

export interface RankedWmTip {
  fixture: WmFixture;
  prediction: WmMatchPrediction;
}

export function rankWmTips(todayIso: string, maxDays = 14): RankedWmTip[] {
  const today = new Date(`${todayIso}T00:00:00`).getTime();
  const horizon = today + maxDays * 24 * 60 * 60 * 1000;
  const out: RankedWmTip[] = [];
  for (const f of WM_2026_FIXTURES) {
    if (f.homeTeam.includes('TBD') || f.awayTeam.includes('TBD')) continue;
    const fDate = new Date(`${f.date}T00:00:00`).getTime();
    if (fDate < today || fDate > horizon) continue;
    const prediction = predictWmMatch({
      homeTeam: f.homeTeam,
      awayTeam: f.awayTeam,
      venue: f.venue,
      phase: f.phase
    });
    out.push({ fixture: f, prediction });
  }
  // Sortierung: zuerst nach Confidence, dann nach Datenbasis-Sicherheit,
  // dann nach Datum (frühere zuerst bei gleichem Score).
  out.sort((a, b) => {
    const ac = a.prediction.pick.confidencePct + a.prediction.dataConfidence * 0.1;
    const bc = b.prediction.pick.confidencePct + b.prediction.dataConfidence * 0.1;
    if (bc !== ac) return bc - ac;
    return a.fixture.date.localeCompare(b.fixture.date);
  });
  return out;
}

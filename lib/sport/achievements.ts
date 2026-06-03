// Achievements: Meilensteine im Tipp-Tagebuch (Erste 10 Tipps, 3er-Streak,
// 5er-Streak, 50% Wochenziel-Trefferquote, etc.). Reine Auswertung des
// Tagebuchs, keine eigene Persistenz.

import type { TipJournalEntry } from '@/lib/sport/tip-journal';

export interface Achievement {
  id: string;
  label: string;
  description: string;
  earned: boolean;
  progressLabel?: string;
}

function longestWinStreak(log: TipJournalEntry[]): number {
  const chrono = [...log]
    .filter((e) => e.outcome !== 'pending')
    .sort((a, b) => (a.resolvedAt ?? 0) - (b.resolvedAt ?? 0));
  let max = 0;
  let cur = 0;
  for (const e of chrono) {
    if (e.outcome === 'win') {
      cur += 1;
      if (cur > max) max = cur;
    } else if (e.outcome === 'loss') {
      cur = 0;
    }
  }
  return max;
}

export function computeAchievements(log: TipJournalEntry[]): Achievement[] {
  const total = log.length;
  const resolved = log.filter((e) => e.outcome !== 'pending');
  const wins = resolved.filter((e) => e.outcome === 'win').length;
  const decisive = resolved.filter((e) => e.outcome !== 'push').length;
  const hitRatePct = decisive > 0 ? (wins / decisive) * 100 : 0;
  const streak = longestWinStreak(log);
  const wmTips = log.filter((e) => e.league === 'WM 2026' || e.fixtureId.startsWith('wm-'));
  const stableTips = resolved.filter((e) => e.isStableMarket === true).length;
  const strongBandWins = resolved.filter((e) => e.outcome === 'win' && (e.qualityBand === 'sehr_stark' || e.qualityBand === 'stark')).length;

  return [
    {
      id: 'first-tip',
      label: 'Erster Tipp',
      description: 'Du hast deinen ersten Tipp gespeichert.',
      earned: total >= 1
    },
    {
      id: 'ten-tips',
      label: '10 Tipps abgegeben',
      description: 'Mindestens 10 Tipps im Tagebuch.',
      earned: total >= 10,
      progressLabel: total < 10 ? `${total} / 10` : undefined
    },
    {
      id: 'first-win',
      label: 'Erster Treffer',
      description: 'Mindestens einen Tipp richtig gehabt.',
      earned: wins >= 1
    },
    {
      id: 'three-streak',
      label: '3er-Streak',
      description: 'Drei Treffer in Folge.',
      earned: streak >= 3,
      progressLabel: streak < 3 ? `bestes ${streak} in Folge` : undefined
    },
    {
      id: 'five-streak',
      label: '5er-Streak',
      description: 'Fünf Treffer in Folge.',
      earned: streak >= 5,
      progressLabel: streak < 5 ? `bestes ${streak} in Folge` : undefined
    },
    {
      id: 'fifty-percent',
      label: '50 % Trefferquote',
      description: 'Über alle ausgewerteten Tipps ≥ 50 %.',
      earned: decisive >= 10 && hitRatePct >= 50,
      progressLabel: decisive < 10 ? `${decisive} / 10 ausgewertet` : (hitRatePct < 50 ? `${Math.round(hitRatePct)} %` : undefined)
    },
    {
      id: 'wm-tipster',
      label: 'WM-Tipper',
      description: 'Mindestens einen WM-Tipp gespeichert.',
      earned: wmTips.length >= 1
    },
    {
      id: 'stable-five',
      label: 'fünf stabile Märkte',
      description: 'Fünf Tipps auf stabile Märkte (Doppelchance, Tor-Markt).',
      earned: stableTips >= 5,
      progressLabel: stableTips < 5 ? `${stableTips} / 5` : undefined
    },
    {
      id: 'top-band-three',
      label: 'drei Top-Band-Treffer',
      description: 'Drei Treffer in „stark" oder „sehr stark".',
      earned: strongBandWins >= 3,
      progressLabel: strongBandWins < 3 ? `${strongBandWins} / 3` : undefined
    }
  ];
}

export function achievementSummary(achievements: Achievement[]): { earned: number; total: number; percent: number } {
  const earned = achievements.filter((a) => a.earned).length;
  return {
    earned,
    total: achievements.length,
    percent: Math.round((earned / achievements.length) * 100)
  };
}

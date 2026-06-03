// Saison-Start-Termine der Top-5-Ligen für die Saison 2026/27.
// Stand: bestätigte/erwartete Spieltage des ersten Spieltags.

export interface SeasonStart {
  league: string;
  country: string;
  emoji: string;
  iso: string;     // Tag des 1. Spieltags
  note?: string;
}

export const SEASON_STARTS_2026_27: SeasonStart[] = [
  { league: 'Premier League', country: 'England', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', iso: '2026-08-14' },
  { league: 'Bundesliga', country: 'Deutschland', emoji: '🇩🇪', iso: '2026-08-21' },
  { league: 'Ligue 1', country: 'Frankreich', emoji: '🇫🇷', iso: '2026-08-21' },
  { league: 'La Liga', country: 'Spanien', emoji: '🇪🇸', iso: '2026-08-22' },
  { league: 'Serie A', country: 'Italien', emoji: '🇮🇹', iso: '2026-08-22' }
];

export function daysUntil(todayIso: string, targetIso: string): number {
  const t = new Date(`${todayIso}T00:00:00`).getTime();
  const x = new Date(`${targetIso}T00:00:00`).getTime();
  return Math.round((x - t) / (24 * 60 * 60 * 1000));
}

export function nextSeasonStarts(todayIso: string): SeasonStart[] {
  return SEASON_STARTS_2026_27
    .filter((s) => daysUntil(todayIso, s.iso) >= 0)
    .sort((a, b) => a.iso.localeCompare(b.iso));
}

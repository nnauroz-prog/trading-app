// Formatiert die heutigen WM-Picks als kopierbaren Klartext.
//
// Ziel: eine kompakte, gut lesbare Liste die in WhatsApp oder Notizen
// gut aussieht. Eine Zeile Header + eine Zeile pro Pick.
//
// Reine Funktion. Keine I/O.

import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

const TIER_LABEL: Record<WmWinnerPick['tier'], string> = {
  'hoechste-konfluenz': 'Hoechste Konfluenz',
  'modell-favorit': 'Modell-Favorit'
};

function dateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function formatWmPicksForClipboard(picks: WmWinnerPick[], todayIso: string): string {
  const heute = picks.filter((p) => p.fixture.date === todayIso);
  if (heute.length === 0) {
    return `WM ${dateLabel(todayIso)}: heute keine freigegebenen Tipps.`;
  }
  const lines: string[] = [`WM ${dateLabel(todayIso)} - ${heute.length} Tipp${heute.length === 1 ? '' : 's'}:`];
  for (const p of heute) {
    const opponent = p.winnerSide === 'home' ? p.fixture.awayTeam : p.fixture.homeTeam;
    const t = p.fixture.time ?? '--:--';
    lines.push(`- ${t} ${p.fixture.homeTeam}-${p.fixture.awayTeam}: Tipp ${p.winnerTeam} (${TIER_LABEL[p.tier]}, ${p.modelProbabilityPct}%, ELO ${p.eloDiff >= 0 ? '+' : ''}${p.eloDiff.toFixed(0)}) vs. ${opponent}`);
  }
  lines.push('');
  lines.push('Hinweis: Modell-Tipps mit Restrisiko - keine Garantie.');
  return lines.join('\n');
}

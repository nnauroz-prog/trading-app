// Live-WM-Spielplan aus TheSportsDB (Liga-ID 4429).
//
// Holt aktuelle WM-2026-Fixtures von TheSportsDB und konvertiert sie
// in das WmFixture-Format. Server-seitig gecacht, damit kein API-
// Hammering passiert.
//
// Sicheres Default-Verhalten: bei Fehler oder leerer Antwort kommt
// eine leere Liste zurueck — die statische Schedule bleibt
// authoritativ. Niemals erfundene Daten.

import { unstable_cache } from 'next/cache';
import type { WmFixture } from '@/lib/sport/wm-schedule-2026';
import { findTeamStrength } from '@/lib/sport/wm-team-strength';

function canonicalTeam(name: string): string {
  // Englische TheSportsDB-Namen auf deutsche ELO-DB-Namen mappen.
  const t = findTeamStrength(name);
  return t?.name ?? name.trim();
}

interface ApiEvent {
  idEvent?: string;
  strHomeTeam?: string;
  strAwayTeam?: string;
  dateEvent?: string;
  strTime?: string;
  strVenue?: string;
  strRound?: string;          // "Group A", "Round of 16", ...
  strLeague?: string;
}

const WM_LEAGUE_ID = '4429';

function parseGroup(round: string | undefined): { phase: WmFixture['phase']; group?: string } | null {
  if (!round) return null;
  const r = round.trim().toLowerCase();
  // "group a" .. "group l"
  const groupMatch = /^group\s+([a-l])$/i.exec(round.trim());
  if (groupMatch) return { phase: 'Gruppe', group: groupMatch[1].toUpperCase() };
  if (r.includes('round of 32') || r.includes('runde der 32')) return { phase: 'Achtelfinale' };
  if (r.includes('round of 16') || r.includes('achtelfinal')) return { phase: 'Achtelfinale' };
  if (r.includes('quarter') || r.includes('viertelfinal')) return { phase: 'Viertelfinale' };
  if (r.includes('semi') || r.includes('halbfinal')) return { phase: 'Halbfinale' };
  if (r.includes('third') || r.includes('platz 3') || r.includes('3rd')) return { phase: 'Spiel um Platz 3' };
  if (r.includes('final')) return { phase: 'Finale' };
  return null;
}

function normalize(ev: ApiEvent): WmFixture | null {
  if (!ev.idEvent || !ev.strHomeTeam || !ev.strAwayTeam || !ev.dateEvent) return null;
  const phaseInfo = parseGroup(ev.strRound);
  if (!phaseInfo) return null;
  // Datum muss YYYY-MM-DD Form haben.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ev.dateEvent)) return null;
  const time = ev.strTime && /^\d{2}:\d{2}/.test(ev.strTime) ? ev.strTime.slice(0, 5) : null;
  return {
    id: `tsdb-${ev.idEvent}`,
    date: ev.dateEvent,
    time,
    homeTeam: canonicalTeam(ev.strHomeTeam),
    awayTeam: canonicalTeam(ev.strAwayTeam),
    venue: ev.strVenue?.trim() ?? '',
    phase: phaseInfo.phase,
    ...(phaseInfo.group ? { group: phaseInfo.group as WmFixture['group'] } : {}),
    sourceConfidence: 'official' as const
  } as WmFixture;
}

async function rawFetch(season: string): Promise<WmFixture[]> {
  const url = `https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=${WM_LEAGUE_ID}&s=${season}`;
  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { events?: ApiEvent[] | null };
    const events = data.events ?? [];
    return events.map(normalize).filter((f): f is WmFixture => f !== null);
  } catch {
    return [];
  }
}

export const getCachedWmLiveSchedule = unstable_cache(
  async () => rawFetch('2026'),
  ['wm-live-schedule-v1'],
  { revalidate: 1800 }
);

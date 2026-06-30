// Live-WM-Spielplan aus TheSportsDB (Liga-ID 4429).
//
// Holt aktuelle WM-2026-Fixtures von TheSportsDB:
//   - Spielplan (alle Spiele der Saison) -> WmFixture[]
//   - Bereits gespielte Begegnungen mit Endstand -> FinishedFixtureLite[]
//
// Server-seitig gecacht, damit kein API-Hammering passiert.
//
// Sicheres Default-Verhalten: bei Fehler oder leerer Antwort kommt
// eine leere Liste zurueck — die statische Schedule bleibt
// authoritativ. Niemals erfundene Daten.

import { unstable_cache } from 'next/cache';
import { thesportsdbBase } from '@/lib/sport/sportsdb-config';
import type { WmFixture } from '@/lib/sport/wm-schedule-2026';
import type { FinishedFixtureLite } from '@/lib/sport/wm-pick-learning';
import type { ExternalLastFixture } from '@/lib/sport/wm-results-matcher';
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
  // Score-Felder (TheSportsDB liefert sie als String, ggf. "" / null)
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  strStatus?: string | null;  // "Match Finished", "FT", ...
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

async function rawFetchEvents(season: string): Promise<ApiEvent[]> {
  const url = `${thesportsdbBase()}/eventsseason.php?id=${WM_LEAGUE_ID}&s=${season}`;
  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { events?: ApiEvent[] | null };
    return data.events ?? [];
  } catch {
    return [];
  }
}

function parseScore(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (s === '' || s === '-' || s === '?') return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function extractFinished(events: ApiEvent[]): FinishedFixtureLite[] {
  const out: FinishedFixtureLite[] = [];
  for (const ev of events) {
    if (!ev.idEvent || !ev.strHomeTeam || !ev.strAwayTeam) continue;
    const home = parseScore(ev.intHomeScore);
    const away = parseScore(ev.intAwayScore);
    if (home === null || away === null) continue;
    out.push({
      fixtureId: `tsdb-${ev.idEvent}`,
      homeScore: home,
      awayScore: away
    });
  }
  return out;
}

// Wie extractFinished, aber im ExternalLastFixture-Format mit
// Team-Namen (kanonisiert) und Datum — fuer matchExternalResults.
function extractExternalLastFixtures(events: ApiEvent[]): ExternalLastFixture[] {
  const out: ExternalLastFixture[] = [];
  for (const ev of events) {
    if (!ev.strHomeTeam || !ev.strAwayTeam || !ev.dateEvent) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ev.dateEvent)) continue;
    const home = parseScore(ev.intHomeScore);
    const away = parseScore(ev.intAwayScore);
    if (home === null || away === null) continue;
    out.push({
      homeTeam: canonicalTeam(ev.strHomeTeam),
      awayTeam: canonicalTeam(ev.strAwayTeam),
      homeScore: home,
      awayScore: away,
      date: ev.dateEvent
    });
  }
  return out;
}

export interface WmLiveData {
  schedule: WmFixture[];
  finished: FinishedFixtureLite[];
  externalLast: ExternalLastFixture[];
}

async function rawFetch(season: string): Promise<WmLiveData> {
  const events = await rawFetchEvents(season);
  const schedule = events.map(normalize).filter((f): f is WmFixture => f !== null);
  const finished = extractFinished(events);
  const externalLast = extractExternalLastFixtures(events);
  return { schedule, finished, externalLast };
}

export const getCachedWmLiveData = unstable_cache(
  async () => rawFetch('2026'),
  ['wm-live-data-v3'],
  { revalidate: 1800 }
);

// Backwards-Kompatibilitaet: bestehender Aufruf liefert nur Schedule.
export const getCachedWmLiveSchedule = unstable_cache(
  async () => (await rawFetch('2026')).schedule,
  ['wm-live-schedule-v1'],
  { revalidate: 1800 }
);

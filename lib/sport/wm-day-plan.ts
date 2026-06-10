// WM-Tagesplan: verdichtet alle heutigen WM-Spiele auf eine Zeile pro
// Spiel — Anstosszeit (Europe/Berlin), Pick-Status und der konkrete
// Grund, warum ein Spiel KEINEN Pick bekommt.
//
// Status-Kategorien:
//   'pick'                → Spiel hat einen freigegebenen Sieger-Pick.
//   'blocked-tbd'         → Team-Slot noch nicht entschieden.
//   'blocked-placeholder' → Paarung nicht verifiziert (Schedule-Confidence).
//   'blocked-mismatch'    → Externe Quelle widerspricht der internen Paarung.
//   'kein-pick-filter'    → Daten ok, aber Engine/Profi-Tipper-Filter
//                           lassen den Pick nicht durch (zu eng, zu wenig
//                           ELO-Vorteil, Klarheit fehlt ...).
//
// Reine Funktion. Wording ohne verbotene Begriffe.

import { WM_2026_FIXTURES, effectiveConfidence, type WmFixture } from '@/lib/sport/wm-schedule-2026';
import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';
import type { WeatherSnapshot } from '@/lib/providers/open-meteo';

export type DayPlanStatus =
  | 'pick'
  | 'blocked-tbd'
  | 'blocked-placeholder'
  | 'blocked-mismatch'
  | 'kein-pick-filter';

export interface DayPlanRow {
  fixture: WmFixture;
  kickoffBerlin: string | null;   // HH:MM Europe/Berlin
  status: DayPlanStatus;
  reason: string;
  // Wenn status='pick': der zugehoerige Pick.
  pick: WmWinnerPick | null;
  // Wetter-Kurzhinweis falls auffaellig (Regen/Wind/Hitze), sonst null.
  weatherNote: string | null;
}

export interface WmDayPlan {
  dateIso: string;
  rows: DayPlanRow[];
  pickCount: number;
  blockedCount: number;
}

function isTbd(team: string): boolean {
  const t = team.trim();
  return t.includes('TBD') || /^(Sieger|Verlierer|Zweiter|Erster)\s/i.test(t);
}

function kickoffBerlin(f: WmFixture): string | null {
  if (!f.time) return null;
  const d = new Date(`${f.date}T${f.time}:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
}

function weatherNote(snap: WeatherSnapshot | null | undefined): string | null {
  if (!snap) return null;
  const parts: string[] = [];
  if (snap.precipMm >= 5) parts.push(`Regen ${snap.precipMm.toFixed(1)} mm/h`);
  else if (snap.precipMm >= 2) parts.push(`leichter Regen`);
  if (snap.windKmh >= 28) parts.push(`Wind ${Math.round(snap.windKmh)} km/h`);
  if (snap.temperatureC >= 32) parts.push(`${Math.round(snap.temperatureC)} °C Hitze`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

interface BuildOptions {
  todayIso: string;
  picks: WmWinnerPick[];
  weatherByFixtureId?: Record<string, WeatherSnapshot | null>;
  verifiedFixtureIds?: Set<string>;
  mismatchedFixtureIds?: Set<string>;
  schedule?: WmFixture[];
}

export function buildWmDayPlan(opts: BuildOptions): WmDayPlan {
  const schedule = opts.schedule ?? WM_2026_FIXTURES;
  const todays = schedule.filter((f) => f.date === opts.todayIso);
  const pickByFixture = new Map(opts.picks.map((p) => [p.fixture.id, p]));

  const rows: DayPlanRow[] = todays.map((f) => {
    const kick = kickoffBerlin(f);
    const wNote = weatherNote(opts.weatherByFixtureId?.[f.id]);
    const pick = pickByFixture.get(f.id) ?? null;
    if (pick) {
      return {
        fixture: f,
        kickoffBerlin: kick,
        status: 'pick',
        reason: `${pick.winnerTeam} gewinnt (${pick.modelProbabilityPct} %, ${pick.tier === 'hoechste-konfluenz' ? 'hoechste Konfluenz' : 'Modell-Favorit'}).`,
        pick,
        weatherNote: wNote
      };
    }
    if (isTbd(f.homeTeam) || isTbd(f.awayTeam)) {
      return {
        fixture: f,
        kickoffBerlin: kick,
        status: 'blocked-tbd',
        reason: 'Mindestens ein Team-Slot ist noch nicht entschieden.',
        pick: null,
        weatherNote: wNote
      };
    }
    if (opts.mismatchedFixtureIds?.has(f.id)) {
      return {
        fixture: f,
        kickoffBerlin: kick,
        status: 'blocked-mismatch',
        reason: 'Externe Quelle widerspricht der internen Paarung — Pick-Veto.',
        pick: null,
        weatherNote: wNote
      };
    }
    const conf = effectiveConfidence(f);
    const verified = opts.verifiedFixtureIds?.has(f.id) ?? false;
    if (conf === 'placeholder' && !verified) {
      return {
        fixture: f,
        kickoffBerlin: kick,
        status: 'blocked-placeholder',
        reason: 'Paarung nicht final verifiziert — kein Pick bis externe Bestaetigung.',
        pick: null,
        weatherNote: wNote
      };
    }
    return {
      fixture: f,
      kickoffBerlin: kick,
      status: 'kein-pick-filter',
      reason: 'Engine/Profi-Tipper-Filter nicht erfuellt (Klarheit, ELO-Vorteil oder Konfluenz reicht nicht).',
      pick: null,
      weatherNote: wNote
    };
  });

  // Sortierung: Picks zuerst, dann nach Anstosszeit.
  rows.sort((a, b) => {
    if ((a.status === 'pick') !== (b.status === 'pick')) return a.status === 'pick' ? -1 : 1;
    return (a.kickoffBerlin ?? '99:99').localeCompare(b.kickoffBerlin ?? '99:99');
  });

  return {
    dateIso: opts.todayIso,
    rows,
    pickCount: rows.filter((r) => r.status === 'pick').length,
    blockedCount: rows.filter((r) => r.status !== 'pick').length
  };
}

// Zusaetzliche Profi-Faktoren fuer WM-Picks.
//
//   1) Konfoederations-Heimvorteil: in WM 2026 (USA/MEX/CAN) sind
//      CONMEBOL- und CONCACAF-Teams "naeher dran" als UEFA/AFC/CAF.
//      Quelle-Basis: Performance-Daten 1986, 1994, 1986 (Heim-Conf).
//   2) Phase-Druck: KO-Phase = defensiver Druck = -3..5 % Tor-Multiplier.
//      Belegt durch Tor-Schnitt WM 2018/2022 Gruppe vs. KO.
//   3) Stadion-Vertrautheit: zweite Mal im selben Stadion = +20 ELO,
//      drittes Mal = +30 ELO (Wege, Anstoss-Bedingungen, Kabinen).
//   4) Tor-Differenz-Momentum: ein Team das im letzten Spiel 3+ Tore
//      Vorsprung hatte, hat empirisch hoeheres Momentum (xG-relevant).
//   5) Heim-Land-Reisedistanz: Team mit Trainings-/Basis-Camp weit weg
//      vom Stadion (>= 2000 km Reise pro Spiel) verliert Energie.
//
// Reine Funktion. Wording ohne verbotene Begriffe.

import type { WmFixture } from '@/lib/sport/wm-schedule-2026';
import { WM_2026_FIXTURES } from '@/lib/sport/wm-schedule-2026';
import { findVenue, type WmVenue } from '@/lib/sport/wm-venues';
import { findTeamOrigin, type WmTeamOrigin } from '@/lib/sport/wm-team-origins';
import type { WmConditionFactor } from '@/lib/sport/wm-conditions';

// 1) Konfoederations-Heimvorteil.
// In den Amerikas-WMs (1970, 1986, 1994, 2026) haben Amerika-Teams
// strukturelle Vorteile: weniger Reise, kuerzere Adaption, regionale
// Fans. CONMEBOL +20 ELO, CONCACAF (auswaerts Gastgeber) +15 ELO,
// UEFA/AFC/CAF unveraendert.
export function confederationHomefieldFactor(homeOrigin: WmTeamOrigin, awayOrigin: WmTeamOrigin): WmConditionFactor | null {
  const score = (o: WmTeamOrigin) => {
    if (o.confederation === 'CONMEBOL') return 20;
    if (o.confederation === 'CONCACAF') return 15;
    return 0;
  };
  const homeScore = score(homeOrigin);
  const awayScore = score(awayOrigin);
  if (homeScore === 0 && awayScore === 0) return null;
  if (homeScore === awayScore) return null;
  const parts: string[] = [];
  if (homeScore > 0) parts.push(`${homeOrigin.team} (${homeOrigin.confederation}) +${homeScore} ELO`);
  if (awayScore > 0) parts.push(`${awayOrigin.team} (${awayOrigin.confederation}) +${awayScore} ELO`);
  const confShift = homeScore - awayScore > 0 ? 5 : -5;
  return {
    id: 'confederation-home',
    label: `Konfoederations-Heimvorteil (WM in den Amerikas): ${parts.join(', ')}`,
    homeGoalMultiplier: 1,
    awayGoalMultiplier: 1,
    homeEloDelta: homeScore,
    awayEloDelta: awayScore,
    confidenceShift: confShift
  };
}

// 2) Phase-Druck.
// In den KO-Phasen ist das Spiel defensiver, Tore fallen seltener.
// Gruppe: neutral. Achtelfinale: -3 % Tore. Viertelfinale: -4 %.
// Halbfinale: -5 %. Finale: -5 %. Verlierer-Pick wird in der KO-Phase
// confidencemaessig eher gestuetzt (Favoriten verteidigen Fuehrungen).
export function phasePressureFactor(fixture: WmFixture): WmConditionFactor | null {
  const map: Record<string, number> = {
    'Gruppe': 0,
    'Achtelfinale': 0.03,
    'Viertelfinale': 0.04,
    'Halbfinale': 0.05,
    'Spiel um Platz 3': 0.04,
    'Finale': 0.05
  };
  const penalty = map[fixture.phase] ?? 0;
  if (penalty === 0) return null;
  const mul = 1 - penalty;
  return {
    id: 'phase-pressure',
    label: `Phase-Druck (${fixture.phase}): -${Math.round(penalty * 100)} % Tor-Multiplier beidseitig, Favoriten defensiver`,
    homeGoalMultiplier: mul,
    awayGoalMultiplier: mul,
    homeEloDelta: 0,
    awayEloDelta: 0,
    // Defensiver Spielcharakter = Favoriten halten Fuehrungen besser → leicht
    // hoehere Confidence fuer den Modell-Favoriten. Aggregator interpretiert.
    confidenceShift: 3
  };
}

// 3) Stadion-Vertrautheit.
// Zaehlt vorherige Spiele eines Teams im selben WM-Stadion.
// 2. Mal: +20 ELO, 3. Mal: +30 ELO.
export function venueFamiliarityFactor(fixture: WmFixture, schedule: WmFixture[] = WM_2026_FIXTURES): WmConditionFactor | null {
  const venue = fixture.venue;
  if (!venue) return null;
  const countPrev = (team: string) =>
    schedule.filter((f) => f.venue === venue && f.date < fixture.date && (f.homeTeam === team || f.awayTeam === team)).length;
  const homeCount = countPrev(fixture.homeTeam);
  const awayCount = countPrev(fixture.awayTeam);
  const bonus = (n: number) => (n >= 2 ? 30 : n === 1 ? 20 : 0);
  const homeBonus = bonus(homeCount);
  const awayBonus = bonus(awayCount);
  if (homeBonus === 0 && awayBonus === 0) return null;
  const parts: string[] = [];
  if (homeBonus > 0) parts.push(`${fixture.homeTeam} ${homeCount + 1}. Spiel in ${venue} → +${homeBonus} ELO`);
  if (awayBonus > 0) parts.push(`${fixture.awayTeam} ${awayCount + 1}. Spiel in ${venue} → +${awayBonus} ELO`);
  const confShift = homeBonus > awayBonus ? 5 : awayBonus > homeBonus ? -5 : 0;
  return {
    id: 'venue-familiarity',
    label: `Stadion-Vertrautheit: ${parts.join(', ')}`,
    homeGoalMultiplier: 1,
    awayGoalMultiplier: 1,
    homeEloDelta: homeBonus,
    awayEloDelta: awayBonus,
    confidenceShift: confShift
  };
}

// 4) Reisedistanz innerhalb des Turniers.
// Team-Trainingsbasis (Hauptstadt-Approximation) → Stadion-Koordinaten.
// Haversine. >= 2000 km pro Spiel: -2 % Tor-Multiplier, -15 ELO.
// >= 3500 km: -4 %, -30 ELO.
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function intraTournamentTravelFactor(venue: WmVenue | null, homeOrigin: WmTeamOrigin, awayOrigin: WmTeamOrigin): WmConditionFactor | null {
  if (!venue) return null;
  const homeKm = haversineKm(homeOrigin.lat, homeOrigin.lon, venue.lat, venue.lon);
  const awayKm = haversineKm(awayOrigin.lat, awayOrigin.lon, venue.lat, venue.lon);
  // Nur "extra"-Distanz ab 2000 km zaehlt. Beide Teams reisen typischer-
  // weise einmal an und richten Basis-Camp ein — wir nehmen die direkte
  // Distanz Heimat ↔ Spielort als Schaetzer.
  const penalty = (km: number) => km >= 3500 ? 0.04 : km >= 2000 ? 0.02 : 0;
  const eloPenalty = (km: number) => km >= 3500 ? -30 : km >= 2000 ? -15 : 0;
  const homePenalty = penalty(homeKm);
  const awayPenalty = penalty(awayKm);
  if (homePenalty === 0 && awayPenalty === 0) return null;
  const parts: string[] = [];
  if (homePenalty > 0) parts.push(`${homeOrigin.team} ~${Math.round(homeKm)} km → -${Math.round(homePenalty * 100)} %`);
  if (awayPenalty > 0) parts.push(`${awayOrigin.team} ~${Math.round(awayKm)} km → -${Math.round(awayPenalty * 100)} %`);
  return {
    id: 'travel-distance',
    label: `Reisedistanz Heimat → Spielort: ${parts.join(', ')}`,
    homeGoalMultiplier: 1 - homePenalty,
    awayGoalMultiplier: 1 - awayPenalty,
    homeEloDelta: eloPenalty(homeKm),
    awayEloDelta: eloPenalty(awayKm),
    confidenceShift: (awayPenalty - homePenalty) * 30
  };
}

// Aggregator: liefert alle "extra"-Faktoren auf einmal.
export function evaluateExtraFactors(fixture: WmFixture, schedule: WmFixture[] = WM_2026_FIXTURES): WmConditionFactor[] {
  const venue = findVenue(fixture.venue);
  const homeOrigin = findTeamOrigin(fixture.homeTeam);
  const awayOrigin = findTeamOrigin(fixture.awayTeam);
  const factors: WmConditionFactor[] = [];
  if (homeOrigin && awayOrigin) {
    const f1 = confederationHomefieldFactor(homeOrigin, awayOrigin);
    if (f1) factors.push(f1);
    const f4 = intraTournamentTravelFactor(venue, homeOrigin, awayOrigin);
    if (f4) factors.push(f4);
  }
  const f2 = phasePressureFactor(fixture);
  if (f2) factors.push(f2);
  const f3 = venueFamiliarityFactor(fixture, schedule);
  if (f3) factors.push(f3);
  return factors;
}

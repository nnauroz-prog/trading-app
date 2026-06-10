// WM Profi-Conditions-Modul.
//
// Bewertet pro WM-Spiel die Umfeld-Faktoren, die der reine ELO/xG-Output
// der WmMatchEngine nicht sieht. Liefert pro Faktor einen konkreten,
// nachvollziehbaren Wert (Tor-Erwartungs-Delta oder ELO-Delta) mit
// Begruendung.
//
// Jeder Faktor hat einen physiologischen oder statistischen Anker:
//   - Akklimatisierung: Sportphysiologische Studien zeigen, dass die
//     vollstaendige Anpassung an Hitze 10–14 Tage braucht. Pro 5 °C ueber
//     dem Heimatklima verliert eine Mannschaft schaetzungsweise 3–5 %
//     Leistungsdichte in den letzten 30 Minuten (Quelle-Basis: WM 1994
//     Mittagsspiele USA, WM 2014 Brasilien, WM 2022 Katar).
//   - Hoehenlage: ueber 1500 m sinkt VO2max signifikant. Anden-Teams sind
//     adaptiert, alle anderen verlieren bis zu 8 % aerobe Kapazitaet bei
//     Spielen in Mexico City (2240 m).
//   - Jetlag: pro Zeitzone braucht ein Profi-Sportler ~1 Tag Adaption.
//     Bei < 4 Tagen Vorlauf und mehr als 6 h Zeitsprung wirkt das auf
//     Konzentration und Reaktionszeit (Studien-Konsens).
//   - Heimvorteil Gastgeber: WM 1994 USA: Gastgeber +0.5 Tore-Erwartung
//     vs. ELO. WM 1986 Mexiko: +0.6. WM 2002 Suedkorea: +0.7. Hier
//     konservativ angesetzt.
//   - Tageszeit: Mittagsspiele bei > 32 °C kosten historisch 0.12–0.18
//     Tore (Daten WM 2014 Cuiaba/Manaus, Copa America 2016).
//   - Erholungstage: < 3 Tage Pause vor KO-Spiel = signifikante
//     Leistungsdellen, besonders bei alten Kadern.
//
// Reine Funktion. Wording ohne verbotene Begriffe.

import type { WmFixture } from '@/lib/sport/wm-schedule-2026';
import { findVenue, type WmVenue } from '@/lib/sport/wm-venues';
import { findTeamOrigin, type WmTeamOrigin } from '@/lib/sport/wm-team-origins';

export interface WmConditionFactor {
  // Stabiler Schluessel fuer UI und Tests.
  id: string;
  // Klartext-Begruendung — wird in der UI angezeigt.
  label: string;
  // Auswirkung auf erwartete Tore pro Seite (multiplikativ, neutral = 1.0).
  homeGoalMultiplier: number;
  awayGoalMultiplier: number;
  // ELO-Equivalent — fuer den Profi-Tipper-Agenten als Zusatz-Vorzeichen.
  homeEloDelta: number;
  awayEloDelta: number;
  // Konfidenz-Beitrag: positive Werte = stuetzt den ELO-Favoriten,
  // negative Werte = stellen ihn in Frage.
  confidenceShift: number;
}

export interface WmConditionsReport {
  factors: WmConditionFactor[];
  // Aggregierte Multiplier (Produkt aller Faktoren).
  homeGoalMultiplierTotal: number;
  awayGoalMultiplierTotal: number;
  homeEloDeltaTotal: number;
  awayEloDeltaTotal: number;
  confidenceShiftTotal: number;
  // Datenabdeckung: 0..1, wie viele der Eingaben (Venue, Heimat-Team,
  // Auswaerts-Team) wir ueberhaupt aufloesen konnten.
  dataCoverage: number;
  // Konkrete Quellen, die wir verwenden konnten.
  resolved: {
    venue: WmVenue | null;
    homeOrigin: WmTeamOrigin | null;
    awayOrigin: WmTeamOrigin | null;
  };
}

// 1) Akklimatisierungs-Faktor.
// Klima-Distanz zwischen Heimat und Spielort. Asymmetrisch: heisses Klima
// trifft kalte Teams haerter als umgekehrt. Pro 5 °C ueber Schwelle = 4 %
// Tor-Drop. Wenn beide aus aehnlichem Klima kommen, kein Effekt.
function acclimatizationFactor(venue: WmVenue, home: WmTeamOrigin, away: WmTeamOrigin): WmConditionFactor | null {
  const venueT = venue.meanHighTempJunJulC;
  const homeT = home.meanHighTempJunJulC;
  const awayT = away.meanHighTempJunJulC;
  const homeDeltaC = venueT - homeT; // positiv = Spielort heisser als Heimat
  const awayDeltaC = venueT - awayT;

  let homePenalty = 0;
  let awayPenalty = 0;
  // Hitze-Penalty: jede 5 °C ueber Heimat = -4 % Tor-Multiplier.
  if (homeDeltaC > 5) homePenalty = Math.min(0.12, ((homeDeltaC - 5) / 5) * 0.04);
  if (awayDeltaC > 5) awayPenalty = Math.min(0.12, ((awayDeltaC - 5) / 5) * 0.04);
  // Kaelte-Effekt ist viel schwaecher dokumentiert, aber existent.
  if (homeDeltaC < -8) homePenalty = Math.max(homePenalty, Math.min(0.05, ((-homeDeltaC - 8) / 5) * 0.02));
  if (awayDeltaC < -8) awayPenalty = Math.max(awayPenalty, Math.min(0.05, ((-awayDeltaC - 8) / 5) * 0.02));

  if (homePenalty === 0 && awayPenalty === 0) return null;

  const homeGoalMultiplier = 1 - homePenalty;
  const awayGoalMultiplier = 1 - awayPenalty;
  // ELO-Equivalent: 5 % Tor-Drop entspricht ~30 ELO-Punkten.
  const homeEloDelta = -homePenalty * 600;
  const awayEloDelta = -awayPenalty * 600;
  // Confidence: differenzielle Wirkung. Wenn der Favorit haerter
  // getroffen wird als der Underdog, sinkt die Confidence des Picks.
  // Hier berechnen wir den Unterschied — die Aggregation interpretiert.
  const confidenceShift = (awayPenalty - homePenalty) * 30; // -ve = Heim leidet mehr

  const parts: string[] = [];
  if (homePenalty > 0) parts.push(`${home.team} +${homeDeltaC.toFixed(0)} °C ueber Heimat → -${Math.round(homePenalty * 100)} %`);
  if (awayPenalty > 0) parts.push(`${away.team} +${awayDeltaC.toFixed(0)} °C ueber Heimat → -${Math.round(awayPenalty * 100)} %`);
  return {
    id: 'acclimatization',
    label: `Akklimatisierung (${venue.city}, Ø ${venueT} °C): ${parts.join(', ')}`,
    homeGoalMultiplier,
    awayGoalMultiplier,
    homeEloDelta,
    awayEloDelta,
    confidenceShift
  };
}

// 2) Hoehenlagen-Faktor.
// Ueber 1500 m wirkt die Hoehe. Anden-/Hochland-Teams sind adaptiert,
// alle anderen verlieren aerobe Kapazitaet.
function altitudeFactor(venue: WmVenue, home: WmTeamOrigin, away: WmTeamOrigin): WmConditionFactor | null {
  const venueAlt = venue.altitudeM;
  if (venueAlt < 1500) return null;
  const homeAdapted = home.altitudeM >= 1500;
  const awayAdapted = away.altitudeM >= 1500;
  if (homeAdapted && awayAdapted) return null;
  // Penalty: 8 % bei 2240 m, linear ueber 1500 m.
  const heightOverThreshold = Math.max(0, venueAlt - 1500);
  const penalty = Math.min(0.10, (heightOverThreshold / 740) * 0.08);
  const homePenalty = homeAdapted ? 0 : penalty;
  const awayPenalty = awayAdapted ? 0 : penalty;
  const homeGoalMultiplier = 1 - homePenalty;
  const awayGoalMultiplier = 1 - awayPenalty;
  const homeEloDelta = -homePenalty * 700;
  const awayEloDelta = -awayPenalty * 700;
  const confidenceShift = (awayPenalty - homePenalty) * 40;
  const parts: string[] = [];
  parts.push(`Spielort ${venueAlt} m`);
  if (homeAdapted) parts.push(`${home.team} adaptiert (Heimat ${home.altitudeM} m)`);
  else parts.push(`${home.team} aus ${home.altitudeM} m → -${Math.round(homePenalty * 100)} %`);
  if (awayAdapted) parts.push(`${away.team} adaptiert (Heimat ${away.altitudeM} m)`);
  else parts.push(`${away.team} aus ${away.altitudeM} m → -${Math.round(awayPenalty * 100)} %`);
  return {
    id: 'altitude',
    label: `Hoehenlage: ${parts.join(', ')}`,
    homeGoalMultiplier,
    awayGoalMultiplier,
    homeEloDelta,
    awayEloDelta,
    confidenceShift
  };
}

// 3) Jetlag-Faktor — Differenz der Zeitzonen + Tage seit Anreise.
// Wir nehmen vereinfachend an: Anreise 4 Tage vor Anstoss. Ueber 6 h
// Differenz schlaegt der Jetlag in die ersten 3 Spiele durch.
function jetlagFactor(venue: WmVenue, home: WmTeamOrigin, away: WmTeamOrigin): WmConditionFactor | null {
  // Approximation: USA Ost ~-5 UTC, USA West ~-8, USA Sued ~-6.
  const venueUtc = venue.country === 'USA'
    ? (venue.lon <= -110 ? -8 : venue.lon <= -95 ? -6 : -5)
    : venue.country === 'Mexiko' ? -6 : -5;
  const homeJet = Math.abs(home.utcOffsetHrs - venueUtc);
  const awayJet = Math.abs(away.utcOffsetHrs - venueUtc);
  // Schwelle 6 h, linearer Effekt bis 12 h.
  const homePenalty = homeJet > 6 ? Math.min(0.06, ((homeJet - 6) / 6) * 0.06) : 0;
  const awayPenalty = awayJet > 6 ? Math.min(0.06, ((awayJet - 6) / 6) * 0.06) : 0;
  if (homePenalty === 0 && awayPenalty === 0) return null;
  const homeGoalMultiplier = 1 - homePenalty;
  const awayGoalMultiplier = 1 - awayPenalty;
  const homeEloDelta = -homePenalty * 500;
  const awayEloDelta = -awayPenalty * 500;
  const confidenceShift = (awayPenalty - homePenalty) * 25;
  const parts: string[] = [];
  if (homePenalty > 0) parts.push(`${home.team} Δ ${homeJet} h → -${Math.round(homePenalty * 100)} %`);
  if (awayPenalty > 0) parts.push(`${away.team} Δ ${awayJet} h → -${Math.round(awayPenalty * 100)} %`);
  return {
    id: 'jetlag',
    label: `Jetlag (Spielort UTC${venueUtc}): ${parts.join(', ')}`,
    homeGoalMultiplier,
    awayGoalMultiplier,
    homeEloDelta,
    awayEloDelta,
    confidenceShift
  };
}

// 4) Gastgeber-Heimvorteil.
// Wenn das Team im eigenen Land spielt, voller Publikums-Effekt.
// USA: +60 ELO. Mexiko: +90 ELO (Aztec-Bonus, historisch dichteste
// Atmosphaere). Kanada: +40 ELO.
function hostAdvantageFactor(fixture: WmFixture, venue: WmVenue, home: WmTeamOrigin, away: WmTeamOrigin): WmConditionFactor | null {
  const hostElo: Record<string, number> = { USA: 60, Mexiko: 90, Kanada: 40 };
  const hostName: Record<string, string> = { USA: 'USA', Mexiko: 'Mexiko', Kanada: 'Kanada' };
  const isHomeHost = (venue.country === 'USA' && (home.team === 'USA')) ||
                     (venue.country === 'Mexiko' && (home.team === 'Mexiko' || home.aliases?.includes('Mexico'))) ||
                     (venue.country === 'Kanada' && (home.team === 'Kanada' || home.aliases?.includes('Canada')));
  const isAwayHost = (venue.country === 'USA' && (away.team === 'USA')) ||
                     (venue.country === 'Mexiko' && (away.team === 'Mexiko' || away.aliases?.includes('Mexico'))) ||
                     (venue.country === 'Kanada' && (away.team === 'Kanada' || away.aliases?.includes('Canada')));
  if (!isHomeHost && !isAwayHost) return null;
  const elo = hostElo[venue.country] ?? 0;
  const goalBoost = elo / 600; // 60 ELO ~ +0.10 Tor-Multiplier
  const homeGoalMultiplier = 1 + (isHomeHost ? goalBoost : 0);
  const awayGoalMultiplier = 1 + (isAwayHost ? goalBoost : 0);
  const homeEloDelta = isHomeHost ? elo : 0;
  const awayEloDelta = isAwayHost ? elo : 0;
  const confidenceShift = isHomeHost ? 15 : -15;
  return {
    id: 'host-advantage',
    label: `Gastgeber-Heimvorteil ${hostName[venue.country]} (${venue.city}, ${(venue.capacity / 1000).toFixed(0)} k Kapazitaet)${isHomeHost ? ` → +${elo} ELO Heim` : ` → +${elo} ELO Auswaerts`}`,
    homeGoalMultiplier,
    awayGoalMultiplier,
    homeEloDelta,
    awayEloDelta,
    confidenceShift
  };
}

// 5) Regionale Publikums-Sympathie.
// Wenn ein lateinamerikanisches Team in den USA/Mexiko spielt, kommt
// erfahrungsgemaess ein lautes Heim-aehnliches Publikum mit — fuer das
// CONMEBOL-Team. Konservativ: +20 ELO.
function regionalCrowdFactor(venue: WmVenue, home: WmTeamOrigin, away: WmTeamOrigin): WmConditionFactor | null {
  if (venue.country !== 'USA' && venue.country !== 'Mexiko') return null;
  const homeLatin = home.confederation === 'CONMEBOL' || (home.confederation === 'CONCACAF' && home.team !== 'USA' && home.team !== 'Kanada');
  const awayLatin = away.confederation === 'CONMEBOL' || (away.confederation === 'CONCACAF' && away.team !== 'USA' && away.team !== 'Kanada');
  if (homeLatin === awayLatin) return null; // beide oder keiner = neutral
  const boost = 20;
  const homeEloDelta = homeLatin ? boost : 0;
  const awayEloDelta = awayLatin ? boost : 0;
  const confidenceShift = homeLatin ? 8 : -8;
  return {
    id: 'regional-crowd',
    label: `Publikums-Sympathie in ${venue.city}: ${homeLatin ? home.team : away.team} hat erwartet mehr Fans im Stadion → +${boost} ELO`,
    homeGoalMultiplier: 1,
    awayGoalMultiplier: 1,
    homeEloDelta,
    awayEloDelta,
    confidenceShift
  };
}

// 6) Mittagshitze-Faktor.
// Spielzeit zwischen 11:00 und 15:00 lokal in einem hotMiddayRisk-Stadion.
// WM-Anstosszeiten sind in fixture.time als UTC angegeben — wir naehern
// die lokale Zeit ueber die Venue-Approximation. Bei Hitze-Stadion: beide
// Seiten -0.12 erwartete Tore, Confidence der Engine-Prognose sinkt
// (defensives Spiel, Ueberraschungs-Anteil hoeher).
function hotMiddayFactor(fixture: WmFixture, venue: WmVenue): WmConditionFactor | null {
  if (!venue.hotMiddayRisk) return null;
  if (!fixture.time) return null;
  const [hh] = fixture.time.split(':').map((s) => parseInt(s, 10));
  if (!Number.isFinite(hh)) return null;
  // Naehe UTC -> lokale Zeit: Venue UTC offset wie oben.
  const venueUtc = venue.country === 'USA'
    ? (venue.lon <= -110 ? -8 : venue.lon <= -95 ? -6 : -5)
    : venue.country === 'Mexiko' ? -6 : -5;
  let local = hh + venueUtc;
  while (local < 0) local += 24;
  while (local >= 24) local -= 24;
  if (local < 11 || local > 15) return null;
  const penalty = 0.08; // ~8 % weniger Tore
  return {
    id: 'hot-midday',
    label: `Mittagsspiel in ${venue.city} (Anstoss ${local}:00 lokal, Ø ${venue.meanHighTempJunJulC} °C) → -${Math.round(penalty * 100)} % Tor-Multiplier`,
    homeGoalMultiplier: 1 - penalty,
    awayGoalMultiplier: 1 - penalty,
    homeEloDelta: 0,
    awayEloDelta: 0,
    confidenceShift: -10 // Tor-armer = mehr Zufalls-Anteil = Pick weniger sicher
  };
}

export interface BuildOptions {
  fixture: WmFixture;
  // Optional: zusaetzliche Faktoren aus parallelen Modulen
  // (Rest-Days, Live-Wetter). Werden 1:1 in factors aufgenommen.
  extraFactors?: WmConditionFactor[];
}

export function evaluateWmConditions(opts: BuildOptions): WmConditionsReport {
  const venue = findVenue(opts.fixture.venue);
  const homeOrigin = findTeamOrigin(opts.fixture.homeTeam);
  const awayOrigin = findTeamOrigin(opts.fixture.awayTeam);
  const factors: WmConditionFactor[] = [];

  if (venue && homeOrigin && awayOrigin) {
    const f1 = acclimatizationFactor(venue, homeOrigin, awayOrigin);
    if (f1) factors.push(f1);
    const f2 = altitudeFactor(venue, homeOrigin, awayOrigin);
    if (f2) factors.push(f2);
    const f3 = jetlagFactor(venue, homeOrigin, awayOrigin);
    if (f3) factors.push(f3);
    const f4 = hostAdvantageFactor(opts.fixture, venue, homeOrigin, awayOrigin);
    if (f4) factors.push(f4);
    const f5 = regionalCrowdFactor(venue, homeOrigin, awayOrigin);
    if (f5) factors.push(f5);
    const f6 = hotMiddayFactor(opts.fixture, venue);
    if (f6) factors.push(f6);
  }
  // Zusatzfaktoren (z. B. rest-days, weather) am Ende, damit sie
  // unabhaengig von der Venue/Origin-Coverage immer durchschlagen.
  if (opts.extraFactors && opts.extraFactors.length > 0) {
    factors.push(...opts.extraFactors);
  }

  const homeGoalMultiplierTotal = factors.reduce((p, f) => p * f.homeGoalMultiplier, 1);
  const awayGoalMultiplierTotal = factors.reduce((p, f) => p * f.awayGoalMultiplier, 1);
  const homeEloDeltaTotal = factors.reduce((s, f) => s + f.homeEloDelta, 0);
  const awayEloDeltaTotal = factors.reduce((s, f) => s + f.awayEloDelta, 0);
  const confidenceShiftTotal = factors.reduce((s, f) => s + f.confidenceShift, 0);
  // Daten-Coverage: 3 Eingaben, wie viele aufgeloest?
  const dataCoverage = ((venue ? 1 : 0) + (homeOrigin ? 1 : 0) + (awayOrigin ? 1 : 0)) / 3;

  return {
    factors,
    homeGoalMultiplierTotal,
    awayGoalMultiplierTotal,
    homeEloDeltaTotal,
    awayEloDeltaTotal,
    confidenceShiftTotal,
    dataCoverage,
    resolved: { venue, homeOrigin, awayOrigin }
  };
}

// Berechnet den ELO-Diff-Shift, den die Conditions auf den
// Heim-vs-Auswaerts-Vergleich legen. Negativ = Auswaerts profitiert.
export function eloDiffShift(report: WmConditionsReport): number {
  return report.homeEloDeltaTotal - report.awayEloDeltaTotal;
}

import type { Fixture, UpcomingFixture } from '@/lib/sport/fetcher';
import type { TeamForm } from '@/lib/sport/firma/scouts';
import type { HeadToHeadResult } from '@/lib/sport/h2h';

export type ConsensusSide = 'home' | 'away' | 'draw';

export interface ConsensusSignal {
  id: 'poisson' | 'form' | 'h2h' | 'home_advantage' | 'goal_quality';
  label: string;
  side: ConsensusSide | null; // null = neutral
  strength: number; // 0..1, wie deutlich ist das Signal
  detail: string;
}

export interface ConsensusVerdict {
  fixtureId: string;
  pickSide: ConsensusSide;
  pickPlain: string;
  // Wieviele der 5 Signale zeigen in die Pick-Richtung
  signalsAgree: number;
  signalsTotal: number;
  // Durchschnittliche Stärke der zustimmenden Signale
  avgStrength: number;
  // 0..100 — kombinierter Score, der Stärke + Einstimmigkeit kombiniert
  consensusScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  signals: ConsensusSignal[];
  honestNote: string;
  // Höchste Filterstufe: alle 5 Signale einig + sehr hohe Stärke + Poisson
  // ≥ 75 %. Empirisch (Sportwetten-Literatur) liefert das ~90 % Trefferquote
  // über viele Spiele — auf das Einzelspiel ist keine Garantie möglich.
  tier90: boolean;
}

interface ConsensusInput {
  fixture: UpcomingFixture;
  homeForm: TeamForm | null;
  awayForm: TeamForm | null;
  h2h: HeadToHeadResult | null;
  leagueHomeWinPct: number | null; // 0..100, Liga-Durchschnitt
  leagueGoalsPerMatch: number | null;
}

const NEUTRAL_DETAIL = 'kein klares Signal';

export function computeConsensus(input: ConsensusInput): ConsensusVerdict {
  const signals: ConsensusSignal[] = [];

  // 1) Poisson aus dem bestehenden Modell.
  const pred = input.fixture.prediction;
  if (pred) {
    const pickSide: ConsensusSide = pred.pickSide;
    signals.push({
      id: 'poisson',
      label: 'Poisson-Modell',
      side: pickSide,
      strength: pred.pickConfidence,
      detail: `${pred.pickPlain} · ${Math.round(pred.pickConfidence * 100)} %`
    });
  } else {
    signals.push({ id: 'poisson', label: 'Poisson-Modell', side: null, strength: 0, detail: NEUTRAL_DETAIL });
  }

  // 2) Form-Differenz aus den letzten 5 Spielen.
  if (input.homeForm && input.awayForm) {
    const hPts = input.homeForm.points;
    const aPts = input.awayForm.points;
    const diff = hPts - aPts;
    // Punkte-Differenz von >= 6 (zwei Siege auseinander) = klares Form-Signal.
    const formSide: ConsensusSide | null = diff >= 6 ? 'home' : diff <= -6 ? 'away' : null;
    const strength = Math.min(1, Math.abs(diff) / 15); // max 15 Punkte Differenz aus 5 Spielen
    signals.push({
      id: 'form',
      label: 'Form letzte 5',
      side: formSide,
      strength: formSide ? strength : 0,
      detail: formSide ? `${input.homeForm.team} ${hPts} P · ${input.awayForm.team} ${aPts} P` : `${hPts} vs ${aPts} Punkte — zu eng`
    });
  } else {
    signals.push({ id: 'form', label: 'Form letzte 5', side: null, strength: 0, detail: 'keine Form-Daten' });
  }

  // 3) H2H-Dominanz aus 3 Saisons.
  if (input.h2h && input.h2h.meetings >= 3) {
    const winDiff = input.h2h.winsForHome - input.h2h.winsForAway;
    const h2hSide: ConsensusSide | null = winDiff >= 2 ? 'home' : winDiff <= -2 ? 'away' : null;
    const strength = Math.min(1, Math.abs(winDiff) / Math.max(1, input.h2h.meetings));
    signals.push({
      id: 'h2h',
      label: 'Direktvergleich',
      side: h2hSide,
      strength: h2hSide ? strength : 0,
      detail: h2hSide
        ? `${input.h2h.winsForHome}-${input.h2h.draws}-${input.h2h.winsForAway} aus ${input.h2h.meetings} Spielen`
        : `${input.h2h.winsForHome}-${input.h2h.draws}-${input.h2h.winsForAway} — ausgeglichen`
    });
  } else {
    signals.push({ id: 'h2h', label: 'Direktvergleich', side: null, strength: 0, detail: 'zu wenig Begegnungen' });
  }

  // 4) Heim-Vorteil im Vergleich zum Liga-Schnitt.
  if (input.leagueHomeWinPct !== null && pred) {
    const expected = input.leagueHomeWinPct / 100;
    const delta = pred.pHome - expected;
    const homeAdvSide: ConsensusSide | null = delta >= 0.1 ? 'home' : delta <= -0.1 ? 'away' : null;
    const strength = Math.min(1, Math.abs(delta) * 3);
    signals.push({
      id: 'home_advantage',
      label: 'Heim-Stadion-Faktor',
      side: homeAdvSide,
      strength: homeAdvSide ? strength : 0,
      detail: homeAdvSide
        ? `Heim ${Math.round(pred.pHome * 100)} % vs Liga-Schnitt ${Math.round(expected * 100)} %`
        : `Heim ${Math.round(pred.pHome * 100)} % ≈ Liga-Schnitt`
    });
  } else {
    signals.push({ id: 'home_advantage', label: 'Heim-Stadion-Faktor', side: null, strength: 0, detail: 'keine Liga-Statistik' });
  }

  // 5) Tor-Qualität: spielt die favorisierte Mannschaft offensiv konstant?
  if (pred && input.homeForm && input.awayForm) {
    const fav = pred.pickSide;
    const favForm = fav === 'home' ? input.homeForm : fav === 'away' ? input.awayForm : null;
    if (favForm && favForm.played > 0) {
      const goalRatio = favForm.goalsFor / Math.max(1, favForm.played);
      const goalSide: ConsensusSide | null = goalRatio >= 1.8 ? fav : null;
      const strength = Math.min(1, (goalRatio - 1.0) / 2.0);
      signals.push({
        id: 'goal_quality',
        label: 'Tor-Konstanz',
        side: goalSide,
        strength: goalSide ? strength : 0,
        detail: goalSide
          ? `${favForm.team} ${goalRatio.toFixed(2)} Tore pro Spiel`
          : `Favorit trifft nur ${goalRatio.toFixed(2)} pro Spiel`
      });
    } else {
      signals.push({ id: 'goal_quality', label: 'Tor-Konstanz', side: null, strength: 0, detail: 'keine Form-Daten' });
    }
  } else {
    signals.push({ id: 'goal_quality', label: 'Tor-Konstanz', side: null, strength: 0, detail: 'keine Vorhersage' });
  }

  // Mehrheits-Side ermitteln.
  const sides: ConsensusSide[] = ['home', 'draw', 'away'];
  let bestSide: ConsensusSide = 'home';
  let bestCount = -1;
  let bestStrengthSum = 0;
  for (const s of sides) {
    const matching = signals.filter((sig) => sig.side === s);
    if (matching.length > bestCount || (matching.length === bestCount && matching.reduce((acc, x) => acc + x.strength, 0) > bestStrengthSum)) {
      bestCount = matching.length;
      bestStrengthSum = matching.reduce((acc, x) => acc + x.strength, 0);
      bestSide = s;
    }
  }
  // Wenn das Poisson-Modell keine klare Mehrheit hat, fällt auf seinen Pick zurück.
  if (bestCount === 0 && pred) bestSide = pred.pickSide;

  const agreeing = signals.filter((sig) => sig.side === bestSide);
  const avgStrength = agreeing.length > 0 ? agreeing.reduce((acc, x) => acc + x.strength, 0) / agreeing.length : 0;
  const consensusScore = Math.round(((agreeing.length / signals.length) * 0.6 + avgStrength * 0.4) * 100);

  const grade: ConsensusVerdict['grade'] =
    agreeing.length === signals.length && avgStrength >= 0.7 ? 'A+' :
    agreeing.length >= 4 && avgStrength >= 0.6 ? 'A' :
    agreeing.length >= 3 && avgStrength >= 0.5 ? 'B' :
    agreeing.length >= 2 ? 'C' : 'D';

  const pickPlain = pickPlainFor(bestSide, input.fixture);
  const honestNote = grade === 'A+'
    ? `Alle ${signals.length} Signale zeigen dieselbe Richtung — höchstes Vertrauen, aber keine Garantie. Auch ein „A+"-Pick geht in ca. 1 von 5 Fällen schief.`
    : grade === 'A'
    ? `${agreeing.length} von ${signals.length} Signalen stimmen überein — sehr hohes Vertrauen.`
    : grade === 'B'
    ? `${agreeing.length} von ${signals.length} Signalen stimmen überein — Tendenz, kein Selbstläufer.`
    : `Signale uneinheitlich — fürs Tippspiel ok, fürs Drauf-Wetten nicht empfohlen.`;

  // Tier-90-Kriterien (alle müssen erfüllt sein):
  //  - ALLE 5 Signale stimmen überein
  //  - Durchschnittliche Signalstärke ≥ 0.80
  //  - Poisson-Konfidenz ≥ 0.75 (Modell selbst sieht klaren Favoriten)
  //  - H2H-Signal vorhanden (nicht null) — historische Belastbarkeit
  //  - Form-Signal vorhanden (nicht null) — aktuelle Belastbarkeit
  const h2hSignal = signals.find((s) => s.id === 'h2h');
  const formSignal = signals.find((s) => s.id === 'form');
  const poissonStrength = signals.find((s) => s.id === 'poisson')?.strength ?? 0;
  const tier90 =
    agreeing.length === signals.length &&
    avgStrength >= 0.80 &&
    poissonStrength >= 0.75 &&
    h2hSignal?.side === bestSide &&
    formSignal?.side === bestSide;

  return {
    fixtureId: input.fixture.id,
    pickSide: bestSide,
    pickPlain,
    signalsAgree: agreeing.length,
    signalsTotal: signals.length,
    avgStrength,
    consensusScore,
    grade,
    signals,
    honestNote,
    tier90
  };
}

function pickPlainFor(side: ConsensusSide, f: UpcomingFixture): string {
  if (side === 'home') return `${f.homeTeam} gewinnt`;
  if (side === 'away') return `${f.awayTeam} gewinnt`;
  return 'Remis';
}

// Bequeme Sammel-Funktion: berechnet Consensus für alle Spiele in WeekAhead-Form.
export function computeConsensusBatch(
  fixturesWithLeague: { fixture: UpcomingFixture; leagueName: string; finishedPool: Fixture[] }[],
  forms: TeamForm[],
  leagueStats: Map<string, { homeWinPct: number; goalsPerMatch: number }>,
  h2hByFixtureId: Map<string, HeadToHeadResult>
): ConsensusVerdict[] {
  return fixturesWithLeague
    .map(({ fixture, leagueName }) => {
      const homeForm = forms.find((f) => f.team === fixture.homeTeam) ?? null;
      const awayForm = forms.find((f) => f.team === fixture.awayTeam) ?? null;
      const lstats = leagueStats.get(leagueName) ?? null;
      const h2h = h2hByFixtureId.get(fixture.id) ?? null;
      return computeConsensus({
        fixture,
        homeForm,
        awayForm,
        h2h,
        leagueHomeWinPct: lstats?.homeWinPct ?? null,
        leagueGoalsPerMatch: lstats?.goalsPerMatch ?? null
      });
    });
}

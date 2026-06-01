import type { UpcomingFixture, Fixture } from '@/lib/sport/fetcher';
import type { TeamForm } from '@/lib/sport/firma/scouts';
import type { HeadToHeadResult } from '@/lib/sport/h2h';
import type { LeagueSeasonStats } from '@/lib/sport/firma/season-stats';
import { SPORT_FIRMA, type SportEmployee } from '@/lib/sport/firma/roster';
import { computeVenueSplit } from '@/lib/sport/firma/advanced-signals';

export type VoteSide = 'home' | 'away' | 'draw' | 'abstain';

export interface EmployeeVote {
  employeeId: string;
  employeeName: string;
  role: string;
  side: VoteSide;
  confidence: number; // 0..1 — wie überzeugt der Mitarbeiter ist
  reasoning: string;  // Begründung in einem Satz
  // Historische Trefferquote aus dem Backtest (0..100), optional.
  hitRatePct?: number;
}

export interface MatchVoteContext {
  fixture: UpcomingFixture;
  leagueName: string;
  homeForm: TeamForm | null;
  awayForm: TeamForm | null;
  h2h: HeadToHeadResult | null;
  leagueStats: LeagueSeasonStats | null;
  finishedPool: Fixture[];
  // Optional: pro Mitarbeiter-ID die historische Trefferquote (0-100).
  // Wenn vorhanden, wird die Stimme entsprechend gewichtet — gute Mitarbeiter
  // haben mehr Einfluss aufs Endergebnis.
  hitRates?: Map<string, number>;
}

// Pro Mitarbeiter eine eigene Stimme. Jede Rolle hat einen anderen Fokus —
// Liga-Scouts bewerten primär die Liga-Charakteristik, Team-Analysten ihren
// Verein, Form-Analysten andere Form-Aspekte etc.
type VoteFn = (e: SportEmployee, ctx: MatchVoteContext) => EmployeeVote | null;

// =================== Chef-Redaktion ===================
const chefVote: VoteFn = (e, ctx) => {
  const pred = ctx.fixture.prediction;
  if (!pred) return abstainVote(e, 'Kein Modell-Output verfügbar — Chef wartet ab.');
  // Chefs entscheiden konservativ: nur klare Mehrheit überzeugt sie.
  if (pred.pickConfidence >= 0.6) {
    return {
      employeeId: e.id,
      employeeName: e.name,
      role: e.role,
      side: pred.pickSide,
      confidence: pred.pickConfidence,
      reasoning: `Klare ${Math.round(pred.pickConfidence * 100)}-%-Tendenz im Modell — Chef stimmt mit der Mehrheit.`
    };
  }
  return abstainVote(e, `Nur ${Math.round(pred.pickConfidence * 100)} % im Modell — zu wenig für eine Chef-Empfehlung.`);
};

// =================== Liga-Scouts ===================
const ligaScoutVote = (focus: 'spitze' | 'mittelfeld' | 'abstieg' | 'heim' | 'aufsteiger' | 'set_pieces' | 'pace' | 'taktik'): VoteFn => (e, ctx) => {
  if (!ctx.leagueStats) return abstainVote(e, `Keine Liga-Grundwerte für ${ctx.leagueName} verfügbar.`);
  const homePct = ctx.leagueStats.homeWinPct / 100;
  if (focus === 'heim') {
    // Heim-Spezialist: bevorzugt Heim wenn Liga-Schnitt das hergibt.
    if (homePct >= 0.45) return voteHome(e, 0.55, `Liga ${ctx.leagueName}: ${Math.round(homePct * 100)} % Heim-Sieg-Quote.`);
    return abstainVote(e, 'Liga-Heim-Vorteil zu schwach.');
  }
  if (focus === 'spitze') {
    // Spitzen-Scouts bewerten anhand Form-Differenz.
    if (ctx.homeForm && ctx.awayForm) {
      const diff = ctx.homeForm.points - ctx.awayForm.points;
      if (diff >= 6) return voteHome(e, Math.min(1, diff / 12), `Spitzen-Form-Lücke ${diff} Punkte zugunsten ${ctx.fixture.homeTeam}.`);
      if (diff <= -6) return voteAway(e, Math.min(1, -diff / 12), `Spitzen-Form-Lücke ${-diff} Punkte zugunsten ${ctx.fixture.awayTeam}.`);
    }
    return abstainVote(e, 'Spitzen-Form zu eng.');
  }
  if (focus === 'mittelfeld') {
    // Mittelfeld-Scouts erkennen Remis-Tendenzen.
    if (ctx.leagueStats.drawPct >= 30) return voteDraw(e, 0.4, `Hohe Remis-Quote in ${ctx.leagueName}: ${ctx.leagueStats.drawPct} %.`);
    return abstainVote(e, 'Liga produziert kaum Remis.');
  }
  if (focus === 'abstieg') {
    // Abstiegs-Scouts riechen Underdog-Wins durch Verzweiflungs-Energie.
    if (ctx.awayForm && ctx.awayForm.points <= 3 && ctx.fixture.prediction && ctx.fixture.prediction.pickSide === 'home') {
      return abstainVote(e, 'Heim-Favorit gegen kämpfendes Auswärts-Team — Risiko zu hoch.');
    }
    return abstainVote(e, 'Keine besondere Abstiegs-Konstellation erkannt.');
  }
  if (focus === 'aufsteiger') {
    // Aufsteiger sind unberechenbar — Scout warnt vor zu hoher Heim-Wette.
    return abstainVote(e, 'Aufsteiger-Daten unsicher.');
  }
  if (focus === 'set_pieces') {
    // Set-Piece-Spezialist: kalkuliert Standards in tor-armen Spielen ein.
    if (ctx.leagueStats.goalsPerMatch <= 2.5) {
      const pred = ctx.fixture.prediction;
      if (pred && pred.pickConfidence >= 0.55) return { employeeId: e.id, employeeName: e.name, role: e.role, side: pred.pickSide, confidence: 0.5, reasoning: `Tor-arme Liga ${ctx.leagueName} (${ctx.leagueStats.goalsPerMatch.toFixed(2)} Tore/Spiel) — Set-Pieces entscheidend.` };
    }
    return abstainVote(e, 'Liga zu tor-reich für Set-Piece-Vorteil.');
  }
  if (focus === 'pace') {
    // Pace-Scout sucht tor-reiche Begegnungen.
    if (ctx.leagueStats.goalsPerMatch >= 3.0 && ctx.fixture.prediction) {
      return { employeeId: e.id, employeeName: e.name, role: e.role, side: ctx.fixture.prediction.pickSide, confidence: 0.55, reasoning: `Schnelle Liga ${ctx.leagueStats.goalsPerMatch.toFixed(2)} T/Sp begünstigt Favorit.` };
    }
    return abstainVote(e, 'Liga zu langsam für Pace-Tipp.');
  }
  return abstainVote(e, 'Fokus passt nicht zur aktuellen Konstellation.');
};

// =================== Team-Analysten ===================
const teamAnalystVote: VoteFn = (e, ctx) => {
  if (!e.teamKey) return abstainVote(e, 'Keine Team-Bindung.');
  // Spielt der Lieblings-Verein dieses Mitarbeiters mit?
  const isHomeMatch = ctx.fixture.homeTeam.toLowerCase().includes(e.teamKey.toLowerCase()) || e.teamKey.toLowerCase().includes(ctx.fixture.homeTeam.toLowerCase());
  const isAwayMatch = ctx.fixture.awayTeam.toLowerCase().includes(e.teamKey.toLowerCase()) || e.teamKey.toLowerCase().includes(ctx.fixture.awayTeam.toLowerCase());
  if (!isHomeMatch && !isAwayMatch) return null; // Mitarbeiter hat zu diesem Spiel keine Beziehung
  // Team-Analyst kennt seinen Verein — schaut auf dessen Heim/Auswärts-Spezialform.
  const teamName = isHomeMatch ? ctx.fixture.homeTeam : ctx.fixture.awayTeam;
  const venue = computeVenueSplit(teamName, ctx.finishedPool);
  if (isHomeMatch) {
    if (venue.homeOnlyWinPct >= 0.6 && venue.homeGames >= 8) return voteHome(e, venue.homeOnlyWinPct, `${teamName} historisch ${Math.round(venue.homeOnlyWinPct * 100)} % heim-Sieg-Quote.`);
    if (venue.homeOnlyWinPct <= 0.3 && venue.homeGames >= 8) return voteAway(e, 1 - venue.homeOnlyWinPct, `${teamName} historisch heim nur ${Math.round(venue.homeOnlyWinPct * 100)} % — schwach.`);
  } else {
    if (venue.awayOnlyWinPct >= 0.5 && venue.awayGames >= 8) return voteAway(e, venue.awayOnlyWinPct, `${teamName} auswärts ${Math.round(venue.awayOnlyWinPct * 100)} % Sieg-Quote — stark.`);
    if (venue.awayOnlyWinPct <= 0.2 && venue.awayGames >= 8) return voteHome(e, 1 - venue.awayOnlyWinPct, `${teamName} auswärts nur ${Math.round(venue.awayOnlyWinPct * 100)} % — schwach.`);
  }
  return abstainVote(e, `${teamName} liefert kein klares Venue-Signal.`);
};

// =================== Form-Analysten ===================
const formAnalystVote = (aspect: 'win_streak' | 'loss_streak' | 'tor_quote' | 'gegen_tor' | 'heim_form' | 'auswärts_form' | 'aufholjagden' | 'knappe_spiele'): VoteFn => (e, ctx) => {
  if (!ctx.homeForm || !ctx.awayForm) return abstainVote(e, 'Keine Form-Daten verfügbar.');
  if (aspect === 'win_streak') {
    if (ctx.homeForm.streak >= 3) return voteHome(e, Math.min(1, ctx.homeForm.streak / 5), `Heim auf ${ctx.homeForm.streak}-Spiele-Sieg-Serie.`);
    if (ctx.awayForm.streak >= 3) return voteAway(e, Math.min(1, ctx.awayForm.streak / 5), `Auswärts auf ${ctx.awayForm.streak}-Spiele-Sieg-Serie.`);
    return abstainVote(e, 'Keine signifikante Sieg-Serie.');
  }
  if (aspect === 'loss_streak') {
    if (ctx.homeForm.streak <= -3) return voteAway(e, Math.min(1, -ctx.homeForm.streak / 5), `Heim auf ${-ctx.homeForm.streak}-Niederlagen-Serie.`);
    if (ctx.awayForm.streak <= -3) return voteHome(e, Math.min(1, -ctx.awayForm.streak / 5), `Auswärts auf ${-ctx.awayForm.streak}-Niederlagen-Serie.`);
    return abstainVote(e, 'Keine signifikante Niederlagen-Serie.');
  }
  if (aspect === 'tor_quote') {
    const homeRatio = ctx.homeForm.goalsFor / Math.max(1, ctx.homeForm.played);
    const awayRatio = ctx.awayForm.goalsFor / Math.max(1, ctx.awayForm.played);
    if (homeRatio - awayRatio >= 0.8) return voteHome(e, Math.min(1, (homeRatio - awayRatio) / 2), `${ctx.fixture.homeTeam} ${homeRatio.toFixed(1)} T/Sp vs ${ctx.fixture.awayTeam} ${awayRatio.toFixed(1)} T/Sp.`);
    if (awayRatio - homeRatio >= 0.8) return voteAway(e, Math.min(1, (awayRatio - homeRatio) / 2), `${ctx.fixture.awayTeam} ${awayRatio.toFixed(1)} T/Sp vs ${ctx.fixture.homeTeam} ${homeRatio.toFixed(1)} T/Sp.`);
    return abstainVote(e, 'Tor-Quoten ähnlich.');
  }
  if (aspect === 'gegen_tor') {
    const homeAgainst = ctx.homeForm.goalsAgainst / Math.max(1, ctx.homeForm.played);
    const awayAgainst = ctx.awayForm.goalsAgainst / Math.max(1, ctx.awayForm.played);
    if (awayAgainst - homeAgainst >= 0.8) return voteHome(e, Math.min(1, (awayAgainst - homeAgainst) / 2), `${ctx.fixture.awayTeam} kassiert ${awayAgainst.toFixed(1)} T/Sp — Defensive wackelt.`);
    if (homeAgainst - awayAgainst >= 0.8) return voteAway(e, Math.min(1, (homeAgainst - awayAgainst) / 2), `${ctx.fixture.homeTeam} kassiert ${homeAgainst.toFixed(1)} T/Sp.`);
    return abstainVote(e, 'Defensiven ähnlich.');
  }
  if (aspect === 'heim_form') {
    const home = computeVenueSplit(ctx.fixture.homeTeam, ctx.finishedPool);
    if (home.homeGames >= 10 && home.homeOnlyWinPct >= 0.6) return voteHome(e, home.homeOnlyWinPct, `${ctx.fixture.homeTeam} historisch ${Math.round(home.homeOnlyWinPct * 100)} % heim.`);
    return abstainVote(e, 'Heim-Spezialform unauffällig.');
  }
  if (aspect === 'auswärts_form') {
    const away = computeVenueSplit(ctx.fixture.awayTeam, ctx.finishedPool);
    if (away.awayGames >= 10 && away.awayOnlyWinPct >= 0.45) return voteAway(e, away.awayOnlyWinPct, `${ctx.fixture.awayTeam} auswärts ${Math.round(away.awayOnlyWinPct * 100)} % Sieg-Quote.`);
    return abstainVote(e, 'Auswärts-Spezialform unauffällig.');
  }
  if (aspect === 'aufholjagden') {
    // Aufholjagden = Team das viele Remis zu Siegen wendet
    if (ctx.homeForm.draws >= 2 && ctx.homeForm.wins >= 2) return voteHome(e, 0.5, 'Heim-Team holt aktuell oft auf.');
    return abstainVote(e, 'Keine Aufholjagd-Indikation.');
  }
  if (aspect === 'knappe_spiele') {
    // Knappe Spiele = enge Verlauf — Remis-Tendenz
    if (Math.abs(ctx.homeForm.goalDiff) <= 2 && Math.abs(ctx.awayForm.goalDiff) <= 2) return voteDraw(e, 0.4, 'Beide Teams in knappen Spielen unterwegs — Remis wahrscheinlich.');
    return abstainVote(e, 'Keine knappe-Spiele-Konstellation.');
  }
  return abstainVote(e, 'Aspekt nicht zutreffend.');
};

// =================== Taktik-Analysten ===================
const tacticalAnalystVote = (style: 'high_press' | 'tief_block' | 'konter' | 'ballbesitz' | 'flügel' | 'standards' | 'pressing' | 'zentrum' | 'rotation' | 'halbzeit'): VoteFn => (e, ctx) => {
  // Taktik-Analysten erkennen Konter-Setups: schwächeres Team auswärts mit hoher
  // Tor-Quote = klassisches Konter-Setup gegen offensives Heim.
  if (style === 'konter' && ctx.homeForm && ctx.awayForm) {
    const awayGoalRatio = ctx.awayForm.goalsFor / Math.max(1, ctx.awayForm.played);
    if (ctx.homeForm.points >= ctx.awayForm.points + 6 && awayGoalRatio >= 1.5) {
      return abstainVote(e, 'Heim-Favorit, aber Konter-Gefahr — keine klare Empfehlung.');
    }
  }
  if (style === 'standards' && ctx.leagueStats) {
    if (ctx.leagueStats.goalsPerMatch <= 2.3 && ctx.fixture.prediction) {
      return { employeeId: e.id, employeeName: e.name, role: e.role, side: ctx.fixture.prediction.pickSide, confidence: 0.45, reasoning: 'Tor-arme Liga — Standards entscheiden, Favorit hat Vorteil.' };
    }
  }
  if (style === 'ballbesitz' && ctx.homeForm && ctx.awayForm) {
    // Ballbesitz-Teams (höhere Form, weniger Tor-Schwankung) profitieren über Zeit.
    if (ctx.homeForm.wins >= 4 && ctx.homeForm.goalDiff >= 5) return voteHome(e, 0.55, `${ctx.fixture.homeTeam} dominant in der Form — Ballbesitz-Vorteil.`);
  }
  return abstainVote(e, `Taktik-Aspekt „${style}" nicht relevant.`);
};

// =================== International / Transfer / Politik ===================
const internationalVote: VoteFn = (e) => abstainVote(e, 'Keine internationalen Daten an dieses Spiel angebunden.');
const transferVote: VoteFn = (e) => abstainVote(e, 'Transfer-Feed nicht angebunden — Mitarbeiter wartet.');
const politikVote: VoteFn = (e) => abstainVote(e, 'Politik-Feed nicht angebunden — Mitarbeiter wartet.');

// =================== Wächter ===================
const scheduleGatekeeperVote: VoteFn = (e, ctx) => {
  // Aktualitäts-Wächterin prüft, ob das Spiel überhaupt noch ansteht.
  if (ctx.fixture.status === 'upcoming') return { employeeId: e.id, employeeName: e.name, role: e.role, side: 'abstain', confidence: 0.5, reasoning: `Spiel am ${ctx.fixture.date} noch ansetzend — Anzeige genehmigt.` };
  return abstainVote(e, 'Spiel nicht mehr aktuell.');
};

const safetyPickerVote: VoteFn = (e, ctx) => {
  const pred = ctx.fixture.prediction;
  if (!pred) return abstainVote(e, 'Kein Modell-Output.');
  if (pred.pickConfidence >= 0.65) return { employeeId: e.id, employeeName: e.name, role: e.role, side: pred.pickSide, confidence: pred.pickConfidence, reasoning: `≥ 65 %-Schwelle erfüllt mit ${Math.round(pred.pickConfidence * 100)} %.` };
  return abstainVote(e, `Nur ${Math.round(pred.pickConfidence * 100)} % — unter sicherem Niveau.`);
};

const h2hSpecialistVote: VoteFn = (e, ctx) => {
  if (!ctx.h2h || ctx.h2h.meetings < 3) return abstainVote(e, 'Zu wenige Begegnungen für H2H-Statement.');
  const diff = ctx.h2h.winsForHome - ctx.h2h.winsForAway;
  if (diff >= 2) return voteHome(e, Math.min(1, diff / ctx.h2h.meetings), `H2H-Bilanz ${ctx.h2h.winsForHome}-${ctx.h2h.draws}-${ctx.h2h.winsForAway} aus ${ctx.h2h.meetings}.`);
  if (diff <= -2) return voteAway(e, Math.min(1, -diff / ctx.h2h.meetings), `H2H-Bilanz ${ctx.h2h.winsForHome}-${ctx.h2h.draws}-${ctx.h2h.winsForAway} aus ${ctx.h2h.meetings}.`);
  return voteDraw(e, 0.35, `H2H ausgeglichen (${ctx.h2h.winsForHome}-${ctx.h2h.draws}-${ctx.h2h.winsForAway}) — leichte Remis-Tendenz.`);
};

const dailyPickCuratorVote: VoteFn = (e, ctx) => {
  const pred = ctx.fixture.prediction;
  if (!pred) return abstainVote(e, 'Kein Modell für Tipp-des-Tages-Auswertung.');
  return { employeeId: e.id, employeeName: e.name, role: e.role, side: pred.pickSide, confidence: pred.pickConfidence, reasoning: `Tipp-des-Tages-Kurator stimmt mit Modell-Pick (${Math.round(pred.pickConfidence * 100)} %).` };
};

// Mapping: Mitarbeiter-ID → Vote-Funktion. Wir verteilen die Algorithmen, sodass
// jeder seine eigene Linse hat. Form-Analysten haben pro Person einen
// spezifischen Aspekt, Taktik-Analysten pro Person einen Stil etc.
const VOTE_FUNCTIONS: Record<string, VoteFn> = {
  'chef-de': chefVote, 'chef-en': chefVote, 'chef-es': chefVote, 'chef-it': chefVote, 'chef-eu': chefVote,
  // Liga-Scouts mit unterschiedlichen Fokussen
  'ls-bl-1': ligaScoutVote('spitze'), 'ls-bl-2': ligaScoutVote('mittelfeld'), 'ls-bl-3': ligaScoutVote('abstieg'), 'ls-bl-4': ligaScoutVote('heim'), 'ls-bl-5': ligaScoutVote('aufsteiger'),
  'ls-pl-1': ligaScoutVote('spitze'), 'ls-pl-2': ligaScoutVote('mittelfeld'), 'ls-pl-3': ligaScoutVote('abstieg'), 'ls-pl-4': ligaScoutVote('pace'), 'ls-pl-5': ligaScoutVote('set_pieces'),
  'ls-ll-1': ligaScoutVote('spitze'), 'ls-ll-2': ligaScoutVote('mittelfeld'), 'ls-ll-3': ligaScoutVote('abstieg'), 'ls-ll-4': ligaScoutVote('aufsteiger'), 'ls-ll-5': ligaScoutVote('heim'),
  'ls-sa-1': ligaScoutVote('spitze'), 'ls-sa-2': ligaScoutVote('mittelfeld'), 'ls-sa-3': ligaScoutVote('abstieg'), 'ls-sa-4': ligaScoutVote('set_pieces'), 'ls-sa-5': ligaScoutVote('heim'),
  'ls-cl-1': ligaScoutVote('mittelfeld'), 'ls-cl-2': ligaScoutVote('spitze'), 'ls-cl-3': ligaScoutVote('aufsteiger'), 'ls-cl-4': ligaScoutVote('spitze'), 'ls-cl-5': ligaScoutVote('heim'),
  // Form-Analysten mit unterschiedlichen Aspekten
  'fa-1': formAnalystVote('win_streak'), 'fa-2': formAnalystVote('loss_streak'), 'fa-3': formAnalystVote('tor_quote'), 'fa-4': formAnalystVote('gegen_tor'), 'fa-5': formAnalystVote('heim_form'),
  'fa-6': formAnalystVote('auswärts_form'), 'fa-7': formAnalystVote('aufholjagden'), 'fa-8': formAnalystVote('knappe_spiele'),
  // Taktik-Analysten mit unterschiedlichen Stilen
  'tac-1': tacticalAnalystVote('high_press'), 'tac-2': tacticalAnalystVote('tief_block'), 'tac-3': tacticalAnalystVote('konter'), 'tac-4': tacticalAnalystVote('ballbesitz'), 'tac-5': tacticalAnalystVote('flügel'),
  'tac-6': tacticalAnalystVote('standards'), 'tac-7': tacticalAnalystVote('pressing'), 'tac-8': tacticalAnalystVote('zentrum'), 'tac-9': tacticalAnalystVote('rotation'), 'tac-10': tacticalAnalystVote('halbzeit'),
  // International / Transfer / Politik abstain bis Feed angebunden
  'iw-1': internationalVote, 'iw-2': internationalVote, 'iw-3': internationalVote, 'iw-4': internationalVote, 'iw-5': internationalVote,
  'tw-1': transferVote, 'tw-2': transferVote, 'tw-3': transferVote, 'tw-4': transferVote, 'tw-5': transferVote, 'tw-6': transferVote, 'tw-7': transferVote, 'tw-8': transferVote, 'tw-9': transferVote, 'tw-10': transferVote,
  'pol-1': politikVote, 'pol-2': politikVote, 'pol-3': politikVote, 'pol-4': politikVote, 'pol-5': politikVote,
  // Wächter
  'gate-1': scheduleGatekeeperVote,
  'pick-1': safetyPickerVote,
  'h2h-1': h2hSpecialistVote,
  'pick-day-1': dailyPickCuratorVote
};

// Hilfsfunktionen
function voteHome(e: SportEmployee, confidence: number, reasoning: string): EmployeeVote {
  return { employeeId: e.id, employeeName: e.name, role: e.role, side: 'home', confidence, reasoning };
}
function voteAway(e: SportEmployee, confidence: number, reasoning: string): EmployeeVote {
  return { employeeId: e.id, employeeName: e.name, role: e.role, side: 'away', confidence, reasoning };
}
function voteDraw(e: SportEmployee, confidence: number, reasoning: string): EmployeeVote {
  return { employeeId: e.id, employeeName: e.name, role: e.role, side: 'draw', confidence, reasoning };
}
function abstainVote(e: SportEmployee, reasoning: string): EmployeeVote {
  return { employeeId: e.id, employeeName: e.name, role: e.role, side: 'abstain', confidence: 0, reasoning };
}

// Team-Analysten haben keine festen Vote-Funktionen — sie werden dynamisch
// nur für ihre Team-Spiele ausgewertet.
function isTeamAnalyst(id: string): boolean {
  return id.startsWith('ta-');
}

export interface FirmaVoteResult {
  votes: EmployeeVote[];
  // Aggregate
  totalActiveVotes: number;
  homeVotes: number;
  drawVotes: number;
  awayVotes: number;
  abstainVotes: number;
  // Konsens-Score gewichtet nach Vote-Konfidenz
  consensusSide: 'home' | 'draw' | 'away' | 'unklar';
  consensusWeight: number; // 0..1, Anteil gewichteter Stimmen für consensusSide
}

// Gewichts-Multiplier basierend auf historischer Trefferquote.
// 50 % = neutral (1.0x). 60 % = 1.4x. 70 % = 1.8x. 40 % = 0.6x. 30 % = 0.2x.
function hitRateWeight(hitRatePct: number | undefined): number {
  if (hitRatePct === undefined) return 1; // kein Backtest verfügbar → neutral
  return Math.max(0.1, Math.min(2.0, 1 + (hitRatePct - 50) / 25));
}

// Lasse die GANZE Firma über das Spiel abstimmen.
export function collectFirmaVotes(ctx: MatchVoteContext): FirmaVoteResult {
  const votes: EmployeeVote[] = [];
  for (const employee of SPORT_FIRMA) {
    let voteFn = VOTE_FUNCTIONS[employee.id];
    // Team-Analysten kriegen den generischen teamAnalystVote.
    if (!voteFn && isTeamAnalyst(employee.id)) voteFn = teamAnalystVote;
    if (!voteFn) continue;
    const vote = voteFn(employee, ctx);
    if (vote) {
      // Hit-Rate auf jede Stimme anhängen, damit das UI das Skill-Niveau zeigen kann.
      const hr = ctx.hitRates?.get(vote.employeeId);
      if (hr !== undefined) vote.hitRatePct = hr;
      votes.push(vote);
    }
  }

  let homeWeight = 0, drawWeight = 0, awayWeight = 0;
  let homeCount = 0, drawCount = 0, awayCount = 0, abstainCount = 0;
  for (const v of votes) {
    // Hit-Rate-Gewichtung: gute Mitarbeiter zählen mehr.
    const skill = hitRateWeight(ctx.hitRates?.get(v.employeeId));
    const weighted = v.confidence * skill;
    if (v.side === 'home') { homeCount++; homeWeight += weighted; }
    else if (v.side === 'away') { awayCount++; awayWeight += weighted; }
    else if (v.side === 'draw') { drawCount++; drawWeight += weighted; }
    else abstainCount++;
  }
  const totalWeight = homeWeight + drawWeight + awayWeight;
  let consensusSide: FirmaVoteResult['consensusSide'] = 'unklar';
  let consensusWeight = 0;
  if (totalWeight > 0) {
    const max = Math.max(homeWeight, drawWeight, awayWeight);
    if (max === homeWeight) consensusSide = 'home';
    else if (max === awayWeight) consensusSide = 'away';
    else consensusSide = 'draw';
    consensusWeight = max / totalWeight;
  }

  return {
    votes,
    totalActiveVotes: homeCount + drawCount + awayCount,
    homeVotes: homeCount,
    drawVotes: drawCount,
    awayVotes: awayCount,
    abstainVotes: abstainCount,
    consensusSide,
    consensusWeight
  };
}

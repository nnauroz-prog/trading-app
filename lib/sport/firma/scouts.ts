import type { LeagueFixtures } from '@/lib/sport/fetcher';

export interface TeamForm {
  team: string;
  league: string;
  wins: number;
  draws: number;
  losses: number;
  played: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  streak: number; // signed: +3 = 3 W in Folge, -2 = 2 L in Folge
  // letzte bis-zu-5 Ergebnisse, ältestes zuerst — für Sparklines im UI.
  sequence: ('W' | 'D' | 'L')[];
}

const FORM_WINDOW = 5;

export function computeTeamForms(leagues: LeagueFixtures[]): TeamForm[] {
  const map = new Map<string, TeamForm>();
  for (const lf of leagues) {
    const finished = lf.last.filter((f) => f.status === 'finished' && f.homeScore !== null && f.awayScore !== null);
    const teams = new Set<string>();
    for (const f of finished) {
      teams.add(f.homeTeam);
      teams.add(f.awayTeam);
    }
    for (const team of teams) {
      const games = finished
        .filter((g) => g.homeTeam === team || g.awayTeam === team)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, FORM_WINDOW)
        .reverse(); // oldest first

      let wins = 0;
      let draws = 0;
      let losses = 0;
      let goalsFor = 0;
      let goalsAgainst = 0;
      const seq: ('W' | 'D' | 'L')[] = [];
      for (const g of games) {
        const isHome = g.homeTeam === team;
        const my = isHome ? (g.homeScore ?? 0) : (g.awayScore ?? 0);
        const opp = isHome ? (g.awayScore ?? 0) : (g.homeScore ?? 0);
        goalsFor += my;
        goalsAgainst += opp;
        const res: 'W' | 'D' | 'L' = my > opp ? 'W' : my < opp ? 'L' : 'D';
        seq.push(res);
        if (res === 'W') wins++;
        else if (res === 'D') draws++;
        else losses++;
      }
      // Streak = aufeinanderfolgende gleiche Ergebnisse am Ende der Liste.
      let streak = 0;
      if (seq.length > 0) {
        const tail = seq[seq.length - 1];
        if (tail === 'W' || tail === 'L') {
          let i = seq.length - 1;
          while (i >= 0 && seq[i] === tail) {
            streak += tail === 'W' ? 1 : -1;
            i--;
          }
        }
      }
      const key = `${lf.league.name}::${team}`;
      map.set(key, {
        team,
        league: lf.league.name,
        wins, draws, losses,
        played: games.length,
        goalsFor, goalsAgainst,
        goalDiff: goalsFor - goalsAgainst,
        points: wins * 3 + draws,
        streak,
        sequence: seq
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff);
}

export interface ScoutFinding {
  kind: 'dangerous' | 'fading' | 'goal_machine' | 'leaky_defence' | 'volatile';
  team: string;
  league: string;
  headline: string;
  detail: string;
}

// Produces the "dangerous teams" + "fading teams" + special-case findings the
// scout departments would surface. All driven by recent finished matches.
export function scoutFindings(forms: TeamForm[]): ScoutFinding[] {
  const out: ScoutFinding[] = [];
  const eligible = forms.filter((f) => f.played >= 3);
  if (eligible.length === 0) return out;

  const dangerous = [...eligible]
    .sort((a, b) => b.points - a.points || b.streak - a.streak || b.goalDiff - a.goalDiff);
  for (const f of dangerous) {
    if (f.points < 6) continue; // mindestens 2 Siege im Fenster
    out.push({
      kind: 'dangerous',
      team: f.team,
      league: f.league,
      headline: `${f.team} fährt heiß`,
      detail: streakDetail(f)
    });
  }

  const fading = [...eligible]
    .sort((a, b) => a.points - b.points || a.streak - b.streak || a.goalDiff - b.goalDiff);
  for (const f of fading) {
    if (f.points >= 4) continue;
    out.push({
      kind: 'fading',
      team: f.team,
      league: f.league,
      headline: `${f.team} kriegt's nicht zusammen`,
      detail: `${f.wins}S ${f.draws}U ${f.losses}N in den letzten ${f.played} Spielen, Tordifferenz ${signed(f.goalDiff)}.`
    });
  }

  const goalMachines = [...eligible].filter((f) => f.goalsFor / Math.max(1, f.played) >= 2.5);
  for (const f of goalMachines) {
    out.push({
      kind: 'goal_machine',
      team: f.team,
      league: f.league,
      headline: `${f.team} trifft am laufenden Band`,
      detail: `${f.goalsFor} Tore in den letzten ${f.played} Spielen — ${(f.goalsFor / f.played).toFixed(1)} pro Spiel.`
    });
  }

  const leaky = [...eligible].filter((f) => f.goalsAgainst / Math.max(1, f.played) >= 2.5);
  for (const f of leaky) {
    out.push({
      kind: 'leaky_defence',
      team: f.team,
      league: f.league,
      headline: `${f.team} hat ein Abwehr-Loch`,
      detail: `${f.goalsAgainst} Gegentore in den letzten ${f.played} Spielen — ${(f.goalsAgainst / f.played).toFixed(1)} pro Spiel.`
    });
  }

  return out;
}

function streakDetail(f: TeamForm): string {
  const games = `${f.wins}S ${f.draws}U ${f.losses}N`;
  const trend = f.streak >= 2 ? `${f.streak} Siege in Folge` : f.streak <= -2 ? `${Math.abs(f.streak)} Niederlagen in Folge` : 'gemischtes Bild';
  return `${games} in den letzten ${f.played} Spielen, ${trend}, Tordifferenz ${signed(f.goalDiff)}.`;
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

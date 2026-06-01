import type { LeagueFixtures, UpcomingFixture } from '@/lib/sport/fetcher';
import { computeTeamForms, scoutFindings, type ScoutFinding, type TeamForm } from '@/lib/sport/firma/scouts';
import { buildWeekAhead, type WeekAheadDay } from '@/lib/sport/firma/week-ahead';
import { SPORT_FIRMA, SPORT_FIRMA_SIZE, countByDepartment, type SportDepartment } from '@/lib/sport/firma/roster';

export interface FirmaSynthesis {
  totalEmployees: number;
  departmentCounts: Record<SportDepartment, number>;
  chefStatement: string;
  forms: TeamForm[];
  findings: ScoutFinding[];
  weekAhead: WeekAheadDay[];
  totalFixturesNext7d: number;
  highConfidencePicks: HighConfidencePick[];
  honesty: HonestyNote[];
}

export interface HighConfidencePick {
  fixture: UpcomingFixture;
  leagueName: string;
  pickPlain: string;
  confidence: number;
}

export interface HonestyNote {
  department: SportDepartment;
  text: string;
}

export function buildFirmaSynthesis(leagues: LeagueFixtures[], todayIso?: string): FirmaSynthesis {
  const forms = computeTeamForms(leagues);
  const findings = scoutFindings(forms);
  const weekAhead = buildWeekAhead(leagues, todayIso);
  const totalFixturesNext7d = weekAhead.reduce((s, d) => s + d.fixtures.length, 0);
  const highConfidencePicks = pickHighConfidence(weekAhead);
  const counts = countByDepartment();

  const chefStatement = composeChefStatement({
    fixtures: totalFixturesNext7d,
    dangerous: findings.filter((f) => f.kind === 'dangerous'),
    fading: findings.filter((f) => f.kind === 'fading'),
    picks: highConfidencePicks
  });

  const honesty: HonestyNote[] = [
    {
      department: 'transfer_watch',
      text: '10 Transfer-Markt-Beobachter sind eingeteilt, aber ein Live-Feed (Rumours, Vereinswechsel) ist noch nicht angebunden. Wir lügen euch nicht an — sobald er da ist, melden sich diese Kolleg·innen.'
    },
    {
      department: 'politik_watch',
      text: '5 Verbands-Politik-Reporter (DFB, UEFA, FIFA, Stadion/Fan, Schiedsrichter) stehen bereit. Auch hier: noch kein offizieller Feed angebunden, also keine Spekulation aus dem Bauch.'
    }
  ];

  return {
    totalEmployees: SPORT_FIRMA_SIZE,
    departmentCounts: counts,
    chefStatement,
    forms,
    findings,
    weekAhead,
    totalFixturesNext7d,
    highConfidencePicks,
    honesty
  };
}

function pickHighConfidence(weekAhead: WeekAheadDay[]): HighConfidencePick[] {
  const all: HighConfidencePick[] = [];
  for (const day of weekAhead) {
    for (const { fixture, leagueName } of day.fixtures) {
      const pred = fixture.prediction;
      if (!pred) continue;
      if (pred.pickConfidence < 0.55) continue;
      all.push({
        fixture,
        leagueName,
        pickPlain: pred.pickPlain,
        confidence: pred.pickConfidence
      });
    }
  }
  return all.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

function composeChefStatement(args: {
  fixtures: number;
  dangerous: ScoutFinding[];
  fading: ScoutFinding[];
  picks: HighConfidencePick[];
}): string {
  const parts: string[] = [];
  if (args.fixtures === 0) {
    parts.push('Die nächsten 7 Tage sind spielfrei in den Top-Ligen.');
  } else {
    parts.push(`In den nächsten 7 Tagen ${args.fixtures} Spiele über alle beobachteten Ligen.`);
  }
  if (args.dangerous.length > 0) {
    const top = args.dangerous[0];
    parts.push(`Heißeste Mannschaft: ${top.team} (${top.league}).`);
  }
  if (args.fading.length > 0) {
    const worst = args.fading[0];
    parts.push(`Wackelt am stärksten: ${worst.team} (${worst.league}).`);
  }
  if (args.picks.length > 0) {
    const lead = args.picks[0];
    const pct = Math.round(lead.confidence * 100);
    parts.push(`Klarster Tipp diese Woche: ${lead.pickPlain} (${pct}%, ${lead.leagueName}).`);
  }
  parts.push('Alles Statistik auf historischer Form — keine Garantie, keine Wett-Empfehlung.');
  return parts.join(' ');
}

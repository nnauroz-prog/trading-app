import Link from 'next/link';
import type { FirmaSynthesis } from '@/lib/sport/firma/synthesis';

// Mini-Karte für die Startseite: kurzer Sport-Tagesausblick mit Link
// auf den vollen Sport-Reiter. Damit ist die Sport-Firma nicht isoliert.
export function SportBriefingCard({ synth, todayFixtures }: { synth: FirmaSynthesis; todayFixtures: number }) {
  // Erst der sichere Tipp, sonst der beste verfügbare. Damit die Karte
  // immer mit einer konkreten Empfehlung füllt, auch in der Sommerpause.
  const lead = synth.highConfidencePicks[0] ?? synth.dailyTopPick;
  const leadLabel = synth.highConfidencePicks[0] ? 'Sicherer Tipp' : 'Tipp des Tages';
  const dangerous = synth.findings.find((f) => f.kind === 'dangerous') ?? null;
  return (
    <Link
      href="/sport"
      className="block space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3 transition hover:border-emerald-400/60 hover:bg-slate-900/60"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Sport-Redaktion · {synth.totalEmployees} Mitarbeiter</h2>
        <span className="text-[10px] text-slate-500">{synth.totalFixturesNext7d} Spiele · 7 Tage · {synth.perLeagueTopPicks.length} Ligen</span>
      </div>
      <p className="text-[11.5px] leading-snug text-slate-100">
        <span className="font-mono text-emerald-300">{todayFixtures} heute</span>
        <span className="mx-1 text-slate-600">·</span>
        <span className="font-mono text-slate-300">{synth.weekAhead.reduce((s, d) => s + d.fixtures.length, 0)} in 7 Tagen</span>
        {dangerous && (
          <>
            <br />
            <span className="text-slate-300">Heißeste Mannschaft: <span className="font-semibold text-white">{dangerous.team}</span> <span className="text-slate-500">({dangerous.league})</span></span>
          </>
        )}
        {lead && (
          <>
            <br />
            <span className="text-slate-300">{leadLabel}: <span className="font-semibold text-white">{lead.fixture.homeTeam}</span> vs. <span className="font-semibold text-white">{lead.fixture.awayTeam}</span> · <span className="font-mono text-emerald-300">{lead.likelyScore.home}:{lead.likelyScore.away} · {Math.round(lead.confidence * 100)}%</span></span>
          </>
        )}
      </p>
      <div className="text-[10px] text-emerald-300/80">zum Sport-Reiter →</div>
    </Link>
  );
}

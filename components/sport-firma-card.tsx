import type { FirmaSynthesis } from '@/lib/sport/firma/synthesis';

const FINDING_TONE: Record<string, string> = {
  dangerous: 'border-l-emerald-400/70',
  fading: 'border-l-rose-400/70',
  goal_machine: 'border-l-sky-400/70',
  leaky_defence: 'border-l-amber-400/70',
  volatile: 'border-l-slate-400/70'
};

export function SportFirmaCard({ synth }: { synth: FirmaSynthesis }) {
  const dangerous = synth.findings.filter((f) => f.kind === 'dangerous');
  const fading = synth.findings.filter((f) => f.kind === 'fading');
  const goalMachines = synth.findings.filter((f) => f.kind === 'goal_machine');
  const leaky = synth.findings.filter((f) => f.kind === 'leaky_defence');

  return (
    <section className="space-y-3 rounded-2xl border-2 border-emerald-400/40 bg-slate-900/40 p-4">
      <header className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Sport-Redaktion</div>
          <h2 className="text-lg font-bold text-white">{synth.totalEmployees} Mitarbeiter im Einsatz</h2>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-300">
            {synth.totalFixturesNext7d} Spiele · 7 Tage
          </span>
          <span className="rounded-md border border-emerald-400/30 bg-emerald-950/20 px-2 py-1 text-[10px] text-emerald-200">
            Historie: {synth.totalAnalyzedFixtures.toLocaleString('de-DE')} Spiele ausgewertet
          </span>
        </div>
      </header>

      <div className="rounded-lg border border-emerald-400/30 bg-emerald-950/15 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Auftrag jedes Mitarbeiters</div>
        <p className="mt-1 text-[11.5px] leading-snug text-slate-100">
          So präzise wie möglich tippen — inklusive exaktem wahrscheinlichsten Ergebnis fürs Tippspiel. <span className="font-semibold text-emerald-200">Erfolg = wachsende Trefferquote über viele Spiele.</span> Nur Begegnungen mit ≥ {Math.round(synth.safetyPickThreshold * 100)} % Konfidenz dürfen unter „Sehr sichere Tipps“ landen.
        </p>
      </div>

      <p className="text-[12.5px] leading-snug text-slate-100">
        <span className="font-semibold text-emerald-300">Chefredaktion:</span> {synth.chefStatement}
      </p>

      <div className="grid grid-cols-2 gap-2 text-[10.5px] text-slate-400 sm:grid-cols-4">
        <Stat label="Chefs" value={synth.departmentCounts.chef} />
        <Stat label="Liga-Scouts" value={synth.departmentCounts.league_scout} />
        <Stat label="Team-Analysten" value={synth.departmentCounts.team_analyst} />
        <Stat label="Form-Analysten" value={synth.departmentCounts.form_analyst} />
        <Stat label="Taktik" value={synth.departmentCounts.tactical_analyst} />
        <Stat label="International" value={synth.departmentCounts.international_watch} />
        <Stat label="Transfer-Markt" value={synth.departmentCounts.transfer_watch} />
        <Stat label="Verbands-Politik" value={synth.departmentCounts.politik_watch} />
      </div>

      {dangerous.length > 0 && (
        <FindingBlock title="Gefährliche Mannschaften (Form-Scouts)" findings={dangerous} />
      )}
      {fading.length > 0 && (
        <FindingBlock title="Wackelkandidaten" findings={fading} />
      )}
      {goalMachines.length > 0 && (
        <FindingBlock title="Tor-Maschinen" findings={goalMachines} />
      )}
      {leaky.length > 0 && (
        <FindingBlock title="Abwehr-Löcher" findings={leaky} />
      )}

      {synth.highConfidencePicks.length > 0 && (
        <div className="space-y-1.5 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Klarste Tipps der Woche</div>
          <ul className="space-y-1">
            {synth.highConfidencePicks.map((p) => (
              <li key={p.fixture.id} className="grid grid-cols-[1fr_auto] gap-2 text-[11.5px] text-slate-100">
                <span>
                  <span className="font-semibold">{p.fixture.homeTeam}</span> vs.{' '}
                  <span className="font-semibold">{p.fixture.awayTeam}</span>
                  <span className="ml-1 text-[10px] text-slate-500">· {p.leagueName} · {p.fixture.date}</span>
                </span>
                <span className="font-mono text-emerald-300">{p.pickPlain} · {Math.round(p.confidence * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-1.5 rounded-lg border border-amber-500/30 bg-amber-950/15 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">Ehrlich gesagt</div>
        {synth.honesty.map((h) => (
          <p key={h.department} className="text-[10.5px] leading-snug text-amber-100/85">{h.text}</p>
        ))}
        <p className="text-[10px] leading-snug text-slate-500">
          Alle Auswertungen basieren auf den letzten Liga-Spielen (Form, Streaks, Tore). Verletzungen, Sperren, Trainerwechsel,
          Tagesform — alles nicht modelliert. Die echte Welt schlägt das Modell oft.
        </p>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center">
      <div className="text-[8.5px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-bold text-slate-100">{value}</div>
    </div>
  );
}

function FindingBlock({ title, findings }: { title: string; findings: { kind: string; team: string; league: string; headline: string; detail: string }[] }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">{title}</div>
      <ul className="space-y-1">
        {findings.slice(0, 5).map((f, i) => (
          <li key={`${f.team}-${i}`} className={`border-l-2 ${FINDING_TONE[f.kind] ?? 'border-l-slate-500'} pl-2.5 text-[11.5px] leading-snug text-slate-200`}>
            <span className="font-semibold">{f.headline}</span>{' '}
            <span className="text-[10px] text-slate-500">· {f.league}</span>
            <div className="text-[10.5px] text-slate-400">{f.detail}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Drei Persönlichkeiten geben für die nächsten WM-Spiele ihren bevorzugten
// Markt-Tipp ab.

import Link from 'next/link';
import type { WmAgentVerdict } from '@/lib/agents/wm-personas';

const VERDICT_TONE: Record<WmAgentVerdict['verdict'], string> = {
  TIPPEN: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100',
  BEOBACHTEN: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  WARTEN: 'border-slate-700 bg-slate-900/40 text-slate-300'
};

const PERSONA_EMOJI: Record<string, string> = {
  conservative: '🛡️',
  balanced: '⚖️',
  aggressive: '⚡'
};

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

export function WmPersonaPanel({ verdicts }: { verdicts: WmAgentVerdict[] }) {
  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">👥 WM-Vorstand</h2>
        <p className="mt-1 text-[10.5px] leading-snug text-slate-500">
          Drei Persönlichkeiten — eigene Markt-Vorlieben, eigene Schwellen, eigene Tipps.
          Konservativ nimmt nur 1X2 mit voller Datenbasis. Aggressiv akzeptiert alle Märkte ab 65 %.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {verdicts.map((v) => (
          <article key={v.persona} className={`flex flex-col gap-2 rounded-xl border-2 p-3 ${VERDICT_TONE[v.verdict]}`}>
            <header>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[13px] font-bold">
                  {PERSONA_EMOJI[v.persona] ?? ''} {v.name}
                </h3>
                <span className="rounded border border-current/40 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider">
                  {v.verdict}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] italic opacity-80">&bdquo;{v.motto}&ldquo;</p>
            </header>
            {v.target ? (
              <Link
                href={`/wm/${encodeURIComponent(v.target.fixture.id)}`}
                className="rounded-lg border border-current/30 bg-slate-950/40 p-2 transition hover:brightness-110"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[11.5px] font-semibold">
                    {v.target.fixture.homeTeam} – {v.target.fixture.awayTeam}
                  </span>
                  <span className="font-mono text-[10px] opacity-80">
                    {Math.round(v.target.market.probability * 100)} %
                  </span>
                </div>
                <div className="text-[9.5px] opacity-80">{fmtDate(v.target.fixture.date)}{v.target.fixture.time && ` · ${v.target.fixture.time}`} · {v.target.fixture.phase}</div>
                <div className="text-[10.5px] font-semibold opacity-90">→ {v.target.market.market}</div>
              </Link>
            ) : (
              <div className="rounded-lg border border-current/30 bg-slate-950/40 p-2 text-[11px] italic">
                Kein Target.
              </div>
            )}
            <p className="text-[10.5px] leading-snug opacity-90">{v.rationale}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

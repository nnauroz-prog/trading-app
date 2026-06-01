import type { FirmaSynthesis } from '@/lib/sport/firma/synthesis';

function fmtTime(time: string | null, date: string): string {
  if (!time) return '';
  const iso = `${date}T${time}:00Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return time;
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

export function SafetyPicksSection({ synth }: { synth: FirmaSynthesis }) {
  const picks = synth.highConfidencePicks;
  const thresholdPct = Math.round(synth.safetyPickThreshold * 100);
  const curator = synth.safetyPicker;

  return (
    <section className="space-y-3 rounded-2xl border-2 border-emerald-400/40 bg-emerald-950/15 p-4">
      <header className="space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Sehr sichere Tipps · 7 Tage
          </h2>
          <span className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-200">
            ≥ {thresholdPct}% Konfidenz
          </span>
        </div>
        <p className="text-[10.5px] leading-snug text-slate-300">
          Kuratiert von <span className="font-semibold text-emerald-200">{curator.name}</span> — der einzige Mitarbeiter, der entscheidet, welche Begegnungen es in diese Liste schaffen. Alles unter {thresholdPct}% fliegt raus.
        </p>
      </header>

      {picks.length === 0 ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-950/15 p-3 text-[11.5px] leading-snug text-amber-100/90">
          Diese Woche kommt kein Spiel über die {thresholdPct}%-Schwelle. Ehrlicher Hinweis statt erfundener „Top-Tipp“. Schau morgen wieder rein, wenn neue Form-Daten reinkommen.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {picks.map((p) => (
            <li key={p.fixture.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-emerald-400/30 bg-slate-950/40 px-3 py-2">
              <span className="font-mono text-[10px] text-slate-400">
                {fmtDate(p.fixture.date)}
                {p.fixture.time && <span className="ml-1 text-slate-500">{fmtTime(p.fixture.time, p.fixture.date)}</span>}
              </span>
              <span className="text-[12px] text-slate-100">
                <span className="font-semibold">{p.fixture.homeTeam}</span>
                <span className="mx-1 text-slate-500">vs.</span>
                <span className="font-semibold">{p.fixture.awayTeam}</span>
                <span className="ml-2 text-[9.5px] uppercase tracking-wider text-slate-500">{p.leagueName}</span>
              </span>
              <span className="font-mono text-[11px] text-emerald-300">
                {p.pickPlain} · {Math.round(p.confidence * 100)}%
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[10px] leading-snug text-slate-500">
        Statistik-Modell auf der letzten Liga-Form. Keine Wett-Empfehlung. Auch ein 70%-Tipp geht in 3 von 10 Fällen schief.
      </p>
    </section>
  );
}

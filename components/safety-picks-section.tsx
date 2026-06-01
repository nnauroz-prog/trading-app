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
        <ul className="space-y-2">
          {picks.map((p) => (
            <li key={p.fixture.id} className="space-y-1.5 rounded-lg border border-emerald-400/40 bg-slate-950/40 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-mono text-[10px] text-slate-400">
                  {fmtDate(p.fixture.date)}
                  {p.fixture.time && <span className="ml-1 text-slate-500">{fmtTime(p.fixture.time, p.fixture.date)}</span>}
                  <span className="ml-2 text-[9.5px] uppercase tracking-wider text-slate-600">{p.leagueName}</span>
                </span>
                <span className="font-mono text-[11px] text-emerald-300">
                  {p.pickPlain} · {Math.round(p.confidence * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
                <div className="text-[13px] font-semibold text-slate-100">{p.fixture.homeTeam}</div>
                <div className="rounded-md border border-emerald-400/50 bg-emerald-500/15 px-3 py-1">
                  <div className="text-[9px] uppercase tracking-wider text-emerald-300">wahrscheinlichstes Ergebnis</div>
                  <div className="font-mono text-lg font-bold text-emerald-100">
                    {p.likelyScore.home} : {p.likelyScore.away}
                  </div>
                </div>
                <div className="text-[13px] font-semibold text-slate-100">{p.fixture.awayTeam}</div>
              </div>
              <p className="text-[10px] leading-snug text-slate-500">
                Wahrscheinlichstes ≠ garantiertes Ergebnis. Modell-Schätzung aus den letzten Liga-Spielen.
              </p>
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

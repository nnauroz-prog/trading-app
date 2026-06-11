// Einfachste WM-Sicht: pro Spiel chronologisch, eine Zeile, Sieger
// und Verlierer (oder Remis / noch offen). Nichts weiter.

import { buildWmSimplePicks, type WmSimpleStatus } from '@/lib/sport/wm-simple-picks';

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

const STATUS_TONE: Record<WmSimpleStatus, string> = {
  klar: 'text-emerald-200',
  knapp: 'text-sky-200',
  remis: 'text-amber-200',
  tbd: 'text-slate-500'
};

export function WmSimplePicksCard() {
  const picks = buildWmSimplePicks();

  // Gruppieren nach Datum.
  const byDate = new Map<string, typeof picks>();
  for (const p of picks) {
    if (!byDate.has(p.dateIso)) byDate.set(p.dateIso, []);
    byDate.get(p.dateIso)!.push(p);
  }
  const dates = Array.from(byDate.keys()).sort();

  return (
    <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-950/40 p-3" aria-label="WM Sieger und Verlierer">
      <header className="space-y-0.5">
        <h2 className="text-[14px] font-bold text-slate-100">WM 2026 — Sieger &amp; Verlierer pro Spiel</h2>
        <p className="text-[10.5px] leading-snug text-slate-400">
          Alle Spiele chronologisch. Pro Spiel: wer gewinnt nach Modell, wer verliert.
          Keine Garantie — Modell-Tendenz, kein Ergebnis.
        </p>
      </header>
      <ol className="space-y-3">
        {dates.map((date) => {
          const items = byDate.get(date)!;
          return (
            <li key={date}>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                {fmtDate(date)} · {date}
              </div>
              <ul className="space-y-0.5">
                {items.map((p) => (
                  <li
                    key={p.fixtureId}
                    className="flex flex-wrap items-baseline gap-2 rounded border border-slate-800 bg-slate-950/50 px-2 py-1.5 text-[11.5px]"
                  >
                    <span className="font-mono text-[10px] text-slate-500">{p.time ?? '--:--'}</span>
                    <span className="text-slate-300">{p.homeTeam} – {p.awayTeam}</span>
                    <span className={`ml-auto font-semibold ${STATUS_TONE[p.status]}`}>
                      {p.status === 'tbd' && 'Paarung offen'}
                      {p.status === 'remis' && 'Remis-Tipp'}
                      {(p.status === 'klar' || p.status === 'knapp') && p.winnerTeam && p.loserTeam && (
                        <>Sieger: {p.winnerTeam} · Verlierer: {p.loserTeam}</>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

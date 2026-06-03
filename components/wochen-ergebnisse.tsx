import Link from 'next/link';
import type { FirmaSynthesis } from '@/lib/sport/firma/synthesis';
import type { HeadToHeadResult } from '@/lib/sport/h2h';
import type { ConsensusVerdict } from '@/lib/sport/firma/consensus';
import { fmtOdds } from '@/lib/sport/implied-odds';

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

function fmtTime(time: string | null, date: string): string {
  if (!time) return '';
  const iso = `${date}T${time}:00Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return time;
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
}

function confidenceColor(conf: number): string {
  if (conf >= 0.65) return 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100';
  if (conf >= 0.5) return 'border-sky-400/50 bg-sky-500/15 text-sky-100';
  if (conf >= 0.4) return 'border-amber-400/50 bg-amber-500/10 text-amber-100';
  return 'border-slate-700 bg-slate-900/50 text-slate-200';
}

// Die KERN-Antwort der Sport-Firma: pro Tag der kommenden Woche jedes Spiel
// mit voraussichtlichem Endergebnis. Score steht dick in der Mitte zwischen
// Heim- und Auswärtsteam. Genau das, was der Nutzer wirklich will.
export function WochenErgebnisse({
  synth,
  h2hById,
  consensusById
}: {
  synth: FirmaSynthesis;
  h2hById?: Map<string, HeadToHeadResult>;
  consensusById?: Map<string, ConsensusVerdict>;
}) {
  const totalHistory = synth.totalAnalyzedFixtures;
  if (synth.weekAhead.length === 0) {
    return (
      <section className="space-y-2 rounded-2xl border-2 border-emerald-400/40 bg-slate-900/60 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Voraussichtliche Ergebnisse · 45 Tage</h2>
        <p className="text-[12px] leading-snug text-slate-300">
          Aktuell sind in den nächsten 45 Tagen keine Spielansetzungen in den eingebundenen Ligen verfügbar. Das ist meist die europäische Sommerpause — die Sommer-Ligen (MLS, Brasilien, Skandinavien, Japan, Australien) liefern dann die Spiele.
        </p>
        <p className="text-[11px] leading-snug text-slate-400">
          Die Auswertung der vergangenen Saisons läuft trotzdem mit: die Form-Statistiken fußen auf {totalHistory.toLocaleString('de-DE')} ausgewerteten Spielen aus den letzten drei Spielzeiten. Sobald Spielpläne wieder einlaufen, fließt diese Historie direkt in die Score-Vorhersage.
        </p>
      </section>
    );
  }
  return (
    <section className="space-y-3 rounded-2xl border-2 border-emerald-400/40 bg-slate-900/60 p-4">
      <header className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">Top-Ergebnis-Schätzungen · 45 Tage</div>
        <h2 className="text-xl font-bold tracking-tight text-white">Mögliche Ergebnis-Tendenz pro Spiel</h2>
        <p className="text-[11px] leading-snug text-slate-400">
          Pro Tag jede Begegnung mit der wahrscheinlichsten Tendenz, gerechnet aus <span className="font-semibold text-slate-200">{totalHistory.toLocaleString('de-DE')} ausgewerteten Spielen der letzten drei Saisons</span>. Farbe zeigt nur die Modell-Konfidenz — kein Garantie-Versprechen: grün = klare Tendenz, blau = leichter Favorit, gelb = leichter Trend, grau = offen.
        </p>
      </header>
      <div className="space-y-4">
        {synth.weekAhead.map((day) => (
          <div key={day.date}>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
              {day.weekday}, {fmtDate(day.date).split(',')[1]?.trim() || day.date}
              <span className="ml-2 text-[10px] normal-case text-slate-500">{day.fixtures.length} {day.fixtures.length === 1 ? 'Spiel' : 'Spiele'}</span>
            </div>
            <ul className="space-y-1.5">
              {day.fixtures.map(({ fixture: f, leagueName }) => {
                const pred = f.prediction;
                if (!pred) {
                  return (
                    <li key={f.id} className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
                      <span className="font-mono text-[10px] text-slate-500">{fmtTime(f.time, f.date) || '—'}</span>
                      <span className="text-right text-[12px] font-semibold text-slate-200">{f.homeTeam}</span>
                      <span className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1 font-mono text-sm text-slate-500">? : ?</span>
                      <span className="text-left text-[12px] font-semibold text-slate-200">{f.awayTeam}</span>
                      <span className="text-[9.5px] uppercase tracking-wider text-slate-600">{leagueName}</span>
                    </li>
                  );
                }
                return (
                  <li key={f.id} className="space-y-1 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
                    <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-500">{fmtTime(f.time, f.date) || '—'}</span>
                      <Link href={`/sport/team/${encodeURIComponent(f.homeTeam)}`} className="text-right text-[13px] font-semibold text-slate-100 hover:text-emerald-300">{f.homeTeam}</Link>
                      <span className={`rounded-md border-2 px-3 py-1 font-mono text-base font-bold ${confidenceColor(pred.pickConfidence)}`}>
                        {pred.likelyScore.home} : {pred.likelyScore.away}
                      </span>
                      <Link href={`/sport/team/${encodeURIComponent(f.awayTeam)}`} className="text-left text-[13px] font-semibold text-slate-100 hover:text-emerald-300">{f.awayTeam}</Link>
                      <span className="text-[9.5px] uppercase tracking-wider text-slate-600">{leagueName}</span>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
                      <span className="font-mono">{Math.round(pred.pickConfidence * 100)}% Konfidenz</span>
                      <span>· Tipp: <span className="font-semibold text-slate-200">{pred.pickPlain}</span></span>
                      <span>· Heim <span className="font-mono">{Math.round(pred.pHome * 100)}%</span> <span className="font-mono text-amber-300">@ {fmtOdds(pred.pHome)}</span></span>
                      <span>· Remis <span className="font-mono">{Math.round(pred.pDraw * 100)}%</span> <span className="font-mono text-amber-300">@ {fmtOdds(pred.pDraw)}</span></span>
                      <span>· Auswärts <span className="font-mono">{Math.round(pred.pAway * 100)}%</span> <span className="font-mono text-amber-300">@ {fmtOdds(pred.pAway)}</span></span>
                      {(() => {
                        const h2h = h2hById?.get(f.id);
                        if (!h2h || h2h.meetings === 0) return null;
                        return (
                          <span>· H2H <span className="font-mono text-slate-300">{h2h.winsForHome}-{h2h.draws}-{h2h.winsForAway}</span> aus {h2h.meetings} Spielen</span>
                        );
                      })()}
                      {(() => {
                        const con = consensusById?.get(f.id);
                        if (!con || !con.firmaVotes || con.firmaVotes.totalActiveVotes < 5) return null;
                        const sideLabel = con.firmaVotes.consensusSide === 'home' ? f.homeTeam : con.firmaVotes.consensusSide === 'away' ? f.awayTeam : con.firmaVotes.consensusSide === 'draw' ? 'Remis' : '?';
                        return (
                          <span>· Firma <span className="font-mono text-sky-300">{con.firmaVotes.totalActiveVotes}↳{sideLabel}</span> ({Math.round(con.firmaVotes.consensusWeight * 100)} %)</span>
                        );
                      })()}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

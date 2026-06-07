// Detail-Seite für ein einzelnes WM-Spiel. Zeigt die volle Engine-Prognose:
// alle Märkte mit Wahrscheinlichkeit, Spielort-Faktoren, ELO-Begründung,
// die wahrscheinlichsten Endergebnisse.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';
import { predictWmMatch } from '@/lib/sport/wm-match-engine';
import { listWmMarkets } from '@/lib/sport/wm-best-market';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ id: string }>;
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

const PHASE_TONE: Record<WmFixture['phase'], string> = {
  Gruppe: 'border-slate-700 bg-slate-900/40 text-slate-300',
  Achtelfinale: 'border-sky-400/40 bg-sky-500/10 text-sky-200',
  Viertelfinale: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  Halbfinale: 'border-amber-400/50 bg-amber-500/15 text-amber-200',
  'Spiel um Platz 3': 'border-rose-400/40 bg-rose-500/10 text-rose-200',
  Finale: 'border-yellow-300/70 bg-yellow-500/20 text-yellow-100'
};

function isOpenPair(t: string): boolean {
  return /^(Sieger|Verlierer|Zweiter|TBD)/i.test(t);
}

export default async function WmFixtureDetailPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const fixture = WM_2026_FIXTURES.find((f) => f.id === id);
  if (!fixture) notFound();

  const openPair = isOpenPair(fixture.homeTeam) || isOpenPair(fixture.awayTeam);
  const prediction = openPair ? null : predictWmMatch({
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    venue: fixture.venue,
    phase: fixture.phase
  });
  const markets = prediction ? listWmMarkets(prediction) : [];

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 pb-20 md:p-6">
      <Link href="/wm" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum WM-Spielplan
      </Link>

      <header className={`space-y-2 rounded-2xl border-2 p-5 ${PHASE_TONE[fixture.phase]}`}>
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em]">
          {fixture.phase}{fixture.group ? ` · Gruppe ${fixture.group}` : ''}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {fixture.homeTeam} <span className="text-slate-400">vs.</span> {fixture.awayTeam}
        </h1>
        <p className="text-[11px] leading-snug text-slate-400">
          {fmtDate(fixture.date)}{fixture.time && ` · ${fixture.time} (UTC)`} · 📍 {fixture.venue}
        </p>
      </header>

      {openPair ? (
        <section className="rounded-2xl border border-amber-500/40 bg-amber-950/15 p-4 text-sm text-amber-100">
          Eine der Mannschaften steht noch nicht fest — eine seriöse Prognose ist hier nicht möglich.
        </section>
      ) : prediction ? (
        <>
          <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Profi-Pick</h2>
            <p className="text-base font-bold text-white">
              {prediction.pick.winnerName}{' '}
              <span className="font-mono text-[12px] text-emerald-300">{prediction.pick.confidencePct} %</span>
            </p>
            <p className="text-[11px] leading-snug text-slate-400">
              {prediction.pick.clarity === 'strong' ? 'Klare Aussage — Modell überzeugt.'
                : prediction.pick.clarity === 'leaning' ? 'Leichte Tendenz, kein klarer Favorit.'
                : 'Offen — kein verlässlicher Tipp möglich.'}
            </p>
          </section>

          <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">1X2 reguläre Spielzeit</h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label={fixture.homeTeam} value={`${prediction.regular.homePct} %`} tone={prediction.regular.homePct >= 50 ? 'good' : 'neutral'} />
              <Stat label="Remis" value={`${prediction.regular.drawPct} %`} tone="neutral" />
              <Stat label={fixture.awayTeam} value={`${prediction.regular.awayPct} %`} tone={prediction.regular.awayPct >= 50 ? 'good' : 'neutral'} />
            </div>
            {fixture.phase !== 'Gruppe' && (
              <p className="text-[10.5px] leading-snug text-slate-500">
                Inkl. Verlängerung: {fixture.homeTeam} {prediction.withExtraTime.homePct} % · {fixture.awayTeam} {prediction.withExtraTime.awayPct} %.
              </p>
            )}
          </section>

          <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">xG-Modell &amp; Tor-Märkte</h2>
            <p className="text-[11px] leading-snug text-slate-300">
              Erwartete Tore: <span className="font-mono font-bold">{prediction.expectedGoals.home}</span> für {fixture.homeTeam},{' '}
              <span className="font-mono font-bold">{prediction.expectedGoals.away}</span> für {fixture.awayTeam}{' '}
              (Σ {prediction.expectedGoals.total}).
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Über 1,5" value={`${prediction.goalMarkets.over15} %`} tone={prediction.goalMarkets.over15 >= 75 ? 'good' : 'neutral'} />
              <Stat label="Über 2,5" value={`${prediction.goalMarkets.over25} %`} tone={prediction.goalMarkets.over25 >= 65 ? 'good' : 'neutral'} />
              <Stat label="BTTS" value={`${prediction.goalMarkets.btts} %`} tone={prediction.goalMarkets.btts >= 60 ? 'good' : 'neutral'} />
              <Stat label={`${fixture.homeTeam} CS`} value={`${prediction.goalMarkets.cleanSheetHome} %`} tone="neutral" />
            </div>
            <h3 className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Wahrscheinlichste Endergebnisse</h3>
            <ul className="grid grid-cols-3 gap-2">
              {prediction.topScorelines.map((s) => (
                <li key={s.score} className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center text-[12px] text-slate-100">
                  <div className="font-mono font-bold">{s.score}</div>
                  <div className="text-[9.5px] text-slate-500">{s.probability.toFixed(1)} %</div>
                </li>
              ))}
            </ul>
          </section>

          {markets.length > 0 && (
            <section className="space-y-2 rounded-2xl border border-emerald-400/40 bg-emerald-950/15 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">🛡️ Markt-Optionen mit ≥55 % Wahrscheinlichkeit</h2>
              <ul className="space-y-1">
                {markets.map((m) => {
                  const pct = Math.round(m.probability * 100);
                  const tone = pct >= 85 ? 'border-emerald-300/70 bg-emerald-400/20 text-emerald-100'
                    : pct >= 78 ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                    : pct >= 70 ? 'border-sky-400/40 bg-sky-500/10 text-sky-100'
                    : 'border-slate-700 bg-slate-900/60 text-slate-300';
                  return (
                    <li key={m.market} className={`grid grid-cols-[1fr_auto] items-baseline gap-2 rounded-md border px-2.5 py-1.5 text-[11px] ${tone}`}>
                      <div>
                        <div className="font-semibold">{m.market}</div>
                        <div className="text-[9.5px] opacity-80">{m.rationale}</div>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] font-bold">{pct} %</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Begründung der Engine</h2>
            <ul className="space-y-1 text-[11px] text-slate-300">
              {prediction.reasoning.map((r, i) => (
                <li key={i} className="leading-snug">• {r}</li>
              ))}
            </ul>
            {prediction.venueFactors.length > 0 && (
              <>
                <h3 className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Spielort-Faktoren</h3>
                <ul className="space-y-1 text-[11px] text-slate-300">
                  {prediction.venueFactors.map((v, i) => (
                    <li key={i} className="leading-snug">• {v}</li>
                  ))}
                </ul>
              </>
            )}
            <p className="text-[10px] leading-snug text-slate-500">
              Datenbasis-Sicherheit: {prediction.dataConfidence}/100. Wert &lt; 80 = mindestens eine Mannschaft ohne Profi-Daten, Prognose dann mit Vorsicht zu genießen.
            </p>
          </section>
        </>
      ) : null}

      <footer className="border-t border-slate-900 pt-4 text-[10px] leading-relaxed text-slate-600">
        Modell-Schätzungen aus ELO + Form-Index + xG + Spielort. Keine Garantien — Vergangenheit ≠ Zukunft.
      </footer>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'good' | 'bad' | 'neutral' }) {
  const cls = tone === 'good' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : tone === 'bad' ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
    : 'border-slate-700 bg-slate-950/40 text-slate-100';
  return (
    <div className={`rounded-lg border p-2 ${cls}`}>
      <div className="text-[9px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-bold">{value}</div>
    </div>
  );
}

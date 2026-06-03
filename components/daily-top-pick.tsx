import type { FirmaSynthesis } from '@/lib/sport/firma/synthesis';
import { ExtraTipsChips } from '@/components/extra-tips-chips';
import { TipSaveButton } from '@/components/tip-save-button';

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

function confidenceBand(conf: number): { label: string; tone: string; explanation: string } {
  if (conf >= 0.65) return { label: 'sicher', tone: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200', explanation: 'über der 65 %-Schwelle.' };
  if (conf >= 0.5) return { label: 'leichter Favorit', tone: 'border-sky-400/50 bg-sky-500/15 text-sky-200', explanation: 'Tendenz klar, aber unter der sicheren Schwelle.' };
  if (conf >= 0.4) return { label: 'leichter Trend', tone: 'border-amber-400/40 bg-amber-500/10 text-amber-200', explanation: 'es gibt eine Richtung, mehr nicht.' };
  return { label: 'offenes Spiel', tone: 'border-slate-700 bg-slate-900 text-slate-300', explanation: 'das Modell sieht keinen klaren Favoriten.' };
}

export function DailyTopPickCard({ synth }: { synth: FirmaSynthesis }) {
  const pick = synth.dailyTopPick;
  const curator = synth.dailyPickCurator;
  if (!pick) {
    return (
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Tipp des Tages</h2>
          <span className="text-[10px] text-slate-500">kuratiert von {curator.name}</span>
        </div>
        <p className="mt-1.5 text-[12px] leading-snug text-slate-400">
          Aktuell kein Spiel mit auswertbarer Form in den eingebundenen Ligen. Das ist meist die Sommerpause der europäischen Top-Ligen — schau morgen wieder rein, oder beobachte die Sommer-Ligen (MLS, Brasilien, Skandinavien, Japan, Australien) unter „Diese Woche“.
        </p>
      </section>
    );
  }
  const band = confidenceBand(pick.confidence);
  const pct = Math.round(pick.confidence * 100);
  const isSafety = pick.confidence >= synth.safetyPickThreshold;

  return (
    <section className="space-y-3 rounded-2xl border-2 border-emerald-400/40 bg-slate-900/40 p-4">
      <header className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Tipp des Tages</div>
          <h2 className="text-base font-bold text-white">{pick.fixture.homeTeam} <span className="text-slate-500">vs.</span> {pick.fixture.awayTeam}</h2>
        </div>
        <span className={`rounded-md border px-2 py-1 text-[10px] font-mono ${band.tone}`}>
          {pct}% · {band.label}
        </span>
      </header>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
        <div className="text-[13px] font-semibold text-slate-100">{pick.fixture.homeTeam}</div>
        <div className="rounded-md border border-emerald-400/50 bg-emerald-500/15 px-3 py-1">
          <div className="text-[9px] uppercase tracking-wider text-emerald-300">wahrscheinlichst</div>
          <div className="font-mono text-lg font-bold text-emerald-100">
            {pick.likelyScore.home} : {pick.likelyScore.away}
          </div>
        </div>
        <div className="text-[13px] font-semibold text-slate-100">{pick.fixture.awayTeam}</div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <ExtraTipsChips btts={pick.btts} over25={pick.over25} />
        <TipSaveButton
          fixtureId={pick.fixture.id}
          fixtureDate={pick.fixture.date}
          league={pick.leagueName}
          homeTeam={pick.fixture.homeTeam}
          awayTeam={pick.fixture.awayTeam}
          tier="custom"
          market={`Tipp des Tages: ${pick.likelyScore.home}:${pick.likelyScore.away} (${pick.pickPlain})`}
          modelProbabilityPct={pct}
        />
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[10.5px] text-slate-400">
        <span>{fmtDate(pick.fixture.date)}</span>
        {pick.fixture.time && <span>{fmtTime(pick.fixture.time, pick.fixture.date)}</span>}
        <span>· {pick.leagueName}</span>
        <span>· Tipp: <span className="font-mono text-emerald-300">{pick.pickPlain}</span></span>
      </div>

      {pick.fixture.prediction && (
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-[10px] text-slate-500">
          <span>Form Heim {pick.fixture.homeTeam}: {pick.fixture.prediction.homeForm.results.join(' · ') || '—'}</span>
          <span>Form Auswärts {pick.fixture.awayTeam}: {pick.fixture.prediction.awayForm.results.join(' · ') || '—'}</span>
        </div>
      )}

      <p className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 text-[10.5px] leading-snug text-slate-300">
        <span className="font-semibold text-slate-200">{curator.name}</span> hat das aus allen kommenden Spielen als bestes Setup rausgesucht.{' '}
        {isSafety
          ? `Es schafft die ≥ ${Math.round(synth.safetyPickThreshold * 100)} %-Schwelle und steht damit auch oben in der Top-Konfidenz-Liste.`
          : `Liegt unter der ${Math.round(synth.safetyPickThreshold * 100)} %-Konfidenz-Schwelle — ${band.explanation} Trotzdem die plausibelste verfügbare Begegnung für dein Tippspiel.`}
      </p>
    </section>
  );
}

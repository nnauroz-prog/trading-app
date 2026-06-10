// WM Backtest-Bericht: zeigt wie unser System auf 50+ echten Top-
// Laenderspielen aus WM 2022 KO, EM 2024 KO, Copa America 2024 KO,
// Nations League Finals und Freundschaftsspielen abgeschnitten haette.
//
// Wording strikt: keine "Bank", kein "sicher". Hit-Rate ehrlich pro
// Tier, klarer Look-Ahead-Disclaimer.

import { combinedBrier, type BacktestReport } from '@/lib/sport/wm-backtest-runner';

interface Props {
  report: BacktestReport;
}

function colorClass(hit: number | null, sample: number): string {
  if (hit === null || sample < 3) return 'border-slate-700 bg-slate-900/40 text-slate-300';
  if (hit >= 75) return 'border-emerald-400/60 bg-emerald-950/30 text-emerald-100';
  if (hit >= 60) return 'border-emerald-500/40 bg-emerald-950/15 text-emerald-200';
  if (hit >= 50) return 'border-amber-500/40 bg-amber-950/20 text-amber-100';
  return 'border-rose-500/40 bg-rose-950/20 text-rose-100';
}

const FACTOR_LABEL: Record<string, string> = {
  'acclimatization': 'Akklimatisierung',
  'altitude': 'Hoehenlage',
  'jetlag': 'Jetlag',
  'host-advantage': 'Gastgeber-Heimvorteil',
  'regional-crowd': 'Publikums-Sympathie',
  'hot-midday': 'Mittagshitze',
  'rest-days': 'Erholungstage',
  'weather': 'Live-Wetter'
};

export function WmBacktestReportCard({ report }: Props) {
  const totalPicks = report.picksHoechsteKonfluenz + report.picksModellFavorit;
  const overallBrier = combinedBrier(report);
  const overallCls = colorClass(report.hitRateCombinedPct, totalPicks);

  return (
    <section className={`space-y-3 rounded-2xl border-2 p-4 ${overallCls}`} aria-label="WM System-Backtest">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em]">System-Backtest gegen echte Spiele</h2>
        <span className="text-[10px] opacity-60">{report.totalMatches} Top-Laenderspiele · 2022–2024</span>
      </div>

      <p className="text-[11.5px] leading-snug opacity-90">
        Bevor Du heute live tippst: so haette unser System (Engine + Profi-Tipper-Agent + Umfeld-Faktoren) auf echten Spielen abgeschnitten. Datenbasis: WM 2022 KO, EM 2024 KO, Copa America 2024 KO, Nations League Finals, Top-Freundschaftsspiele 2023/2024.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded border border-slate-800/60 bg-slate-950/30 p-2">
          <div className="text-[9px] uppercase tracking-wider opacity-60">Picks gesamt</div>
          <div className="font-mono text-xl font-bold">{totalPicks}</div>
          <div className="text-[9.5px] opacity-60">{report.noPick} Spiele kein Pick</div>
        </div>
        <div className="rounded border border-emerald-500/30 bg-emerald-950/15 p-2">
          <div className="text-[9px] uppercase tracking-wider text-emerald-300/80">Hit-Rate gesamt</div>
          <div className="font-mono text-xl font-bold text-emerald-200">{report.hitRateCombinedPct ?? '—'}{report.hitRateCombinedPct !== null ? ' %' : ''}</div>
          {overallBrier !== null && <div className="text-[9.5px] text-emerald-200/70">Brier {overallBrier.toFixed(3)}</div>}
        </div>
        <div className={`rounded border p-2 ${colorClass(report.hitRateHoechsteKonfluenzPct, report.picksHoechsteKonfluenz)}`}>
          <div className="text-[9px] uppercase tracking-wider opacity-70">Hoechste Konfluenz</div>
          <div className="font-mono text-xl font-bold">{report.hitRateHoechsteKonfluenzPct ?? '—'}{report.hitRateHoechsteKonfluenzPct !== null ? ' %' : ''}</div>
          <div className="text-[9.5px] opacity-70">{report.picksHoechsteKonfluenz} Picks</div>
        </div>
        <div className={`rounded border p-2 ${colorClass(report.hitRateModellFavoritPct, report.picksModellFavorit)}`}>
          <div className="text-[9px] uppercase tracking-wider opacity-70">Modell-Favorit</div>
          <div className="font-mono text-xl font-bold">{report.hitRateModellFavoritPct ?? '—'}{report.hitRateModellFavoritPct !== null ? ' %' : ''}</div>
          <div className="text-[9.5px] opacity-70">{report.picksModellFavorit} Picks</div>
        </div>
      </div>

      <details className="rounded border border-slate-800/60 bg-slate-950/30 p-2">
        <summary className="cursor-pointer text-[10.5px] font-semibold uppercase tracking-wider opacity-70 hover:opacity-100">▸ Aufschluesselung pro Wettbewerb</summary>
        <ul className="mt-2 space-y-0.5 text-[10.5px]">
          {report.perCompetition.filter((c) => c.picks > 0).map((c) => (
            <li key={c.competition} className="grid grid-cols-[1fr_auto_auto] gap-2">
              <span className="truncate opacity-80">{c.competition}</span>
              <span className="font-mono opacity-60">{c.picks} Picks</span>
              <span className="font-mono font-bold">{c.hitRatePct ?? '—'}{c.hitRatePct !== null ? ' %' : ''}</span>
            </li>
          ))}
        </ul>
      </details>

      <details className="rounded border border-slate-800/60 bg-slate-950/30 p-2">
        <summary className="cursor-pointer text-[10.5px] font-semibold uppercase tracking-wider opacity-70 hover:opacity-100">▸ Wirkung pro Umfeld-Faktor</summary>
        <ul className="mt-2 space-y-0.5 text-[10.5px]">
          {report.factorImpact.filter((f) => f.picksWithFactor > 0).map((f) => (
            <li key={f.factorId} className="grid grid-cols-[1fr_auto_auto] gap-2">
              <span className="truncate opacity-80">{FACTOR_LABEL[f.factorId] ?? f.factorId}</span>
              <span className="font-mono opacity-60">{f.picksWithFactor} aktiv</span>
              <span className="font-mono font-bold">{f.hitRatePct ?? '—'}{f.hitRatePct !== null ? ' %' : ''}</span>
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-[9.5px] leading-snug opacity-60">
          Aktiv = Faktor hatte messbare Wirkung auf Pick (Tor-Multiplier oder ELO-Delta ungleich 0). Hit-Rate = Wins / (Wins+Losses) bei aktivem Faktor.
        </p>
      </details>

      <details className="rounded border border-slate-800/60 bg-slate-950/30 p-2">
        <summary className="cursor-pointer text-[10.5px] font-semibold uppercase tracking-wider opacity-70 hover:opacity-100">▸ Top {Math.min(report.topResults.length, 20)} Picks (nach Confidence)</summary>
        <ul className="mt-2 space-y-1 text-[10.5px]">
          {report.topResults.map((r) => (
            <li key={r.match.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded border border-slate-800/60 bg-slate-950/40 px-1.5 py-1">
              <span className={`rounded border px-1 py-0.5 text-[8.5px] font-bold uppercase tracking-wider ${r.outcome === 'treffer' ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200' : r.outcome === 'daneben' ? 'border-rose-400/60 bg-rose-500/15 text-rose-200' : 'border-slate-700 bg-slate-900 text-slate-300'}`}>
                {r.outcome === 'treffer' ? '✓' : r.outcome === 'daneben' ? '✗' : '='}
              </span>
              <span className="min-w-0 truncate">
                <span className="opacity-90">{r.match.homeTeam} – {r.match.awayTeam}</span>
                <span className="ml-1 opacity-60">{r.match.homeScore}:{r.match.awayScore}</span>
              </span>
              <span className="font-mono text-[9.5px] opacity-60">{r.confidencePct} %</span>
              <span className="text-[9px] opacity-50 truncate">{r.match.competition}</span>
            </li>
          ))}
        </ul>
      </details>

      <p className="rounded border border-amber-500/30 bg-amber-950/15 p-2 text-[10px] leading-snug text-amber-100">
        ⚠ {report.caveat}
      </p>
    </section>
  );
}

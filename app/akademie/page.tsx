import Link from 'next/link';
import { getCryptoNews } from '@/lib/news/news-agent';
import { runSpaeher, ScoredNews } from '@/lib/akademie/spaeher';
import { getLehrlingReport, VariantResult } from '@/lib/akademie/lehrling';
import { AkademieRecorder } from '@/components/akademie-recorder';
import { AkademieLog } from '@/components/akademie-log';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
}

function impactClasses(i: ScoredNews['impact']): string {
  if (i === 'bullish') return 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200';
  if (i === 'bearish') return 'border-rose-400/50 bg-rose-500/10 text-rose-200';
  return 'border-slate-700 bg-slate-900 text-slate-300';
}

function impactLabel(i: ScoredNews['impact']): string {
  if (i === 'bullish') return 'BULLISCH';
  if (i === 'bearish') return 'BÄRISCH';
  return 'NEUTRAL';
}

function NewsRow({ item }: { item: ScoredNews }) {
  return (
    <li className="space-y-1 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-slate-100 hover:text-emerald-300">
          {item.title}
        </a>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${impactClasses(item.impact)}`}>
            {impactLabel(item.impact)}
          </span>
          <span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
            {item.score}/100
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-baseline gap-2 text-[10px] text-slate-500">
        <span>{item.source}</span>
        <span>·</span>
        <span>{fmtTime(item.publishedAt)}</span>
        {item.mentionedCoins.length > 0 && (
          <>
            <span>·</span>
            <span className="font-mono text-slate-300">{item.mentionedCoins.join(' · ')}</span>
          </>
        )}
      </div>
      {item.reasons.length > 0 && (
        <p className="text-[10px] text-slate-500">Späher-Notiz: {item.reasons.join('; ')}.</p>
      )}
    </li>
  );
}

function VariantRow({ v }: { v: VariantResult }) {
  const tone =
    v.isBest ? 'border-emerald-400/60 bg-emerald-950/30' :
    v.isDefault ? 'border-amber-400/40 bg-amber-950/20' :
    'border-slate-800 bg-slate-950/40';
  return (
    <li className={`grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 rounded-lg border px-3 py-2 text-[11px] ${tone}`}>
      <div className="flex flex-col">
        {v.isBest && <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300">BESTE</span>}
        {v.isDefault && <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300">AKTIV</span>}
      </div>
      <div className="font-mono text-slate-200">
        <span className="text-slate-500">Konfluenz </span>{v.params.minConfluence}
        <span className="ml-2 text-slate-500">Stop </span>{v.params.stopAtrMult.toFixed(1)}×ATR
        <span className="ml-2 text-slate-500">Ziel </span>{v.params.tp1AtrMult.toFixed(1)}×ATR
      </div>
      <div className="text-right">
        <div className="text-[9px] uppercase tracking-wider text-slate-500">Trades</div>
        <div className="font-mono text-slate-100">{v.totalTrades}</div>
      </div>
      <div className="text-right">
        <div className="text-[9px] uppercase tracking-wider text-slate-500">Treffer</div>
        <div className="font-mono text-slate-100">{v.winRatePct.toFixed(1)}%</div>
      </div>
      <div className="text-right">
        <div className="text-[9px] uppercase tracking-wider text-slate-500">Netto</div>
        <div className={`font-mono ${v.netReturnPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{v.netReturnPct >= 0 ? '+' : ''}{v.netReturnPct.toFixed(1)}%</div>
      </div>
    </li>
  );
}

export default async function AkademiePage() {
  const [newsItems, lehrling] = await Promise.all([getCryptoNews(), getLehrlingReport()]);
  const spaeher = runSpaeher(newsItems);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Signal Desk
      </Link>

      <header className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400">Akademie</div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Zwei Lern-Agenten, eine Spielwiese</h1>
        <p className="text-sm text-slate-400">
          Hier arbeiten zwei Agenten unabhängig voneinander: der <span className="text-white">Späher</span> liest die Nachrichten und bewertet sie nach Trading-Relevanz, der <span className="text-white">Lehrling</span> probiert systematisch Strategie-Varianten aus und merkt sich, welche am besten funktioniert hat. <span className="text-amber-400/80">Ehrlich gesagt: das ist Heuristik + Grid-Search, kein Machine Learning</span> — aber die Agenten probieren, vergleichen und führen Buch.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Späher — News-Bewertung</h2>
            <p className="mt-1 text-[11px] text-slate-500">Bewertet jeden Headline nach: Coin-Erwähnung · bullische/bärische Wörter · Schwergewicht-Themen (ETF, SEC, Fed) · Frische · Quellenqualität.</p>
          </div>
          <span className="rounded border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-200">
            {spaeher.items.length} Headlines
          </span>
        </div>

        <p className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-[12px] text-slate-200">{spaeher.summary}</p>

        {spaeher.items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-4 text-center text-[12px] text-slate-500">
            Späher findet keine Nachrichten — Feeds sind aktuell still oder offline.
          </p>
        ) : (
          <ul className="space-y-2">
            {spaeher.items.map((item) => (
              <NewsRow key={item.link} item={item} />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Lehrling — Strategie-Sweep</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              Probiert {lehrling.totalVariantsTried} Parameter-Varianten (Konfluenz-Schwelle, Stop-Abstand, Ziel-Abstand) gegen {lehrling.periodDays} Tage BTC/ETH/SOL-Geschichte. Sortiert nach Erwartungswert pro Trade.
            </p>
          </div>
          {lehrling.best && (
            <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
              Beste: {lehrling.best.netReturnPct >= 0 ? '+' : ''}{lehrling.best.netReturnPct.toFixed(1)}%
            </span>
          )}
        </div>

        {lehrling.best && lehrling.baseline && lehrling.best.id !== lehrling.baseline.id && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3 text-[11px] text-emerald-100">
            <span className="font-bold">Lehrling-Erkenntnis:</span> die beste Variante hätte {(lehrling.best.netReturnPct - lehrling.baseline.netReturnPct).toFixed(1)}%-Punkte mehr gebracht als die aktuell aktive Konfiguration ({lehrling.best.totalTrades} vs {lehrling.baseline.totalTrades} Trades).
          </div>
        )}

        {lehrling.variants.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-4 text-center text-[12px] text-slate-500">
            Lehrling konnte keine Daten holen — Backtest offline.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {lehrling.variants.map((v) => (
              <VariantRow key={v.id} v={v} />
            ))}
          </ul>
        )}

        <p className="text-[10px] text-slate-500">
          Vergangenheit ≠ Zukunft. Selbst die beste Variante hat keine Garantie — sie ist nur die, die in den letzten {lehrling.periodDays} Tagen den höchsten Erwartungswert gehabt hätte. Neuauswertung stündlich.
        </p>
      </section>

      <AkademieRecorder lehrling={lehrling} spaeher={spaeher} />
      <AkademieLog />

      <p className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-3 text-[10px] leading-relaxed text-slate-500">
        Honesty-Check: keiner der beiden Agenten ist „schlauer als jeder Trader“. Der Späher folgt einer Stichwortliste, der Lehrling testet ein 18-Varianten-Raster. Was sie aber wirklich tun: konsistent, transparent, ohne Emotion. Genau dafür ist eine Spielwiese da.
      </p>
    </main>
  );
}

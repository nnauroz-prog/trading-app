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
        <Link href={`/news/${item.id}`} className="text-[13px] font-medium text-slate-100 hover:text-emerald-300">
          {item.title}
        </Link>
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
    v.isBest && v.isRobust ? 'border-emerald-400/60 bg-emerald-950/30' :
    v.isBest ? 'border-amber-400/60 bg-amber-950/20' :
    v.isDefault ? 'border-amber-400/40 bg-amber-950/10' :
    'border-slate-800 bg-slate-950/40';
  return (
    <li className={`space-y-1.5 rounded-lg border p-3 text-[11px] ${tone}`}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          {v.isBest && <span className="rounded border border-emerald-400/50 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-200">BESTE</span>}
          {v.isDefault && <span className="rounded border border-amber-400/50 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200">AKTIV</span>}
          {v.isRobust && <span title="Hat im Üb- UND Prüf-Zeitraum funktioniert." className="rounded border border-emerald-400/50 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-200">hält im Test</span>}
          {!v.isRobust && <span title="Funktionierte im Üben, fiel im Prüf-Zeitraum ab." className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">nur im Üben</span>}
        </div>
        <div className="font-mono text-slate-300">
          <span className="text-slate-500">Konfluenz </span>{v.params.minConfluence}
          <span className="ml-2 text-slate-500">Stop </span>{v.params.stopAtrMult.toFixed(1)}×
          <span className="ml-2 text-slate-500">Ziel </span>{v.params.tp1AtrMult.toFixed(1)}×
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-slate-800 bg-slate-950/60 p-2">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Üben (ältere Hälfte)</div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className={`font-mono ${v.train.netReturnPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {v.train.netReturnPct >= 0 ? '+' : ''}{v.train.netReturnPct.toFixed(1)}%
            </span>
            <span className="font-mono text-slate-500">{v.train.totalTrades} Trades · {v.train.winRatePct.toFixed(0)}%</span>
          </div>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-950/60 p-2">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Prüfen (neuere Hälfte, der ehrliche Test)</div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className={`font-mono ${v.test.netReturnPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {v.test.netReturnPct >= 0 ? '+' : ''}{v.test.netReturnPct.toFixed(1)}%
            </span>
            <span className="font-mono text-slate-500">{v.test.totalTrades} Trades · {v.test.winRatePct.toFixed(0)}%</span>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-slate-500">{v.robustnessReason}</p>
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
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Zwei Hilfs-Agenten, die im Hintergrund arbeiten</h1>
        <p className="text-sm text-slate-400">
          Du musst hier nichts tun. Zwei Agenten arbeiten für dich: Der <span className="text-white">Späher</span> liest jede Stunde Krypto-Nachrichten und gibt jeder Schlagzeile eine Wichtigkeits-Note. Der <span className="text-white">Lehrling</span> probiert verschiedene Strategie-Einstellungen aus und schaut, welche in der Vergangenheit am besten gelaufen wäre. Die Ergebnisse fließen oben auf der Startseite still ein — diese Seite zeigt dir nur, was die beiden gerade rechnen.
        </p>
        <details className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[11px] text-slate-400">
          <summary className="cursor-pointer text-slate-300">Was bringt mir das konkret?</summary>
          <ul className="mt-2 list-disc space-y-1 pl-4 leading-relaxed">
            <li>Der Späher schiebt Coins, die heute überproportional in den News stehen, auf der Startseite in den „Schon gelaufen“ oder „Angst war übertrieben“-Block.</li>
            <li>Der Lehrling sagt dir täglich, ob die aktuelle Strategie-Einstellung der App in den letzten 60 Tagen wirklich Edge hatte — oder ob sie eigentlich überholt wäre.</li>
            <li>Beides sind <span className="text-amber-400/80">keine Garantien</span>. Es sind Heuristiken, die einem disziplinierten Trader dabei helfen, schlechte Entscheidungen zu vermeiden.</li>
          </ul>
        </details>
      </header>

      <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
        <div className="space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Späher — News-Bewertung</h2>
          <p className="text-[11px] text-slate-500">
            Liest fünf deutsche Krypto-Newsfeeds und gibt jeder Schlagzeile 0–100 Punkte. Punkte gibt es für: erwähnte Coins, bullische oder bärische Wörter, Schwergewicht-Themen (ETF, Fed, SEC), Frische und Quellen-Qualität.
          </p>
        </div>

        <p className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-[12px] text-slate-200">{spaeher.summary}</p>

        {spaeher.items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-4 text-center text-[12px] text-slate-500">
            Späher findet keine Nachrichten — Feeds sind aktuell still oder offline.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {spaeher.items.slice(0, 5).map((item) => (
                <NewsRow key={item.link} item={item} />
              ))}
            </ul>
            {spaeher.items.length > 5 && (
              <details className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[11px]">
                <summary className="cursor-pointer text-slate-300">Weitere {spaeher.items.length - 5} Schlagzeilen anzeigen</summary>
                <ul className="mt-2 space-y-2">
                  {spaeher.items.slice(5).map((item) => (
                    <NewsRow key={item.link} item={item} />
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
        <div className="space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Lehrling — Strategie-Tüfteln</h2>
          <p className="text-[11px] text-slate-500">
            Der Lehrling probiert {lehrling.totalVariantsTried} verschiedene Strategie-Einstellungen aus und schaut, wie sie sich auf den letzten {lehrling.periodDays} Tagen BTC/ETH/SOL geschlagen hätten. Dabei teilt er die Daten in zwei Hälften: die ersten {lehrling.trainDays} Tage zum „Üben“, die letzten {lehrling.testDays} Tage zum „Prüfen“ (das ist der ehrliche Test — die App kennt diese Daten beim Üben nicht). Nur Einstellungen, die in beiden Hälften funktioniert haben, sind <span className="text-emerald-300">robust</span>.
          </p>
        </div>

        {/* The headline summary — what does the Lehrling actually say today? */}
        <div className={`rounded-lg border-2 p-3 text-[12px] ${lehrling.robustCount > 0 ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-100' : 'border-amber-500/40 bg-amber-950/20 text-amber-100'}`}>
          <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Heute sagt der Lehrling</div>
          <p className="leading-relaxed">{lehrling.honestNote}</p>
        </div>

        {/* The single most important variant, plain-language */}
        {lehrling.best && (
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-[12px] text-slate-200">
            <div className="mb-1 flex items-baseline gap-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Aktuelle Top-Einstellung</span>
              <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${lehrling.best.isRobust ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 bg-slate-900 text-slate-400'}`}>
                {lehrling.best.isRobust ? 'robust' : 'fragil'}
              </span>
            </div>
            <p className="leading-relaxed">
              Mindestens <span className="font-mono text-white">{lehrling.best.params.minConfluence} von 12 Häkchen</span> als Einstiegs-Schwelle, Stop bei <span className="font-mono text-white">{lehrling.best.params.stopAtrMult.toFixed(1)}× der durchschnittlichen Tagesschwankung</span>, Gewinn-Ziel bei <span className="font-mono text-white">{lehrling.best.params.tp1AtrMult.toFixed(1)}×</span>. Im Prüf-Zeitraum: {lehrling.best.test.totalTrades} Trades, {lehrling.best.test.winRatePct.toFixed(0)}% getroffen, <span className={lehrling.best.test.netReturnPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{lehrling.best.test.netReturnPct >= 0 ? '+' : ''}{lehrling.best.test.netReturnPct.toFixed(1)}%</span> netto.
            </p>
          </div>
        )}

        <details className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[11px] text-slate-400">
          <summary className="cursor-pointer text-slate-300">Was heißt robust / fragil?</summary>
          <p className="mt-2 leading-relaxed">
            <span className="text-emerald-300">Robust</span> = die Einstellung war im Üb-Zeitraum profitabel UND ist im Prüf-Zeitraum profitabel geblieben (mindestens 3 Trades in beiden Hälften, Prüf-Ergebnis ≥ Hälfte des Üb-Ergebnisses).
            <br />
            <span className="text-slate-300">Fragil</span> = die Einstellung sah im Üb-Zeitraum gut aus, ist im Prüf-Zeitraum eingebrochen. Klassisches Überanpassen — sieht in der Vergangenheit toll aus, hält in der Gegenwart nicht. <span className="text-slate-500">Dass viele oder alle Varianten fragil sind, ist normal — das ist die ehrliche Aussage: dieses Setup hatte zuletzt keinen stabilen Edge.</span>
          </p>
        </details>

        <details className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[11px] text-slate-400">
          <summary className="cursor-pointer text-slate-300">Alle {lehrling.totalVariantsTried} Varianten ansehen (für Tüftler)</summary>
          <ul className="mt-2 space-y-1.5">
            {lehrling.variants.map((v) => (
              <VariantRow key={v.id} v={v} />
            ))}
          </ul>
        </details>

        <p className="text-[10px] text-slate-500">
          Vergangenheit ≠ Zukunft. Selbst eine robuste Variante kann morgen schlechter laufen. Neuauswertung stündlich.
        </p>
      </section>

      <AkademieRecorder lehrling={lehrling} spaeher={spaeher} />
      <AkademieLog />
    </main>
  );
}

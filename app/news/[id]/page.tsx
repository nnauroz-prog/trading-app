import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCryptoNews, linkFromNewsId } from '@/lib/news/news-agent';
import { runSpaeher, scoreNewsItem } from '@/lib/akademie/spaeher';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
}

function impactClasses(impact: 'bullish' | 'bearish' | 'neutral'): string {
  if (impact === 'bullish') return 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200';
  if (impact === 'bearish') return 'border-rose-400/50 bg-rose-500/10 text-rose-200';
  return 'border-slate-700 bg-slate-900 text-slate-300';
}

function impactPlain(impact: 'bullish' | 'bearish' | 'neutral'): string {
  if (impact === 'bullish') return 'eher bullisch';
  if (impact === 'bearish') return 'eher bärisch';
  return 'neutral';
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewsDetailPage({ params }: PageProps) {
  const { id } = await params;
  const newsItems = await getCryptoNews();
  const item = newsItems.find((n) => n.id === id);

  if (!item) {
    // Fall back to the URL decoded from the id — the article might have rolled
    // off the cache but the link is still valid.
    const link = (() => { try { return linkFromNewsId(id); } catch { return null; } })();
    if (!link) notFound();
    return (
      <main className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
        <Link href="/akademie" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
          ← zurück zur Akademie
        </Link>
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Schlagzeile nicht mehr im Speicher</h1>
          <p className="text-sm text-slate-400">
            Diese News ist aus dem 10-Minuten-Cache gerollt. Du kannst das Original beim Anbieter lesen:
          </p>
          <a href={link!} target="_blank" rel="noopener noreferrer" className="inline-block break-all rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-[12px] text-emerald-300 hover:border-emerald-400/50">
            {link}
          </a>
        </header>
      </main>
    );
  }

  const scored = scoreNewsItem(item);
  const spaeher = runSpaeher(newsItems);
  const myCoins = scored.mentionedCoins;
  const coinSentimentsRelevant = spaeher.perCoin.filter((c) => myCoins.includes(c.coin));

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <Link href="/akademie" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zur Akademie
      </Link>

      <header className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400">News-Zusammenfassung</div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{item.title}</h1>
        <div className="flex flex-wrap items-baseline gap-2 text-[11px] text-slate-500">
          <span className="font-mono text-slate-300">{item.source}</span>
          <span>·</span>
          <span>{fmtTime(item.publishedAt)}</span>
        </div>
      </header>

      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Späher-Einordnung</span>
          <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${impactClasses(scored.impact)}`}>
            {impactPlain(scored.impact)}
          </span>
          <span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
            Relevanz {scored.score}/100
          </span>
        </div>
        {scored.reasons.length > 0 && (
          <p className="text-[12px] text-slate-300">
            Warum: {scored.reasons.join('; ')}.
          </p>
        )}
        {myCoins.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Erwähnte Coins</div>
            <div className="flex flex-wrap gap-1.5">
              {myCoins.map((c) => {
                const sentiment = coinSentimentsRelevant.find((s) => s.coin === c);
                return (
                  <span key={c} className="rounded border border-slate-700 bg-slate-950/40 px-2 py-0.5 font-mono text-[11px] text-slate-200">
                    {c}{sentiment && sentiment.tilt !== 'neutral' && (
                      <span className={`ml-1 ${sentiment.tilt === 'bullisch' ? 'text-emerald-300' : 'text-rose-300'}`}>
                        ({sentiment.tilt} heute · {sentiment.bullishCount}↑/{sentiment.bearishCount}↓)
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {item.description && (
        <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Zusammenfassung</div>
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-slate-200">
            {item.description}
          </p>
        </section>
      )}

      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Was heißt das für mich?</div>
        <ul className="space-y-1 text-[12px] text-slate-300">
          {scored.impact === 'bullish' && myCoins.length > 0 && (
            <li>· Bullische Schlagzeile zu {myCoins.join(', ')} — wenn der Kurs heute schon stark gelaufen ist, taucht der Coin auf der Startseite als „Schon gelaufen“ auf (= nicht hinterherjagen).</li>
          )}
          {scored.impact === 'bearish' && myCoins.length > 0 && (
            <li>· Bärische Schlagzeile zu {myCoins.join(', ')} — der News-Watcher in jeder Firma wird das morgen früh berücksichtigen; Konservativ blockt einen Kauf hart, wenn der Coin-Sentiment-Bias bestehen bleibt.</li>
          )}
          {scored.impact === 'neutral' && (
            <li>· Diese Schlagzeile ist statistisch unspezifisch — kein Coin-spezifisches Signal, keine Schwergewicht-Wörter wie ETF, Fed oder SEC. Der Späher zeigt sie nur, weil sie frisch ist.</li>
          )}
          {scored.score < 30 && (
            <li>· Niedrige Relevanz: für deine Trading-Entscheidung kannst du diese News getrost überlesen.</li>
          )}
          {scored.score >= 60 && (
            <li>· Hohe Relevanz — diese Schlagzeile fließt mit Gewicht in den Späher-Tagesbericht ein.</li>
          )}
        </ul>
      </section>

      <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-[12px] text-slate-300 hover:border-emerald-400/40 hover:text-emerald-300">
        Original beim Anbieter öffnen →
      </a>

      <p className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-3 text-[10px] leading-relaxed text-slate-500">
        Die Zusammenfassung kommt direkt aus dem RSS-Feed des Anbieters — meist ein redaktioneller Anriss. Die Späher-Einordnung berechnet die App selbst aus Stichwortlisten. Beides keine Garantie — wenn dir die Schlagzeile wichtig ist, lies das Original.
      </p>
    </main>
  );
}

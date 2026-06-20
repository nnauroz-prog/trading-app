import type { Metadata } from 'next';
import Link from 'next/link';
import { getCryptoNews } from '@/lib/news/news-agent';
import { runSpaeher, ScoredNews } from '@/lib/akademie/spaeher';

export const metadata: Metadata = {
  title: 'Krypto-News mit Impact-Bewertung',
  description: 'Alle Krypto-Schlagzeilen, bewertet vom Spaeher-Agenten. Bullisch, baerisch, neutral — auf einen Blick.'
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
}

function impactClasses(impact: ScoredNews['impact']): string {
  if (impact === 'bullish') return 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200';
  if (impact === 'bearish') return 'border-rose-400/50 bg-rose-500/10 text-rose-200';
  return 'border-slate-700 bg-slate-900 text-slate-300';
}

function impactPlain(impact: ScoredNews['impact']): string {
  if (impact === 'bullish') return 'bullisch';
  if (impact === 'bearish') return 'bärisch';
  return 'neutral';
}

interface PageProps {
  searchParams: Promise<{ coin?: string; impact?: string; source?: string }>;
}

export default async function NewsIndexPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filterCoin = params.coin?.toUpperCase();
  const filterImpact = params.impact;
  const filterSource = params.source;

  const newsItems = await getCryptoNews();
  const spaeher = runSpaeher(newsItems);

  const allSources = Array.from(new Set(spaeher.items.map((i) => i.source))).sort();
  const allCoins = Array.from(new Set(spaeher.items.flatMap((i) => i.mentionedCoins))).sort();

  let visible = spaeher.items;
  if (filterCoin) visible = visible.filter((i) => i.mentionedCoins.includes(filterCoin));
  if (filterImpact === 'bullish' || filterImpact === 'bearish' || filterImpact === 'neutral') {
    visible = visible.filter((i) => i.impact === filterImpact);
  }
  if (filterSource) visible = visible.filter((i) => i.source === filterSource);

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Signal Desk
      </Link>

      <header className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400">Nachrichten</div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Alle Schlagzeilen, bewertet vom Späher</h1>
        <p className="text-sm text-slate-400">
          Sortiert nach Relevanz (nicht nach Datum). Jede Schlagzeile bleibt beim Klick in der App und zeigt eine Zusammenfassung, die Späher-Einordnung und was die News für deine Trading-Entscheidung bedeutet.
        </p>
      </header>

      {/* Sentiment-Überblick */}
      <section className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 text-center text-[11px]">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Bullisch</div>
          <div className="mt-1 font-mono text-lg font-bold text-emerald-300">{spaeher.items.filter((i) => i.impact === 'bullish').length}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Bärisch</div>
          <div className="mt-1 font-mono text-lg font-bold text-rose-300">{spaeher.items.filter((i) => i.impact === 'bearish').length}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Neutral</div>
          <div className="mt-1 font-mono text-lg font-bold text-slate-300">{spaeher.items.filter((i) => i.impact === 'neutral').length}</div>
        </div>
      </section>

      {/* Filter */}
      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Filter</div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-[10px] text-slate-500">Stimmung:</span>
            <FilterChip label="alle" href="/news" active={!filterImpact} />
            <FilterChip label="bullisch" href={buildHref({ ...params, impact: 'bullish' })} active={filterImpact === 'bullish'} />
            <FilterChip label="bärisch" href={buildHref({ ...params, impact: 'bearish' })} active={filterImpact === 'bearish'} />
            <FilterChip label="neutral" href={buildHref({ ...params, impact: 'neutral' })} active={filterImpact === 'neutral'} />
          </div>
          {allCoins.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-[10px] text-slate-500">Coin:</span>
              <FilterChip label="alle" href={buildHref({ ...params, coin: undefined })} active={!filterCoin} />
              {allCoins.map((c) => (
                <FilterChip key={c} label={c} href={buildHref({ ...params, coin: c })} active={filterCoin === c} />
              ))}
            </div>
          )}
          {allSources.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-[10px] text-slate-500">Quelle:</span>
              <FilterChip label="alle" href={buildHref({ ...params, source: undefined })} active={!filterSource} />
              {allSources.map((s) => (
                <FilterChip key={s} label={s} href={buildHref({ ...params, source: s })} active={filterSource === s} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* News-Liste */}
      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-center text-[12px] text-slate-500">
          Keine Schlagzeilen für diese Filter — Filter zurücksetzen oder später nochmal probieren.
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => (
            <li key={item.id}>
              <Link
                href={`/news/${item.id}`}
                className="block space-y-1.5 rounded-lg border border-slate-800 bg-slate-950/40 p-3 transition hover:border-emerald-500/40"
              >
                <p className="text-[14px] font-semibold leading-snug text-slate-100">{item.title}</p>
                <div className="flex flex-wrap items-baseline gap-2 text-[10px] text-slate-500">
                  <span className="font-mono text-slate-400">{item.source}</span>
                  <span>·</span>
                  <span>{fmtTime(item.publishedAt)}</span>
                  <span>·</span>
                  <span className={`rounded border px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider ${impactClasses(item.impact)}`}>
                    {impactPlain(item.impact)}
                  </span>
                  <span className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5 font-mono text-[9px] text-slate-300">
                    {item.score}/100
                  </span>
                  {item.mentionedCoins.length > 0 && (
                    <>
                      <span>·</span>
                      <span className="font-mono text-slate-300">{item.mentionedCoins.join(' · ')}</span>
                    </>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] transition ${active ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600'}`}
    >
      {label}
    </Link>
  );
}

function buildHref(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') search.set(k, v);
  }
  const qs = search.toString();
  return qs ? `/news?${qs}` : '/news';
}

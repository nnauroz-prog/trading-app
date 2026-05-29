import { NewsItem } from '@/lib/news/news-agent';

function timeAgo(ms: number): string {
  const diffMin = Math.floor((Date.now() - ms) / 60_000);
  if (diffMin < 1) return 'gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `vor ${hours} Std`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days === 1 ? '' : 'en'}`;
}

export function NewsFeed({ items }: { items: NewsItem[] }) {
  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Aktuelle Krypto-News</div>
        <p className="mt-1 text-xs text-slate-500">News werden geladen … (gleich verfügbar).</p>
      </section>
    );
  }

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5" aria-label="Aktuelle Krypto-News">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Aktuelle Krypto-News</h2>
        <span className="text-[10px] text-slate-500">Automatisch, nach Aktualität sortiert</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((n) => (
          <li key={n.link}>
            <a
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 transition hover:border-emerald-500/40"
            >
              <p className="text-[13px] font-semibold leading-snug text-slate-100">{n.title}</p>
              <p className="mt-1 text-[10px] text-slate-500">
                <span className="text-slate-400">{n.source}</span> · {timeAgo(n.publishedAt)}
              </p>
            </a>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-slate-500">
        Aggregiert aus öffentlichen RSS-Feeds (CoinDesk, Cointelegraph, Decrypt, The Block). Keine Anlageberatung — News bewegen Märkte, aber Reaktion ist nie garantiert.
      </p>
    </section>
  );
}

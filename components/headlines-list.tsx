import { Headline } from '@/lib/providers/sentiment';

const badgeByClassification: Record<Headline['classification'], string> = {
  positive: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  negative: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  neutral: 'border-slate-700 bg-slate-900 text-slate-400'
};

const labelByClassification: Record<Headline['classification'], string> = {
  positive: '+',
  negative: '-',
  neutral: '·'
};

export function HeadlinesList({ headlines }: { headlines: Headline[] }) {
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">News (letzte 7 Tage)</h2>
      {headlines.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
          Keine Headlines verfügbar. Setze <code className="text-slate-300">FINNHUB_API_KEY</code> oder versuche es später.
        </p>
      ) : (
        <ul className="space-y-2">
          {headlines.map((h, idx) => (
            <li key={`${h.url}-${idx}`} className="rounded-lg border border-slate-800/60 bg-slate-950/60 p-3 transition hover:border-slate-700">
              <div className="mb-1 flex items-center gap-2">
                <span className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold ${badgeByClassification[h.classification]}`}>
                  {labelByClassification[h.classification]}
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  {h.source}{h.datetime ? ` · ${new Date(h.datetime * 1000).toISOString().slice(0, 10)}` : ''}
                </span>
              </div>
              {h.url ? (
                <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-200 hover:text-emerald-300 hover:underline">{h.headline}</a>
              ) : (
                <p className="text-sm text-slate-300">{h.headline}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import { Headline } from '@/lib/providers/sentiment';

const badgeByClassification: Record<Headline['classification'], string> = {
  positive: 'bg-emerald-600/30 text-emerald-300',
  negative: 'bg-rose-700/30 text-rose-300',
  neutral: 'bg-slate-700/40 text-slate-300'
};

const labelByClassification: Record<Headline['classification'], string> = {
  positive: '+',
  negative: '-',
  neutral: '·'
};

export function HeadlinesList({ headlines }: { headlines: Headline[] }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 font-semibold">News (letzte 7 Tage)</h2>
      {headlines.length === 0 ? (
        <p className="text-sm text-slate-400">Keine Headlines verfügbar. Setze FINNHUB_API_KEY oder versuche es später.</p>
      ) : (
        <ul className="space-y-3">
          {headlines.map((h, idx) => (
            <li key={`${h.url}-${idx}`} className="rounded-lg bg-slate-950 p-3">
              <div className="mb-1 flex items-center gap-2">
                <span className={`rounded px-1.5 text-xs font-mono ${badgeByClassification[h.classification]}`}>
                  {labelByClassification[h.classification]}
                </span>
                <span className="text-xs text-slate-400">
                  {h.source}{h.datetime ? ` · ${new Date(h.datetime * 1000).toISOString().slice(0, 10)}` : ''}
                </span>
              </div>
              {h.url ? (
                <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline">{h.headline}</a>
              ) : (
                <p className="text-sm">{h.headline}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

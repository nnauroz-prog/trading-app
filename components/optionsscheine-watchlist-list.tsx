'use client';

import { useEffect, useState } from 'react';
import {
  loadOptionsscheineWatchlist,
  removeOptionsscheinFromWatchlist,
  updateOptionsscheinNote,
  OPTIONSSCHEINE_WATCHLIST_CHANGED_EVENT,
  type OptionsscheineWatchlistItem
} from '@/lib/optionsscheine/watchlist';
import { analyzeOptionsscheinInput } from '@/lib/optionsscheine/analyze';

const RISK_TONE: Record<string, string> = {
  'Niedrigstes Risiko': 'border-emerald-400/50 text-emerald-200',
  'Niedriges Risiko': 'border-emerald-400/40 text-emerald-200',
  'Mittleres Risiko': 'border-amber-400/40 text-amber-200',
  'Hohes Risiko': 'border-rose-400/40 text-rose-200',
  'Sehr hohes Risiko': 'border-rose-500/60 text-rose-200',
  'Unbekanntes Risiko': 'border-slate-700 text-slate-200'
};

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function OptionsscheineWatchlistList() {
  const [items, setItems] = useState<OptionsscheineWatchlistItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setItems(loadOptionsscheineWatchlist());
    sync();
    setMounted(true);
    window.addEventListener(OPTIONSSCHEINE_WATCHLIST_CHANGED_EVENT, sync);
    return () => window.removeEventListener(OPTIONSSCHEINE_WATCHLIST_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Watchlist</h2>
        <p className="mt-1 text-[11.5px] leading-snug text-slate-400">
          Noch keine Optionsscheine gespeichert. Trage oben einen Schein ein und klicke &bdquo;+ auf Watchlist&ldquo; — die Eintraege bleiben lokal im Browser, kein Account noetig.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Watchlist · {items.length}</h2>
        <span className="text-[9.5px] text-slate-500">lokal im Browser</span>
      </header>
      <ul className="space-y-2">
        {items.map((item) => <WatchlistRow key={item.id} item={item} />)}
      </ul>
    </section>
  );
}

function WatchlistRow({ item }: { item: OptionsscheineWatchlistItem }) {
  const [noteDraft, setNoteDraft] = useState(item.note ?? '');
  const [editing, setEditing] = useState(false);

  const analysis = analyzeOptionsscheinInput({
    underlyingName: item.underlyingName,
    underlyingPrice: item.underlyingPrice,
    strike: item.strike,
    direction: item.direction,
    wkn: item.wkn,
    isin: item.isin,
    expiryIso: item.expiryIso,
    knockOut: item.knockOut,
    premiumQuoted: item.premiumQuoted,
    ratio: item.ratio
  });

  return (
    <li className="space-y-1.5 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={`rounded border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${item.direction === 'call' ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200' : 'border-rose-400/50 bg-rose-500/10 text-rose-200'}`}>
              {item.direction}
            </span>
            <span className="truncate text-[12.5px] font-semibold text-slate-100">{item.underlyingName}</span>
            {item.knockOut && (
              <span className="rounded border border-rose-500/50 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-200">KO</span>
            )}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">
            Strike <span className="font-mono text-slate-300">{item.strike}</span>
            {item.expiryIso && <> · Verfall <span className="font-mono text-slate-300">{item.expiryIso}</span></>}
            {item.wkn && <> · WKN <span className="font-mono text-slate-300">{item.wkn}</span></>}
            {item.ratio && item.ratio !== 1 && <> · Ratio <span className="font-mono text-slate-300">{item.ratio}:1</span></>}
          </div>
        </div>
        {analysis && (
          <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${RISK_TONE[analysis.riskClass]}`}>
            {analysis.riskClass.replace(' Risiko', '')}
          </span>
        )}
      </div>

      {analysis && (
        <div className="grid grid-cols-2 gap-1.5 text-[10.5px] sm:grid-cols-4">
          <MiniStat label="Moneyness" value={analysis.moneyness.classification.toUpperCase()} />
          <MiniStat label="Delta" value={analysis.estimatedDelta?.toFixed(2) ?? '—'} />
          <MiniStat
            label={analysis.effectiveLeverage ? 'Markt-Hebel' : 'Modell-Hebel'}
            value={
              analysis.effectiveLeverage !== null
                ? `${analysis.effectiveLeverage.toFixed(1)}×`
                : analysis.estimatedLeverage !== null
                  ? `~${analysis.estimatedLeverage.toFixed(1)}×`
                  : '—'
            }
          />
          <MiniStat label="Restlauf" value={analysis.daysToExpiry !== null ? `${analysis.daysToExpiry}d` : '—'} />
        </div>
      )}

      {editing ? (
        <div className="flex gap-1.5">
          <input
            type="text"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Notiz"
            className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10.5px] text-slate-100 focus:border-emerald-400/60 focus:outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={() => { updateOptionsscheinNote(item.id, noteDraft); setEditing(false); }}
            className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-500/20"
          >
            ok
          </button>
          <button
            type="button"
            onClick={() => { setNoteDraft(item.note ?? ''); setEditing(false); }}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-400 hover:border-slate-500"
          >
            x
          </button>
        </div>
      ) : item.note ? (
        <button type="button" onClick={() => setEditing(true)} className="block w-full text-left text-[10.5px] italic text-slate-400 hover:text-slate-200">
          &bdquo;{item.note}&ldquo;
        </button>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="text-[10px] text-slate-500 hover:text-slate-300">
          + Notiz
        </button>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-1.5">
        <span className="text-[9.5px] text-slate-500">hinzugefuegt {fmtDate(item.addedAt)}</span>
        <button
          type="button"
          onClick={() => removeOptionsscheinFromWatchlist(item.id)}
          className="rounded border border-slate-700 px-1.5 py-0.5 text-[9.5px] text-slate-400 hover:border-rose-400/50 hover:text-rose-300"
        >
          entfernen
        </button>
      </div>
    </li>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950/40 px-2 py-1">
      <div className="text-[8.5px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="font-mono text-[11px] text-slate-100">{value}</div>
    </div>
  );
}

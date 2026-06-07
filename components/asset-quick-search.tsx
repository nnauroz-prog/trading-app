'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SearchItem {
  symbol: string;
  name: string;
  kind: 'aktie' | 'rohstoff';
  group: string;
}

export function AssetQuickSearch({ items }: { items: SearchItem[] }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return [];
    return items
      .filter((it) => it.symbol.toLowerCase().includes(q) || it.name.toLowerCase().includes(q) || it.group.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, items]);

  function go(item: SearchItem) {
    const path = item.kind === 'aktie'
      ? `/aktien/${encodeURIComponent(item.symbol)}`
      : `/rohstoffe/${encodeURIComponent(item.symbol)}`;
    router.push(path);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && matches.length > 0) {
      e.preventDefault();
      go(matches[0]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <section className="relative rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
      <label className="block">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Schnellzugriff</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKey}
          placeholder="Aktie / Rohstoff suchen (AAPL, Tesla, Gold, …)"
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
          aria-label="Aktie oder Rohstoff suchen"
        />
      </label>
      {open && matches.length > 0 && (
        <ul className="absolute left-3 right-3 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 shadow-lg">
          {matches.map((it) => (
            <li key={`${it.kind}-${it.symbol}`}>
              <button
                onMouseDown={(e) => { e.preventDefault(); go(it); }}
                className="flex w-full items-baseline gap-2 px-3 py-2 text-left text-[11.5px] text-slate-200 hover:bg-slate-800"
              >
                <span className="font-semibold">{it.name}</span>
                <span className="font-mono text-[10px] text-slate-500">{it.symbol}</span>
                <span className="ml-auto rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-slate-400">
                  {it.kind === 'aktie' ? `Aktie · ${it.group}` : `Rohstoff · ${it.group}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.length > 0 && matches.length === 0 && (
        <p className="mt-1 text-[10.5px] text-slate-500">Kein Treffer in Aktien- oder Rohstoff-Universum.</p>
      )}
    </section>
  );
}

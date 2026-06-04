'use client';

import { useEffect, useState } from 'react';

// Schmales Suchfeld direkt über der Liga-Liste — filtert die Accordions
// per data-Attribut, ohne Server-Rerender. Schnellster Weg zu „nur die
// Liga, die mich interessiert".
export function LigaSearch() {
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const q = query.trim().toLowerCase();
    const all = document.querySelectorAll<HTMLDetailsElement>('[data-liga-accordion="1"]');
    all.forEach((el) => {
      if (q.length === 0) {
        el.style.display = '';
        return;
      }
      const summaryText = el.querySelector('summary')?.textContent?.toLowerCase() ?? '';
      el.style.display = summaryText.includes(q) ? '' : 'none';
    });
  }, [query, mounted]);

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Liga oder Land suchen…"
        maxLength={30}
        className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11.5px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/60 focus:outline-none"
        aria-label="Liga-Liste durchsuchen"
      />
      {query.length > 0 && (
        <button
          type="button"
          onClick={() => setQuery('')}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[10px] text-slate-300 hover:border-emerald-400/40 hover:text-emerald-200"
        >
          ✕
        </button>
      )}
    </div>
  );
}

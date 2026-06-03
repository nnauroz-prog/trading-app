// Sticky-Section-Nav für /sport — Anker zu den wichtigsten Blöcken auf der
// Seite, damit auf Mobile nicht endlos gescrollt werden muss.

const SECTIONS = [
  { id: 'top', label: 'oben' },
  { id: 'top-prognosen', label: 'Top 5' },
  { id: 'verteilung', label: 'Verteilung' },
  { id: 'schwelle', label: 'Schwelle' },
  { id: 'tipprunde', label: 'Tipprunde' },
  { id: 'tagebuch', label: 'Tagebuch' },
  { id: 'ligen', label: 'Ligen' }
];

export function SportTopNav() {
  return (
    <nav className="sticky top-0 z-20 -mx-4 overflow-x-auto border-b border-slate-800 bg-slate-950/95 px-4 py-1.5 backdrop-blur md:-mx-6 md:px-6">
      <ul className="flex min-w-max items-center gap-1.5 text-[10.5px]">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="rounded-md border border-slate-800 bg-slate-900/60 px-2 py-0.5 text-slate-300 hover:border-emerald-400/40 hover:text-emerald-200"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

'use client';

// Drei Buttons für die Liga-Accordions ganz unten auf /sport:
//   • „Alle ausklappen"  → öffnet alle Liga-Details
//   • „Alle schließen"   → schließt alle
//   • „Nur Top-Ligen"   → öffnet nur die Top-Ligen (data-liga-top="1"),
//                         schließt alle anderen
//
// Funktioniert komplett über DOM-Manipulation: jedes Liga-Accordion ist ein
// <details data-liga-accordion="1"> Element. Server-Komponenten bleiben
// dadurch unangetastet.

export function LigaAccordionControls() {
  const setAll = (open: boolean, topOnly: boolean) => {
    if (typeof document === 'undefined') return;
    const all = document.querySelectorAll<HTMLDetailsElement>('[data-liga-accordion="1"]');
    all.forEach((el) => {
      if (topOnly) {
        el.open = el.dataset.ligaTop === '1';
      } else {
        el.open = open;
      }
    });
    if (all.length > 0) all[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]">
      <span className="text-[10px] uppercase tracking-wider text-slate-500">Liga-Listen:</span>
      <button
        type="button"
        onClick={() => setAll(true, false)}
        className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-emerald-200 hover:bg-emerald-500/20"
      >
        alle ausklappen
      </button>
      <button
        type="button"
        onClick={() => setAll(false, false)}
        className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-slate-300 hover:border-slate-500 hover:text-slate-100"
      >
        alle schließen
      </button>
      <button
        type="button"
        onClick={() => setAll(false, true)}
        className="rounded-md border border-sky-400/40 bg-sky-500/10 px-2 py-1 text-sky-200 hover:bg-sky-500/20"
      >
        nur Top-Ligen
      </button>
    </div>
  );
}

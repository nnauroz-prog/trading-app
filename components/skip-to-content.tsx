// Skip-to-Content fuer Tastatur-Navigation und Screenreader.
// Sichtbar nur beim Fokussieren (Tab-Taste). Springt zum #main-content
// und ueberspringt Top-Nav.

export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:border focus:border-emerald-400 focus:bg-slate-950 focus:px-3 focus:py-1.5 focus:text-[12px] focus:font-semibold focus:text-emerald-200 focus:shadow-lg focus:outline-none"
    >
      Zum Inhalt springen
    </a>
  );
}

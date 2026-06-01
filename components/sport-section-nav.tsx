// Sprung-Navigation für die Sport-Seite — fixe Anker zu den Haupt-Sektionen,
// damit man nicht durch die ganze Seite scrollen muss.
export function SportSectionNav() {
  const items = [
    { href: '#tier-90', label: '⚜ Tier 90' },
    { href: '#maximal-sicher', label: '🛡 Maximal-Sicher' },
    { href: '#ergebnisse', label: '🎯 Ergebnisse' },
    { href: '#historie', label: '📚 Historie' },
    { href: '#redaktion', label: 'Redaktion' },
    { href: '#sicher', label: 'Sicher' },
    { href: '#tag', label: 'Tipp d. Tages' },
    { href: '#liga', label: 'Pro Liga' },
    { href: '#kombi', label: 'Kombi' },
    { href: '#meine-teams', label: 'Meine Teams' },
    { href: '#woche', label: 'Diese Woche' },
    { href: '#tagebuch', label: 'Tagebuch' }
  ];
  return (
    <nav aria-label="Sport-Sektionen" className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/40 p-2">
      <ul className="flex gap-1.5 whitespace-nowrap text-[10.5px]">
        {items.map((i) => (
          <li key={i.href}>
            <a href={i.href} className="block rounded-md border border-slate-800 bg-slate-950/60 px-2 py-1 text-slate-300 hover:border-emerald-400/60 hover:text-emerald-200">
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

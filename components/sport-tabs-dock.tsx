import Link from 'next/link';

// Schmale Sportarten-Dock-Bar mit Quick-Links direkt im /sport-Reiter,
// unter der Section-Nav. Keine doppelten Funktionen — nur Navigation.

const TABS = [
  { href: '/sport', label: 'Fußball', emoji: '⚽', active: true },
  { href: '/wm', label: 'WM', emoji: '🏆' },
  { href: '/basketball', label: 'Basket', emoji: '🏀' },
  { href: '/tennis', label: 'Tennis', emoji: '🎾' },
  { href: '/eishockey', label: 'Eis', emoji: '🏒' },
  { href: '/handball', label: 'Hand', emoji: '🤾' }
];

export function SportTabsDock() {
  return (
    <nav aria-label="Sportarten-Schnellzugriff" className="-mx-4 overflow-x-auto px-4 md:-mx-6 md:px-6">
      <ul className="flex min-w-max gap-1.5 text-[10.5px]">
        {TABS.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className={`flex items-center gap-1 rounded-md border px-2 py-1 ${t.active ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200' : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-emerald-400/40 hover:text-emerald-200'}`}
            >
              <span aria-hidden>{t.emoji}</span>
              <span>{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

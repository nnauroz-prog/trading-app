// Vollständiger Sub-Page-Index für den Krypto-Bereich. Verhindert, dass
// alte Routen verloren gehen, nachdem die Bottom-Nav auf 5 Top-Level
// reduziert wurde. Bewusst kompakt, gruppiert nach Thema.

import Link from 'next/link';

const GROUPS: Array<{ title: string; items: Array<{ href: string; label: string; emoji: string }> }> = [
  {
    title: 'Trading & Risiko',
    items: [
      { href: '/positions', label: 'Positionen', emoji: '📊' },
      { href: '/risk', label: 'Risiko', emoji: '⚠️' },
      { href: '/warnings', label: 'Warnungen', emoji: '🚨' },
      { href: '/dca', label: 'DCA-Planer', emoji: '🔁' }
    ]
  },
  {
    title: 'Analyse',
    items: [
      { href: '/screener', label: 'Screener', emoji: '🔍' },
      { href: '/watchlist', label: 'Watchlist', emoji: '⭐' },
      { href: '/heatmap', label: 'Heatmap', emoji: '🔥' },
      { href: '/insights', label: 'Insights', emoji: '💡' },
      { href: '/ideas', label: 'Ideen', emoji: '🧠' },
      { href: '/compare', label: 'Vergleich', emoji: '⚖️' },
      { href: '/chancen', label: 'Chancen', emoji: '🎯' }
    ]
  },
  {
    title: 'Tagebuch & Verlauf',
    items: [
      { href: '/journal', label: 'Journal', emoji: '📓' },
      { href: '/history', label: 'Verlauf', emoji: '📜' },
      { href: '/performance', label: 'Performance', emoji: '📈' },
      { href: '/backtest', label: 'Backtest', emoji: '⏪' }
    ]
  },
  {
    title: 'Firmen & Wissen',
    items: [
      { href: '/firmen', label: 'Firmen', emoji: '🏢' },
      { href: '/agent', label: 'Diskussion', emoji: '💬' },
      { href: '/intel', label: 'Intelligence', emoji: '🛰️' },
      { href: '/strategie', label: 'Strategie', emoji: '🗺️' },
      { href: '/akademie', label: 'Akademie', emoji: '🎓' },
      { href: '/news', label: 'News', emoji: '📰' }
    ]
  },
  {
    title: 'System',
    items: [
      { href: '/tools', label: 'Werkzeuge', emoji: '🔧' },
      { href: '/settings', label: 'Einstellungen', emoji: '⚙️' },
      { href: '/hilfe', label: 'Hilfe', emoji: '❓' }
    ]
  }
];

export function AllToolsIndex() {
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Alle Werkzeuge im Krypto-Bereich</h2>
        <p className="mt-1 text-[10.5px] leading-snug text-slate-500">
          Direkt-Links zu allen Sub-Seiten. Reihenfolge nach Thema, nicht nach Wichtigkeit.
        </p>
      </div>
      <div className="space-y-3">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">{group.title}</div>
            <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
              {group.items.map((it) => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-950/40 px-2 py-1.5 text-[11px] text-slate-300 transition hover:border-emerald-400/40 hover:text-emerald-200"
                  >
                    <span aria-hidden className="text-[14px] leading-none">{it.emoji}</span>
                    <span className="truncate">{it.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

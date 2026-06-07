import Link from 'next/link';

const QUICK_LINKS = [
  { href: '/', label: 'Krypto', emoji: '₿' },
  { href: '/aktien', label: 'Aktien', emoji: '📈' },
  { href: '/aktien/watchlist', label: 'Aktien-Watchlist', emoji: '⭐' },
  { href: '/rohstoffe', label: 'Rohstoffe', emoji: '🛢️' },
  { href: '/rohstoffe/watchlist', label: 'Rohstoff-Watchlist', emoji: '⭐' },
  { href: '/gold', label: 'Gold', emoji: '🥇' },
  { href: '/sport', label: 'Sport', emoji: '⚽' },
  { href: '/wm', label: 'WM 2026', emoji: '🏆' },
  { href: '/heute-sicher', label: 'Heute besonders sicher', emoji: '🛡️' },
  { href: '/agenten', label: 'Vorstände & Agenten', emoji: '👥' },
  { href: '/daily', label: 'Daily Decision Center', emoji: '🌅' }
];

export default function NotFound() {
  const buildMarker = process.env.BUILD_MARKER ?? 'unknown';
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        404
      </div>
      <h1 className="text-2xl font-bold text-white">Seite nicht gefunden</h1>
      <p className="max-w-md text-sm leading-relaxed text-slate-400">
        Diese Adresse gibt es nicht (mehr). Vielleicht ein alter Link, ein Tippfehler — oder ein
        ganz neuer Bereich, bei dem Vercel den Deploy noch nicht durch hat. Build-Marker unten zeigt deinen Stand.
      </p>
      <ul className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-3">
        {QUICK_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex items-center justify-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/40 px-3 py-2 text-[11px] text-slate-200 transition hover:border-emerald-400/50 hover:text-emerald-200"
            >
              <span aria-hidden>{link.emoji}</span>
              <span>{link.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 font-mono text-[10px] text-slate-600">Build: {buildMarker}</p>
    </main>
  );
}

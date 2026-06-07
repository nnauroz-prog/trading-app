'use client';

// Globale Top-Nav. Spiegelt die 5 Hauptbereiche der Bottom-Nav, ist aber
// auf Desktop (md+) sichtbar, während die Bottom-Nav nur mobil zählt.
// Bewusst keine Sub-Bar oben — alle Sub-Pages erreichbar über die
// jeweilige Bereichs-Hauptseite.

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: 'Krypto', emoji: '₿' },
  { href: '/aktien', label: 'Aktien', emoji: '📈' },
  { href: '/gold', label: 'Gold', emoji: '🥇' },
  { href: '/rohstoffe', label: 'Rohstoffe', emoji: '🛢️' },
  { href: '/sport', label: 'Sport', emoji: '⚽' }
] as const;

// Sub-Pfade, die zu „Sport" gehören, auch wenn sie nicht unter /sport/* liegen.
const SPORT_SUB_PATHS = ['/basketball', '/tennis', '/eishockey', '/handball', '/wm'];
// Alle Top-Bereich-Roots (außer „/" Krypto) — Krypto matched alles, was nicht
// zu einem der anderen Bereiche gehört.
const NON_KRYPTO_ROOTS = ['/aktien', '/gold', '/rohstoffe', '/sport', ...SPORT_SUB_PATHS];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') {
    // Krypto-Tab ist aktiv für alle Sub-Pages (Positionen, Risiko, Journal …),
    // die nicht zu einem anderen Top-Bereich gehören.
    return !NON_KRYPTO_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`));
  }
  if (href === '/sport') {
    // Sport-Tab matched auch die Sub-Sport-Reiter.
    if (pathname === '/sport' || pathname.startsWith('/sport/')) return true;
    return SPORT_SUB_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Hauptnavigation Desktop"
      className="hidden border-b border-slate-800 bg-slate-950/95 backdrop-blur md:block"
    >
      <ul className="mx-auto flex max-w-5xl items-center gap-1 px-6 py-2 text-[12px]">
        {ITEMS.map((it) => {
          const active = isActive(pathname, it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 transition ${
                  active
                    ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'
                    : 'border-transparent text-slate-300 hover:border-slate-700 hover:text-emerald-200'
                }`}
              >
                <span aria-hidden>{it.emoji}</span>
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

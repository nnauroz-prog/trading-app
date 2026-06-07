'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RiskBadge } from '@/components/bottom-nav-badge';
import { SportNavBadge } from '@/components/sport-nav-badge';

// Mobile-first sticky bottom-nav. Sechs primäre Ziele, optimiert für
// Daumen-Reichweite. Aktive Seite ist hervorgehoben (aria-current).
interface Item {
  href: string;
  label: string;
  emoji: string;
  badge?: 'sport' | 'risk';
  hoverColor: string;
}

// 5 Top-Level-Bereiche, klar getrennt. Alle Sub-Pages
// (Positionen / Risiko / Journal / Firmen / News / Watchlist usw.)
// erreichbar über die jeweilige Hauptseite des Bereichs.
const ITEMS: Item[] = [
  { href: '/', label: 'Krypto', emoji: '₿', hoverColor: 'hover:text-emerald-300' },
  { href: '/aktien', label: 'Aktien', emoji: '📈', hoverColor: 'hover:text-emerald-300' },
  { href: '/gold', label: 'Gold', emoji: '🥇', hoverColor: 'hover:text-amber-300' },
  { href: '/rohstoffe', label: 'Rohstoffe', emoji: '🛢️', hoverColor: 'hover:text-sky-300' },
  { href: '/sport', label: 'Sport', emoji: '⚽', badge: 'sport', hoverColor: 'hover:text-emerald-300' }
];

const SPORT_SUB_PATHS = ['/basketball', '/tennis', '/eishockey', '/handball', '/wm'];
const NON_KRYPTO_ROOTS = ['/aktien', '/gold', '/rohstoffe', '/sport', ...SPORT_SUB_PATHS];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') {
    return !NON_KRYPTO_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`));
  }
  if (href === '/sport') {
    if (pathname === '/sport' || pathname.startsWith('/sport/')) return true;
    return SPORT_SUB_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-5xl grid-cols-5 text-[10px]">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const baseColor = active ? 'text-emerald-300' : 'text-slate-300';
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-0.5 py-2 transition ${baseColor} ${item.hoverColor} ${active ? 'bg-slate-900/60' : ''}`}
              >
                <span aria-hidden className="relative text-base leading-none">
                  {item.emoji}
                  {item.badge === 'sport' && <SportNavBadge />}
                  {item.badge === 'risk' && <RiskBadge />}
                </span>
                <span>{item.label}</span>
                {active && (
                  <span className="absolute -top-px left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-emerald-400" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

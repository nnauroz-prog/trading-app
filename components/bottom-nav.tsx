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

const ITEMS: Item[] = [
  { href: '/', label: 'Heute', emoji: '🏠', hoverColor: 'hover:text-emerald-300' },
  { href: '/agent', label: 'Firmen', emoji: '🏢', hoverColor: 'hover:text-emerald-300' },
  { href: '/sport', label: 'Sport', emoji: '⚽', badge: 'sport', hoverColor: 'hover:text-emerald-300' },
  { href: '/positions', label: 'Positionen', emoji: '📊', hoverColor: 'hover:text-emerald-300' },
  { href: '/risk', label: 'Risiko', emoji: '⚠️', badge: 'risk', hoverColor: 'hover:text-rose-300' },
  { href: '/journal', label: 'Journal', emoji: '📓', hoverColor: 'hover:text-emerald-300' }
];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-5xl grid-cols-6 text-[10px]">
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

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MOBILE_NAV, isNavActive } from '@/components/navigation-items';
import { SportNavBadge } from '@/components/sport-nav-badge';

export function BottomNav() {
  const pathname = usePathname() ?? '/';
  return <nav aria-label="Hauptnavigation" className="terminal-bottom-nav"><ul>{MOBILE_NAV.map(item => {
    const active = isNavActive(pathname, item.href);
    return <li key={item.href}><Link href={item.href} aria-current={active ? 'page' : undefined} className={active ? 'is-active' : ''}><span className="relative"><item.icon size={21} strokeWidth={active ? 2.1 : 1.5} />{item.href === '/sport' && <SportNavBadge />}</span><span>{item.label}</span></Link></li>;
  })}</ul></nav>;
}

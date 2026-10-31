import { Bitcoin, ChartNoAxesCombined, Gem, Droplets, Trophy, Wallet, Settings2 } from 'lucide-react';

export const HOME_NAV = { href: '/', label: 'Mein Geld', icon: Wallet } as const;
export const MARKET_NAV = [
  { href: '/krypto', label: 'Krypto', icon: Bitcoin },
  { href: '/aktien', label: 'Aktien', icon: ChartNoAxesCombined },
  { href: '/gold', label: 'Gold', icon: Gem },
  { href: '/rohstoffe', label: 'Rohstoffe', icon: Droplets },
  { href: '/sport', label: 'Sport', icon: Trophy }
] as const;
export const WORKSPACE_NAV = [
  { href: '/positions', label: 'Meine Käufe', icon: Wallet },
  { href: '/settings', label: 'Einstellungen', icon: Settings2 }
] as const;
export const MOBILE_NAV = [HOME_NAV, MARKET_NAV[0], MARKET_NAV[1], MARKET_NAV[2], MARKET_NAV[4]];
const SPORT_ROOTS = ['/sport', '/basketball', '/tennis', '/eishockey', '/handball', '/wm'];
const starts = (path: string, root: string) => path === root || path.startsWith(`${root}/`);
export function isNavActive(path: string, href: string): boolean {
  if (href === '/') return path === '/' || starts(path, '/geldplan');
  if (href === '/krypto') return starts(path, '/krypto') || ['/assets', '/screener', '/watchlist', '/backtest'].some(root => starts(path, root));
  if (href === '/sport') return SPORT_ROOTS.some(root => starts(path, root));
  return starts(path, href);
}
export function workspaceTitle(path: string): string {
  return [HOME_NAV, ...WORKSPACE_NAV, ...MARKET_NAV].find(item => isNavActive(path, item.href))?.label ?? 'Übersicht';
}

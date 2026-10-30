import { Bitcoin, ChartNoAxesCombined, Gem, Droplets, Trophy, Wallet, ShieldCheck, BookOpen, Users, Settings2, Sparkles } from 'lucide-react';

export const MARKET_NAV = [
  { href: '/', label: 'Krypto', icon: Bitcoin, number: '01' },
  { href: '/aktien', label: 'Aktien', icon: ChartNoAxesCombined, number: '02' },
  { href: '/gold', label: 'Gold', icon: Gem, number: '03' },
  { href: '/rohstoffe', label: 'Rohstoffe', icon: Droplets, number: '04' },
  { href: '/sport', label: 'Sport', icon: Trophy, number: '05' }
] as const;
export const WORKSPACE_NAV = [
  { href: '/geldplan', label: 'Mein Geldplan', icon: Sparkles },
  { href: '/positions', label: 'Positionen', icon: Wallet },
  { href: '/risk', label: 'Risiko-Check', icon: ShieldCheck },
  { href: '/journal', label: 'Mein Tagebuch', icon: BookOpen },
  { href: '/agenten', label: 'Meine Agenten', icon: Users },
  { href: '/settings', label: 'Einstellungen', icon: Settings2 }
] as const;
const SPORT_ROOTS = ['/sport', '/basketball', '/tennis', '/eishockey', '/handball', '/wm'];
const starts = (path: string, root: string) => path === root || path.startsWith(`${root}/`);
export function isNavActive(path: string, href: string): boolean {
  if (href === '/sport') return SPORT_ROOTS.some(root => starts(path, root));
  if (href === '/') return path === '/' || ['/assets', '/screener', '/watchlist', '/backtest'].some(root => starts(path, root));
  return starts(path, href);
}
export function workspaceTitle(path: string): string {
  return [...WORKSPACE_NAV, ...MARKET_NAV].find(item => isNavActive(path, item.href))?.label ?? 'Dein Überblick';
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronRight, Command, Menu, Settings2, Sparkles, X } from 'lucide-react';
import { MARKET_NAV, WORKSPACE_NAV, isNavActive, workspaceTitle } from '@/components/navigation-items';

function Brand() {
  return <Link href="/" className="terminal-brand" aria-label="Trading Desk Startseite"><span className="terminal-brand-symbol"><ArrowUpRight size={23} strokeWidth={2.4} /></span><span>TRADING<span className="block font-normal tracking-[.32em] text-slate-400">DESK<span className="ml-1 text-[#d8ff62]">_</span></span></span></Link>;
}

function NavigationLinks({ pathname, close }: { pathname: string; close?: () => void }) {
  return <>
    <p className="nav-group-label">ENTDECKEN</p>
    <ul className="space-y-1.5">{MARKET_NAV.map(item => {
      const active = isNavActive(pathname, item.href);
      return <li key={item.href}><Link onClick={close} href={item.href} aria-current={active ? 'page' : undefined} className={`terminal-nav-link ${active ? 'is-active' : ''}`}><item.icon size={19} strokeWidth={1.6} /><span>{item.label}</span><span className="ml-auto font-mono text-[10px] opacity-40">{item.number}</span></Link></li>;
    })}</ul>
    <p className="nav-group-label mt-9">DEIN WORKSPACE</p>
    <ul className="space-y-1">{WORKSPACE_NAV.map(item => <li key={item.href}><Link onClick={close} href={item.href} aria-current={isNavActive(pathname, item.href) ? 'page' : undefined} className={`terminal-nav-link terminal-nav-secondary ${isNavActive(pathname, item.href) ? 'is-active' : ''}`}><item.icon size={17} strokeWidth={1.6} /><span>{item.label}</span>{item.href === '/geldplan' && <span className="ml-auto text-[#d8ff62]"><ArrowUpRight size={15} /></span>}</Link></li>)}</ul>
  </>;
}

export function TopNav() {
  const pathname = usePathname() ?? '/';
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => { dialog.current?.close(); setOpen(false); };
  useEffect(() => { dialog.current?.close(); setOpen(false); }, [pathname]);
  const show = () => { dialog.current?.showModal(); setOpen(true); };
  return <>
    <aside className="terminal-sidebar">
      <Brand />
      <nav aria-label="Hauptnavigation Desktop" className="mt-12"><NavigationLinks pathname={pathname} /></nav>
      <div className="sidebar-note"><Command size={17} className="text-[#65e6ff]" /><p>Dein Geld.<br /><strong>Dein nächster guter Schritt.</strong></p></div>
    </aside>
    <header className="terminal-topbar">
      <div className="mobile-brand"><Brand /></div>
      <div className="desktop-breadcrumb"><span className="section-kicker">WORKSPACE</span><ChevronRight size={14} className="text-slate-600" /><span>{workspaceTitle(pathname)}</span></div>
      <div className="flex items-center gap-2 sm:gap-3">
        <Link href="/geldplan" aria-label="Mein Geldplan" className="topbar-money-link"><Sparkles size={15} /><span>Geldplan</span><ArrowUpRight size={14} /></Link>
        <Link href="/settings" className="topbar-settings" aria-label="Einstellungen"><Settings2 size={18} /></Link>
        <button type="button" className="mobile-menu-button" onClick={open ? close : show} aria-label={open ? 'Menü schließen' : 'Menü öffnen'} aria-expanded={open} aria-controls="workspace-menu">{open ? <X size={21} /> : <Menu size={21} />}</button>
      </div>
    </header>
    <dialog ref={dialog} id="workspace-menu" aria-label="Navigation" className="terminal-mobile-dialog" onClose={() => setOpen(false)} onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="flex items-center justify-between border-b border-slate-800 pb-6"><Brand /><button type="button" className="terminal-icon-button" onClick={close} aria-label="Menü schließen"><X size={21} /></button></div>
      <nav aria-label="Alle Bereiche" className="mt-5"><NavigationLinks pathname={pathname} close={close} /></nav>
    </dialog>
  </>;
}

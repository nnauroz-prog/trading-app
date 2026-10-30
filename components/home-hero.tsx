import Link from 'next/link';
import { ArrowRight, ArrowUpRight, ChartNoAxesCombined, ChevronDown, Crosshair, Radar, ShieldCheck, SlidersHorizontal, Trophy, type LucideIcon } from 'lucide-react';
import { isWmOver } from '@/lib/sport/wm-tournament-phase';

interface Props {
  todayIso: string;
}

function fmtDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin'
  });
}

export function HomeHero({ todayIso }: Props) {
  return (
    <header className="terminal-custom-header relative overflow-hidden border border-[#253340] bg-[#0c131c]">
      <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-36 w-64 opacity-30" style={{ backgroundImage: 'linear-gradient(90deg, transparent 23px, #2b4755 24px), linear-gradient(transparent 23px, #2b4755 24px)', backgroundSize: '24px 24px', maskImage: 'linear-gradient(270deg, #000, transparent)' }} />
      <div className="relative p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-[0.15em] text-[#95a6b8]">
          <span className="flex items-center gap-2"><span aria-hidden className="h-1.5 w-1.5 bg-[#65e6ff]" />Markt / Übersicht</span>
          <time dateTime={todayIso}>{fmtDay(todayIso)}</time>
        </div>
        <div className="mt-6 flex items-end justify-between gap-5">
          <div>
            <h1 className="terminal-heading text-[30px] font-semibold leading-[1.1] tracking-[-0.055em] text-white sm:text-[42px]">Dein Marktüberblick<span className="text-[#d8ff62]">.</span></h1>
            <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-[#a5b4c5] sm:text-sm">Kurse einordnen. Setups prüfen. Mit Plan entscheiden.</p>
          </div>
          <span className="hidden shrink-0 items-center gap-2 border-l border-[#2a3947] pl-5 text-[11px] text-[#a5b4c5] sm:flex"><ShieldCheck aria-hidden className="h-4 w-4 text-[#65e6ff]" />Kein Anlageratschlag</span>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[10px] text-[#8b9bad] sm:hidden"><ShieldCheck aria-hidden className="h-3 w-3" />Kein Anlageratschlag</p>
      </div>

      <details className="group border-t border-[#253340]"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-5 py-3 text-xs text-[#a5b4c5] sm:px-7"><span>Märkte &amp; Werkzeuge entdecken</span><ChevronDown size={15} className="text-[#65e6ff] transition-transform group-open:rotate-180" /></summary><ul className="grid grid-cols-2 gap-px border-t border-[#253340] bg-[#253340] sm:grid-cols-4">
        <HeroLink icon={ShieldCheck} label="Heute sicher" desc="Grade-A-Picks prüfen" href="/heute-sicher" />
        {isWmOver(todayIso)
          ? <HeroLink icon={Crosshair} label="Sport" desc="Ligen & Prognosen" href="/sport" />
          : <HeroLink icon={Trophy} label="WM 2026" desc="Spielplan & Prognosen" href="/wm" />}
        <HeroLink icon={ChartNoAxesCombined} label="Aktien-Check" desc="Acht Kriterien im Blick" href="/aktien" />
        <HeroLink icon={SlidersHorizontal} label="Optionsscheine" desc="Setups & Risiko prüfen" href="/optionsscheine" />
      </ul>
      <Link href="/radar" className="group flex items-center justify-between gap-4 border-t border-[#253340] bg-[#65e6ff]/[0.035] px-5 py-3.5 transition-colors hover:bg-[#65e6ff]/[0.08] sm:px-7">
        <span className="flex min-w-0 items-center gap-3"><Radar aria-hidden className="h-[18px] w-[18px] shrink-0 text-[#65e6ff]" /><span><span className="block text-xs font-semibold text-[#e8f0f6]">Finanz-Radar</span><span className="mt-0.5 block text-[10px] text-[#93a5b7]">Weltweite Finanz-News, nach Relevanz sortiert</span></span></span>
        <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-[#65e6ff] transition-transform group-hover:translate-x-1" />
      </Link></details>
    </header>
  );
}

function HeroLink({ icon: Icon, label, desc, href }: { icon: LucideIcon; label: string; desc: string; href: string }) {
  return (
    <li className="min-w-0 bg-[#0c131c]">
      <Link href={href} className="group flex h-full items-start gap-2.5 px-4 py-4 transition-colors hover:bg-[#d8ff62]/[0.045] sm:px-5">
        <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[#8da1b2] transition-colors group-hover:text-[#d8ff62]" />
        <span className="min-w-0"><span className="flex items-center gap-2 text-[12px] font-semibold text-[#edf4fa]">{label}<ArrowUpRight aria-hidden className="h-3 w-3 text-[#667c90] transition-colors group-hover:text-[#d8ff62]" /></span><span className="mt-1 block text-[10px] leading-relaxed text-[#8fa2b4]">{desc}</span></span>
      </Link>
    </li>
  );
}

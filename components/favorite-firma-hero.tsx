'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AgentVerdict, PersonaId } from '@/lib/agents/personas';
import { FIRMA_PREFERENCE_CHANGED_EVENT, loadFirmaPreference } from '@/lib/firma-preference';
import { CEO_BIOS } from '@/lib/agents/personalities';
import { generateTradeMemo } from '@/lib/agents/trade-memo';

function fmt(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(4);
  return v.toFixed(7);
}

// Renders the user's preferred firma's full verdict as a hero block on the
// home page. Stays hidden if no preference is saved yet.
export function FavoriteFirmaHero({ personas }: { personas: AgentVerdict[] }) {
  const [preferred, setPreferred] = useState<PersonaId | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPreferred(loadFirmaPreference());
    setMounted(true);
    const sync = () => setPreferred(loadFirmaPreference());
    window.addEventListener(FIRMA_PREFERENCE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(FIRMA_PREFERENCE_CHANGED_EVENT, sync);
  }, []);

  if (!mounted || !preferred) return null;
  const p = personas.find((x) => x.persona === preferred);
  if (!p) return null;

  const isBuy = p.verdict === 'BUY';
  const tone = isBuy ? 'border-amber-400/60 bg-emerald-950/30' : 'border-amber-400/60 bg-slate-900/60';
  const ceo = CEO_BIOS[p.persona];
  const memo = generateTradeMemo(p);

  return (
    <section className={`space-y-2 rounded-2xl border-2 p-5 ${tone}`}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-amber-300">★</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Deine Lieblings-Firma sagt</span>
        </div>
        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isBuy ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-300'}`}>
          {isBuy ? 'KAUFEN' : 'WARTEN'}
        </span>
      </div>
      <h2 className="text-lg font-bold text-white">{p.name}: {isBuy && p.target ? `kaufe ${p.target.symbol}` : 'heute lieber warten'}</h2>
      <p className="text-[12px] leading-relaxed text-slate-200">{p.rationale}</p>
      {ceo && (
        <p className="text-[10px] italic text-slate-500">— {ceo.name}, {ceo.role}</p>
      )}
      {memo && (
        <div className="grid grid-cols-3 gap-2 rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center text-[11px]">
          <div><div className="text-[9px] uppercase tracking-wider text-slate-500">Einstieg</div><div className="font-mono text-slate-100">${fmt(memo.entry)}</div></div>
          <div><div className="text-[9px] uppercase tracking-wider text-rose-400">Stop</div><div className="font-mono text-rose-200">${fmt(memo.stop)}</div></div>
          <div><div className="text-[9px] uppercase tracking-wider text-emerald-400">Ziel 1</div><div className="font-mono text-emerald-200">${fmt(memo.target1)}</div></div>
        </div>
      )}
      <div className="flex flex-wrap items-baseline gap-3 text-[10px]">
        <Link href="/agent" className="text-sky-300 hover:text-sky-200">→ Volle Begründung auf /agent</Link>
      </div>
    </section>
  );
}

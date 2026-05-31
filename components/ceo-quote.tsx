'use client';

import { useEffect, useState } from 'react';
import { CEO_BIOS, SUBAGENT_BIOS } from '@/lib/agents/personalities';
import { PersonaId } from '@/lib/agents/personas';

const STORAGE_KEY = 'trading-app.daily-quote-v1';

interface DailyQuote {
  date: string;
  firma: PersonaId;
  who: string;        // "CEO" or sub-agent role
  name: string;
  quote: string;
}

function pickQuoteFor(date: string): DailyQuote {
  // Deterministic pick based on date so the same quote stays for the day.
  let hash = 0;
  for (let i = 0; i < date.length; i++) hash = (hash * 31 + date.charCodeAt(i)) | 0;
  const firmas: PersonaId[] = ['conservative', 'balanced', 'aggressive'];
  const firma = firmas[Math.abs(hash) % firmas.length];
  // 30% chance CEO speaks, 70% a sub-agent
  if (Math.abs(hash >> 4) % 10 < 3) {
    const ceo = CEO_BIOS[firma];
    return { date, firma, who: 'CEO', name: ceo.name, quote: ceo.quote };
  }
  const subBios = Object.values(SUBAGENT_BIOS[firma]);
  const sub = subBios[Math.abs(hash >> 7) % subBios.length];
  return { date, firma, who: sub.role, name: sub.name, quote: sub.quote };
}

function todayIso(): string {
  const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return d;
}

export function CeoQuote() {
  const [quote, setQuote] = useState<DailyQuote | null>(null);

  useEffect(() => {
    const date = todayIso();
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as DailyQuote;
        if (parsed.date === date) {
          setQuote(parsed);
          return;
        }
      } catch {
        // ignored
      }
    }
    const fresh = pickQuoteFor(date);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    setQuote(fresh);
  }, []);

  if (!quote) return null;
  const accent =
    quote.firma === 'conservative' ? 'border-sky-400/40 text-sky-100' :
    quote.firma === 'balanced' ? 'border-amber-400/40 text-amber-100' :
    'border-rose-400/40 text-rose-100';

  return (
    <section className={`space-y-1 rounded-2xl border bg-slate-950/40 p-4 ${accent}`}>
      <div className="text-[9px] uppercase tracking-[0.2em] opacity-60">Spruch des Tages</div>
      <p className="text-[14px] italic leading-relaxed">„{quote.quote}“</p>
      <p className="text-[10px] opacity-70">— {quote.name}, {quote.who}</p>
    </section>
  );
}

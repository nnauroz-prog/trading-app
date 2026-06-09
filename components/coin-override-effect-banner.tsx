'use client';

// Honest banner on the asset detail page: when the user has set Coin-Override
// factors, this shows the EFFECT on the persona verdicts — even though the
// server cached the original verdicts. So the user sees: 'your override would
// change the picture to X', without us secretly modifying the cached recs.

import { useEffect, useState } from 'react';
import { COIN_OVERRIDES_CHANGED_EVENT, loadCoinOverride } from '@/lib/agents/coin-override-store';
import { applyCoinAdjustment, type CoinOverride } from '@/lib/agents/coin-override';
import type { AgentVerdict } from '@/lib/agents/personas';

interface Props {
  coinId: string;
  symbol: string;
  serverVerdicts: AgentVerdict[];
}

export function CoinOverrideEffectBanner({ coinId, symbol, serverVerdicts }: Props) {
  const [override, setOverride] = useState<CoinOverride | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setOverride(loadCoinOverride(coinId));
    sync();
    setMounted(true);
    window.addEventListener(COIN_OVERRIDES_CHANGED_EVENT, sync);
    return () => window.removeEventListener(COIN_OVERRIDES_CHANGED_EVENT, sync);
  }, [coinId]);

  if (!mounted || !override || override.factors.length === 0) return null;

  const adj = applyCoinAdjustment(override);
  const buyingPersonas = serverVerdicts.filter((v) => v.verdict === 'BUY');

  // Klartext-Aussage je nach Stand:
  // - hardVeto + jemand kauft  → starkes „dein Veto wuerde sie stoppen"
  // - hardVeto + niemand kauft → bestaetigend
  // - delta > 5  → boost
  // - delta < -5 → drueckt
  // - sonst: leicht modifiziert
  let tone: string;
  let headline: string;
  let body: string;

  if (adj.hardVeto && buyingPersonas.length > 0) {
    tone = 'border-rose-500/60 bg-rose-950/30 text-rose-100';
    headline = `Dein Veto auf ${symbol} ueberstimmt ${buyingPersonas.length} kaufende Firma${buyingPersonas.length === 1 ? '' : 'n'}.`;
    body = `${buyingPersonas.map((p) => p.name).join(', ')} kauft heute. Bei aktiviertem Token-Unlock- oder Misstrauens-Veto bleibst Du sicherheitshalber raus — egal was die Firma sagt.`;
  } else if (adj.hardVeto) {
    tone = 'border-rose-500/50 bg-rose-950/20 text-rose-100';
    headline = `Dein Veto ist konsistent mit den Firmen — niemand kauft heute ${symbol}.`;
    body = `Keine Firma sagt KAUFEN. Dein hartes Veto bestaetigt das.`;
  } else if (adj.scoreDelta >= 8) {
    tone = 'border-emerald-400/40 bg-emerald-950/15 text-emerald-100';
    headline = `Deine Conviction-Faktoren heben die Safety-Bewertung von ${symbol} um +${adj.scoreDelta} Punkte.`;
    body = `Die Firmen-Bewertungen sind nicht angepasst (Server cached), aber bei Note-A-Niveau wuerden sie historisch noch ueberzeugter zugreifen.`;
  } else if (adj.scoreDelta <= -8) {
    tone = 'border-amber-400/40 bg-amber-950/15 text-amber-100';
    headline = `Deine Risiko-Faktoren druecken die Safety-Bewertung um ${adj.scoreDelta} Punkte.`;
    body = `Auch wenn die Firmen-Verdicts gleich aussehen: Du weisst etwas, das das Modell nicht weiss. Position bewusst kleiner sizen.`;
  } else {
    tone = 'border-slate-700 bg-slate-900/50 text-slate-200';
    headline = `${override.factors.length} User-Faktor${override.factors.length === 1 ? '' : 'en'} aktiv auf ${symbol}, Nettoeffekt ${adj.scoreDelta >= 0 ? '+' : ''}${adj.scoreDelta} Punkte.`;
    body = `Marginale Verschiebung — Firmen-Verdicts kippen davon noch nicht.`;
  }

  return (
    <section className={`space-y-1 rounded-2xl border-2 p-4 ${tone}`} aria-label="Coin-Override-Effekt">
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">User-Override · Wirkung auf die Firma-Empfehlungen</div>
      <p className="text-[13px] font-semibold">{headline}</p>
      <p className="text-[11.5px] leading-snug opacity-90">{body}</p>
      <p className="text-[10px] leading-snug opacity-70">Aktiv: {adj.factors.join(' · ')}</p>
    </section>
  );
}

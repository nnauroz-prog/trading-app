'use client';

import { useEffect, useState } from 'react';
import { loadDecisionLog, summarize } from '@/lib/agent-memory';
import { loadFirmaLog, statsPerFirma } from '@/lib/firma-memory';
import { loadIntelLog, computeIntelAccuracy } from '@/lib/intel/memory';
import { loadAkademieLog, lehrlingStability, spaeherTrend } from '@/lib/akademie/memory';
import { loadTipJournal, summariseTips } from '@/lib/sport/tip-journal';
import { loadWatchlist } from '@/lib/watchlist';
import { loadAlerts } from '@/lib/price-alerts';
import { loadPositions } from '@/lib/positions';

interface Stats {
  agentTotal: number;
  agentBuys: number;
  agentWaits: number;
  agentCoins: number;
  firmaCount: number;
  firmaBuyDays: number;
  firmaAgreementRate: number | null;
  intelDays: number;
  intelHitRate: number | null;
  akademieDays: number;
  akademieStability: number;
  sportTotalTips: number;
  sportHitRate: number | null;
  watchlistCount: number;
  alertsTotal: number;
  alertsTriggered: number;
  positionsOpen: number;
  positionsClosed: number;
}

function compute(): Stats {
  const agentLog = loadDecisionLog();
  const agentStats = summarize(agentLog);
  const firmaLog = loadFirmaLog();
  const firmaStats = statsPerFirma(firmaLog);
  const intelLog = loadIntelLog();
  const intelAcc = computeIntelAccuracy(intelLog);
  const akademieLog = loadAkademieLog();
  const lehrStab = lehrlingStability(akademieLog);
  const spTrend = spaeherTrend(akademieLog);
  const sportLog = loadTipJournal();
  const sportStats = summariseTips(sportLog);
  const watchlist = loadWatchlist();
  const alerts = loadAlerts();
  const positions = loadPositions();

  return {
    agentTotal: agentStats.total,
    agentBuys: agentStats.buys,
    agentWaits: agentStats.waits,
    agentCoins: agentStats.uniqueCoinsRecommended,
    firmaCount: firmaStats.length,
    firmaBuyDays: firmaStats.reduce((s, f) => s + f.buyDays, 0),
    firmaAgreementRate: firmaStats.length > 0
      ? Math.round(firmaStats.reduce((s, f) => s + f.agreementWithOthers, 0) / firmaStats.length)
      : null,
    intelDays: intelLog.length,
    intelHitRate: intelAcc.hitRatePct,
    akademieDays: akademieLog.length,
    akademieStability: lehrStab.daysStable,
    sportTotalTips: sportStats.total,
    sportHitRate: sportStats.hitRatePct,
    watchlistCount: watchlist.length,
    alertsTotal: alerts.length,
    alertsTriggered: alerts.filter((a) => a.triggered).length,
    positionsOpen: positions.filter((p) => p.status === 'open').length,
    positionsClosed: positions.filter((p) => p.status !== 'open').length
  };
  // Use spTrend to keep the import used.
  void spTrend;
}

interface Card {
  title: string;
  href?: string;
  rows: Array<{ label: string; value: string; tone?: 'good' | 'bad' | 'neutral' }>;
  empty?: boolean;
}

function valTone(tone?: 'good' | 'bad' | 'neutral'): string {
  if (tone === 'good') return 'text-emerald-300';
  if (tone === 'bad') return 'text-rose-300';
  return 'text-slate-100';
}

function CardView({ card }: { card: Card }) {
  const inner = (
    <div className="space-y-1.5 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 transition hover:border-emerald-400/30">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">{card.title}</h3>
        {card.href && <span className="text-[10px] text-sky-300">öffnen →</span>}
      </div>
      {card.empty ? (
        <p className="text-[11px] italic text-slate-500">Noch keine Daten — App ein paar Tage nutzen, dann füllt sich das.</p>
      ) : (
        <ul className="space-y-0.5">
          {card.rows.map((r, i) => (
            <li key={i} className="flex items-baseline justify-between text-[11px]">
              <span className="text-slate-400">{r.label}</span>
              <span className={`font-mono ${valTone(r.tone)}`}>{r.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  return card.href ? <Link href={card.href}>{inner}</Link> : inner;
}

import Link from 'next/link';

export function PersonalInsights() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    setStats(compute());
  }, []);

  if (!stats) return null;

  const cards: Card[] = [
    {
      title: 'Tagebuch (Master-Signal)',
      href: '/agent',
      rows: [
        { label: 'Tage gespeichert', value: String(stats.agentTotal) },
        { label: 'Kauf-Tage', value: String(stats.agentBuys), tone: 'good' },
        { label: 'Warte-Tage', value: String(stats.agentWaits) },
        { label: 'Coins empfohlen', value: String(stats.agentCoins) }
      ],
      empty: stats.agentTotal === 0
    },
    {
      title: 'Firmen-Bilanz',
      href: '/agent',
      rows: [
        { label: 'Firmen mit Daten', value: String(stats.firmaCount) },
        { label: 'Kauf-Tage gesamt', value: String(stats.firmaBuyDays) },
        { label: 'Ø Konsens-Rate', value: stats.firmaAgreementRate !== null ? `${stats.firmaAgreementRate}%` : '—' }
      ],
      empty: stats.firmaCount === 0
    },
    {
      title: 'Chefredakteur-Trefferquote',
      href: '/intel',
      rows: [
        { label: 'Tage gespeichert', value: String(stats.intelDays) },
        { label: 'Trefferquote', value: stats.intelHitRate !== null ? `${stats.intelHitRate}%` : '—',
          tone: stats.intelHitRate !== null && stats.intelHitRate >= 55 ? 'good' : stats.intelHitRate !== null && stats.intelHitRate < 45 ? 'bad' : 'neutral' }
      ],
      empty: stats.intelDays === 0
    },
    {
      title: 'Akademie-Lernkurve',
      href: '/akademie',
      rows: [
        { label: 'Snapshots', value: String(stats.akademieDays) },
        { label: 'Beste Variante stabil seit', value: stats.akademieStability > 0 ? `${stats.akademieStability} ${stats.akademieStability === 1 ? 'Tag' : 'Tagen'}` : '—',
          tone: stats.akademieStability >= 3 ? 'good' : 'neutral' }
      ],
      empty: stats.akademieDays === 0
    },
    {
      title: 'Sport-Tipps',
      href: '/sport',
      rows: [
        { label: 'Tipps insgesamt', value: String(stats.sportTotalTips) },
        { label: 'Trefferquote', value: stats.sportHitRate !== null ? `${stats.sportHitRate}%` : '—',
          tone: stats.sportHitRate !== null && stats.sportHitRate >= 50 ? 'good' : 'neutral' }
      ],
      empty: stats.sportTotalTips === 0
    },
    {
      title: 'Watchlist',
      href: '/watchlist',
      rows: [
        { label: 'Coins beobachtet', value: String(stats.watchlistCount) }
      ],
      empty: stats.watchlistCount === 0
    },
    {
      title: 'Preis-Alerts',
      rows: [
        { label: 'Insgesamt', value: String(stats.alertsTotal) },
        { label: 'Ausgelöst', value: String(stats.alertsTriggered), tone: stats.alertsTriggered > 0 ? 'good' : 'neutral' }
      ],
      empty: stats.alertsTotal === 0
    },
    {
      title: 'Positionen',
      href: '/positions',
      rows: [
        { label: 'Offen', value: String(stats.positionsOpen) },
        { label: 'Geschlossen', value: String(stats.positionsClosed) }
      ],
      empty: stats.positionsOpen + stats.positionsClosed === 0
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => <CardView key={c.title} card={c} />)}
    </div>
  );
}

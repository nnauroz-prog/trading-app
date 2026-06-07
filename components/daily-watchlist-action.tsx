'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AKTIEN_WATCHLIST_CHANGED_EVENT,
  loadAktienWatchlist
} from '@/lib/aktien-watchlist';
import {
  ROHSTOFF_WATCHLIST_CHANGED_EVENT,
  loadRohstoffWatchlist
} from '@/lib/rohstoff-watchlist';
import {
  loadGradeSnapshot,
  previousGradeFor,
  recordGradeSnapshot,
  type WatchlistGradeSnapshot
} from '@/lib/daily/watchlist-grade-snapshot';
import {
  watchlistAlarms,
  type WatchedAsset,
  type WatchlistAlarm
} from '@/lib/daily/daily-decision-engine';

interface ScanEntry {
  symbol: string;
  name: string;
  grade: 'A' | 'B' | 'C' | 'D';
  score: number;
}

interface Props {
  stockScans: ScanEntry[];
  commodityScans: ScanEntry[];
  todayIso: string;
}

const SIGNAL_TONE: Record<WatchlistAlarm['signal'], string> = {
  'grade-a':           'border-emerald-400/60 bg-emerald-500/15 text-emerald-100',
  'verbesserung':      'border-sky-400/40 bg-sky-500/10 text-sky-100',
  'verschlechterung':  'border-amber-400/40 bg-amber-500/10 text-amber-100'
};

const SIGNAL_LABEL: Record<WatchlistAlarm['signal'], string> = {
  'grade-a': 'Grade A',
  'verbesserung': 'Verbesserung',
  'verschlechterung': 'Verschlechterung'
};

// Aggregiert Aktien- + Rohstoff-Watchlists und kreuzt mit den heutigen Scans
// sowie den lokal gespeicherten Vortags-Grades. Krypto-Watchlist wird hier
// bewusst weggelassen — die Krypto-Watchlist nutzt eine andere Storage-Form
// (passedCount statt Grade) und wird auf der Home Page abgebildet.
export function DailyWatchlistAction({ stockScans, commodityScans, todayIso }: Props) {
  const [stockSymbols, setStockSymbols] = useState<string[]>([]);
  const [commoditySymbols, setCommoditySymbols] = useState<string[]>([]);
  const [snapshots, setSnapshots] = useState<WatchlistGradeSnapshot[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const syncWatchlists = () => {
      setStockSymbols(loadAktienWatchlist().map((w) => w.symbol));
      setCommoditySymbols(loadRohstoffWatchlist().map((w) => w.symbol));
    };
    syncWatchlists();
    setSnapshots(loadGradeSnapshot());
    setMounted(true);
    window.addEventListener(AKTIEN_WATCHLIST_CHANGED_EVENT, syncWatchlists);
    window.addEventListener(ROHSTOFF_WATCHLIST_CHANGED_EVENT, syncWatchlists);
    return () => {
      window.removeEventListener(AKTIEN_WATCHLIST_CHANGED_EVENT, syncWatchlists);
      window.removeEventListener(ROHSTOFF_WATCHLIST_CHANGED_EVENT, syncWatchlists);
    };
  }, []);

  // Snapshot der heutigen Grades schreiben (idempotent), damit der „Vortag"-
  // Vergleich beim nächsten Besuch funktioniert.
  useEffect(() => {
    if (!mounted) return;
    for (const sym of stockSymbols) {
      const scan = stockScans.find((s) => s.symbol === sym);
      if (scan) recordGradeSnapshot({ symbol: sym, klass: 'Aktien', grade: scan.grade, recordedAt: todayIso });
    }
    for (const sym of commoditySymbols) {
      const scan = commodityScans.find((s) => s.symbol === sym);
      if (scan) recordGradeSnapshot({ symbol: sym, klass: 'Rohstoffe', grade: scan.grade, recordedAt: todayIso });
    }
  }, [mounted, stockSymbols, commoditySymbols, stockScans, commodityScans, todayIso]);

  if (!mounted) {
    return (
      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">⭐ Watchlist-Aktion</h2>
        <p className="text-[11px] text-slate-500">Lade Watchlist …</p>
      </section>
    );
  }

  if (stockSymbols.length === 0 && commoditySymbols.length === 0) {
    return (
      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">⭐ Watchlist-Aktion</h2>
        <p className="text-[11px] leading-snug text-slate-500">
          Deine Aktien- und Rohstoff-Watchlist ist leer. Lege ein paar Werte an —
          {' '}<Link href="/aktien" className="text-emerald-300 hover:underline">Aktien</Link>{' '}
          oder{' '}<Link href="/rohstoffe" className="text-emerald-300 hover:underline">Rohstoffe</Link>{' '}
          — dann tauchen hier Verbesserung, Verschlechterung und Grade-A-Treffer auf.
        </p>
      </section>
    );
  }

  const assets: WatchedAsset[] = [];
  for (const sym of stockSymbols) {
    const scan = stockScans.find((s) => s.symbol === sym);
    if (!scan) continue;
    assets.push({
      klass: 'Aktien',
      symbol: scan.symbol,
      label: scan.name,
      previousGrade: previousGradeFor(snapshots, sym, 'Aktien', todayIso),
      currentGrade: scan.grade,
      currentScore: scan.score,
      href: `/aktien/${encodeURIComponent(scan.symbol)}`
    });
  }
  for (const sym of commoditySymbols) {
    const scan = commodityScans.find((s) => s.symbol === sym);
    if (!scan) continue;
    assets.push({
      klass: 'Rohstoffe',
      symbol: scan.symbol,
      label: scan.name,
      previousGrade: previousGradeFor(snapshots, sym, 'Rohstoffe', todayIso),
      currentGrade: scan.grade,
      currentScore: scan.score,
      href: `/rohstoffe/${encodeURIComponent(scan.symbol)}`
    });
  }
  const alarms = watchlistAlarms(assets);

  if (alarms.length === 0) {
    return (
      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">⭐ Watchlist-Aktion</h2>
        <p className="text-[11px] leading-snug text-slate-500">
          Heute keine besonderen Signale auf deinen {stockSymbols.length + commoditySymbols.length} gewatchten Werten —
          kein Grade-A-Treffer, keine sichtbare Veränderung. Watchlist bleibt einfach im Beobachtungs-Modus.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-400/40 bg-emerald-950/15 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">⭐ Watchlist-Aktion</h2>
        <span className="text-[10px] text-emerald-200/70">{alarms.length} Signal{alarms.length === 1 ? '' : 'e'}</span>
      </div>
      <ul className="space-y-1">
        {alarms.map((a) => (
          <li key={`${a.klass}-${a.symbol}-${a.signal}`}>
            <Link
              href={a.href}
              className={`grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px] transition hover:brightness-110 ${SIGNAL_TONE[a.signal]}`}
            >
              <div className="min-w-0">
                <div className="truncate font-semibold">{a.label} <span className="font-mono text-[9.5px] opacity-70">{a.symbol}</span></div>
                <div className="text-[9.5px] opacity-80">{a.klass} · {a.detail}</div>
                <div className="text-[9.5px] opacity-70 italic">{a.rationale}</div>
              </div>
              <span className="shrink-0 rounded border border-current/40 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider">
                {SIGNAL_LABEL[a.signal]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

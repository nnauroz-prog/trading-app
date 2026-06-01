'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal, summariseTips } from '@/lib/sport/tip-journal';

interface Props {
  safetyPickerName: string;
}

// Misst, was die Firma in den real aufgelösten Tipps geliefert hat — also
// Trefferquote auf bereits stattgefundenen Spielen aus dem Tip-Journal.
// Liefert ehrliche Zahlen statt Marketing-Versprechen: das ist der
// Track-Record, den die Firma Kunden wirklich zeigen kann.
export function FirmaTrackRecord({ safetyPickerName }: Props) {
  const [stats, setStats] = useState(() => summariseTips([]));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setStats(summariseTips(loadTipJournal()));
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <header>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Track-Record der Redaktion</h2>
        <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">
          Was zählt, sind aufgelöste Tipps — nicht Versprechen. Hier die echte Bilanz aller in deinem Tipp-Tagebuch gespeicherten Tipps der Firma.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Tipps total" value={stats.total} />
        <Stat label="Aufgelöst" value={stats.resolved} />
        <Stat label="Treffer" value={stats.wins} tone="good" />
        <Stat
          label="Trefferquote"
          value={stats.hitRatePct !== null ? `${stats.hitRatePct}%` : '—'}
          tone={stats.hitRatePct !== null && stats.hitRatePct >= 60 ? 'good' : stats.hitRatePct !== null && stats.hitRatePct < 40 ? 'bad' : 'neutral'}
        />
      </div>

      {stats.resolved < 10 && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-950/15 p-2.5 text-[10.5px] leading-snug text-amber-100/90">
          {stats.resolved === 0
            ? 'Noch keine Tipps aufgelöst — die echte Trefferquote zeigt sich erst nach den ersten 10–20 Spielen. Bis dahin keine Werbe-Zahlen.'
            : `Erst ${stats.resolved} Tipps aufgelöst — kleine Stichprobe, die Trefferquote wackelt noch. Aussagekraft steigt mit jedem weiteren Spiel.`}
        </p>
      )}

      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Auftrag der Redaktion</div>
        <p className="mt-1 text-[11.5px] leading-snug text-slate-200">
          So genau wie möglich tippen, ohne Garantien zu erfinden. Erfolg = wachsende Trefferquote über viele Spiele.{' '}
          <span className="font-semibold text-emerald-300">{safetyPickerName}</span> entscheidet, welche Begegnung über die 65 %-Schwelle kommt — alles darunter wird nicht beworben.
        </p>
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: 'good' | 'bad' | 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-300' : tone === 'bad' ? 'text-rose-300' : 'text-slate-100';
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono text-base font-bold ${cls}`}>{value}</div>
    </div>
  );
}

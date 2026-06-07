// Schneller Cross-Asset-Stats-Block für die Startseite. Zeigt heute:
// Anzahl Grade-A Aktien, Grade-A Rohstoffe, maximal-sichere WM- und Liga-Tipps,
// plus dem aktuellen Krypto-Safety-Grade. Klicks führen zu den jeweiligen Detail-Seiten.

import Link from 'next/link';

interface Props {
  stocksGradeA: number;
  stocksTotal: number;
  commoditiesGradeA: number;
  commoditiesTotal: number;
  wmMaximalCount: number;
  footballMaximalCount: number;
  cryptoGrade: 'A' | 'B' | 'C' | 'D' | null;
  cryptoSymbol: string | null;
}

const GRADE_TONE: Record<string, string> = {
  A: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100',
  B: 'border-sky-400/40 bg-sky-500/10 text-sky-200',
  C: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  D: 'border-rose-500/50 bg-rose-500/15 text-rose-200'
};

export function CrossAssetSafetyStats({
  stocksGradeA, stocksTotal,
  commoditiesGradeA, commoditiesTotal,
  wmMaximalCount, footballMaximalCount,
  cryptoGrade, cryptoSymbol
}: Props) {
  const totalSafe = stocksGradeA + commoditiesGradeA + wmMaximalCount + footballMaximalCount + (cryptoGrade === 'A' ? 1 : 0);
  return (
    <section className="space-y-3 rounded-2xl border border-emerald-400/30 bg-emerald-950/15 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">🛡️ Heute besonders sicher · Schnellblick</h2>
        <Link href="/heute-sicher" className="text-[10px] text-emerald-200 hover:text-emerald-100">
          alle anzeigen →
        </Link>
      </div>
      <p className="text-[10.5px] leading-snug text-emerald-100/70">
        {totalSafe > 0
          ? <>Aktuell <span className="font-bold text-emerald-200">{totalSafe} maximal-sichere Setups</span> quer durch alle Asset-Klassen.</>
          : 'Heute schaffen die strengen Filter wenig — Cash bleibt eine Position.'
        }
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <StatTile
          href="/assets"
          emoji="₿"
          label="Krypto"
          value={cryptoSymbol ?? '—'}
          subValue={cryptoGrade ? `Grade ${cryptoGrade}` : 'keine Daten'}
          tone={cryptoGrade ? (GRADE_TONE[cryptoGrade] ?? 'border-slate-700 bg-slate-950/40 text-slate-200') : 'border-slate-700 bg-slate-950/40 text-slate-200'}
        />
        <StatTile
          href="/aktien"
          emoji="📈"
          label="Aktien Grade A"
          value={`${stocksGradeA}`}
          subValue={`von ${stocksTotal}`}
          tone={stocksGradeA > 0 ? GRADE_TONE.A : 'border-slate-700 bg-slate-950/40 text-slate-200'}
        />
        <StatTile
          href="/rohstoffe"
          emoji="🛢️"
          label="Rohstoffe Grade A"
          value={`${commoditiesGradeA}`}
          subValue={`von ${commoditiesTotal}`}
          tone={commoditiesGradeA > 0 ? GRADE_TONE.A : 'border-slate-700 bg-slate-950/40 text-slate-200'}
        />
        <StatTile
          href="/wm"
          emoji="🏆"
          label="WM maximal-sicher"
          value={`${wmMaximalCount}`}
          subValue="Tipps ≥85 %"
          tone={wmMaximalCount > 0 ? GRADE_TONE.A : 'border-slate-700 bg-slate-950/40 text-slate-200'}
        />
        <StatTile
          href="/sport"
          emoji="⚽"
          label="Liga maximal-sicher"
          value={`${footballMaximalCount}`}
          subValue="Tipps ≥85 %"
          tone={footballMaximalCount > 0 ? GRADE_TONE.A : 'border-slate-700 bg-slate-950/40 text-slate-200'}
        />
      </div>
    </section>
  );
}

function StatTile({ href, emoji, label, value, subValue, tone }: {
  href: string;
  emoji: string;
  label: string;
  value: string;
  subValue: string;
  tone: string;
}) {
  return (
    <Link href={href} className={`rounded-lg border p-2 text-center transition hover:brightness-110 ${tone}`}>
      <div className="text-base leading-none">{emoji}</div>
      <div className="mt-1 text-[8.5px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-bold truncate">{value}</div>
      <div className="text-[8.5px] opacity-70">{subValue}</div>
    </Link>
  );
}

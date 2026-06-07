// Sparkline der Safety-Score-Entwicklung über die letzten Tage. Färbt
// einzelne Punkte nach Grade — grün = A, blau = B, gelb = C, rot = D.

import { analyzeStreak, type ScoreHistoryPoint } from '@/lib/market/safety-score-history';

const GRADE_COLOR: Record<ScoreHistoryPoint['grade'], string> = {
  A: '#34d399',
  B: '#38bdf8',
  C: '#facc15',
  D: '#fb7185'
};

export function SafetyScoreTrend({ points }: { points: ScoreHistoryPoint[] }) {
  if (points.length < 2) return null;
  const streak = analyzeStreak(points);
  const W = 320;
  const H = 80;

  const scores = points.map((p) => p.score);
  const min = 0;
  const max = 100;
  const range = max - min;
  const xs = (i: number) => (i / (points.length - 1)) * (W - 2) + 1;
  const ys = (v: number) => H - 1 - ((v - min) / range) * (H - 2);

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xs(i).toFixed(1)} ${ys(p.score).toFixed(1)}`).join(' ');
  const latest = points[points.length - 1];
  const first = points[0];
  const delta = latest.score - first.score;

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Sicherheits-Score-Verlauf · {points.length} Tage</h2>
        <span className={`font-mono text-[10.5px] ${delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
          {delta >= 0 ? '+' : ''}{delta} Punkte
        </span>
      </div>
      <p className="text-[10.5px] leading-snug text-slate-500">
        Walk-forward auf den letzten {points.length} Handelstagen: an jedem Tag das 8-Punkt-Gate ausgewertet, Score 0–100 hinterlegt.
        Steigend = die Aktie wird sicherer.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Verlauf des Sicherheits-Scores">
        <line x1={1} y1={ys(50)} x2={W - 1} y2={ys(50)} stroke="#475569" strokeWidth={0.4} strokeDasharray="2,3" />
        <path d={path} stroke="#94a3b8" strokeWidth={1.4} fill="none" />
        {points.map((p, i) => (
          <circle key={i} cx={xs(i)} cy={ys(p.score)} r={1.5} fill={GRADE_COLOR[p.grade]} />
        ))}
      </svg>
      <div className="grid grid-cols-4 gap-1 text-center text-[9.5px]">
        <span className="text-emerald-300">● A</span>
        <span className="text-sky-300">● B</span>
        <span className="text-amber-300">● C</span>
        <span className="text-rose-300">● D</span>
      </div>
      {streak && (
        <p className="text-[10.5px] leading-snug text-slate-400">
          Aktuelle Streak: <span className="font-mono font-bold text-slate-200">{streak.currentStreak}× Grade {streak.currentGrade}</span> in Folge.
          {' '}Im Fenster waren <span className="font-mono font-bold text-emerald-300">{streak.gradeADays}/{streak.windowDays}</span> Tage Grade A.
          {streak.daysSinceLastA !== null && streak.daysSinceLastA > 0 && (
            <> Letzter A: vor <span className="font-mono font-bold text-slate-200">{streak.daysSinceLastA} Tagen</span>.</>
          )}
          {streak.daysSinceLastA === null && (
            <> Im Fenster kein einziger Grade-A-Tag.</>
          )}
        </p>
      )}
    </section>
  );
}

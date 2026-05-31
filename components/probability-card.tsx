import { FootballProbabilityModel, ModelConfidence, DataQuality } from '@/lib/sport/probabilities';
import { AllTips, TipSelection } from '@/lib/sport/tip-selection';
import { TipSaveButton } from '@/components/tip-save-button';

function pct(p: number): string {
  return `${Math.round(p * 1000) / 10}%`;
}

function confidenceLabel(c: ModelConfidence): string {
  if (c === 'high') return 'hoch';
  if (c === 'medium') return 'mittel';
  return 'niedrig';
}

function dataQualityLabel(d: DataQuality): string {
  if (d === 'good') return 'gut';
  if (d === 'medium') return 'mittel';
  return 'schwach';
}

function confidenceBadge(c: ModelConfidence): string {
  if (c === 'high') return 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200';
  if (c === 'medium') return 'border-amber-400/50 bg-amber-500/15 text-amber-200';
  return 'border-rose-400/50 bg-rose-500/15 text-rose-200';
}

function Bar({ value, label, highlight }: { value: number; label: string; highlight: boolean }) {
  const w = Math.max(2, Math.round(value * 1000) / 10);
  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline justify-between text-[10px]">
        <span className={highlight ? 'text-white' : 'text-slate-400'}>{label}</span>
        <span className={`font-mono ${highlight ? 'font-bold text-white' : 'text-slate-300'}`}>{pct(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full ${highlight ? 'bg-emerald-400/80' : 'bg-slate-500/70'}`} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

function TipRow({ tip, ctx }: { tip: TipSelection; ctx: { fixtureId: string; date: string; league: string; home: string; away: string } | null }) {
  const tierColor =
    tip.tier === 'konservativ' ? 'text-emerald-300' :
    tip.tier === 'standard' ? 'text-sky-300' :
    'text-amber-300';
  return (
    <li className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[11px]">
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-[9px] font-bold uppercase tracking-wider ${tierColor}`}>{tip.tier}</span>
        <div className="flex items-baseline gap-1.5">
          {tip.available && <span className="font-mono text-[10px] text-slate-300">{tip.probabilityPct}%</span>}
          {tip.available && ctx && (
            <TipSaveButton
              fixtureId={ctx.fixtureId}
              fixtureDate={ctx.date}
              league={ctx.league}
              homeTeam={ctx.home}
              awayTeam={ctx.away}
              tier={tip.tier}
              market={tip.market}
              modelProbabilityPct={tip.probabilityPct}
            />
          )}
        </div>
      </div>
      <div className="mt-0.5 font-semibold text-white">{tip.market}</div>
      <p className="mt-0.5 text-[10px] leading-snug text-slate-400">{tip.reason}</p>
      {tip.warning && <p className="mt-0.5 text-[10px] italic text-amber-300/80">{tip.warning}</p>}
    </li>
  );
}

interface Props {
  homeTeam: string;
  awayTeam: string;
  model: FootballProbabilityModel;
  tips: AllTips;
  saveContext?: { fixtureId: string; date: string; league: string };
}

export function ProbabilityCard({ homeTeam, awayTeam, model, tips, saveContext }: Props) {
  const ctx = saveContext ? { fixtureId: saveContext.fixtureId, date: saveContext.date, league: saveContext.league, home: homeTeam, away: awayTeam } : null;
  const winner = model.homeWin >= Math.max(model.draw, model.awayWin) ? 'home' :
                 model.awayWin >= Math.max(model.draw, model.homeWin) ? 'away' : 'draw';

  return (
    <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[11px] font-semibold text-slate-100">
          <span className="font-bold text-white">{homeTeam}</span>
          <span className="mx-2 text-slate-500">vs.</span>
          <span className="font-bold text-white">{awayTeam}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${confidenceBadge(model.modelConfidence)}`}>
            Confidence {confidenceLabel(model.modelConfidence)}
          </span>
          <span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-slate-400">
            Daten {dataQualityLabel(model.dataQuality)}
          </span>
        </div>
      </div>

      {/* 1X2 */}
      <div className="space-y-1.5">
        <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Ergebnis-Tendenz</div>
        <div className="grid grid-cols-3 gap-2">
          <Bar value={model.homeWin} label="Heim" highlight={winner === 'home'} />
          <Bar value={model.draw} label="Unentschieden" highlight={winner === 'draw'} />
          <Bar value={model.awayWin} label="Auswärts" highlight={winner === 'away'} />
        </div>
      </div>

      {/* Tore */}
      <div className="space-y-1.5">
        <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Tore</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <Bar value={model.over15} label="Over 1.5" highlight={model.over15 >= 0.65} />
          <Bar value={model.over25} label="Over 2.5" highlight={model.over25 >= 0.55} />
          <Bar value={model.bothTeamsToScore} label="Beide treffen" highlight={model.bothTeamsToScore >= 0.55} />
          <Bar value={model.under25} label="Under 2.5" highlight={model.under25 >= 0.55} />
        </div>
      </div>

      {/* Top Scorelines */}
      <div className="space-y-1">
        <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Wahrscheinlichste Ergebnisse</div>
        <ul className="flex flex-wrap gap-1.5">
          {model.topScorelines.map((s, i) => (
            <li key={i} className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-[11px]">
              <span className="font-bold text-white">{s.score}</span>
              <span className="ml-1 text-slate-400">{pct(s.probability)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Head-to-Head */}
      {model.headToHead.totalGames > 0 && (
        <div className="space-y-1">
          <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Direkte Aufeinandertreffen</div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11px] text-slate-300">
            <span>{model.headToHead.totalGames} Spiele im Feed</span>
            <span className="font-mono">
              <span className="text-emerald-300">{model.headToHead.homeWins}</span>
              <span className="mx-0.5 text-slate-500">/</span>
              <span className="text-slate-400">{model.headToHead.draws}</span>
              <span className="mx-0.5 text-slate-500">/</span>
              <span className="text-rose-300">{model.headToHead.awayWins}</span>
            </span>
            <span className="text-[10px] text-slate-500">(Heim/U/Auswärts aus {homeTeam}-Sicht)</span>
          </div>
          {model.headToHead.recentResults.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {model.headToHead.recentResults.map((r, i) => (
                <span key={i} className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px]">
                  <span className="text-slate-500">{r.date.slice(5)} </span>
                  <span className={r.winner === 'home' ? 'text-emerald-300' : r.winner === 'away' ? 'text-rose-300' : 'text-slate-300'}>
                    {r.score}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Drei Tipp-Stufen */}
      <div className="space-y-1.5">
        <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Tipp-Vorschläge</div>
        <ul className="space-y-1.5">
          <TipRow tip={tips.konservativ} ctx={ctx} />
          <TipRow tip={tips.standard} ctx={ctx} />
          <TipRow tip={tips.risiko} ctx={ctx} />
        </ul>
      </div>

      <p className="text-[10px] italic leading-relaxed text-slate-500">{model.explanation} Prozente sind Modell-Schätzungen, keine Garantien.</p>
    </div>
  );
}

import { RiskAlert, RiskGuardianReport, RiskSeverity } from '@/lib/risk/risk-guardian';

function severityStyle(severity: RiskSeverity): { border: string; bg: string; icon: string; text: string } {
  switch (severity) {
    case 'critical': return { border: 'border-rose-500/60', bg: 'bg-rose-950/30', icon: '🛑', text: 'text-rose-200' };
    case 'danger': return { border: 'border-rose-500/40', bg: 'bg-rose-950/15', icon: '⚠', text: 'text-rose-300' };
    case 'warning': return { border: 'border-amber-500/40', bg: 'bg-amber-950/15', icon: '⚠', text: 'text-amber-200' };
    case 'info': return { border: 'border-sky-500/30', bg: 'bg-sky-950/15', icon: 'ℹ', text: 'text-sky-200' };
  }
}

function AlertItem({ alert }: { alert: RiskAlert }) {
  const style = severityStyle(alert.severity);
  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} p-3`}>
      <div className="flex items-start gap-2">
        <span className="text-sm">{style.icon}</span>
        <div className="flex-1">
          <div className={`text-sm font-semibold ${style.text}`}>{alert.title}</div>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-300">{alert.message}</p>
          {alert.actionLabel && (
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Empfohlene Aktion: {alert.actionLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function RiskGuardianPanel({ report, compact = false }: { report: RiskGuardianReport; compact?: boolean }) {
  if (report.alerts.length === 0) {
    return (
      <section className="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-emerald-300">✓</span>
          <span className="font-semibold text-emerald-200">Risk Guardian: Alles ruhig</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {report.openPositions === 0
            ? 'Keine offenen Positionen — kein Position-Risiko aktiv.'
            : `${report.openPositions} offene Position(en) ohne Warnung. Stop-Levels und These trotzdem regelmäßig prüfen.`}
        </p>
      </section>
    );
  }

  const toShow = compact ? report.alerts.slice(0, 4) : report.alerts;

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {compact ? 'Heute aufpassen' : 'Risk Guardian'}
        </h2>
        <span className="font-mono text-[10px] text-slate-500">
          {report.criticalCount > 0 && <span className="text-rose-400">{report.criticalCount} kritisch · </span>}
          {report.dangerCount > 0 && <span className="text-rose-300">{report.dangerCount} danger · </span>}
          {report.warningCount > 0 && <span className="text-amber-300">{report.warningCount} warn · </span>}
          {report.infoCount > 0 && <span className="text-sky-300">{report.infoCount} info</span>}
        </span>
      </div>
      <div className="space-y-2">
        {toShow.map((a) => <AlertItem key={a.id} alert={a} />)}
      </div>
      {compact && report.alerts.length > toShow.length && (
        <div className="pt-1 text-center">
          <a href="/positions" className="text-[11px] text-emerald-300 hover:underline">
            +{report.alerts.length - toShow.length} weitere Warnungen → /positions
          </a>
        </div>
      )}
    </section>
  );
}

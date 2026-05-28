import { IntegrationStatus } from '@/lib/integrations';

export function IntegrationsStatusPanel({ integrations }: { integrations: IntegrationStatus[] }) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Integrationen</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Externe Dienste sind optional — die App funktioniert ohne sie. Schlüssel werden serverseitig gesetzt; hier siehst du nur den Verbindungsstatus, niemals die Werte selbst.
        </p>
      </div>

      <div className="space-y-3">
        {integrations.map((i) => (
          <div key={i.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-200">{i.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                      i.connected
                        ? 'border border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
                        : 'border border-slate-700 bg-slate-900 text-slate-400'
                    }`}
                  >
                    {i.connected ? 'Verbunden' : 'Nicht verbunden'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{i.purpose}</p>
              </div>
              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                  i.connected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-700'
                }`}
              />
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {i.envVars.map((e) => (
                <span
                  key={e.name}
                  className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${
                    e.set ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-500'
                  }`}
                >
                  {e.set ? '✓' : '○'} {e.name}
                </span>
              ))}
            </div>

            {!i.connected && (
              <p className="mt-2.5 rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 text-[10px] leading-relaxed text-slate-500">
                <span className="font-semibold text-slate-400">Einrichten:</span> {i.setup}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

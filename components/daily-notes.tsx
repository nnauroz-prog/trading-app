import { AgentVerdict } from '@/lib/agents/personas';
import { composeDailyNote } from '@/lib/agents/daily-note';

export function DailyNotes({ personas }: { personas: AgentVerdict[] }) {
  const notes = personas.map(composeDailyNote);
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tages-Notizen der CEOs</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Drei kurze Beiträge, jeder im Stil seines CEOs geschrieben. Wer was kauft, warum, oder warum heute Cash-Tag ist.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {notes.map((n) => {
          const accent =
            n.firma === 'conservative' ? 'border-sky-400/40 bg-sky-950/15' :
            n.firma === 'balanced' ? 'border-amber-400/40 bg-amber-950/15' :
            'border-rose-400/40 bg-rose-950/15';
          return (
            <article key={n.firma} className={`space-y-2 rounded-2xl border-2 p-4 ${accent}`}>
              <div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">{n.firmaName} · {n.ceoName}</div>
                <h3 className="mt-0.5 text-sm font-bold text-white">{n.title}</h3>
              </div>
              <div className="space-y-2 text-[12px] leading-relaxed text-slate-200">
                {n.body.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

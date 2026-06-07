// Aggregiert über alle 15 Vorstands-Picks und zeigt jene Assets, die mehr als
// eine Persönlichkeit als Top-Pick gewählt hat. Stärkstes Konsens-Signal —
// wenn Konservativ UND Aggressiv das gleiche wählen, ist das selten.

import Link from 'next/link';

export interface PersonaPickEntry {
  klass: 'Krypto' | 'Aktien' | 'Rohstoffe' | 'WM' | 'Liga-Fußball';
  personaId: string;
  personaName: string;
  verdict: string;
  assetKey: string;   // symbol oder eindeutige Fixture-ID
  assetLabel: string; // Anzeige-Name
  href: string;
}

interface ConsensusGroup {
  assetKey: string;
  assetLabel: string;
  klass: string;
  href: string;
  picks: PersonaPickEntry[];
}

function tone(verdict: string): string {
  if (verdict === 'KAUFEN' || verdict === 'BUY' || verdict === 'TIPPEN') {
    return 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100';
  }
  if (verdict === 'BEOBACHTEN') {
    return 'border-amber-400/40 bg-amber-500/10 text-amber-100';
  }
  return 'border-slate-700 bg-slate-900/40 text-slate-300';
}

export function PersonaConsensusPicks({ entries }: { entries: PersonaPickEntry[] }) {
  const groupMap = new Map<string, ConsensusGroup>();
  for (const e of entries) {
    const key = `${e.klass}::${e.assetKey}`;
    const existing = groupMap.get(key);
    if (existing) {
      existing.picks.push(e);
    } else {
      groupMap.set(key, {
        assetKey: e.assetKey,
        assetLabel: e.assetLabel,
        klass: e.klass,
        href: e.href,
        picks: [e]
      });
    }
  }
  const groups = [...groupMap.values()].filter((g) => g.picks.length >= 2);
  groups.sort((a, b) => b.picks.length - a.picks.length);

  if (groups.length === 0) {
    return (
      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">🎯 Konsens-Picks der Vorstände</h2>
        <p className="text-[11px] leading-snug text-slate-400">
          Heute kein Asset, auf das mehrere Persönlichkeiten gleichzeitig zeigen. Wenn das auftritt, ist es ein starkes Signal.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-400/40 bg-emerald-950/15 p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">🎯 Konsens-Picks der Vorstände</h2>
        <p className="mt-1 text-[10.5px] leading-snug text-emerald-100/70">
          Assets, die heute von ≥2 Persönlichkeiten gewählt wurden. Je mehr Persönlichkeiten zustimmen, desto breiter das Modell-Vertrauen.
        </p>
      </div>
      <ul className="space-y-1.5">
        {groups.map((g) => (
          <li key={`${g.klass}::${g.assetKey}`}>
            <Link
              href={g.href}
              className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-emerald-400/30 bg-slate-950/40 px-2.5 py-1.5 text-[11px] transition hover:brightness-110"
            >
              <div>
                <div className="font-semibold text-slate-100">{g.assetLabel}</div>
                <div className="text-[9.5px] text-slate-500">{g.klass}</div>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-mono text-[10px] text-emerald-300">{g.picks.length}/3 oder mehr</span>
                {g.picks.map((p) => (
                  <span key={`${p.klass}-${p.personaId}`} className={`rounded border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${tone(p.verdict)}`}>
                    {p.personaName}
                  </span>
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

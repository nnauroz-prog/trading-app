// Klartext-Glossar: alle Fachbegriffe in einem Satz erklaert,
// gruppiert nach Kategorie. Aufklappbar, server-renderbar.

import { glossarByCategory, type GlossarEntry } from '@/lib/sport/wm-glossar';

const CATEGORY_LABEL: Record<GlossarEntry['category'], string> = {
  pick: '🎯 Tipps und Modell',
  lernen: '🧠 Lern-System',
  daten: '📊 Spielplan und Daten',
  geld: '💰 Geld und Einsaetze',
  sicherheit: '🛡️ Sicherheit und Sperren'
};

export function WmGlossarCard() {
  const groups = glossarByCategory();
  const order: GlossarEntry['category'][] = ['pick', 'lernen', 'daten', 'geld', 'sicherheit'];

  return (
    <details className="rounded-2xl border border-slate-800/80 bg-slate-900/30">
      <summary className="cursor-pointer p-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
        ▸ Klartext-Glossar (jeder Begriff in einem Satz erklaert)
      </summary>
      <div className="space-y-3 p-3 pt-0">
        {order.map((cat) => (
          <section key={cat}>
            <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">{CATEGORY_LABEL[cat]}</h4>
            <ul className="space-y-1">
              {groups[cat].map((e) => (
                <li key={e.term} className="rounded border border-slate-800 bg-slate-950/40 px-2 py-1.5 text-[11px]">
                  <span className="font-semibold text-slate-100">{e.term}</span>
                  <span className="ml-1.5 text-slate-300">— {e.plain}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}

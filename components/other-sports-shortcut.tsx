// Wenn der Fußball-Pool leer ist, ein Kurz-Cluster „andere Sportarten heute"
// — direkte Links zu den vorhandenen Reitern. Bewusst clientseitig nicht,
// damit der Build schlank bleibt: rein statische Link-Liste.

import Link from 'next/link';

interface Props {
  upcomingFootballCount: number;
}

const TABS = [
  { href: '/wm', label: 'WM 2026', emoji: '🏆', hint: 'Spielplan + Hosts' },
  { href: '/basketball', label: 'Basketball', emoji: '🏀', hint: 'NBA, EuroLeague, BBL' },
  { href: '/tennis', label: 'Tennis', emoji: '🎾', hint: 'ATP, WTA, Grand Slams' },
  { href: '/eishockey', label: 'Eishockey', emoji: '🏒', hint: 'NHL, DEL, KHL, SHL' },
  { href: '/handball', label: 'Handball', emoji: '🤾', hint: 'HBL, EHF CL, ASOBAL' }
];

export function OtherSportsShortcut({ upcomingFootballCount }: Props) {
  // Nur einblenden, wenn Fußball heute praktisch tot ist — sonst Doppelung
  // mit der Top-Navigation oben.
  if (upcomingFootballCount > 15) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Andere Sportarten</h2>
      <p className="text-[10.5px] leading-snug text-slate-500">
        Fußball-Pool dünn? Schau in einen der anderen Reiter — manche Sportarten haben Sommer-Saison.
      </p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {TABS.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 transition hover:border-emerald-400/40 hover:bg-slate-900/60"
            >
              <span aria-hidden className="text-lg leading-none">{t.emoji}</span>
              <span className="min-w-0">
                <span className="block truncate text-[11.5px] font-semibold text-slate-100">{t.label}</span>
                <span className="block truncate text-[10px] text-slate-500">{t.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

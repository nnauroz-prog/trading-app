// Startseiten-Hero: klares Wertversprechen + sichtbarer Disclaimer.
// Ersetzt den frueheren Tag-Wand-Erstkontakt. Bewusst knapp und
// scanbar — User soll in 3 Sekunden verstehen, was die App leistet
// und was sie NICHT ist (kein Anlageratschlag).

import { isWmOver } from '@/lib/sport/wm-tournament-phase';

interface Props {
  todayIso: string;
}

function fmtDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin'
  });
}

export function HomeHero({ todayIso }: Props) {
  return (
    <header className="relative space-y-3 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-950/50 to-slate-950/70 p-5 shadow-[0_20px_60px_-24px_rgba(56,189,248,0.4)] md:p-7">
      <div className="aurora" aria-hidden />
      <div className="relative z-10 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
          Trading Desk · {fmtDay(todayIso)}
        </div>
        <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
          Kein Anlageratschlag
        </span>
      </div>

      <h1 className="text-[26px] font-bold leading-[1.1] tracking-tight sm:text-4xl">
        <span className="text-gradient">Dein Trading-Desk</span>
        <span className="text-white"> für Krypto, Aktien &amp; Rohstoffe.</span>
      </h1>

      <p className="max-w-2xl text-[13px] leading-relaxed text-slate-300/90 sm:text-sm">
        Klare Signale, ehrliche Konfidenz, offengelegte Datenherkunft — keine versteckten Versprechen,
        keine erfundenen Erfolgsquoten. Du entscheidest, der Desk liefert die Grundlage.
      </p>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <HeroBullet emoji="🛡️" label="Heute sicher" desc="Grade-A-Picks ueber alle Asset-Klassen" href="/heute-sicher" />
        {/* Nach dem WM-Finale verschwindet die WM-Kachel — stattdessen Sport
            allgemein, damit der Hero kein totes Turnier bewirbt. */}
        {isWmOver(todayIso) ? (
          <HeroBullet emoji="⚽" label="Sport" desc="Prognosen für laufende Ligen" href="/sport" />
        ) : (
          <HeroBullet emoji="🏆" label="WM 2026" desc="Pro Spiel Sieger-Vorhersage" href="/wm" />
        )}
        <HeroBullet emoji="📈" label="Aktien-Check" desc="8-Kriterien-Sicherheit" href="/aktien" />
        <HeroBullet emoji="⚖️" label="Optionsscheine" desc="3 Risiko-Setups bei Kauf" href="/optionsscheine" />
      </ul>

      <a
        href="/radar"
        className="group flex items-center justify-between gap-3 rounded-2xl border border-cyan-400/30 bg-cyan-500/[0.07] p-3 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-400/60 hover:shadow-[0_12px_34px_-14px_rgba(56,189,248,0.6)]"
      >
        <span className="flex items-center gap-2.5">
          <span aria-hidden className="text-xl">🛰️</span>
          <span>
            <span className="block text-[12.5px] font-semibold text-white">Geld-Radar — womit andere gerade Geld machen</span>
            <span className="block text-[10px] text-slate-400">Weltweite Finanz-News, auf Deutsch nach Geld-Relevanz sortiert</span>
          </span>
        </span>
        <span className="shrink-0 text-[11px] font-semibold text-cyan-300 transition group-hover:translate-x-0.5">öffnen →</span>
      </a>
      </div>
    </header>
  );
}

function HeroBullet({ emoji, label, desc, href }: { emoji: string; label: string; desc: string; href: string }) {
  return (
    <a
      href={href}
      className="group rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-400/50 hover:bg-emerald-500/[0.07] hover:shadow-[0_10px_30px_-12px_rgba(52,211,153,0.5)]"
    >
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-xl leading-none transition-transform duration-200 group-hover:scale-110">{emoji}</span>
        <span className="text-[11.5px] font-semibold text-slate-100 group-hover:text-emerald-200">{label}</span>
      </div>
      <p className="mt-1 text-[10px] leading-snug text-slate-400">{desc}</p>
    </a>
  );
}

// Startseiten-Hero: klares Wertversprechen + sichtbarer Disclaimer.
// Ersetzt den frueheren Tag-Wand-Erstkontakt. Bewusst knapp und
// scanbar — User soll in 3 Sekunden verstehen, was die App leistet
// und was sie NICHT ist (kein Anlageratschlag).

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
    <header className="space-y-3 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/60 to-slate-950/40 p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
          Decision Support · {fmtDay(todayIso)}
        </div>
        <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
          Kein Anlageratschlag
        </span>
      </div>

      <h1 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
        Tagesentscheidungen fuer Krypto, Aktien, Rohstoffe und Sport — transparent gerechnet.
      </h1>

      <p className="max-w-2xl text-[13px] leading-relaxed text-slate-300 sm:text-sm">
        Modell-basierte Hinweise mit offengelegter Datenherkunft und ehrlichen Konfidenzwerten.
        Keine versteckten Versprechen, keine erfundenen Erfolgsquoten. Du entscheidest selbst,
        die App liefert die Grundlage.
      </p>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <HeroBullet emoji="🛡️" label="Heute sicher" desc="Grade-A-Picks ueber alle Asset-Klassen" href="/heute-sicher" />
        <HeroBullet emoji="🏆" label="WM 2026" desc="Pro Spiel Sieger-Vorhersage" href="/wm" />
        <HeroBullet emoji="📈" label="Aktien-Check" desc="8-Kriterien-Sicherheit" href="/aktien" />
        <HeroBullet emoji="⚖️" label="Optionsscheine" desc="3 Risiko-Setups bei Kauf" href="/optionsscheine" />
      </ul>
    </header>
  );
}

function HeroBullet({ emoji, label, desc, href }: { emoji: string; label: string; desc: string; href: string }) {
  return (
    <a
      href={href}
      className="group rounded-xl border border-slate-800 bg-slate-950/50 p-2.5 transition hover:border-emerald-400/40 hover:bg-slate-900/60"
    >
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-lg leading-none">{emoji}</span>
        <span className="text-[11px] font-semibold text-slate-100 group-hover:text-emerald-200">{label}</span>
      </div>
      <p className="mt-1 text-[10px] leading-snug text-slate-400">{desc}</p>
    </a>
  );
}

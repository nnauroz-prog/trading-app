import type { FirmaSynthesis } from '@/lib/sport/firma/synthesis';

// Zwei Kurz-Statements von den beiden Wächtern, abhängig von der heutigen
// Datenlage. Macht die zwei Rollen lebendiger als nur als Namens-Liste.
export function SportCuratorsQuote({ synth }: { synth: FirmaSynthesis }) {
  const safetyCount = synth.highConfidencePicks.length;
  const dailyBest = synth.dailyTopPick;
  const fixtures = synth.totalFixturesNext7d;

  const vogtSays =
    safetyCount === 0
      ? `„Heute lasse ich nichts durch. ${fixtures === 0 ? 'Keine Begegnungen in den Ligen mit auswertbarer Form.' : `Keines der ${fixtures} Spiele schafft die 65 %-Schwelle.`} Lieber leerer Block als überdehnte Top-Tipps."`
      : safetyCount === 1
      ? `„Genau ein klar getakteter Tipp. Wer mehr will, sucht sich woanders Versprechen — bei uns landet nur, was wirklich passt."`
      : `„${safetyCount} klar getaktete Tipps stehen oben — alle ≥ 65 % Modell-Wahrscheinlichkeit. Trefferquote bleibt offen, das ist kein Versprechen."`;

  const wiesingerSays = !dailyBest
    ? `„Ohne Form-Daten kein Tipp des Tages. Sobald die Sommer-Ligen frische Spielergebnisse liefern, melde ich mich wieder."`
    : dailyBest.confidence >= synth.safetyPickThreshold
    ? `„Heute fällt mein Tag-Pick zusammen mit der Top-Liste: ${dailyBest.fixture.homeTeam} vs. ${dailyBest.fixture.awayTeam}. Manchmal ist die offensichtlichste Wahl auch die plausibelste."`
    : `„Wenn unter Rolands 65 % nichts kommt, suche ich trotzdem den plausibelsten verfügbaren Tipp: ${dailyBest.fixture.homeTeam} vs. ${dailyBest.fixture.awayTeam} mit ${Math.round(dailyBest.confidence * 100)} %. Keine Garantie, nur das Beste was die Daten heute hergeben."`;

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Heute aus der Redaktion</h2>
      <div className="space-y-1.5">
        <Quote name={synth.safetyPicker.name} role="Top-Tipp-Wächter" text={vogtSays} />
        <Quote name={synth.dailyPickCurator.name} role="Tipp-des-Tages-Kuratorin" text={wiesingerSays} />
      </div>
    </section>
  );
}

function Quote({ name, role, text }: { name: string; role: string; text: string }) {
  return (
    <blockquote className="border-l-2 border-emerald-400/50 pl-2.5 text-[11.5px] leading-snug text-slate-100">
      {text}
      <div className="mt-0.5 text-[9.5px] uppercase tracking-wider text-slate-500">— {name}, {role}</div>
    </blockquote>
  );
}

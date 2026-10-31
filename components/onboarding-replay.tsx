import Link from 'next/link';

export function OnboardingReplay() {
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <h2 className="text-base font-semibold text-slate-200">Deinen Geldplan anpassen</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">Ein anderer Betrag oder ein neues Ziel? Du kannst deine Angaben jederzeit ändern.</p>
      <Link href="/geldplan" className="terminal-button mt-4">Geldplan ändern</Link>
    </section>
  );
}

'use client';

import { resetOnboarding } from '@/lib/onboarding';

export function OnboardingReplay() {
  const handle = () => {
    resetOnboarding();
    window.location.href = '/';
  };
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Setup-Assistent</h2>
      <p className="mt-1 text-[11px] text-slate-500">Den geführten Erst-Setup (Risiko-Profil, Kapital, Überblick) noch einmal durchlaufen.</p>
      <button onClick={handle} className="mt-3 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-500/40 hover:text-emerald-200">
        Setup erneut anzeigen
      </button>
    </section>
  );
}

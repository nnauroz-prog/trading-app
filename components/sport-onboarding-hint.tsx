'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal } from '@/lib/sport/tip-journal';
import { TIPPRUNDE_CHANGED_EVENT, loadProfile } from '@/lib/sport/tipprunde';

const SEEN_KEY = 'trading-app.sport-onboarding-seen-v1';

// Schmaler einmaliger Hinweis-Block für neue User: was die Sport-Seite tut
// und in welcher Reihenfolge die Karten zu lesen sind. Wird ausgeblendet,
// sobald der User mindestens einen Tipp gespeichert oder ein Profil gesetzt
// hat — sonst ist er sowieso schon orientiert.
export function SportOnboardingHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const sync = () => {
      const seen = window.localStorage.getItem(SEEN_KEY) === '1';
      const hasProfile = !!loadProfile();
      const hasTips = loadTipJournal().length > 0;
      setShow(!seen && !hasProfile && !hasTips);
    };
    sync();
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    window.addEventListener(TIPPRUNDE_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
      window.removeEventListener(TIPPRUNDE_CHANGED_EVENT, sync);
    };
  }, []);

  if (!show) return null;

  const dismiss = () => {
    window.localStorage.setItem(SEEN_KEY, '1');
    setShow(false);
  };

  return (
    <section className="space-y-2 rounded-2xl border border-emerald-400/40 bg-emerald-950/15 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Willkommen</h2>
        <button
          type="button"
          onClick={dismiss}
          className="text-[10px] text-emerald-200/60 hover:text-emerald-200"
        >
          ✕ verstanden
        </button>
      </div>
      <p className="text-[11.5px] leading-snug text-emerald-50/90">
        Diese Seite zeigt Fußball-Prognosen für deine private Tipprunde — keine Wettempfehlung, keine Garantie.
      </p>
      <ol className="space-y-1 text-[11px] leading-snug text-emerald-100/80">
        <li><span className="font-semibold text-emerald-200">1.</span> Oben: <span className="text-emerald-100">beste Prognose heute</span> mit Quality-Score 0–100 und kurzer Begründung.</li>
        <li><span className="font-semibold text-emerald-200">2.</span> <span className="text-emerald-100">+ tippen</span> oder eigenes Ergebnis eingeben → landet im Tipp-Tagebuch.</li>
        <li><span className="font-semibold text-emerald-200">3.</span> <span className="text-emerald-100">Tipprunde-Profil</span> setzen → Streak und Trefferquote werden automatisch geführt.</li>
        <li><span className="font-semibold text-emerald-200">4.</span> Spiel-Ende → App wertet automatisch aus, sobald die Ergebnisse durchkommen.</li>
      </ol>
    </section>
  );
}

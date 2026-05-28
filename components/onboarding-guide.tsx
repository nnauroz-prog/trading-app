'use client';

import { useEffect, useRef, useState } from 'react';
import { UserRiskProfile } from '@/lib/types/ideas';
import { loadUserProfile, profileDescription, profileLabel, saveUserProfile } from '@/lib/user-profile';
import { AccountConfig, loadConfig, saveConfig } from '@/lib/account-config';
import { isOnboardingDone, markOnboardingDone } from '@/lib/onboarding';

const PROFILES: UserRiskProfile[] = ['beginner', 'intermediate', 'speculative', 'very_speculative'];

const TABS = [
  ['Idee', 'Trade-Idee einfügen → Score, Risiken, Sizing-Vorschlag.'],
  ['Positionen', 'Offene Trades verwalten, Stop/TP, Live-P/L.'],
  ['Warnung', 'Risk-Guardian: was an deinem Portfolio gerade gefährlich ist.'],
  ['Settings', 'Risk-Schwellen, Daten-Backup & Geräte-Übertragung.']
] as const;

export function OnboardingGuide() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserRiskProfile>('intermediate');
  const [sizeInput, setSizeInput] = useState('');
  const [currency, setCurrency] = useState<'EUR' | 'USD'>('EUR');
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOnboardingDone()) {
      setProfile(loadUserProfile());
      const c = loadConfig();
      setCurrency(c.currency);
      if (c.accountSize > 0) setSizeInput(String(c.accountSize));
      setOpen(true);
    }
  }, []);

  const finish = () => {
    saveUserProfile(profile);
    const size = parseFloat(sizeInput);
    if (Number.isFinite(size) && size > 0) {
      const c = loadConfig();
      const next: AccountConfig = { ...c, accountSize: size, currency };
      saveConfig(next);
    }
    markOnboardingDone();
    setOpen(false);
  };

  const skip = () => {
    markOnboardingDone();
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        markOnboardingDone();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Setup-Assistent"
        tabIndex={-1}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            Setup · Schritt {step + 1}/3
          </div>
          <button onClick={skip} className="text-[11px] text-slate-500 hover:text-slate-300">Überspringen</button>
        </div>

        <div className="px-5 py-5">
          {step === 0 && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-white">Willkommen am Trading Desk</h2>
              <p className="text-sm leading-relaxed text-slate-300">
                Dein persönliches Cockpit: Ideen prüfen, Positionen managen, Risiken früh sehen. Daten liegen lokal in diesem Browser — du behältst die Kontrolle.
              </p>
              <div className="rounded-lg border border-amber-500/20 bg-amber-950/15 p-3 text-[11px] leading-relaxed text-amber-200/80">
                <span className="font-semibold text-amber-300">Wichtig:</span> Das ist keine Finanzberatung. Marktdaten können falsch oder verzögert sein. Jede Entscheidung — und jedes Risiko bis zum Totalverlust — liegt bei dir.
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-white">Dein Risiko-Profil</h2>
              <p className="text-[12px] text-slate-400">Steuert, wie streng dich Warnungen und Idee-Bewertungen anfassen. Jederzeit änderbar.</p>
              <div className="space-y-2">
                {PROFILES.map((p) => (
                  <button
                    key={p}
                    onClick={() => setProfile(p)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      profile === p
                        ? 'border-emerald-400/50 bg-emerald-500/10'
                        : 'border-slate-700 bg-slate-950/40 hover:border-slate-600'
                    }`}
                  >
                    <div className={`text-sm font-semibold ${profile === p ? 'text-emerald-200' : 'text-slate-200'}`}>{profileLabel(p)}</div>
                    <div className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{profileDescription(p)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-white">Trading-Kapital (optional)</h2>
              <p className="text-[12px] text-slate-400">
                Damit jedes Signal dir konkret zeigt, wie viel € einzusetzen und zu riskieren sind. Kannst du auch leer lassen und später setzen.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  value={sizeInput}
                  onChange={(e) => setSizeInput(e.target.value)}
                  placeholder="z.B. 5000"
                  className="w-32 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as 'EUR' | 'USD')}
                  className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Wo finde ich was</div>
                <ul className="space-y-1 text-[11px] text-slate-400">
                  {TABS.map(([name, desc]) => (
                    <li key={name}><span className="font-semibold text-slate-200">{name}</span> — {desc}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-800 px-5 py-3">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-600 disabled:opacity-30"
          >
            Zurück
          </button>
          {step < 2 ? (
            <button onClick={() => setStep((s) => s + 1)} className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-4 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30">
              Weiter
            </button>
          ) : (
            <button onClick={finish} className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-4 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30">
              Los geht&apos;s
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

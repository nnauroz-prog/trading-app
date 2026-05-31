'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'trading-app.install-prompt-dismissed-v1';

// Surface the browser's PWA install prompt when available. Dismissable;
// remembers the dismissal locally so we don't nag.
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(DISMISSED_KEY);
    setDismissed(stored === '1');

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (dismissed || !deferred) return null;

  const install = async () => {
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted' || outcome === 'dismissed') {
      window.localStorage.setItem(DISMISSED_KEY, '1');
      setDeferred(null);
      setDismissed(true);
    }
  };

  const dismiss = () => {
    window.localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  return (
    <section className="space-y-2 rounded-2xl border-2 border-sky-400/40 bg-sky-950/20 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-sky-200">App auf den Home-Screen?</h2>
        <button onClick={dismiss} className="text-[10px] text-slate-400 hover:text-slate-200">✕</button>
      </div>
      <p className="text-[12px] text-slate-200">
        Du kannst die App wie eine native App installieren — schneller Zugriff, Vollbild, kein Browser-Chrome. Funktioniert auch offline für statische Inhalte.
      </p>
      <button
        onClick={install}
        className="rounded-md border border-sky-400/50 bg-sky-500/15 px-3 py-1.5 text-[11px] font-semibold text-sky-100 hover:border-sky-300"
      >
        Installieren
      </button>
    </section>
  );
}

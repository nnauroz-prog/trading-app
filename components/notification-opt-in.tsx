'use client';

import { useEffect, useState } from 'react';

const SEEN_KEY = 'trading-app.sport-notif-opt-in-seen-v1';

// Schmale Karte, die einmalig fragt: „Browser-Erinnerung wenn dein Spiel
// beginnt?". Kein Server, nur lokale Notification-API. Wird nach Klick
// ausgeblendet — kein wiederholtes Nerven.
export function NotificationOptIn() {
  const [show, setShow] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    const seen = window.localStorage.getItem(SEEN_KEY) === '1';
    setPermission(Notification.permission);
    setShow(!seen && Notification.permission === 'default');
  }, []);

  if (!show) return null;

  const accept = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch {
      // noop
    }
    window.localStorage.setItem(SEEN_KEY, '1');
    setShow(false);
  };

  const dismiss = () => {
    window.localStorage.setItem(SEEN_KEY, '1');
    setShow(false);
  };

  return (
    <section className="space-y-1.5 rounded-2xl border border-sky-400/30 bg-sky-950/15 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">Browser-Erinnerung</span>
        <button
          type="button"
          onClick={dismiss}
          className="text-[10px] text-sky-200/60 hover:text-sky-200"
          aria-label="Hinweis ausblenden"
        >
          ✕
        </button>
      </div>
      <p className="text-[11px] leading-snug text-sky-100/85">
        Möchtest du eine Browser-Benachrichtigung bekommen, wenn deine gespeicherten Tipp-Spiele beginnen?
        Komplett lokal, keine Daten verlassen den Browser.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={accept}
          className="rounded-md border border-sky-400/50 bg-sky-500/15 px-3 py-1 text-[11px] font-semibold text-sky-100 hover:bg-sky-500/25"
        >
          aktivieren
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] text-slate-300 hover:border-slate-500"
        >
          später
        </button>
      </div>
      {permission === 'denied' && (
        <p className="text-[10px] text-rose-300">
          Benachrichtigungen sind im Browser blockiert — du kannst das in den Site-Einstellungen ändern.
        </p>
      )}
    </section>
  );
}

'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="de">
      <body style={{ margin: 0, background: '#020617', color: '#e2e8f0', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>Etwas ist schiefgelaufen</h1>
          <p style={{ maxWidth: 420, fontSize: 14, lineHeight: 1.6, color: '#94a3b8', margin: 0 }}>
            Die App konnte nicht geladen werden. Deine lokal gespeicherten Daten sind nicht betroffen.
          </p>
          {error.digest && <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#475569', margin: 0 }}>Ref: {error.digest}</p>}
          <button
            onClick={reset}
            style={{ marginTop: 8, borderRadius: 6, border: '1px solid rgba(52,211,153,0.5)', background: 'rgba(16,185,129,0.2)', color: '#d1fae5', padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Erneut versuchen
          </button>
        </main>
      </body>
    </html>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Periodically re-renders the server page (fresh prices + analysis) via
// router.refresh(). Pauses while the tab is hidden to avoid pointless load.
export function AutoRefresh({ intervalMs = 20000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [router, intervalMs]);

  return null;
}

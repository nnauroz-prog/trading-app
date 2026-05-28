'use client';

import { useEffect, useState } from 'react';
import { loadConfig } from '@/lib/account-config';

// Renders its children only when beginner mode is OFF. Used to hide advanced
// blocks for beginners. Children are server-rendered and just gated here.
export function AdvancedOnly({ children }: { children: React.ReactNode }) {
  const [advanced, setAdvanced] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setAdvanced(loadConfig().advancedMode);
    sync();
    setMounted(true);
    window.addEventListener('trading-app:config-changed', sync);
    return () => window.removeEventListener('trading-app:config-changed', sync);
  }, []);

  // Hidden by default (clean buy-tip view); only shown once the user opts into
  // advanced mode. Stays hidden until mounted so nothing flashes in and out.
  if (!mounted || !advanced) return null;
  return <>{children}</>;
}

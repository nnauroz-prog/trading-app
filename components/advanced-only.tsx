'use client';

import { useEffect, useState } from 'react';
import { loadConfig } from '@/lib/account-config';

// Renders its children only when beginner mode is OFF. Used to hide advanced
// blocks for beginners. Children are server-rendered and just gated here.
export function AdvancedOnly({ children }: { children: React.ReactNode }) {
  const [beginner, setBeginner] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setBeginner(loadConfig().beginnerMode);
    sync();
    setMounted(true);
    window.addEventListener('trading-app:config-changed', sync);
    return () => window.removeEventListener('trading-app:config-changed', sync);
  }, []);

  if (mounted && beginner) return null;
  return <>{children}</>;
}

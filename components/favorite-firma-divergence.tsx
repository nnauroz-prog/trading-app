'use client';

import { useEffect, useState } from 'react';
import { AgentVerdict, PersonaId } from '@/lib/agents/personas';
import { FIRMA_PREFERENCE_CHANGED_EVENT, loadFirmaPreference } from '@/lib/firma-preference';

interface Props {
  personas: AgentVerdict[];
}

export function FavoriteFirmaDivergence({ personas }: Props) {
  const [preferred, setPreferred] = useState<PersonaId | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPreferred(loadFirmaPreference());
    setMounted(true);
    const sync = () => setPreferred(loadFirmaPreference());
    window.addEventListener(FIRMA_PREFERENCE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(FIRMA_PREFERENCE_CHANGED_EVENT, sync);
  }, []);

  if (!mounted || !preferred) return null;
  const fav = personas.find((p) => p.persona === preferred);
  if (!fav) return null;

  const others = personas.filter((p) => p.persona !== preferred);
  const otherBuys = others.filter((p) => p.verdict === 'BUY').length;
  const otherWaits = others.length - otherBuys;
  const favBuys = fav.verdict === 'BUY';

  // Divergence cases
  if (favBuys && otherBuys === 0) {
    return (
      <div className="rounded-lg border border-amber-400/50 bg-amber-950/20 px-3 py-2 text-[12px] text-amber-100">
        <span className="font-bold">Lieblings-Firma alleine:</span> {fav.name} will kaufen, aber die anderen beiden warten. Setup ist klar nur etwas für dein Risikoprofil — Position bewusst kleiner halten.
      </div>
    );
  }
  if (!favBuys && otherBuys === otherWaits + otherBuys) {
    // both others want to buy
    return (
      <div className="rounded-lg border border-sky-400/50 bg-sky-950/20 px-3 py-2 text-[12px] text-sky-100">
        <span className="font-bold">Lieblings-Firma vorsichtiger:</span> Die anderen beiden Firmen wollen kaufen, {fav.name} wartet. Wenn du deinem Profil treu bleiben willst — heute nicht handeln.
      </div>
    );
  }
  return null;
}

// Aggregiert Persona-Picks zu Konsens-Gruppen: Assets, die von mindestens N
// verschiedenen Persönlichkeiten gewählt wurden. Pure Funktion, testbar.

export interface PersonaPickEntry {
  klass: 'Krypto' | 'Aktien' | 'Rohstoffe' | 'WM' | 'Liga-Fußball';
  personaId: string;
  personaName: string;
  verdict: string;
  assetKey: string;
  assetLabel: string;
  href: string;
}

export interface ConsensusGroup {
  assetKey: string;
  assetLabel: string;
  klass: string;
  href: string;
  picks: PersonaPickEntry[];
}

export function aggregateConsensus(entries: PersonaPickEntry[], minPicks = 2): ConsensusGroup[] {
  const groupMap = new Map<string, ConsensusGroup>();
  for (const e of entries) {
    const key = `${e.klass}::${e.assetKey}`;
    const existing = groupMap.get(key);
    if (existing) {
      existing.picks.push(e);
    } else {
      groupMap.set(key, {
        assetKey: e.assetKey,
        assetLabel: e.assetLabel,
        klass: e.klass,
        href: e.href,
        picks: [e]
      });
    }
  }
  const groups = [...groupMap.values()].filter((g) => g.picks.length >= minPicks);
  // Mehr Picks zuerst, bei Gleichstand alphabetisch nach Label.
  groups.sort((a, b) => {
    if (b.picks.length !== a.picks.length) return b.picks.length - a.picks.length;
    return a.assetLabel.localeCompare(b.assetLabel);
  });
  return groups;
}

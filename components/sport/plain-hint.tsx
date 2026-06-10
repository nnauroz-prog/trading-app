// Eine Zeile Klartext unter dem Karten-Titel — erklaert in einfacher
// Sprache was die Karte tut. Server-kompatibel (keine Hooks).

import { PLAIN_HINTS } from '@/lib/sport/wm-plain-texts';

interface Props {
  id: keyof typeof PLAIN_HINTS | string;
}

export function PlainHint({ id }: Props) {
  const text = PLAIN_HINTS[id];
  if (!text) return null;
  return (
    <p className="rounded border border-sky-500/20 bg-sky-950/20 px-2 py-1 text-[10.5px] leading-snug text-sky-100/90">
      💬 Einfach gesagt: {text}
    </p>
  );
}

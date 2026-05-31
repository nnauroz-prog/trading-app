import Link from 'next/link';
import { RiskBadge } from '@/components/bottom-nav-badge';

// Mobile-first sticky bottom-nav. Five primary destinations, fits one-handed
// thumb reach on iPhone. Stays out of the way on >= md.
export function BottomNav() {
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-5xl grid-cols-5 text-[10px]">
        <li>
          <Link href="/" className="flex flex-col items-center gap-0.5 py-2 text-slate-300 hover:text-emerald-300">
            <span aria-hidden className="text-base leading-none">🏠</span>
            <span>Heute</span>
          </Link>
        </li>
        <li>
          <Link href="/agent" className="flex flex-col items-center gap-0.5 py-2 text-slate-300 hover:text-emerald-300">
            <span aria-hidden className="text-base leading-none">🏢</span>
            <span>Firmen</span>
          </Link>
        </li>
        <li>
          <Link href="/positions" className="flex flex-col items-center gap-0.5 py-2 text-slate-300 hover:text-emerald-300">
            <span aria-hidden className="text-base leading-none">📊</span>
            <span>Positionen</span>
          </Link>
        </li>
        <li>
          <Link href="/risk" className="relative flex flex-col items-center gap-0.5 py-2 text-slate-300 hover:text-rose-300">
            <span aria-hidden className="relative text-base leading-none">
              ⚠️
              <RiskBadge />
            </span>
            <span>Risiko</span>
          </Link>
        </li>
        <li>
          <Link href="/journal" className="flex flex-col items-center gap-0.5 py-2 text-slate-300 hover:text-emerald-300">
            <span aria-hidden className="text-base leading-none">📓</span>
            <span>Journal</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}

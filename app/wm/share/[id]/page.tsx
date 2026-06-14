// Share-Route: /wm/share/[id] — saubere Single-Match-Ansicht, optimiert
// fuer Screenshot + WhatsApp/Mail-Versand. Ein Empfaenger, der den Link
// bekommt, sieht NUR das eine Match mit Prognose. Keine Navigation, kein
// Sport-Page-Salat.
//
// Zweck im System: ermoeglicht Masterplan-Schritt-2 (zeig die App 60
// Sekunden) ohne Friktion. Bricht den geschlossenen 2-Knoten-Loop.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { WM_2026_FIXTURES } from '@/lib/sport/wm-schedule-2026';
import { predictWmMatch } from '@/lib/sport/wm-match-engine';
import { utcToBerlin } from '@/lib/sport/wm-utc-to-berlin';

export const revalidate = 600;

interface Params {
  id: string;
}

interface Props {
  params: Promise<Params>;
}

function findFixture(id: string) {
  return WM_2026_FIXTURES.find((f) => f.id === id) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const fix = findFixture(id);
  if (!fix) {
    return { title: 'Match nicht gefunden — Trading-App WM 2026' };
  }
  const title = `${fix.homeTeam} – ${fix.awayTeam} · WM 2026`;
  const description = `${fix.phase}${fix.group ? ` · Gruppe ${fix.group}` : ''} · ${fix.venue}. Modell-Tendenz, keine Garantie.`;
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description }
  };
}

function fmtDateBerlin(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', {
    timeZone: 'Europe/Berlin',
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

const PHASE_LABEL: Record<string, string> = {
  Gruppe: 'Gruppenphase',
  Achtelfinale: 'Achtelfinale',
  Viertelfinale: 'Viertelfinale',
  Halbfinale: 'Halbfinale',
  'Spiel um Platz 3': 'Spiel um Platz 3',
  Finale: 'Finale'
};

export default async function WmSharePage({ params }: Props) {
  const { id } = await params;
  const fix = findFixture(id);
  if (!fix) notFound();

  // Berlin-Zeit fuer Anzeige
  const berlin = utcToBerlin(fix.date, fix.time);

  // Vorhersage nur wenn beide Teams konkret (kein KO-TBD).
  const tbdRe = /^(Sieger|Verlierer|Zweiter|Erster)\s/i;
  const isConcrete = !tbdRe.test(fix.homeTeam) && !tbdRe.test(fix.awayTeam);

  let prediction: ReturnType<typeof predictWmMatch> | null = null;
  if (isConcrete) {
    try {
      prediction = predictWmMatch({
        homeTeam: fix.homeTeam,
        awayTeam: fix.awayTeam,
        venue: fix.venue,
        phase: fix.phase
      });
    } catch {
      prediction = null;
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-gradient-to-b from-slate-950 via-emerald-950/40 to-slate-950 px-5 py-8 text-slate-100">
      <header className="mb-5 flex items-baseline justify-between">
        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300">
          🏆 WM 2026
        </div>
        <div className="text-[10px] text-slate-500">
          {PHASE_LABEL[fix.phase] ?? fix.phase}
          {fix.group && ` · Gruppe ${fix.group}`}
        </div>
      </header>

      <section className="rounded-2xl border border-emerald-400/40 bg-slate-900/80 p-5 shadow-2xl">
        <div className="text-center">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">
            {fmtDateBerlin(berlin.dateIso)}
          </div>
          <div className="mt-1 font-mono text-[14px] text-emerald-200">
            {berlin.time ?? '--:--'} Berlin-Zeit
          </div>
        </div>

        <div className="my-6 flex items-center justify-center gap-3 text-center">
          <div className="flex-1">
            <div className="text-[18px] font-bold leading-tight text-slate-50">{fix.homeTeam}</div>
          </div>
          <div className="text-[14px] font-bold text-slate-500">vs</div>
          <div className="flex-1">
            <div className="text-[18px] font-bold leading-tight text-slate-50">{fix.awayTeam}</div>
          </div>
        </div>

        <div className="rounded border border-slate-800 bg-slate-950/60 p-3 text-center text-[11px] text-slate-400">
          📍 {fix.venue}
        </div>

        {prediction && (
          <div className="mt-5 space-y-3">
            <div className="text-center text-[10px] uppercase tracking-[0.18em] text-emerald-300/80">
              Modell-Tendenz
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <PctBox label={fix.homeTeam} pct={prediction.regular.homePct} highlight={prediction.pick.winner === 'home'} />
              <PctBox label="Remis" pct={prediction.regular.drawPct} highlight={prediction.pick.winner === 'draw'} />
              <PctBox label={fix.awayTeam} pct={prediction.regular.awayPct} highlight={prediction.pick.winner === 'away'} />
            </div>
            <div className="rounded border border-emerald-400/30 bg-emerald-500/5 p-3 text-center">
              <div className="text-[9.5px] uppercase tracking-wider text-emerald-300/70">
                Tipp ({prediction.pick.clarity})
              </div>
              <div className="mt-0.5 text-[14px] font-bold text-emerald-100">
                {prediction.pick.winnerName}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-emerald-200/80">
                {prediction.pick.confidencePct}% Konfidenz
              </div>
            </div>
          </div>
        )}

        {!prediction && isConcrete && (
          <div className="mt-5 rounded border border-slate-700 bg-slate-950/40 p-3 text-center text-[11px] text-slate-400">
            Modell hat zu dieser Paarung keine ausreichende Datenbasis.
          </div>
        )}

        {!isConcrete && (
          <div className="mt-5 rounded border border-amber-400/30 bg-amber-500/5 p-3 text-center text-[11px] text-amber-200">
            Paarung steht noch nicht fest — wartet auf Gruppenphase-Ergebnis.
          </div>
        )}
      </section>

      <footer className="mt-6 space-y-2 text-center text-[10px] text-slate-500">
        <p>Modell-Tendenz, keine Garantie. Keine Wett-Empfehlung.</p>
        <p>
          <Link href="/wm" className="text-emerald-400 hover:text-emerald-300">
            → Alle WM-2026-Spiele
          </Link>
        </p>
      </footer>
    </main>
  );
}

interface PctBoxProps {
  label: string;
  pct: number;
  highlight: boolean;
}

function PctBox({ label, pct, highlight }: PctBoxProps) {
  return (
    <div className={`rounded border p-2 ${highlight ? 'border-emerald-400/60 bg-emerald-500/15' : 'border-slate-700 bg-slate-950/60'}`}>
      <div className={`font-mono text-[16px] font-bold ${highlight ? 'text-emerald-100' : 'text-slate-200'}`}>{pct}%</div>
      <div className="mt-0.5 truncate text-[9px] text-slate-400" title={label}>{label}</div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Question {
  id: string;
  prompt: string;
  options: Array<{ label: string; weight: { conservative: number; balanced: number; aggressive: number } }>;
}

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    prompt: 'Wie viele Krypto-Trades pro Monat sind dir ungefähr genug?',
    options: [
      { label: '0–2', weight: { conservative: 3, balanced: 1, aggressive: 0 } },
      { label: '3–10', weight: { conservative: 1, balanced: 3, aggressive: 1 } },
      { label: '10+', weight: { conservative: 0, balanced: 1, aggressive: 3 } }
    ]
  },
  {
    id: 'q2',
    prompt: 'Wie reagierst du, wenn dein Stop gerissen wird?',
    options: [
      { label: 'Sofort glatt — Regel ist Regel', weight: { conservative: 3, balanced: 2, aggressive: 1 } },
      { label: 'Stop nachziehen, wenn noch Hoffnung ist', weight: { conservative: 0, balanced: 1, aggressive: 2 } },
      { label: 'Nachkaufen — Kurs muss zurück', weight: { conservative: 0, balanced: 0, aggressive: 0 } }
    ]
  },
  {
    id: 'q3',
    prompt: 'Wie wichtig ist dir, dass das Setup historisch funktioniert hat?',
    options: [
      { label: 'Sehr wichtig — ohne Backtest-Bestätigung nie', weight: { conservative: 3, balanced: 1, aggressive: 0 } },
      { label: 'Hilfreich, aber nicht zwingend', weight: { conservative: 1, balanced: 3, aggressive: 1 } },
      { label: 'Egal — der Trend zählt', weight: { conservative: 0, balanced: 1, aggressive: 3 } }
    ]
  },
  {
    id: 'q4',
    prompt: 'Maximaler Verlust pro Trade als % deines Accounts?',
    options: [
      { label: 'Maximal 1%', weight: { conservative: 3, balanced: 1, aggressive: 0 } },
      { label: '1–2%', weight: { conservative: 1, balanced: 3, aggressive: 1 } },
      { label: '2–5%', weight: { conservative: 0, balanced: 1, aggressive: 3 } }
    ]
  },
  {
    id: 'q5',
    prompt: 'Wie lange willst du eine Position normalerweise halten?',
    options: [
      { label: 'Tage bis Wochen — auf Ziel laufen lassen', weight: { conservative: 3, balanced: 2, aggressive: 0 } },
      { label: 'Stunden bis 1–2 Tage', weight: { conservative: 1, balanced: 2, aggressive: 2 } },
      { label: 'Intraday — schnell rein, schnell raus', weight: { conservative: 0, balanced: 0, aggressive: 3 } }
    ]
  }
];

const NAMES = {
  conservative: 'Konservativ',
  balanced: 'Balanciert',
  aggressive: 'Aggressiv'
};

const PROFILE_NOTES = {
  conservative: 'Du tickst wie die Konservativ-Firma: lieber zu wenige als zu riskante Trades. Folge ihren Empfehlungen, ignoriere die anderen Firmen (sie würden dich nur frustrieren).',
  balanced: 'Du passt zur Balanciert-Firma: solide Setups mit Stop, kein FOMO, aber auch keine Lähmung. Ihre BUY-Verdikte sind dein Hauptkompass; die anderen Firmen sind nur Zusatz-Info.',
  aggressive: 'Du tickst aggressiv: Bewegung über Sicherheit. Folge der Aggressiv-Firma, aber halte dich an ihre kleinere-Positionsgröße-Empfehlung — sonst frisst dich der Markt.'
};

export function FirmaQuiz() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);

  const answer = (q: string, optionIdx: number) => {
    const next = { ...answers, [q]: optionIdx };
    setAnswers(next);
    if (Object.keys(next).length === QUESTIONS.length) setDone(true);
  };

  const reset = () => { setAnswers({}); setDone(false); };

  const result = (() => {
    const totals = { conservative: 0, balanced: 0, aggressive: 0 };
    for (const q of QUESTIONS) {
      const idx = answers[q.id];
      if (idx === undefined) continue;
      const opt = q.options[idx];
      totals.conservative += opt.weight.conservative;
      totals.balanced += opt.weight.balanced;
      totals.aggressive += opt.weight.aggressive;
    }
    const max = Math.max(totals.conservative, totals.balanced, totals.aggressive);
    const winner = max === totals.conservative ? 'conservative' : max === totals.balanced ? 'balanced' : 'aggressive';
    return { totals, winner: winner as 'conservative' | 'balanced' | 'aggressive' };
  })();

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Welche Firma passt zu mir?</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Fünf Fragen, ehrlich beantworten, am Ende eine Empfehlung welcher Firma du folgen solltest. Verändert nichts an der App — ist nur ein Kompass.
        </p>
      </div>

      {!done && (
        <ol className="space-y-3">
          {QUESTIONS.map((q, qi) => (
            <li key={q.id} className="space-y-1.5 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-[12px] font-semibold text-slate-100">{qi + 1}. {q.prompt}</div>
              <div className="flex flex-col gap-1.5">
                {q.options.map((opt, oi) => {
                  const selected = answers[q.id] === oi;
                  return (
                    <button
                      key={oi}
                      onClick={() => answer(q.id, oi)}
                      className={`rounded-md border px-2.5 py-1.5 text-left text-[11px] transition ${selected ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>
      )}

      {done && (
        <div className="space-y-3 rounded-lg border-2 border-emerald-400/50 bg-emerald-950/30 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Dein Profil</div>
          <h3 className="text-xl font-bold text-white">{NAMES[result.winner]}</h3>
          <p className="text-[12px] leading-relaxed text-slate-200">{PROFILE_NOTES[result.winner]}</p>
          <div className="grid grid-cols-3 gap-2 rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center text-[10px]">
            <div><div className="uppercase tracking-wider text-slate-500">Konservativ</div><div className="font-mono text-sm text-slate-200">{result.totals.conservative}</div></div>
            <div><div className="uppercase tracking-wider text-slate-500">Balanciert</div><div className="font-mono text-sm text-slate-200">{result.totals.balanced}</div></div>
            <div><div className="uppercase tracking-wider text-slate-500">Aggressiv</div><div className="font-mono text-sm text-slate-200">{result.totals.aggressive}</div></div>
          </div>
          <div className="flex items-baseline gap-3">
            <button onClick={reset} className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 hover:border-slate-600">Nochmal</button>
            <Link href="/agent" className="text-[11px] text-sky-300 hover:text-sky-200">→ deine Firma auf /agent ansehen</Link>
          </div>
        </div>
      )}
    </section>
  );
}

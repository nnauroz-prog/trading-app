'use client';

// Pick-Notizen. Pro Pick eine freie Notiz (z. B. "Quote bei Bet365
// besser", "Wetter ueberraschend kuehl"). Hilft beim spaeteren
// Reflektieren der eigenen Entscheidungen.

import { useEffect, useState } from 'react';
import {
  loadAllPickNotes,
  savePickNote,
  MAX_NOTE_LENGTH,
  WM_PICK_NOTES_CHANGED_EVENT
} from '@/lib/sport/wm-pick-notes-store';
import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

interface Props {
  picks: WmWinnerPick[];
}

export function WmPickNotesCard({ picks }: Props) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setNotes(loadAllPickNotes());
    sync();
    setMounted(true);
    window.addEventListener(WM_PICK_NOTES_CHANGED_EVENT, sync);
    return () => window.removeEventListener(WM_PICK_NOTES_CHANGED_EVENT, sync);
  }, []);

  if (picks.length === 0) return null;

  const onChange = (pickId: string, value: string) => {
    setNotes((prev) => ({ ...prev, [pickId]: value }));
  };

  const onBlur = (pickId: string) => {
    if (!mounted) return;
    savePickNote(pickId, notes[pickId] ?? '');
  };

  const totalWithNotes = Object.values(notes).filter((n) => n.trim().length > 0).length;

  return (
    <section className="space-y-2 rounded-2xl border border-slate-700 bg-slate-950/40 p-3" aria-label="WM Pick-Notizen">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">Deine Notizen zu den Tipps</h3>
        <span className="text-[10px] text-slate-500">{totalWithNotes} mit Notiz</span>
      </div>
      <ul className="space-y-2">
        {picks.map((p) => {
          const pickId = `${p.fixture.id}-${p.winnerSide}`;
          const value = notes[pickId] ?? '';
          const opponent = p.winnerSide === 'home' ? p.fixture.awayTeam : p.fixture.homeTeam;
          const remaining = MAX_NOTE_LENGTH - value.length;
          return (
            <li key={pickId} className="rounded border border-slate-800 bg-slate-950/30 px-2 py-1.5">
              <div className="flex flex-wrap items-baseline gap-2 text-[11px]">
                <span className="font-semibold text-slate-100">{p.winnerTeam}</span>
                <span className="text-slate-500">gegen {opponent}</span>
                <span className="ml-auto font-mono text-[9.5px] text-slate-500">{p.fixture.date}</span>
              </div>
              <textarea
                value={value}
                onChange={(e) => onChange(pickId, e.target.value)}
                onBlur={() => onBlur(pickId)}
                placeholder="z.B. Quote bei Bet365 besser, oder eigenes Bauchgefuehl notieren..."
                maxLength={MAX_NOTE_LENGTH}
                rows={2}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950/70 px-1.5 py-1 text-[11px] text-slate-100 placeholder:text-slate-600"
                aria-label={`Notiz zu ${p.winnerTeam}`}
              />
              <div className="mt-0.5 flex items-baseline justify-between text-[9.5px] text-slate-500">
                <span>nur lokal gespeichert</span>
                <span className={remaining < 30 ? 'text-amber-300' : ''}>{remaining}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

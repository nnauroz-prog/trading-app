'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal } from '@/lib/sport/tip-journal';
import { loadProfile, TIPPRUNDE_CHANGED_EVENT, type TipprundeProfile } from '@/lib/sport/tipprunde';
import {
  addFriend,
  FRIENDS_CHANGED_EVENT,
  hitRatePct,
  loadFriends,
  MAX_FRIENDS,
  removeFriend,
  updateFriend,
  type FriendEntry
} from '@/lib/sport/friends-mode';

interface Row {
  key: string;
  name: string;
  wins: number;
  decisive: number;
  note?: string;
  isSelf: boolean;
}

// Friends-Mode: zeigt User + bis zu 3 manuell gepflegte Freund-Profile als
// Rangliste. Komplett lokal — kein Account, kein Sync.
export function FriendsLeaderboard() {
  const [self, setSelf] = useState<{ profile: TipprundeProfile | null; wins: number; decisive: number }>({ profile: null, wins: 0, decisive: 0 });
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [draftName, setDraftName] = useState('');
  const [draftWins, setDraftWins] = useState('');
  const [draftDecisive, setDraftDecisive] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      const log = loadTipJournal();
      const resolved = log.filter((e) => e.outcome !== 'pending');
      const wins = resolved.filter((e) => e.outcome === 'win').length;
      const decisive = resolved.filter((e) => e.outcome !== 'push').length;
      setSelf({ profile: loadProfile(), wins, decisive });
      setFriends(loadFriends());
    };
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    window.addEventListener(TIPPRUNDE_CHANGED_EVENT, sync);
    window.addEventListener(FRIENDS_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
      window.removeEventListener(TIPPRUNDE_CHANGED_EVENT, sync);
      window.removeEventListener(FRIENDS_CHANGED_EVENT, sync);
    };
  }, []);

  if (!mounted) return null;
  if (self.decisive === 0 && friends.length === 0 && !self.profile) return null;

  const submit = () => {
    const wins = parseInt(draftWins, 10);
    const decisive = parseInt(draftDecisive, 10);
    if (editingId) {
      updateFriend(editingId, wins, decisive);
      setEditingId(null);
    } else {
      addFriend(draftName, wins, decisive);
    }
    setDraftName('');
    setDraftWins('');
    setDraftDecisive('');
  };

  const startEdit = (f: FriendEntry) => {
    setEditingId(f.id);
    setDraftName(f.name);
    setDraftWins(String(f.wins));
    setDraftDecisive(String(f.decisive));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftName('');
    setDraftWins('');
    setDraftDecisive('');
  };

  const rows: Row[] = [
    {
      key: 'self',
      name: self.profile?.displayName ?? 'du',
      wins: self.wins,
      decisive: self.decisive,
      note: undefined,
      isSelf: true
    },
    ...friends.map<Row>((f) => ({
      key: f.id,
      name: f.name,
      wins: f.wins,
      decisive: f.decisive,
      note: f.note,
      isSelf: false
    }))
  ].sort((a, b) => {
    const aPct = a.decisive > 0 ? a.wins / a.decisive : -1;
    const bPct = b.decisive > 0 ? b.wins / b.decisive : -1;
    return bPct - aPct;
  });

  return (
    <details className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-slate-100">
        ▸ Freundes-Rangliste (lokal, ohne Sync)
      </summary>
      <div className="mt-3 space-y-3">
        <ol className="space-y-1">
          {rows.map((r, i) => {
            const pct = hitRatePct(r);
            const friend = friends.find((f) => f.id === r.key);
            return (
              <li key={r.key} className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-md border px-2 py-1.5 ${r.isSelf ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-slate-800 bg-slate-950/40'}`}>
                <span className="font-mono text-[10px] text-slate-500">#{i + 1}</span>
                <span className="min-w-0 truncate text-[11.5px] text-slate-100">
                  <span className={r.isSelf ? 'font-semibold text-emerald-100' : 'font-semibold'}>{r.name}</span>
                  {r.note && <span className="ml-1 text-[10px] text-slate-500">· {r.note}</span>}
                </span>
                <span className="font-mono text-[10px] text-slate-400">{r.wins}/{r.decisive}</span>
                <span className={`font-mono text-[10.5px] font-bold ${pct === null ? 'text-slate-500' : pct >= 60 ? 'text-emerald-300' : pct >= 40 ? 'text-amber-300' : 'text-rose-300'}`}>
                  {pct !== null ? `${pct}%` : '—'}
                </span>
                {friend && !r.isSelf && !editingId && (
                  <button
                    type="button"
                    onClick={() => startEdit(friend)}
                    className="col-start-2 col-end-5 -mt-1 justify-self-end text-[9px] text-slate-500 hover:text-slate-300"
                  >
                    bearbeiten · entfernen
                  </button>
                )}
              </li>
            );
          })}
        </ol>

        {(editingId || friends.length < MAX_FRIENDS) && (
          <div className="space-y-2 rounded-md border border-slate-800 bg-slate-950/40 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              {editingId ? 'Freund bearbeiten' : `Freund hinzufügen (${friends.length}/${MAX_FRIENDS})`}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Name"
                disabled={!!editingId}
                maxLength={32}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/60 focus:outline-none disabled:opacity-60"
              />
              <input
                type="number"
                value={draftWins}
                onChange={(e) => setDraftWins(e.target.value)}
                placeholder="Treffer"
                min={0}
                inputMode="numeric"
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-center font-mono text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/60 focus:outline-none"
              />
              <input
                type="number"
                value={draftDecisive}
                onChange={(e) => setDraftDecisive(e.target.value)}
                placeholder="ausgewertet"
                min={0}
                inputMode="numeric"
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-center font-mono text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/60 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={submit}
                className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/20"
              >
                {editingId ? 'speichern' : 'hinzufügen'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => { removeFriend(editingId); cancelEdit(); }}
                  className="rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-[11px] text-rose-200 hover:bg-rose-500/20"
                >
                  entfernen
                </button>
              )}
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="ml-auto text-[10px] text-slate-500 hover:text-slate-300"
                >
                  abbrechen
                </button>
              )}
            </div>
            <p className="text-[10px] leading-snug text-slate-500">
              Trage manuell den aktuellen Stand deiner Freunde ein. Komplett lokal, ohne Server-Sync — wer aktualisieren will, gibt einfach den neuen Stand ein.
            </p>
          </div>
        )}
      </div>
    </details>
  );
}

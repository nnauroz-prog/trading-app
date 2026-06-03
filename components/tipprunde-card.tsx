'use client';

import { useEffect, useState } from 'react';
import {
  TIPPRUNDE_CHANGED_EVENT,
  computeTipprundeStats,
  loadProfile,
  saveProfile,
  clearProfile,
  type TipprundeProfile,
  type TipprundeStats
} from '@/lib/sport/tipprunde';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT } from '@/lib/sport/tip-journal';

const BAND_LABEL: Record<string, string> = {
  sehr_stark: 'sehr starke Prognose',
  stark: 'starke Prognose',
  brauchbar: 'brauchbare Prognose',
  orientierung: 'nur grobe Orientierung'
};

// Lokale Tipprunde — User setzt einen Anzeige-Namen und sieht seinen
// Streak/Trefferquoten-Verlauf. Für Freundes-Tipprunden: Screenshot teilen.
export function TipprundeCard() {
  const [profile, setProfile] = useState<TipprundeProfile | null>(null);
  const [stats, setStats] = useState<TipprundeStats | null>(null);
  const [draftName, setDraftName] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      setProfile(loadProfile());
      setStats(computeTipprundeStats());
    };
    sync();
    setMounted(true);
    window.addEventListener(TIPPRUNDE_CHANGED_EVENT, sync);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener(TIPPRUNDE_CHANGED_EVENT, sync);
      window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    };
  }, []);

  if (!mounted) return null;

  const submit = () => {
    const name = draftName.trim().slice(0, 32);
    if (name.length < 2) return;
    saveProfile({ displayName: name, joinedAt: profile?.joinedAt ?? Date.now() });
    setEditing(false);
  };

  if (!profile || editing) {
    return (
      <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Tipprunde — dein Anzeige-Name</h2>
          <p className="mt-1 text-[10.5px] leading-snug text-slate-500">
            Setze einen Spitznamen für deine eigene Tipprunde. Bleibt nur lokal in deinem Browser, kein Server. Mit Freunden tippen → Screenshot der Statistik teilen.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder={profile?.displayName ?? 'z. B. „Tom" oder „Tipp-Wölfin"'}
            maxLength={32}
            className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[12px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={submit}
            disabled={draftName.trim().length < 2}
            className="rounded-md border border-emerald-400/50 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Speichern
          </button>
        </div>
        {profile && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-[10px] text-slate-500 hover:text-slate-300"
          >
            Abbrechen
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-400/30 bg-emerald-950/15 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">deine Tipprunde</div>
          <h2 className="text-lg font-bold tracking-tight text-emerald-50">{profile.displayName}</h2>
        </div>
        <button
          type="button"
          onClick={() => { setDraftName(profile.displayName); setEditing(true); }}
          className="rounded-md border border-emerald-400/30 bg-emerald-500/5 px-2 py-0.5 text-[10px] text-emerald-200 hover:bg-emerald-500/15"
        >
          umbenennen
        </button>
      </div>

      {stats && stats.resolved === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-3 text-[11px] leading-snug text-slate-400">
          Noch keine ausgewerteten Tipps. Markiere oben Spiele mit „+ tippen“, die App rechnet ab, sobald die Ergebnisse rein sind.
        </p>
      ) : stats ? (
        <>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="ausgewertet" value={String(stats.resolved)} />
            <Stat label="Treffer" value={String(stats.wins)} tone="good" />
            <Stat label="Quote" value={stats.hitRatePct !== null ? `${stats.hitRatePct} %` : '—'} tone={stats.hitRatePct !== null && stats.hitRatePct >= 50 ? 'good' : 'neutral'} />
            <Stat label="Streak" value={`${stats.currentStreak} (max ${stats.longestStreak})`} />
          </dl>
          {stats.bestBand && (
            <p className="rounded-md border border-emerald-400/20 bg-emerald-500/5 p-2 text-[10.5px] leading-snug text-emerald-100/80">
              Dein bestes Band: <span className="font-semibold">{BAND_LABEL[stats.bestBand.band] ?? stats.bestBand.band}</span> mit
              {' '}{stats.bestBand.hitRatePct}% Trefferquote ({stats.bestBand.resolved} Tipps).
            </p>
          )}
          {stats.recent.length > 0 && (
            <details className="rounded-md border border-slate-800 bg-slate-950/40 p-2">
              <summary className="cursor-pointer text-[10.5px] uppercase tracking-wider text-slate-400 hover:text-slate-200">
                letzte 5 Tipps
              </summary>
              <ul className="mt-1.5 space-y-0.5 text-[10.5px]">
                {stats.recent.map((r) => (
                  <li key={r.id} className="grid grid-cols-[1fr_auto] gap-2">
                    <span className="truncate text-slate-300">{r.label}</span>
                    <span className={`font-mono text-[10px] uppercase ${r.outcome === 'win' ? 'text-emerald-300' : r.outcome === 'loss' ? 'text-rose-300' : 'text-slate-400'}`}>
                      {r.outcome === 'win' ? '✓ Treffer' : r.outcome === 'loss' ? '✗ daneben' : 'push'}
                      {typeof r.qualityScore === 'number' && <span className="ml-1 text-slate-500">Q{r.qualityScore}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      ) : null}

      <button
        type="button"
        onClick={() => { if (window.confirm('Profil zurücksetzen? Die Tipps selbst bleiben erhalten.')) clearProfile(); }}
        className="text-[10px] text-slate-500 hover:text-rose-300"
      >
        Profil zurücksetzen
      </button>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-200' : 'text-slate-100';
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2">
      <dt className="text-[9px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className={`mt-0.5 font-mono text-sm font-bold ${cls}`}>{value}</dd>
    </div>
  );
}

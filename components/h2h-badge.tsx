import type { HeadToHeadResult } from '@/lib/sport/h2h';

function fmtDateShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Europe/Berlin' });
}

export function H2HBadge({ h2h }: { h2h: HeadToHeadResult }) {
  if (h2h.meetings === 0) {
    return (
      <div className="rounded-md border border-slate-800 bg-slate-950/40 px-2 py-1 text-[10px] text-slate-500">
        Direktvergleich: kein Aufeinandertreffen im Datenpool.
      </div>
    );
  }
  const trendTone =
    h2h.winsForHome > h2h.winsForAway
      ? 'text-emerald-300'
      : h2h.winsForAway > h2h.winsForHome
      ? 'text-rose-300'
      : 'text-slate-300';
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/40 px-2 py-1 text-[10px] text-slate-400">
      <span className="font-semibold text-slate-300">H2H:</span>{' '}
      <span className={trendTone}>
        {h2h.winsForHome}–{h2h.draws}–{h2h.winsForAway}
      </span>{' '}
      <span className="text-slate-500">({h2h.meetings} Spiele · Tore {h2h.goalsForHome}:{h2h.goalsForAway})</span>
      {h2h.lastMeeting && (
        <span className="ml-1 block text-slate-500">
          Letztes: <span className="font-mono text-slate-300">{h2h.lastMeeting.homeTeam}</span>{' '}
          <span className="font-mono">{h2h.lastMeeting.homeScore}:{h2h.lastMeeting.awayScore}</span>{' '}
          <span className="font-mono text-slate-300">{h2h.lastMeeting.awayTeam}</span>{' '}
          <span className="text-slate-600">· {fmtDateShort(h2h.lastMeeting.date)}</span>
        </span>
      )}
    </div>
  );
}

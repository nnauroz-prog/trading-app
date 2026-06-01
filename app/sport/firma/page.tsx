import Link from 'next/link';
import { SPORT_FIRMA, SPORT_FIRMA_SIZE, countByDepartment, type SportDepartment, type SportEmployee } from '@/lib/sport/firma/roster';
import { getEmployeeBacktest } from '@/lib/sport/firma/employee-backtest-cache';
import { EmployeeLeaderboard } from '@/components/employee-leaderboard';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const DEPARTMENT_LABEL: Record<SportDepartment, string> = {
  chef: 'Chefredaktion',
  league_scout: 'Liga-Scouts',
  team_analyst: 'Mannschafts-Analyse',
  form_analyst: 'Form-Analyse',
  tactical_analyst: 'Taktik',
  international_watch: 'International',
  transfer_watch: 'Transfer-Markt',
  politik_watch: 'Verbands-Politik',
  schedule_gatekeeper: 'Aktualitäts-Wache',
  safety_picker: 'Sicherheits-Tipp-Wache',
  h2h_specialist: 'Direktvergleich (H2H)',
  daily_pick_curator: 'Tipp-des-Tages-Wache'
};

const DEPARTMENT_ORDER: SportDepartment[] = [
  'chef',
  'schedule_gatekeeper',
  'safety_picker',
  'daily_pick_curator',
  'h2h_specialist',
  'league_scout',
  'team_analyst',
  'form_analyst',
  'tactical_analyst',
  'international_watch',
  'transfer_watch',
  'politik_watch'
];

function avatarInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function EmployeeChip({ e }: { e: SportEmployee }) {
  const hue = hueFromId(e.id);
  return (
    <li>
      <Link href={`/sport/firma/${e.id}`} className="grid grid-cols-[2rem_1fr] items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 hover:border-emerald-400/40 hover:bg-slate-900/60">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full font-mono text-[10px] font-bold text-white"
          style={{ background: `hsl(${hue}, 45%, 35%)` }}
          aria-hidden
        >
          {avatarInitials(e.name)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-semibold text-white">{e.name}</div>
          <div className="truncate text-[10.5px] text-slate-400">{e.role}</div>
        </div>
      </Link>
    </li>
  );
}

export default async function SportFirmaPage() {
  const counts = countByDepartment();
  const backtestStats = await getEmployeeBacktest();
  const grouped: Record<SportDepartment, SportEmployee[]> = {
    chef: [], league_scout: [], team_analyst: [], form_analyst: [],
    tactical_analyst: [], international_watch: [], transfer_watch: [], politik_watch: [],
    schedule_gatekeeper: [], safety_picker: [], h2h_specialist: [], daily_pick_curator: []
  };
  for (const e of SPORT_FIRMA) grouped[e.department].push(e);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:space-y-6 md:p-6">
      <Link href="/sport" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Sport-Reiter
      </Link>

      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          Sport-Redaktion
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Personalakte · {SPORT_FIRMA_SIZE} Mitarbeiter</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Die komplette Belegschaft der Sport-Redaktion. Jede·r mit Rolle und Abteilung. Wer was beobachtet, ist hier transparent — das ist kein Marketing-Schaufenster, das ist die echte Aufstellung.
        </p>
      </header>

      <EmployeeLeaderboard stats={backtestStats} />

      <section className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
        {DEPARTMENT_ORDER.map((d) => (
          <div key={d} className="rounded-lg border border-slate-800 bg-slate-950/40 p-2 text-center">
            <div className="text-[9px] uppercase tracking-wider text-slate-500">{DEPARTMENT_LABEL[d]}</div>
            <div className="mt-0.5 font-mono text-lg font-bold text-emerald-300">{counts[d]}</div>
          </div>
        ))}
      </section>

      {DEPARTMENT_ORDER.map((d) => (
        <section key={d} className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">{DEPARTMENT_LABEL[d]}</h2>
            <span className="text-[10px] text-slate-500">{counts[d]} Mitarbeiter</span>
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {grouped[d].map((e) => <EmployeeChip key={e.id} e={e} />)}
          </ul>
          {(d === 'transfer_watch' || d === 'politik_watch') && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-950/15 p-2 text-[10.5px] leading-snug text-amber-100/85">
              Diese Abteilung wartet auf einen Live-Feed. Bis dahin keine erfundenen Gerüchte — die Köpfe sind hier, die Quelle muss noch ran.
            </p>
          )}
        </section>
      ))}

      <footer className="border-t border-slate-900 pt-4 text-[10px] leading-relaxed text-slate-600">
        Namen frei gewählt — die Personen sind fiktiv und stehen für definierte Rollen mit eigenen Auswertungsfunktionen. Daten-Quelle für die echten Auswertungen: TheSportsDB (öffentlich).
      </footer>
    </main>
  );
}

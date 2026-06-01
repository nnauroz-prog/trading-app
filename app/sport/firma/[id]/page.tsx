import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SPORT_FIRMA, type SportEmployee } from '@/lib/sport/firma/roster';

export const dynamic = 'force-static';

interface PageProps {
  params: Promise<{ id: string }>;
}

const DEPARTMENT_LABEL: Record<SportEmployee['department'], string> = {
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

export default async function EmployeeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const employee = SPORT_FIRMA.find((e) => e.id === id);
  if (!employee) return notFound();

  const colleagues = SPORT_FIRMA.filter((e) => e.department === employee.department && e.id !== employee.id);
  const hue = hueFromId(employee.id);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <Link href="/sport/firma" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zur Personalakte
      </Link>

      <header className="flex items-center gap-4">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full font-mono text-xl font-bold text-white"
          style={{ background: `hsl(${hue}, 45%, 35%)` }}
          aria-hidden
        >
          {avatarInitials(employee.name)}
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">{DEPARTMENT_LABEL[employee.department]}</div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{employee.name}</h1>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Rolle</h2>
        <p className="mt-1 text-[12.5px] leading-snug text-slate-200">{employee.role}</p>
        {employee.leagueKey && (
          <div className="mt-2 text-[10px] uppercase tracking-wider text-slate-500">Liga-Bindung: {employee.leagueKey}</div>
        )}
        {employee.teamKey && (
          <div className="mt-2 text-[10px] uppercase tracking-wider text-slate-500">Team-Bindung: {employee.teamKey}</div>
        )}
      </section>

      {colleagues.length > 0 && (
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Kollegen in dieser Abteilung ({colleagues.length})</h2>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {colleagues.map((c) => (
              <li key={c.id}>
                <Link href={`/sport/firma/${c.id}`} className="block truncate rounded-md border border-slate-800 bg-slate-950/40 px-2 py-1 text-[11px] text-slate-200 hover:border-emerald-400/60 hover:text-emerald-300">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

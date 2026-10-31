import type { Metadata } from 'next';
import Link from 'next/link';
import { getCachedWmLiveData } from '@/lib/sport/wm-live-schedule';
import type { WmFixture } from '@/lib/sport/wm-schedule-2026';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'WM 2026 – Spiele und Ergebnisse',
  description: 'Der Rückblick auf die Fußball-WM 2026 mit verfügbaren Spielständen und Spielterminen.'
};

interface ResultRow {
  fixture: WmFixture;
  homeScore: number;
  awayScore: number;
}

export default async function WorldCupPage() {
  const liveData = await getCachedWmLiveData();
  const finishedById = new Map(liveData.finished.map((result) => [result.fixtureId, result]));
  const schedule = liveData.schedule
    .filter((fixture) => fixture.date >= '2026-06-11' && fixture.date <= '2026-07-19')
    .sort((a, b) => `${b.date}T${b.time ?? '00:00'}`.localeCompare(`${a.date}T${a.time ?? '00:00'}`));
  const results: ResultRow[] = [];
  const withoutResult: WmFixture[] = [];

  for (const fixture of schedule) {
    const result = finishedById.get(fixture.id);
    if (result && Number.isInteger(result.homeScore) && result.homeScore >= 0 && Number.isInteger(result.awayScore) && result.awayScore >= 0) {
      results.push({ fixture, homeScore: result.homeScore, awayScore: result.awayScore });
    } else {
      withoutResult.push(fixture);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 pb-20 md:p-6">
      <Link href="/sport" className="text-sm text-slate-400 hover:text-cyan-200">← Zurück zum Sport</Link>
      <header className="space-y-3">
        <p className="section-kicker">Fußball-WM 2026</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Spiele und Ergebnisse.</h1>
        <p className="text-sm leading-relaxed text-slate-400">Das Turnier vom 11. Juni bis 19. Juli 2026 ist beendet. Hier findest du die Ergebnisse, die unsere Datenquelle liefert.</p>
      </header>

      {results.length > 0 ? (
        <>
          <section className="terminal-panel space-y-4 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-white">Zuletzt gemeldete Ergebnisse</h2>
            <ResultsList rows={results.slice(0, 6)} />
          </section>
          {results.length > 6 && (
            <details className="terminal-panel p-5 sm:p-6">
              <summary className="cursor-pointer text-sm font-semibold text-slate-200">Weitere Ergebnisse ansehen ({results.length - 6})</summary>
              <div className="mt-5 space-y-6">
                {groupByDate(results.slice(6)).map(([date, rows]) => (
                  <section key={date} className="space-y-3">
                    <h2 className="text-sm font-medium text-slate-300">{date}</h2>
                    <ResultsList rows={rows} />
                  </section>
                ))}
              </div>
            </details>
          )}
        </>
      ) : (
        <section className="terminal-panel space-y-3 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Ergebnisse sind gerade nicht verfügbar.</h2>
          <p className="text-sm leading-relaxed text-slate-400">Unsere Datenquelle liefert derzeit keine zugehörigen Endstände für die WM 2026.</p>
          <Link href="/sport" className="terminal-button terminal-button-primary">Aktuelle Sportergebnisse ansehen →</Link>
        </section>
      )}

      {withoutResult.length > 0 && (
        <details className="terminal-panel p-5 sm:p-6">
          <summary className="cursor-pointer text-sm font-semibold text-slate-200">Gemeldete Spiele ohne Ergebnis ({withoutResult.length})</summary>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">Diese Spiele stehen im gelieferten Spielplan. Ein Endstand liegt uns dazu nicht vor.</p>
          <ul className="mt-4 divide-y divide-slate-800">
            {withoutResult.map((fixture) => (
              <li key={fixture.id} className="space-y-1 py-3">
                <p className="text-xs text-slate-500">{dateLabel(fixture)}</p>
                <p className="text-sm text-slate-200">{fixture.homeTeam} – {fixture.awayTeam}</p>
                <p className="text-xs text-slate-500">Ergebnis fehlt</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-xs leading-relaxed text-slate-500">Quelle: TheSportsDB. Termine werden in deutscher Ortszeit angezeigt. Fehlende Ergebnisse bleiben offen.</p>
    </main>
  );
}

function dateLabel(fixture: WmFixture): string {
  const date = new Date(`${fixture.date}T${fixture.time ?? '12:00'}:00Z`);
  if (!Number.isFinite(date.getTime())) return fixture.date;
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(date);
}

function groupByDate(rows: ResultRow[]): Array<[string, ResultRow[]]> {
  const groups = new Map<string, ResultRow[]>();
  for (const row of rows) {
    const date = dateLabel(row.fixture);
    groups.set(date, [...(groups.get(date) ?? []), row]);
  }
  return [...groups];
}

function ResultsList({ rows }: { rows: ResultRow[] }) {
  return (
    <ul className="divide-y divide-slate-800">
      {rows.map(({ fixture, homeScore, awayScore }) => (
        <li key={fixture.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
          <p className="text-xs text-slate-500">{dateLabel(fixture)} · Endstand</p>
          <div className="grid grid-cols-[1fr_auto] gap-x-5 gap-y-1 text-sm">
            <span className="text-slate-200">{fixture.homeTeam}</span>
            <span className="text-lg font-semibold tabular-nums text-white">{homeScore}</span>
            <span className="text-slate-200">{fixture.awayTeam}</span>
            <span className="text-lg font-semibold tabular-nums text-white">{awayScore}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

import type { LeagueFixtures } from '@/lib/sport/fetcher';

const EU_TOP_LEAGUE_IDS = new Set(['4331', '4328', '4335', '4332', '4334', '4337', '4338', '4480', '4481']);

// Wenn die europäischen Top-Ligen alle leer sind, aber andere (Sommer-)Ligen
// noch Spiele liefern, klären wir das auf statt den Nutzer mit einer halb-
// leeren Seite zu verwirren.
export function SeasonPauseBanner({ leagues }: { leagues: LeagueFixtures[] }) {
  const euActive = leagues.filter((l) => EU_TOP_LEAGUE_IDS.has(l.league.id) && l.next.length > 0);
  const summerActive = leagues.filter((l) => !EU_TOP_LEAGUE_IDS.has(l.league.id) && l.next.length > 0);
  if (euActive.length > 0 || summerActive.length === 0) return null;
  return (
    <section className="rounded-2xl border border-amber-500/40 bg-amber-950/15 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-300">Europäische Sommerpause</h2>
      <p className="mt-1 text-[11.5px] leading-snug text-amber-100/85">
        Bundesliga, Premier League, La Liga, Serie A & Co. sind aktuell durch — die Spiele kommen aus den Sommer-Ligen:{' '}
        <span className="font-semibold text-amber-200">{summerActive.map((l) => l.league.name).join(', ')}</span>. Form-Stichproben sind dort kleiner, also bleiben sichere Tipps seltener.
      </p>
    </section>
  );
}

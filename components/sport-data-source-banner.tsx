// Ehrliches Banner zur Datenquellen-Qualitaet. Server-Component.
//
// Zeigt sich NUR, wenn die App auf dem oeffentlichen Gratis-Test-Key
// von TheSportsDB laeuft — dann sind Spielplaene/Ergebnisse oft leer
// oder veraltet. Mit einem echten Premium-Key (Env-Var THESPORTSDB_KEY)
// verschwindet das Banner automatisch.
//
// Bewusst keine Schoenfaerberei: lieber ehrlich sagen "Daten koennen
// unzuverlaessig sein" als falsche Sicherheit vorgaukeln.

import { isUsingTestKey } from '@/lib/sport/sportsdb-config';

export function SportDataSourceBanner() {
  if (!isUsingTestKey()) return null;

  return (
    <section
      role="alert"
      className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 text-[11.5px] leading-snug text-amber-100/90"
    >
      <div className="font-semibold text-amber-200">⚠ Daten laufen auf dem Gratis-Test-Zugang</div>
      <p className="mt-1">
        Diese App nutzt gerade den oeffentlichen Test-Zugang von TheSportsDB. Der ist stark
        limitiert und liefert haeufig <span className="font-semibold">leere oder veraltete</span>{' '}
        Spielplaene und Ergebnisse — angezeigte Spiele und Vorhersagen koennen deshalb falsch sein.
      </p>
      <p className="mt-1 text-amber-100/70">
        Fuer echte Live-Daten: einen eigenen TheSportsDB-Premium-Key als Umgebungsvariable{' '}
        <code className="rounded bg-amber-500/15 px-1 font-mono text-[10.5px]">THESPORTSDB_KEY</code>{' '}
        hinterlegen. Danach gehen alle Sportarten automatisch auf echte Daten.
      </p>
    </section>
  );
}

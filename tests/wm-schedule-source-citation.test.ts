// Lint-Test: jedes 'official'-Fixture muss in der Datei zwischen den
// vorhergehenden 'official'-Eintrag (oder dem Datei-Anfang) und sich
// selbst mindestens eine Tier-1-Quelle zitieren. Das verhindert, dass
// jemand einen Eintrag als 'official' markiert, ohne renommierte
// Quelle.
//
// Reine Datei-Inspektion — kein Netzwerk.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { effectiveConfidence, WM_2026_FIXTURES } from '@/lib/sport/wm-schedule-2026';
import { commentCitesTier1 } from '@/lib/sport/wm-source-tiers';

const SCHEDULE_PATH = join(process.cwd(), 'lib/sport/wm-schedule-2026.ts');

// Den File-Content laden und in Abschnitte zerteilen, jeweils
// "vorhergehende Zeilen vor dem Fixture-Beginn".
function fileSnippetsByFixtureId(): Map<string, string> {
  const text = readFileSync(SCHEDULE_PATH, 'utf-8');
  const lines = text.split('\n');
  const snippets = new Map<string, string>();
  let buffer: string[] = [];
  for (const line of lines) {
    buffer.push(line);
    const m = line.match(/^\s*id:\s*'([^']+)'/);
    if (m) {
      // Letzte ~30 Zeilen vor dem id zaehlen als Kontext-Kommentar.
      const ctx = buffer.slice(Math.max(0, buffer.length - 30)).join('\n');
      snippets.set(m[1], ctx);
      // Buffer behalten — nachfolgende Eintraege koennen denselben
      // Gruppen-Kommentar weiter referenzieren (z.B. "Verifiziert via Sky"
      // gilt fuer alle folgenden Eintraege bis zur naechsten Gruppe).
    }
  }
  return snippets;
}

describe('Quellen-Zitat pro official-Fixture', () => {
  const snippets = fileSnippetsByFixtureId();

  it('Schedule-Datei wurde gelesen', () => {
    expect(snippets.size).toBeGreaterThan(20);
  });

  it('Jedes official-Gruppen-Fixture hat eine Tier-1-Quelle im Kontext', () => {
    const offenders: string[] = [];
    for (const f of WM_2026_FIXTURES) {
      if (effectiveConfidence(f) !== 'official') continue;
      if (f.phase !== 'Gruppe') continue;
      const ctx = snippets.get(f.id) ?? '';
      if (!commentCitesTier1(ctx)) {
        offenders.push(f.id);
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        `Folgende official-Fixtures haben keine Tier-1-Quelle im Kommentar: ${offenders.join(', ')}\n` +
        `Erlaubt: fifa.com/FIFA, ESPN, Sky Sports, kicker, BBC, Reuters, Tagesschau, Sportschau, ZDF, ARD, Globe and Mail.`
      );
    }
  });
});

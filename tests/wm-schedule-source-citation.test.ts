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

// Den File-Content laden und pro Fixture-ID den lokalen Kontext bestimmen:
// (a) die Kommentar-Zeilen direkt vor dem Fixture-Objekt, plus
// (b) optional den letzten Gruppen-Header-Block (Kommentar mit "GRUPPE X").
// Damit kann ein Header "Quelle: Sky" alle folgenden Fixtures in der Gruppe
// belegen, aber NICHT alle Fixtures der ganzen Datei wie im urspruenglichen
// kumulativen Buffer (das hat den Test trivial passen lassen).
function fileSnippetsByFixtureId(): Map<string, string> {
  const text = readFileSync(SCHEDULE_PATH, 'utf-8');
  const lines = text.split('\n');
  const snippets = new Map<string, string>();
  let groupHeader = '';
  let localBuffer: string[] = [];
  for (const line of lines) {
    if (/^\s*\/\/.*GRUPPE\s+[A-L]\b/i.test(line)) {
      // Neuer Gruppen-Header startet — nimm die folgenden Kommentar-Zeilen
      // bis zum naechsten Code als Header-Beleg.
      groupHeader = line + '\n';
      localBuffer = [];
      continue;
    }
    if (groupHeader && /^\s*\/\//.test(line) && !/^\s*\/\/\s*MD\d/i.test(line) && localBuffer.length === 0) {
      groupHeader += line + '\n';
      continue;
    }
    // Reset des lokalen Buffers, sobald ein neues Objekt beginnt.
    if (/^\s*\{/.test(line)) {
      localBuffer = [];
    }
    localBuffer.push(line);
    const m = line.match(/^\s*id:\s*'([^']+)'/);
    if (m) {
      // Lokaler Kontext = letzte 12 Zeilen (Kommentare unmittelbar vor
      // dem Objekt + die ersten Objekt-Felder) + Gruppen-Header.
      const ctx = groupHeader + localBuffer.slice(-12).join('\n');
      snippets.set(m[1], ctx);
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

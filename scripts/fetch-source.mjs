#!/usr/bin/env node
// Quellen-Fetcher mit Browser-User-Agent.
// Greift auf renommierte Tier-1-Quellen zu (BBC, Reuters, Tagesschau,
// sportschau.de, fifa.com, kicker.de, ESPN, Sky Sports), die der
// Standard-WebFetch-User-Agent nicht erreicht.
//
// Verwendung:
//   node scripts/fetch-source.mjs <URL> [--max-chars=N] [--text-only]
//
// Beispiel:
//   node scripts/fetch-source.mjs https://www.tagesschau.de/...
//
// Liefert HTML-zu-Text-konvertierten Body (oder rohen HTML mit
// --html-only). Default: Text-Extraktion mit Limit 8000 Zeichen.

const TIER1_DOMAINS = [
  'fifa.com',
  'espn.com',
  'skysports.com',
  'bbc.com',
  'bbc.co.uk',
  'reuters.com',
  'apnews.com',
  'kicker.de',
  'zdf.de',
  'tagesschau.de',
  'sportschau.de',
  'theglobeandmail.com',
  'nytimes.com',
  'theguardian.com'
];

const BROWSER_UA =
  'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0';

function parseArgs(argv) {
  const args = { url: null, maxChars: 8000, mode: 'text' };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--max-chars=')) {
      args.maxChars = parseInt(a.split('=')[1], 10);
    } else if (a === '--html-only') {
      args.mode = 'html';
    } else if (a === '--text-only') {
      args.mode = 'text';
    } else if (!a.startsWith('--')) {
      args.url = a;
    }
  }
  return args;
}

function htmlToText(html) {
  // Skripte/Styles entfernen, dann Tags strippen, dann HTML-Entities loesen,
  // dann Whitespace normalisieren.
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr|td|th)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
  s = s.replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return s;
}

function isTier1(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return TIER1_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
}

async function main() {
  const { url, maxChars, mode } = parseArgs(process.argv);
  if (!url) {
    console.error('FEHLER: Bitte URL angeben.');
    console.error('Verwendung: node scripts/fetch-source.mjs <URL> [--max-chars=N] [--text-only|--html-only]');
    process.exit(2);
  }
  if (!isTier1(url)) {
    console.error(`WARNUNG: ${url} ist nicht auf der Tier-1-Whitelist.`);
    console.error(`Erlaubte Domains: ${TIER1_DOMAINS.join(', ')}`);
    // Trotzdem fortfahren — der User entscheidet, ob er die Quelle
    // verifizieren will. Wir markieren aber im Output.
    console.error('--- (TROTZDEM_GEFETCHT) ---');
  }
  let res;
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        'Accept-Encoding': 'identity'
      },
      redirect: 'follow'
    });
  } catch (err) {
    console.error(`FETCH-FEHLER: ${err.message}`);
    process.exit(3);
  }
  if (!res.ok) {
    console.error(`HTTP ${res.status} ${res.statusText} fuer ${url}`);
    process.exit(4);
  }
  const html = await res.text();
  if (mode === 'html') {
    process.stdout.write(html.slice(0, maxChars));
    return;
  }
  const text = htmlToText(html);
  process.stdout.write(text.slice(0, maxChars));
  if (text.length > maxChars) {
    process.stdout.write(`\n\n--- [gekuerzt: ${text.length - maxChars} weitere Zeichen] ---`);
  }
}

main().catch((err) => {
  console.error(`UNERWARTETER FEHLER: ${err.message}`);
  process.exit(1);
});

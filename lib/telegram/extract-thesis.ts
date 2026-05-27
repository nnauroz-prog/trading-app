const STOP_PATTERNS = [
  /^\s*$/,
  /^(trade\s*republic|scalable|coinbase|bitpanda)\b/i,
  /risiko\s*:/i,
  /^(sehr\s+hohes?|hohes?|mittler(?:es|e)|niedrigstes?|niedrig(?:es|e)?)\s*risiko/i,
  /^\d+\s*€?\s*aktueller\s*kurs/i,
  /52[\s-]?wochen?(?:tief|hoch)/i,
  /https?:\/\//i,
  /^[\s\W]*$/
];

const BULLET_PREFIXES = [/^[•\-\*–·]\s*/, /^\d+[.)\]]\s*/];

function stripBullet(line: string): string {
  let s = line.trim();
  for (const re of BULLET_PREFIXES) s = s.replace(re, '');
  return s.trim();
}

function isStop(line: string): boolean {
  return STOP_PATTERNS.some((re) => re.test(line));
}

export function extractThesis(text: string): string[] {
  const lines = text.split(/\n/);
  const candidates: string[] = [];
  for (const raw of lines) {
    if (isStop(raw)) continue;
    const cleaned = stripBullet(raw);
    if (cleaned.length < 10) continue;
    if (/^https?:\/\//i.test(cleaned)) continue;
    if (/^[A-Z]{2}[A-Z0-9]{4}$/.test(cleaned)) continue;
    if (/\bWKN\b/i.test(cleaned) && cleaned.length < 25) continue;
    candidates.push(cleaned);
  }
  const sentences: string[] = [];
  for (const c of candidates) {
    const parts = c.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ])/);
    for (const p of parts) {
      const trimmed = p.trim();
      if (trimmed.length >= 15) sentences.push(trimmed);
    }
  }
  return sentences.slice(0, 8);
}

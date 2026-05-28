import { ExtractedLink } from '@/lib/types/ideas';

const URL_REGEX = /(https?:\/\/[^\s\)\]]+)/gi;

function classifyLink(url: string): ExtractedLink['kind'] {
  const lower = url.toLowerCase();
  if (lower.includes('t.me/c/') || lower.includes('telegram.me/c/')) return 'telegram_private';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.match(/(reuters|bloomberg|cnbc|wsj|ft\.com|handelsblatt|manager-magazin|spiegel|finanzen\.net|n-tv|focus|welt)/)) {
    return 'news';
  }
  if (lower.match(/(verlustwarnung|loss[\-_ ]warning)/)) return 'loss_warning';
  if (lower.match(/(analyst|rating|kursziel|price[\-_ ]target)/)) return 'analyst_rating';
  if (lower.match(/(idee|tradingidee|trading[\-_ ]idea|setup)/)) return 'related_idea';
  if (lower.match(/(kauf|gekauft|bought|purchase)/)) return 'past_purchase';
  return 'unknown';
}

export function extractLinks(text: string): ExtractedLink[] {
  const matches = text.match(URL_REGEX) ?? [];
  const seen = new Set<string>();
  const out: ExtractedLink[] = [];
  for (const raw of matches) {
    const url = raw.replace(/[.,;:!?\)\]]+$/, '');
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, kind: classifyLink(url) });
  }
  return out;
}

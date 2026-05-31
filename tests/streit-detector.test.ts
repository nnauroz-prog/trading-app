import { describe, expect, it } from 'vitest';
import { detectStreitPhase } from '@/lib/agents/streit-detector';
import { VorstandSnapshot } from '@/lib/agents/vorstand-memory';
import { VorstandVerdict } from '@/lib/agents/vorstand';

function s(date: string, verdict: VorstandVerdict): VorstandSnapshot {
  return { date, recordedAt: 0, verdict, consensusCoin: null, buyCount: 0, conflictCount: 0, headline: '' };
}

describe('detectStreitPhase', () => {
  it('returns unklar for empty log', () => {
    expect(detectStreitPhase([]).phase).toBe('unklar');
  });

  it('detects streit after 3+ consecutive WATCHLIST', () => {
    const log = [
      s('2026-05-01', 'WATCHLIST'),
      s('2026-05-02', 'WATCHLIST'),
      s('2026-05-03', 'WATCHLIST')
    ];
    const r = detectStreitPhase(log);
    expect(r.phase).toBe('streit');
    expect(r.consecutiveDays).toBe(3);
  });

  it('detects lange_pause after 5+ consecutive CASH', () => {
    const log = Array.from({ length: 5 }, (_, i) => s(`2026-05-0${i + 1}`, 'CASH_HALTEN'));
    expect(detectStreitPhase(log).phase).toBe('lange_pause');
  });

  it('detects konsens after 3+ consecutive BUY-flavored verdicts', () => {
    const log = [
      s('2026-05-01', 'KLARER_KAUF'),
      s('2026-05-02', 'KAUFEN_VORSICHTIG'),
      s('2026-05-03', 'KLARER_KAUF')
    ];
    expect(detectStreitPhase(log).phase).toBe('konsens');
  });

  it('returns unklar when last is WATCHLIST but only 1 day', () => {
    const log = [
      s('2026-05-01', 'KLARER_KAUF'),
      s('2026-05-02', 'WATCHLIST')
    ];
    expect(detectStreitPhase(log).phase).toBe('unklar');
  });

  it('streak resets when verdict-kind changes', () => {
    const log = [
      s('2026-05-01', 'WATCHLIST'),
      s('2026-05-02', 'CASH_HALTEN'),
      s('2026-05-03', 'WATCHLIST'),
      s('2026-05-04', 'WATCHLIST')
    ];
    const r = detectStreitPhase(log);
    expect(r.phase).toBe('unklar'); // only 2 WATCHLIST in a row at end
  });
});

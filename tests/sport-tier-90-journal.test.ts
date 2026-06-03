import { describe, expect, it } from 'vitest';
import { resolveSportTier90, summariseSportTier90, type SportTier90Entry } from '@/lib/sport/sport-tier-90-journal';

function entry(pickSide: 'home' | 'away' | 'draw'): SportTier90Entry {
  return {
    fixtureId: 'fx1',
    date: '2026-06-10',
    recordedAt: 1,
    homeTeam: 'Bayern',
    awayTeam: 'Schwacher SC',
    league: 'Bundesliga',
    pickPlain: 'Heimsieg',
    pickSide,
    confidence: 0.78,
    likelyScoreHome: 2,
    likelyScoreAway: 0,
    outcome: 'pending'
  };
}

describe('resolveSportTier90', () => {
  it('marks win when picked side actually wins', () => {
    const r = resolveSportTier90(entry('home'), 2, 1);
    expect(r.outcome).toBe('win');
  });

  it('marks loss when picked side loses', () => {
    const r = resolveSportTier90(entry('home'), 0, 2);
    expect(r.outcome).toBe('loss');
  });

  it('marks loss on a draw if picked a side', () => {
    const r = resolveSportTier90(entry('home'), 1, 1);
    expect(r.outcome).toBe('loss');
  });

  it('marks win when draw was picked and game drew', () => {
    const r = resolveSportTier90(entry('draw'), 2, 2);
    expect(r.outcome).toBe('win');
  });

  it('does not re-resolve already resolved entries', () => {
    const e: SportTier90Entry = { ...entry('home'), outcome: 'loss' };
    expect(resolveSportTier90(e, 5, 0).outcome).toBe('loss');
  });
});

describe('summariseSportTier90', () => {
  it('computes hit rate from resolved entries only', () => {
    const log: SportTier90Entry[] = [
      { ...entry('home'), outcome: 'win' },
      { ...entry('home'), outcome: 'win' },
      { ...entry('home'), outcome: 'loss' },
      { ...entry('home'), outcome: 'pending' }
    ];
    const s = summariseSportTier90(log);
    expect(s.total).toBe(4);
    expect(s.pending).toBe(1);
    expect(s.hitRatePct).toBeCloseTo(66.7, 0);
  });
});

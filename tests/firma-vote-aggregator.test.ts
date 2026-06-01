import { describe, expect, it } from 'vitest';
import { summariseFirmaVotes } from '@/lib/agents/firma-vote-aggregator';
import type { SubAgentReport, VoteTone } from '@/lib/agents/sub-agents';

function report(tone: 'good' | 'neutral' | 'bad'): SubAgentReport {
  return { role: 'analyst', title: 'Analyst', vote: 'POSITIV', voteTone: tone, reason: '' } as SubAgentReport;
}

describe('summariseFirmaVotes', () => {
  it('classifies a positive landslide as kaufen', () => {
    const s = summariseFirmaVotes([report('good'), report('good'), report('good'), report('good'), report('neutral')]);
    expect(s.positiveVotes).toBe(4);
    expect(s.direction).toBe('kaufen');
  });

  it('classifies a negative landslide as warten', () => {
    const s = summariseFirmaVotes([report('bad'), report('bad'), report('bad'), report('good')]);
    expect(s.direction).toBe('warten');
  });

  it('classifies close calls as mixed', () => {
    const s = summariseFirmaVotes([report('good'), report('bad'), report('good'), report('bad')]);
    expect(s.direction).toBe('mixed');
  });

  it('handles all-neutral as mixed with 0 confidence', () => {
    const s = summariseFirmaVotes([report('neutral'), report('neutral'), report('neutral')]);
    expect(s.direction).toBe('mixed');
    expect(s.confidence).toBe(0);
  });
});

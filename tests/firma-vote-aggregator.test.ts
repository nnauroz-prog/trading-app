import { describe, expect, it } from 'vitest';
import { summariseFirmaVotes } from '@/lib/agents/firma-vote-aggregator';
import type { SubAgentReport, VoteTone } from '@/lib/agents/sub-agents';

function report(tone: VoteTone): SubAgentReport {
  return { role: 'analyst', title: 'Analyst', vote: 'POSITIV', voteTone: tone, reason: '' } as SubAgentReport;
}

describe('summariseFirmaVotes', () => {
  it('classifies a positive landslide as kaufen', () => {
    const s = summariseFirmaVotes([report('positive'), report('positive'), report('positive'), report('positive'), report('neutral')]);
    expect(s.positiveVotes).toBe(4);
    expect(s.direction).toBe('kaufen');
  });

  it('classifies a negative landslide as warten', () => {
    const s = summariseFirmaVotes([report('negative'), report('negative'), report('negative'), report('positive')]);
    expect(s.direction).toBe('warten');
  });

  it('classifies close calls as mixed', () => {
    const s = summariseFirmaVotes([report('positive'), report('negative'), report('positive'), report('negative')]);
    expect(s.direction).toBe('mixed');
  });

  it('handles all-neutral as mixed with 0 confidence', () => {
    const s = summariseFirmaVotes([report('neutral'), report('neutral'), report('neutral')]);
    expect(s.direction).toBe('mixed');
    expect(s.confidence).toBe(0);
  });
});

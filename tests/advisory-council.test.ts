import { describe, expect, it } from 'vitest';
import { conveneCouncil, type CouncilInput } from '@/lib/analysis/advisory-council';

function base(): CouncilInput {
  return {
    dataAvailable: true,
    hasOpportunity: false,
    primaryLabel: null,
    primaryAssetClass: null,
    confidencePct: null,
    marketMood: 'neutral',
    fearGreedValue: 50,
    crowdState: 'neutral',
    crowdCautious: false,
    recentChangePct: null
  };
}

describe('conveneCouncil', () => {
  it('ohne Daten: Chef haelt zurueck, kein Raten', () => {
    const r = conveneCouncil({ ...base(), dataAvailable: false });
    expect(r.netStance).toBe('neutral');
    expect(r.voices).toHaveLength(1);
    expect(r.chiefDirective.toLowerCase()).toContain('keine empfehlung');
  });

  it('vier Stimmen inkl. Emotion + Disziplin, wenn Daten da sind', () => {
    const r = conveneCouncil(base());
    const names = r.voices.map((v) => v.name);
    expect(names).toContain('Sentiment-Analyst');
    expect(names).toContain('Disziplin-Coach');
    expect(r.voices.length).toBe(4);
  });

  it('extreme Gier → Sentiment baerisch, Emotion warnt', () => {
    const r = conveneCouncil({ ...base(), fearGreedValue: 85, crowdState: 'greed', crowdCautious: true });
    const sent = r.voices.find((v) => v.name === 'Sentiment-Analyst')!;
    expect(sent.stance).toBe('bearish');
    expect(r.emotionRead.toLowerCase()).toContain('gier');
  });

  it('Angst im Markt → Sentiment bullisch (antizyklisch)', () => {
    const r = conveneCouncil({ ...base(), fearGreedValue: 18, crowdState: 'fear' });
    const sent = r.voices.find((v) => v.name === 'Sentiment-Analyst')!;
    expect(sent.stance).toBe('bullish');
  });

  it('Disziplin-Coach warnt vor Chasing nach Pump', () => {
    const r = conveneCouncil({ ...base(), hasOpportunity: true, primaryLabel: 'DOGE — Long-Setup', recentChangePct: 22 });
    const coach = r.voices.find((v) => v.name === 'Disziplin-Coach')!;
    expect(coach.stance).toBe('caution');
    expect(coach.say.toLowerCase()).toContain('fomo');
  });

  it('sauberes Setup + risk-on → konstruktive/bullische Direktive auf den Wert', () => {
    const r = conveneCouncil({
      ...base(), hasOpportunity: true, primaryLabel: 'ETH — Long-Setup',
      primaryAssetClass: 'Krypto', confidencePct: 78, marketMood: 'risk-on',
      fearGreedValue: 45, recentChangePct: 2
    });
    expect(['bullish', 'constructive']).toContain(r.netStance);
    expect(r.chiefDirective).toContain('ETH — Long-Setup');
  });

  it('risk-off → Rat vorsichtig, Kapitalschutz', () => {
    const r = conveneCouncil({ ...base(), marketMood: 'risk-off', hasOpportunity: true, primaryLabel: 'BTC — Long-Setup', confidencePct: 60 });
    expect(['caution', 'bearish']).toContain(r.netStance);
    const risk = r.voices.find((v) => v.name === 'Risk-Manager')!;
    expect(risk.stance).toBe('caution');
  });
});

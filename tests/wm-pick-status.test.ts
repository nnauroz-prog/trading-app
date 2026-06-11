import { describe, expect, it } from 'vitest';
import { computeWmPickStatus } from '@/lib/sport/wm-pick-status';

describe('computeWmPickStatus', () => {
  it('Nichts erledigt -> rot, 0/3', () => {
    const r = computeWmPickStatus({ pickId: 'x', hasStake: false, hasOddsEntered: false, hasNote: false });
    expect(r.ampel).toBe('rot');
    expect(r.doneCount).toBe(0);
    expect(r.pflichtErledigt).toBe(false);
  });

  it('Quote eingetragen, Stake fehlt -> gelb', () => {
    const r = computeWmPickStatus({ pickId: 'x', hasStake: false, hasOddsEntered: true, hasNote: false });
    expect(r.ampel).toBe('gelb');
    expect(r.pflichtErledigt).toBe(false);
  });

  it('Stake erledigt, Quote fehlt -> gelb', () => {
    const r = computeWmPickStatus({ pickId: 'x', hasStake: true, hasOddsEntered: false, hasNote: false });
    expect(r.ampel).toBe('gelb');
  });

  it('Quote + Stake -> gruen + pflichtErledigt', () => {
    const r = computeWmPickStatus({ pickId: 'x', hasStake: true, hasOddsEntered: true, hasNote: false });
    expect(r.ampel).toBe('gruen');
    expect(r.pflichtErledigt).toBe(true);
  });

  it('Alle drei -> gruen, 3/3', () => {
    const r = computeWmPickStatus({ pickId: 'x', hasStake: true, hasOddsEntered: true, hasNote: true });
    expect(r.ampel).toBe('gruen');
    expect(r.doneCount).toBe(3);
  });

  it('items haben sprechende Hints fuer offen vs. erledigt', () => {
    const r = computeWmPickStatus({ pickId: 'x', hasStake: false, hasOddsEntered: false, hasNote: false });
    expect(r.items.find((i) => i.id === 'quote')?.hint).toContain('eintragen');
    const done = computeWmPickStatus({ pickId: 'x', hasStake: true, hasOddsEntered: true, hasNote: true });
    expect(done.items.find((i) => i.id === 'quote')?.hint).toContain('eingetragen');
  });

  it('Reihenfolge der items: quote, stake, notiz', () => {
    const r = computeWmPickStatus({ pickId: 'x', hasStake: false, hasOddsEntered: false, hasNote: false });
    expect(r.items.map((i) => i.id)).toEqual(['quote', 'stake', 'notiz']);
  });
});

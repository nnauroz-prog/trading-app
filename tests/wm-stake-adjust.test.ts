import { describe, expect, it } from 'vitest';
import { adjustStake, labelForMode, STAKE_MODES } from '@/lib/sport/wm-stake-adjust';

describe('adjustStake', () => {
  it('standard laesst Stake unveraendert', () => {
    const r = adjustStake(2.0, 40, 'modell-favorit', 'standard');
    expect(r.stakePct).toBe(2.0);
    expect(r.stakeEur).toBe(40);
    expect(r.cappedByTier).toBe(false);
  });

  it('minus50 halbiert Stake-Prozent und Stake-EUR', () => {
    const r = adjustStake(2.0, 40, 'modell-favorit', 'minus50');
    expect(r.stakePct).toBe(1.0);
    expect(r.stakeEur).toBe(20);
  });

  it('minus25 -> 75 %', () => {
    const r = adjustStake(2.0, 40, 'modell-favorit', 'minus25');
    expect(r.stakePct).toBe(1.5);
    expect(r.stakeEur).toBe(30);
  });

  it('plus25 -> 125 %', () => {
    const r = adjustStake(1.6, 40, 'modell-favorit', 'plus25');
    expect(r.stakePct).toBe(2.0);
    expect(r.stakeEur).toBe(50);
  });

  it('plus50 stoesst an Modell-Favorit-Cap (2 %)', () => {
    const r = adjustStake(1.6, 40, 'modell-favorit', 'plus50');
    expect(r.stakePct).toBe(2.0);
    expect(r.cappedByTier).toBe(true);
    expect(r.stakeEur).toBe(50);
  });

  it('plus50 bleibt unter Hoechste-Konfluenz-Cap (4 %)', () => {
    const r = adjustStake(2.0, 40, 'hoechste-konfluenz', 'plus50');
    expect(r.stakePct).toBe(3.0);
    expect(r.cappedByTier).toBe(false);
    expect(r.stakeEur).toBe(60);
  });

  it('plus50 mit hohem Basis-Stake greift auf Hoechste-Konfluenz-Cap zu', () => {
    const r = adjustStake(3.5, 70, 'hoechste-konfluenz', 'plus50');
    expect(r.stakePct).toBe(4.0);
    expect(r.cappedByTier).toBe(true);
  });

  it('Stake-EUR null bleibt null', () => {
    const r = adjustStake(2.0, null, 'modell-favorit', 'plus25');
    expect(r.stakeEur).toBeNull();
  });

  it('STAKE_MODES enthaelt alle 5 Modi', () => {
    expect(STAKE_MODES.length).toBe(5);
  });

  it('labelForMode liefert deutsche Strings', () => {
    expect(labelForMode('minus50')).toContain('50');
    expect(labelForMode('standard')).toBe('Standard');
    expect(labelForMode('plus25')).toContain('+');
  });
});

import { describe, expect, it, beforeEach, vi } from 'vitest';

const store = new Map<string, string>();
vi.stubGlobal('window', {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k)
  }
});

import { isOnboardingDone, markOnboardingDone, resetOnboarding } from '@/lib/onboarding';
import { profileDescription } from '@/lib/user-profile';

describe('onboarding flag', () => {
  beforeEach(() => store.clear());

  it('defaults to not-done on a fresh browser', () => {
    expect(isOnboardingDone()).toBe(false);
  });

  it('persists done and can be reset', () => {
    markOnboardingDone();
    expect(isOnboardingDone()).toBe(true);
    resetOnboarding();
    expect(isOnboardingDone()).toBe(false);
  });
});

describe('profileDescription', () => {
  it('returns a non-empty description for every profile', () => {
    for (const p of ['beginner', 'intermediate', 'speculative', 'very_speculative'] as const) {
      expect(profileDescription(p).length).toBeGreaterThan(10);
    }
  });
});

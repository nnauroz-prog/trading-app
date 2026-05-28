const STORAGE_KEY = 'trading-app.onboarding-done';

export function isOnboardingDone(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(STORAGE_KEY) === '1';
}

export function markOnboardingDone(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, '1');
}

export function resetOnboarding(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

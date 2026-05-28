import { UserRiskProfile } from '@/lib/types/ideas';

const STORAGE_KEY = 'trading-app.user-profile';
export const PROFILE_CHANGED_EVENT = 'trading-app:profile-changed';

export const DEFAULT_PROFILE: UserRiskProfile = 'intermediate';

export function loadUserProfile(): UserRiskProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === 'beginner' || v === 'intermediate' || v === 'speculative' || v === 'very_speculative') return v;
  return DEFAULT_PROFILE;
}

export function saveUserProfile(profile: UserRiskProfile): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, profile);
  window.dispatchEvent(new CustomEvent(PROFILE_CHANGED_EVENT));
}

export function profileLabel(p: UserRiskProfile): string {
  switch (p) {
    case 'beginner': return 'Anfänger';
    case 'intermediate': return 'Fortgeschritten';
    case 'speculative': return 'Spekulativ';
    case 'very_speculative': return 'Sehr spekulativ';
  }
}

export function profileDescription(p: UserRiskProfile): string {
  switch (p) {
    case 'beginner': return 'Kapitalerhalt zuerst. Strenge Warnungen, klare Stops, keine Hebelprodukte ohne deutlichen Hinweis.';
    case 'intermediate': return 'Ausgewogen. Du kennst die Basics, willst aber weiter auf Risiko und Disziplin hingewiesen werden.';
    case 'speculative': return 'Bewusst offensiv. Du akzeptierst höhere Schwankungen und Hebel, willst aber harte Risiken sehen.';
    case 'very_speculative': return 'Maximales Risiko. Wenige Warnungen, du übernimmst volle Verantwortung für Totalverlust-Szenarien.';
  }
}

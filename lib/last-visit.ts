const STORAGE_KEY = 'trading-app.last-visit-v1';
// Don't fire the welcome banner unless the gap was ≥ this many minutes.
const MIN_GAP_MIN = 30;

export interface LastVisitInfo {
  lastVisitAt: number | null;
  minutesSinceLast: number | null;
  showWelcome: boolean;
}

export function readAndUpdateLastVisit(): LastVisitInfo {
  if (typeof window === 'undefined') return { lastVisitAt: null, minutesSinceLast: null, showWelcome: false };
  const stored = window.localStorage.getItem(STORAGE_KEY);
  const now = Date.now();
  const lastVisitAt = stored ? parseInt(stored, 10) : null;
  window.localStorage.setItem(STORAGE_KEY, String(now));
  if (!lastVisitAt || Number.isNaN(lastVisitAt)) {
    return { lastVisitAt: null, minutesSinceLast: null, showWelcome: false };
  }
  const minutesSinceLast = Math.round((now - lastVisitAt) / 60_000);
  return { lastVisitAt, minutesSinceLast, showWelcome: minutesSinceLast >= MIN_GAP_MIN };
}

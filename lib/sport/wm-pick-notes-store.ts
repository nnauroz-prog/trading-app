// Persoenliche Notizen pro WM-Pick. Reine localStorage-Schicht.
//
// Der User kann zu jedem Pick eine freie Notiz hinterlegen (z. B. "Quote
// bei Bet365 war besser", "Hatte Bauchgefuehl gegen den Tipp"). Hilft
// dem Lernprozess und der eigenen Disziplin.

const STORAGE_KEY = 'trading-app.wm-pick-notes-v1';
export const WM_PICK_NOTES_CHANGED_EVENT = 'trading-app:wm-pick-notes-changed';
export const MAX_NOTE_LENGTH = 280;

type NotesMap = Record<string, string>;

function read(): NotesMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as NotesMap;
  } catch {
    return {};
  }
}

function write(map: NotesMap): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent(WM_PICK_NOTES_CHANGED_EVENT));
}

export function loadAllPickNotes(): NotesMap {
  return read();
}

export function loadPickNote(pickId: string): string {
  return read()[pickId] ?? '';
}

export function savePickNote(pickId: string, note: string): void {
  const map = read();
  const trimmed = note.trim().slice(0, MAX_NOTE_LENGTH);
  if (trimmed.length === 0) {
    delete map[pickId];
  } else {
    map[pickId] = trimmed;
  }
  write(map);
}

export function clearPickNote(pickId: string): void {
  const map = read();
  delete map[pickId];
  write(map);
}

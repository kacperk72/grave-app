import { readStorage, removeStorage, writeStorage } from './storage';

const SESSION_KEY = 'znajdzgroby-session';

/** Sesja konta w tym urządzeniu (token `Bearer` + e-mail do wyświetlenia). */
export interface StoredSession {
  token: string;
  email: string;
}

export function readSession(): StoredSession | null {
  try {
    const parsed = JSON.parse(readStorage(SESSION_KEY) ?? 'null') as StoredSession | null;
    return parsed && typeof parsed.token === 'string' && typeof parsed.email === 'string'
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function writeSession(session: StoredSession): void {
  writeStorage(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  removeStorage(SESSION_KEY);
}

/** `localStorage` bywa niedostępny (tryb prywatny, zablokowane dane) — wtedy działamy bez niego. */
export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // bez localStorage ustawienie działa do zamknięcia karty
  }
}

export function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
